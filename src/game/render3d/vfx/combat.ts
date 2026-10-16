import * as THREE from 'three';
import type { ProjectileActor } from '../../engine/entities.ts';
import type { World } from '../../engine/world.ts';
import { ELEMENTAL_STANCES } from '../../rules/index.ts';
import { LANE_Z, S, laneSpan, toX, toY } from '../coords.ts';
import type { RenderFrame3D } from '../module.ts';
import { cssColor } from '../resources.ts';
import { hash01, segment, type FxKit } from './shared.ts';

// Combat VFX (canvas: render/projectiles.ts, render/effects.ts):
// - projectiles by style: kunai (lit blade + tassel), shuriken (spinning star), fireball (core +
//   glow), flame tongues (fire_burst), forked bolts (lightning_bolt), ice shards, enemy wind blades;
// - kunai trails: per pool-slot position history → fading additive ribbon (vệt phi tiêu);
// - sim particles by kind: spark = velocity streak, slash = red shard, ember = flame, snow = ice
//   diamond, lightning = tiny zig-zag; `env` particles are replaced by the weather layer;
// - lightning arcs (LightningArc): 3-layer jagged beam (cyan glow, colour, white core) + end glows;
// - impact ring + flash where a fresh spark burst is (parry / hits), sized by its age.
// Glowing parts sit on the bloom layer. All pools are fixed InstancedMeshes, nothing per frame.

const TRAIL_LEN = 8;
const POOL = 80;
const LIGHTNING_STEPS = 6;

type Style = 'kunai' | 'shuriken' | 'fireball' | 'flame' | 'bolt' | 'ice' | 'blade';

function styleOf(p: ProjectileActor, world: World): Style {
  const style =
    p.elementalStyle ?? (p.fromPlayer ? ELEMENTAL_STANCES[world.combat.skills.activeElement].projectileStyle : undefined);
  if (p.fromPlayer && style === 'fire_burst') return 'flame';
  if (p.fromPlayer && style === 'lightning_bolt') return 'bolt';
  if (p.fromPlayer && style === 'ice_shard') return 'ice';
  if (p.isSwordBeam) return 'blade';
  if (p.isFireball) return 'fireball';
  if (p.fromPlayer) return 'kunai';
  return 'shuriken';
}

function kunaiColor(p: ProjectileActor): string {
  return p.parried ? '#fde047' : p.homing ? '#c084fc' : p.explosive ? '#fb923c' : '#38bdf8';
}

function trailColor(p: ProjectileActor, style: Style): string {
  if (p.parried) return '#fde047';
  switch (style) {
    case 'flame':
    case 'fireball':
      return p.customColor ?? '#fb923c';
    case 'bolt':
      return '#fde047';
    case 'ice':
      return '#7dd3fc';
    case 'blade':
      return p.customColor ?? '#f43f5e';
    case 'kunai':
      return kunaiColor(p);
    default:
      return '#f43f5e';
  }
}

export function createCombatFx(kit: FxKit) {
  const { track, quad } = kit;

  // Geometry pointing +x (direction of travel).
  const bladeGeo = track.geometry(new THREE.ConeGeometry(1, 1, 4).rotateZ(-Math.PI / 2));
  const starShape = new THREE.Shape();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = i % 2 === 0 ? 1 : 0.3;
    if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const starGeo = track.geometry(
    new THREE.ExtrudeGeometry(starShape, { depth: 0.15, bevelEnabled: false }).translate(0, 0, -0.075)
  );
  const sphereGeo = track.geometry(new THREE.IcosahedronGeometry(1, 2));
  const octaGeo = track.geometry(new THREE.OctahedronGeometry(1, 0));
  const flameGeo = track.geometry(new THREE.ConeGeometry(1, 1, 7).rotateZ(Math.PI / 2)); // tip trails −x

  const blades = kit.batch(bladeGeo, kit.litMat, 96, false, { castShadow: true });
  const stars = kit.batch(starGeo, kit.litMat, 48, false, { castShadow: true });
  const cores = kit.batch(sphereGeo, kit.flatMat, 64, true);
  const shards = kit.batch(octaGeo, kit.flatMat, 160, false);
  // Flames use normal blending: additive orange over a bright backdrop washes out to white.
  const flameMat = track.material(
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.92, depthWrite: false, toneMapped: false })
  );
  const flames = kit.batch(flameGeo, flameMat, 128, true, { renderOrder: 7 });
  const glows = kit.batch(quad, kit.glowMat, 256, true, { renderOrder: 8 });
  const beams = kit.batch(quad, kit.beamMat, 1024, true, { renderOrder: 8 });
  const rings = kit.batch(quad, kit.ringMat, 8, true, { renderOrder: 9 });

  // Trail history per projectile pool slot: [x, y] × TRAIL_LEN, newest first (sim px).
  const hist = new Float32Array(POOL * TRAIL_LEN * 2);
  const histCount = new Uint8Array(POOL);
  const wasActive = new Uint8Array(POOL);

  const c = new THREE.Color();
  const c2 = new THREE.Color();
  const WHITE = new THREE.Color(1, 1, 1);

  function addBeam(x1: number, y1: number, x2: number, y2: number, z: number, width: number, col: THREE.Color) {
    const s = segment(x1, y1, x2, y2);
    if (s.len < 1e-4) return;
    beams.add(s.x, s.y, z, s.len + width * 0.5, width, 1, col, s.ang);
  }

  /** Jagged 3-layer bolt between two three-space points (shared by arcs and bolt projectiles). */
  const pts = new Float32Array((LIGHTNING_STEPS + 1) * 2);
  function addJagged(
    x1: number, y1: number, x2: number, y2: number, z: number,
    amp: number, seed: number, t: number, col: THREE.Color, k: number, scale = 1
  ) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    for (let s = 0; s <= LIGHTNING_STEPS; s++) {
      const u = s / LIGHTNING_STEPS;
      const off =
        s === 0 || s === LIGHTNING_STEPS
          ? 0
          : (s % 2 === 0 ? 1 : -1) * amp * (1 + Math.sin(t * 60 + s * 2.1 + seed) * 0.6);
      pts[s * 2] = x1 + dx * u + nx * off;
      pts[s * 2 + 1] = y1 + dy * u + ny * off;
    }
    c2.setRGB(0.22, 0.74, 0.97).multiplyScalar(k * 0.55); // #38bdf8 halo
    for (let s = 0; s < LIGHTNING_STEPS; s++) {
      const ax = pts[s * 2], ay = pts[s * 2 + 1], bx = pts[s * 2 + 2], by = pts[s * 2 + 3];
      addBeam(ax, ay, bx, by, z, 0.22 * scale, c2);
    }
    c2.copy(col).multiplyScalar(k * 1.2);
    for (let s = 0; s < LIGHTNING_STEPS; s++) {
      addBeam(pts[s * 2], pts[s * 2 + 1], pts[s * 2 + 2], pts[s * 2 + 3], z + 0.01, 0.08 * scale, c2);
    }
    c2.copy(WHITE).multiplyScalar(k * 1.6);
    for (let s = 0; s < LIGHTNING_STEPS; s++) {
      addBeam(pts[s * 2], pts[s * 2 + 1], pts[s * 2 + 2], pts[s * 2 + 3], z + 0.02, 0.035 * scale, c2);
    }
  }

  function projectiles(world: World, f: RenderFrame3D) {
    for (let i = 0; i < world.projectiles.length && i < POOL; i++) {
      const p = world.projectiles[i];
      if (!p.active) {
        wasActive[i] = 0;
        histCount[i] = 0;
        continue;
      }
      // --- trail history (sim px). A slot that was reused or teleported starts over.
      const h = i * TRAIL_LEN * 2;
      if (!wasActive[i] || Math.hypot(hist[h] - p.x, hist[h + 1] - p.y) > 160) histCount[i] = 0;
      wasActive[i] = 1;
      if (histCount[i] === 0 || hist[h] !== p.x || hist[h + 1] !== p.y) {
        hist.copyWithin(h + 2, h, h + (TRAIL_LEN - 1) * 2);
        hist[h] = p.x;
        hist[h + 1] = p.y;
        histCount[i] = Math.min(TRAIL_LEN, histCount[i] + 1);
      }

      const style = styleOf(p, world);
      const z = p.crossZ ? laneSpan('both').z + 1.5 : LANE_Z[p.zLane] + 0.15;
      const x = toX(p.x);
      const y = toY(p.y);
      const ang = Math.atan2(-p.vy, p.vx);
      const n = histCount[i];

      // --- trail ribbon: segments get thinner and dimmer towards the tail.
      if (n >= 2 && style !== 'shuriken') {
        const base = cssColor(trailColor(p, style));
        const w0 = style === 'kunai' ? 0.09 : style === 'blade' || style === 'flame' ? 0.2 : 0.14;
        for (let s = 0; s < n - 1; s++) {
          const fade = 1 - s / (TRAIL_LEN - 1);
          c.copy(base).multiplyScalar(1.6 * fade * fade);
          addBeam(
            toX(hist[h + s * 2]), toY(hist[h + s * 2 + 1]),
            toX(hist[h + s * 2 + 2]), toY(hist[h + s * 2 + 3]),
            z - 0.02, w0 * (0.35 + 0.65 * fade), c
          );
        }
      }

      // --- body
      switch (style) {
        case 'kunai': {
          const col = cssColor(kunaiColor(p));
          blades.add(x, y, z, 0.28, 0.07, 0.04, col, ang);
          // ring pommel (gold) behind the blade
          const bx = x - Math.cos(ang) * 0.13;
          const by = y - Math.sin(ang) * 0.13;
          shards.add(bx, by, z, 0.035, 0.035, 0.035, cssColor('#fde047'));
          c.copy(col).multiplyScalar(0.9);
          glows.add(x, y, z + 0.02, 0.36, 0.36, 1, c);
          break;
        }
        case 'shuriken':
          stars.add(x, y, z, 0.13, 0.13, 0.6, cssColor('#e2e8f0'), f.t * 20 + i);
          shards.add(x, y, z + 0.05, 0.035, 0.035, 0.035, cssColor('#f43f5e'));
          break;
        case 'fireball': {
          const col = cssColor(p.parried ? '#fde047' : (p.customColor ?? '#fb923c'));
          c.copy(col).multiplyScalar(1.6);
          cores.add(x, y, z, 0.11, 0.11, 0.11, c);
          c.copy(col).multiplyScalar(1.4);
          glows.add(x, y, z + 0.05, 0.7, 0.7, 1, c);
          // licking flames behind it
          for (let k = 0; k < 3; k++) {
            const wob = Math.sin(f.t * 30 + k * 2.1 + i) * 0.15;
            c.copy(col).multiplyScalar(0.9 - k * 0.2);
            flames.add(
              x - Math.cos(ang) * (0.12 + k * 0.05), y - Math.sin(ang) * (0.12 + k * 0.05), z - 0.01,
              0.3 - k * 0.05, 0.1 - k * 0.02, 0.1, c, ang + wob * 0.4
            );
          }
          break;
        }
        case 'flame': {
          // Cluster of flame tongues (3, or 5 for sword beams), tips flickering backwards.
          const count = p.isSwordBeam ? 5 : 3;
          const half = (count - 1) / 2;
          const ca = Math.cos(ang), sa = Math.sin(ang);
          for (let k = 0; k < count; k++) {
            const o = k - half;
            const flick = Math.sin(f.t * 44 + k * 2.1 + p.x * 0.06);
            const len = ((p.isSwordBeam ? 36 : 28) - Math.abs(o) * 4 + flick * 2.2) * S * 1.4;
            const wid = ((p.isSwordBeam ? 11.5 : 9.5) - Math.abs(o) * 1.2) * S;
            const lx = -Math.abs(o) * 4 * S;
            const ly = o * 8.5 * S;
            const px = x + ca * lx - sa * ly;
            const py = y + sa * lx + ca * ly;
            const a = ang + o * 0.11;
            flames.add(px, py, z, len, wid, wid, c.copy(cssColor(Math.abs(o) >= 1.5 ? '#b91c1c' : '#dc2626')).multiplyScalar(1.4), a);
            flames.add(px + ca * 0.03, py + sa * 0.03, z + 0.01, len * 0.7, wid * 0.65, wid * 0.65, c.copy(cssColor('#f97316')).multiplyScalar(1.6), a);
            flames.add(px + ca * 0.06, py + sa * 0.06, z + 0.02, len * 0.4, wid * 0.35, wid * 0.35, c.copy(cssColor('#fde047')).multiplyScalar(2), a);
          }
          glows.add(x, y, z + 0.05, 0.9, 0.9, 1, c.copy(cssColor('#f97316')).multiplyScalar(0.9));
          break;
        }
        case 'bolt': {
          const count = p.isSwordBeam ? 3 : 2;
          const half = (count - 1) / 2;
          const ca = Math.cos(ang), sa = Math.sin(ang);
          for (let k = 0; k < count; k++) {
            const o = (k - half) * 12 * S;
            const ox = -sa * o, oy = ca * o;
            addJagged(
              x - ca * 0.3 + ox, y - sa * 0.3 + oy, x + ca * 0.34 + ox, y + sa * 0.34 + oy, z,
              0.08, i * 3 + k, f.t, cssColor('#fde047'), 1, 0.55
            );
          }
          glows.add(x, y, z + 0.05, 0.8, 0.8, 1, c.copy(cssColor('#facc15')).multiplyScalar(0.8));
          break;
        }
        case 'ice': {
          const count = p.isSwordBeam ? 3 : 1;
          const half = (count - 1) / 2;
          const ca = Math.cos(ang), sa = Math.sin(ang);
          for (let k = 0; k < count; k++) {
            const o = k - half;
            const lx = -Math.abs(o) * 5 * S;
            const ly = o * 10 * S;
            const px = x + ca * lx - sa * ly;
            const py = y + sa * lx + ca * ly;
            shards.add(px, py, z, 0.22, 0.09, 0.09, cssColor('#38bdf8'), ang + o * 0.1);
            shards.add(px + ca * 0.02, py + sa * 0.02, z + 0.04, 0.15, 0.04, 0.04, cssColor('#ffffff'), ang + o * 0.1);
          }
          glows.add(x, y, z + 0.05, 0.55, 0.55, 1, c.copy(cssColor('#7dd3fc')).multiplyScalar(0.8));
          break;
        }
        case 'blade': {
          const col = cssColor(p.customColor ?? '#f43f5e');
          const ca = Math.cos(ang), sa = Math.sin(ang);
          for (const o of [-7, 0, 7]) {
            const ly = o * S;
            blades.add(x - sa * ly, y + ca * ly, z, 0.34, 0.055, 0.03, col, ang);
          }
          glows.add(x, y, z + 0.05, 0.7, 0.5, 1, c.copy(col).multiplyScalar(0.9));
          break;
        }
      }
    }
  }

  // Shock ring: centroid of the freshest spark burst, while it is young.
  function impacts(world: World, f: RenderFrame3D) {
    let sx = 0, sy = 0, n = 0, youngest = 0;
    for (const p of world.particles) {
      if (!p.active || p.kind !== 'spark') continue;
      const age = p.life / p.maxLife;
      if (age < 0.55) continue;
      sx += p.x - p.vx * (p.maxLife - p.life); // back-project to the burst origin
      sy += p.y - p.vy * (p.maxLife - p.life);
      n++;
      if (age > youngest) youngest = age;
    }
    const hit = world.hitstopTimer > 0;
    if (n >= 6 || (hit && n > 0)) {
      const x = toX(sx / n);
      const y = toY(sy / n);
      const grow = 1 - youngest; // 0 at the moment of impact
      const z = LANE_Z[world.combat.zLane] + 0.3;
      const r = 0.35 + grow * 2.2;
      c.setRGB(1, 0.92, 0.55).multiplyScalar(1.4 * (1 - grow));
      rings.add(x, y, z, r, r, 1, c);
      c.setRGB(1, 0.95, 0.7).multiplyScalar((hit ? 0.6 : 0.35) * (1 - grow));
      glows.add(x, y, z, 0.6 - grow * 0.3, 0.6 - grow * 0.3, 1, c);
      if (hit) {
        // Parry-strength hits: a cross flare during the freeze.
        c.setRGB(1, 0.95, 0.75).multiplyScalar(0.9);
        beams.add(x, y, z + 0.01, 1.6, 0.06, 1, c, 0.3);
        beams.add(x, y, z + 0.01, 0.9, 0.045, 1, c, Math.PI / 2 + 0.3);
      }
    }
  }

  function particles(world: World, f: RenderFrame3D) {
    for (const p of world.particles) {
      if (!p.active || p.kind === 'env') continue;
      const x = toX(p.x);
      const y = toY(p.y);
      const z = LANE_Z[world.combat.zLane] + 0.35;
      const a = p.alpha;
      switch (p.kind) {
        case 'spark':
        case 'lightning': {
          const sp = Math.hypot(p.vx, p.vy);
          const len = Math.max(0.05, Math.min(0.4, sp * 0.0008)) * (0.4 + 0.6 * a);
          const ang = Math.atan2(-p.vy, p.vx);
          c.copy(cssColor(p.color)).multiplyScalar((p.kind === 'spark' ? 0.75 : 0.6) * a);
          beams.add(x, y, z, len, (p.size + 1) * S * 0.6, 1, c, ang);
          if (p.kind === 'lightning') {
            c.copy(cssColor('#38bdf8')).multiplyScalar(0.4 * a);
            glows.add(x, y, z, 0.2, 0.2, 1, c);
          }
          break;
        }
        case 'slash': {
          const s = (p.size + 1.5) * S * (0.5 + 0.5 * a);
          shards.add(x, y, z, s * 1.6, s * 0.6, s * 0.6, cssColor(p.color), Math.atan2(-p.vy, p.vx));
          break;
        }
        case 'ember': {
          const s = (p.size + 1) * S;
          c.copy(cssColor(p.color)).multiplyScalar(1.8 * a);
          flames.add(x, y + s, z, s * 2.6, s * 1.1, s * 1.1, c, -Math.PI / 2);
          c.copy(cssColor('#fde047')).multiplyScalar(1.4 * a);
          glows.add(x, y, z, s * 4, s * 4, 1, c);
          break;
        }
        case 'snow': {
          const r = (p.size + 1.5) * S * (0.6 + 0.4 * a);
          shards.add(x, y, z, r * 0.75, r, r * 0.5, cssColor(p.color), f.t * 3 + p.x * 0.1);
          break;
        }
        default: {
          // petal & any other kind: small tumbling disc
          const r = (p.size + 0.8) * S * (0.6 + 0.4 * a);
          shards.add(x, y, z, r, r * 0.6, r * 0.3, cssColor(p.color), f.t * 4 + p.y * 0.05, f.t * 3);
        }
      }
    }
  }

  function lightning(world: World, f: RenderFrame3D) {
    for (let i = 0; i < world.lightningBolts.length; i++) {
      const lb = world.lightningBolts[i];
      if (!lb.active) continue;
      const k = Math.min(1, (lb.life / lb.maxLife) * 1.3);
      const z = LANE_Z[world.combat.zLane] + 0.25;
      const col = cssColor(lb.color);
      const len = Math.hypot(lb.x2 - lb.x1, lb.y2 - lb.y1) * S;
      addJagged(toX(lb.x1), toY(lb.y1), toX(lb.x2), toY(lb.y2), z, Math.min(0.16, 0.1 + len * 0.01), i, f.t, col, k);
      c.copy(col).multiplyScalar(0.8 * k);
      glows.add(toX(lb.x2), toY(lb.y2), z, 0.7, 0.7, 1, c);
      c.copy(col).multiplyScalar(0.4 * k);
      glows.add(toX(lb.x1), toY(lb.y1), z, 0.4, 0.4, 1, c);
      // a side fork from the middle
      const mx = (lb.x1 + lb.x2) / 2, my = (lb.y1 + lb.y2) / 2;
      const fx = mx + (hash01(i + Math.floor(f.t * 20)) - 0.5) * 60;
      const fy = my + 30;
      addJagged(toX(mx), toY(my), toX(fx), toY(fy), z, 0.05, i + 7, f.t, col, k * 0.7, 0.5);
    }
  }

  const all = [blades, stars, cores, shards, flames, glows, beams, rings];
  return {
    /** Begin all batches (other systems may add glows/beams/flames through `shared`). */
    begin() {
      for (const b of all) b.begin();
    },
    update(world: World, f: RenderFrame3D) {
      projectiles(world, f);
      particles(world, f);
      lightning(world, f);
      impacts(world, f);
    },
    end() {
      for (const b of all) b.end();
    },
    /** Batches other VFX systems draw into, so the whole VFX layer stays at a handful of draw calls. */
    shared: { glows, beams, flames, shards, cores, rings, addBeam, addJagged },
    dispose() {
      for (const b of all) b.dispose();
    },
  };
}

export type CombatFx = ReturnType<typeof createCombatFx>;
