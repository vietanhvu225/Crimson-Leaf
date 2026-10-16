import * as THREE from 'three';
import type { World } from '../../engine/world.ts';
import { CAMERA_FOV } from '../camera.ts';
import { LANE_Z, S, laneSpan, toX, toY } from '../coords.ts';
import type { RenderFrame3D } from '../module.ts';
import { cssColor } from '../resources.ts';
import type { CombatFx } from './combat.ts';
import { hash01, type FxKit } from './shared.ts';

// Stage atmosphere drawn by the renderer itself (no sim state, no world.rng):
// - weather by `particleType` (petals, fireflies, maple, snow, embers, bubbles) spread through real
//   depth z ∈ [-14, 1.5]: world-anchored, wrapped around the view, so the parallax is real. It
//   replaces the sim's `env` particles (which headless runs do not even spawn), so canvas and three
//   show the same kind of weather while the three one has depth;
// - god rays: slanted additive shafts far behind the play field;
// - water glints (summer, cavern, ocean) and magma embers (blood_abyss) on the liquid surface;
// - checkpoint light pillars and seal-gate shimmer (both on the bloom layer).
// Everything is analytic in sim time (frame.t), so a paused or hit-stopped game freezes it too.

const WEATHER = 150;
const RAYS = 6;

interface Look {
  color: string;
  color2: string;
  /** 'leaf' = petal/maple solid shapes, 'glow' = additive dots, 'ring' = bubbles. */
  draw: 'petal' | 'maple' | 'glow' | 'snow' | 'ring';
  bloom: boolean;
  vx: [number, number];
  vy: [number, number];
  size: number;
}

const LOOKS: Record<string, Look> = {
  petals: { color: '#fda4af', color2: '#fbcfe8', draw: 'petal', bloom: false, vx: [-0.8, -0.3], vy: [-0.9, -0.4], size: 0.07 },
  maple: { color: '#fb923c', color2: '#dc2626', draw: 'maple', bloom: false, vx: [-0.7, -0.25], vy: [-0.8, -0.35], size: 0.09 },
  snow: { color: '#f1f5f9', color2: '#e0f2fe', draw: 'snow', bloom: false, vx: [-0.35, 0.1], vy: [-0.7, -0.3], size: 0.07 },
  fireflies: { color: '#67e8f9', color2: '#bef264', draw: 'glow', bloom: true, vx: [-0.12, 0.12], vy: [-0.08, 0.12], size: 0.12 },
  embers: { color: '#f87171', color2: '#fbbf24', draw: 'glow', bloom: true, vx: [-0.25, 0.15], vy: [0.45, 1.1], size: 0.08 },
  bubbles: { color: '#a5f3fc', color2: '#e0f2fe', draw: 'ring', bloom: false, vx: [-0.15, 0.15], vy: [0.6, 1.3], size: 0.1 },
};

/** Positive modulo. */
const wrap = (v: number, m: number) => ((v % m) + m) % m;

export function createAmbientFx(kit: FxKit, combat: CombatFx) {
  const { track, quad } = kit;
  const { glows, beams } = combat.shared;

  const petalGeo = track.geometry(new THREE.CircleGeometry(1, 7).scale(1, 0.55, 1));
  const mapleShape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 === 0 ? 1 : 0.45;
    if (i === 0) mapleShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else mapleShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const mapleGeo = track.geometry(new THREE.ShapeGeometry(mapleShape));
  const leafMat = track.material(
    new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide, emissive: '#000000' })
  );
  const petals = kit.batch(petalGeo, leafMat, WEATHER, false, { renderOrder: 3 });
  const maples = kit.batch(mapleGeo, leafMat, WEATHER, false, { renderOrder: 3 });
  const softGlows = kit.batch(quad, kit.glowMat, WEATHER, false, { renderOrder: 3 });
  const bubbles = kit.batch(quad, kit.ringMat, WEATHER, false, { renderOrder: 3 });
  const raysMat = kit.beamMat.clone();
  track.material(raysMat);
  raysMat.opacity = 1;
  const rays = kit.batch(quad, raysMat, RAYS, false, { renderOrder: 1 });

  const c = new THREE.Color();
  const tanHalf = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));

  function weather(world: World, f: RenderFrame3D) {
    const look = LOOKS[f.cfg.particleType] ?? LOOKS.petals;
    const halfH0 = (world.viewH * S) / 2;
    const dist = halfH0 / tanHalf;
    const aspect = world.viewW / Math.max(1, world.viewH);
    const cx = (world.camX + world.viewW / 2) * S;
    const cy = -(world.camY + world.viewH / 2) * S;
    const col1 = cssColor(look.color);
    const col2 = cssColor(look.color2);
    for (let i = 0; i < WEATHER; i++) {
      const h1 = hash01(i * 1.17 + 0.3);
      const h2 = hash01(i * 2.31 + 1.7);
      const h3 = hash01(i * 3.73 + 2.9);
      const h4 = hash01(i * 5.11 + 4.1);
      // Depth: most particles behind the play field, a few in front (kept small and sparse).
      const z = h1 < 0.12 ? 0.4 + h1 * 9 : -14 + h1 * 14;
      const k = (dist - z) / dist; // view size multiplier at this depth
      const W = halfH0 * aspect * 2 * k * 1.15;
      const H = halfH0 * 2 * k * 1.15;
      const vx = look.vx[0] + (look.vx[1] - look.vx[0]) * h2;
      const vy = look.vy[0] + (look.vy[1] - look.vy[0]) * h3;
      const sway = Math.sin(f.t * (1 + h4 * 1.5) + i) * 0.25;
      // World-anchored position (the slight parallax factor keeps far layers drifting slower).
      const wx = h2 * 97 + vx * f.t + sway;
      const wy = h3 * 61 + vy * f.t;
      const x = cx + wrap(wx - cx, W) - W / 2;
      const y = cy + wrap(wy - cy, H) - H / 2;
      const near = z > 0 ? 0.55 : 1;
      const s = look.size * (0.7 + h4 * 0.6) * near;
      const col = h4 < 0.5 ? col1 : col2;
      switch (look.draw) {
        case 'petal':
          petals.add(x, y, z, s, s, s, col, f.t * (1.5 + h2 * 2) + i, f.t * (1 + h3 * 2));
          break;
        case 'maple':
          maples.add(x, y, z, s, s, s, col, f.t * (1 + h2 * 1.5) + i, f.t * (0.8 + h3 * 1.6));
          break;
        case 'snow':
          c.copy(col).multiplyScalar(0.55 * near);
          softGlows.add(x, y, z, s * 1.6, s * 1.6, 1, c);
          break;
        case 'ring':
          c.copy(col).multiplyScalar(0.7 * near);
          bubbles.add(x, y, z, s * 1.4, s * 1.4, 1, c);
          break;
        case 'glow': {
          const tw = f.st.seasonId === 'thunder_peak' || look === LOOKS.embers
            ? 0.6 + 0.4 * Math.sin(f.t * 13 + i * 1.9)
            : 0.5 + 0.5 * Math.sin(f.t * (2 + h4 * 3) + i);
          c.copy(col).multiplyScalar(1.6 * tw * near);
          glows.add(x, y, z, s * 2, s * 2, 1, c);
        }
      }
    }
  }

  function godRays(world: World, f: RenderFrame3D) {
    const under = f.st.seasonId === 'ocean_palace' || f.st.seasonId === 'cavern' || f.st.seasonId === 'earth_core' || f.st.seasonId === 'blood_abyss';
    const col = cssColor(under ? f.cfg.accentColor : '#fff7d6');
    const halfH0 = (world.viewH * S) / 2;
    const cx = (world.camX + world.viewW / 2) * S;
    const cy = -(world.camY + world.viewH / 2) * S;
    for (let i = 0; i < RAYS; i++) {
      const z = -9 - hash01(i + 0.5) * 8;
      const k = (halfH0 / tanHalf - z) / (halfH0 / tanHalf);
      const span = (world.viewW * S) * k * 1.4;
      const x = cx + wrap(hash01(i * 7.7) * 40 - cx * 0.15 + Math.sin(f.t * 0.2 + i) * 0.4, span) - span / 2;
      const breathe = 0.6 + 0.4 * Math.sin(f.t * 0.6 + i * 1.3);
      c.copy(col).multiplyScalar((under ? 0.1 : 0.13) * breathe);
      const len = halfH0 * 2 * k * 1.6;
      rays.add(x, cy + halfH0 * k * 0.2, z, len, 0.8 + hash01(i * 3.3) * 1.6, 1, c, -Math.PI / 2 + 0.32);
    }
  }

  function liquid(world: World, f: RenderFrame3D) {
    const wl = f.cfg.waterLevelY;
    if (wl === null) return;
    const wy = f.st.seasonId === 'summer' ? wl + Math.sin(f.t * 1.35) * 38 : wl;
    if (wy < world.camY - 100 || wy > world.camY + world.viewH + 100) return;
    const magma = f.st.seasonId === 'blood_abyss';
    for (let i = 0; i < 40; i++) {
      const h1 = hash01(i * 4.1);
      const h2 = hash01(i * 6.7 + 1);
      const x = world.camX + wrap(h1 * 3000 - world.camX, world.viewW + 200) - 100;
      const z = 1 - h2 * 5;
      if (magma) {
        const life = (f.t * (0.5 + h2 * 0.6) + h1) % 1;
        c.copy(cssColor(h2 < 0.5 ? '#f97316' : '#fde047')).multiplyScalar(2.2 * (1 - life));
        glows.add(toX(x + Math.sin(f.t * 2 + i) * 10), toY(wy - life * 140), z, 0.09, 0.12, 1, c);
      } else {
        const tw = Math.max(0, Math.sin(f.t * (2 + h2 * 3) + i * 2.3));
        c.copy(cssColor('#e0f2fe')).multiplyScalar(1.3 * tw * tw * tw);
        glows.add(toX(x), toY(wy) + 0.02, z, 0.22, 0.06, 1, c);
      }
    }
  }

  function shrines(world: World, f: RenderFrame3D) {
    for (const cp of world.checkpoints) {
      if (cp.x < f.viewMinX - 200 || cp.x > f.viewMaxX + 200) continue;
      const z = -1.5;
      if (cp.activated) {
        const breathe = 0.75 + 0.25 * Math.sin(f.t * 3 + cp.id);
        c.copy(cssColor('#6ee7b7')).multiplyScalar(0.9 * breathe);
        beams.add(toX(cp.x), toY(cp.y - 300), z, 6, 0.9, 1, c, Math.PI / 2);
        c.copy(cssColor('#fef08a')).multiplyScalar(1.6 * breathe);
        glows.add(toX(cp.x), toY(cp.y - 62), z + 0.1, 0.9, 0.9, 1, c);
        for (let k = 0; k < 5; k++) {
          const life = (f.t * 0.6 + k / 5) % 1;
          c.copy(cssColor('#a7f3d0')).multiplyScalar(2 * (1 - life));
          glows.add(toX(cp.x + Math.sin(k * 2.4 + f.t) * 30), toY(cp.y - life * 220), z + 0.2, 0.08, 0.08, 1, c);
        }
      } else {
        const breathe = 0.5 + 0.5 * Math.sin(f.t * 2 + cp.id);
        c.copy(cssColor('#fda4af')).multiplyScalar(0.6 * breathe);
        glows.add(toX(cp.x), toY(cp.y - 62), z + 0.1, 0.6, 0.6, 1, c);
      }
    }
    // Locked seal gates: scanning shimmer bands over the barrier.
    const horizontal = f.cfg.scrollMode === 'horizontal';
    const { z } = laneSpan('both');
    for (const gate of world.sealGates) {
      if (gate.unlocked) continue;
      if (horizontal) {
        if (gate.coord < f.viewMinX - 200 || gate.coord > f.viewMaxX + 200) continue;
        const x = toX(gate.coord);
        c.copy(cssColor('#fb7185')).multiplyScalar(0.8 + 0.2 * Math.sin(f.t * 6));
        beams.add(x, toY(300), LANE_Z[0] + 0.4, 5.6, 0.55, 1, c, Math.PI / 2);
        for (let k = 0; k < 4; k++) {
          const u = (f.t * 0.5 + k / 4) % 1;
          c.copy(cssColor('#fef08a')).multiplyScalar(1.6 * Math.sin(u * Math.PI));
          beams.add(x, toY(560 - u * 520), LANE_Z[0] + 0.45, 0.7, 0.12, 1, c);
        }
      } else {
        if (gate.coord < world.camY - 200 || gate.coord > world.camY + world.viewH + 200) continue;
        c.copy(cssColor('#f43f5e')).multiplyScalar(0.8 + 0.2 * Math.sin(f.t * 6));
        beams.add(toX(570), toY(gate.coord), z + 1.9, 8, 0.4, 1, c);
        for (let k = 0; k < 4; k++) {
          const u = (f.t * 0.4 + k / 4) % 1;
          c.copy(cssColor('#fef08a')).multiplyScalar(1.6 * Math.sin(u * Math.PI));
          beams.add(toX(170 + u * 800), toY(gate.coord), z + 1.95, 0.12, 0.5, 1, c);
        }
      }
    }
  }

  const own = [petals, maples, softGlows, bubbles, rays];
  return {
    update(world: World, f: RenderFrame3D) {
      for (const b of own) b.begin();
      weather(world, f);
      godRays(world, f);
      liquid(world, f);
      shrines(world, f);
      for (const b of own) b.end();
    },
    dispose() {
      for (const b of own) b.dispose();
    },
  };
}
