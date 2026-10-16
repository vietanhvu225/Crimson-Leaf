import * as THREE from 'three';
import type { ProjectileActor, WorldItemPickup } from '../../engine/entities.ts';
import { LANE_Z, S, laneSpan, toX, toY } from '../coords.ts';
import { InstancedBatch } from '../instanced.ts';
import { TextSprite } from '../label.ts';
import type { RenderModule, RenderModuleContext, RenderModuleDef } from '../module.ts';
import { cssColor } from '../resources.ts';

// T02 placeholder effects: projectiles / particles / orbs / items = small instanced meshes from
// fixed-size pools, lightning = line segments, banners = text sprites, plus aim reticle and grapple
// rope. T05 replaces this slot (`vfx`).

const ITEM_COLOR: Record<WorldItemPickup['kind'], string> = {
  scroll_kodachi: '#f43f5e',
  scroll_kunai: '#38bdf8',
  scroll_mobility: '#4ade80',
  scroll_deflect: '#fde047',
  scroll_guardian: '#c084fc',
  relic_chest: '#f59e0b',
  elemental_shrine: '#22d3ee',
  jade_elixir: '#10b981',
  chakra_pearl: '#a5f3fc',
  blood_orb: '#e11d48',
};

function projectileColor(p: ProjectileActor): string {
  if (p.customColor) return p.customColor;
  if (p.parried) return '#fde047';
  if (p.isSwordBeam) return '#f8fafc';
  if (p.isFireball || p.elementalStyle === 'fire_burst') return '#f97316';
  if (p.elementalStyle === 'lightning_bolt') return '#facc15';
  if (p.elementalStyle === 'ice_shard') return '#7dd3fc';
  return p.fromPlayer ? '#38bdf8' : '#f43f5e';
}

const LIGHTNING_STEPS = 6;

function create(ctx: RenderModuleContext): RenderModule {
  const { scene, track } = ctx;
  const root = new THREE.Group();
  root.name = 'vfx-placeholder';
  scene.add(root);

  const sphere = track.geometry(new THREE.IcosahedronGeometry(1, 1));
  const octa = track.geometry(new THREE.OctahedronGeometry(1, 0));
  const box = track.geometry(new THREE.BoxGeometry(1, 1, 1));
  const bright = track.material(new THREE.MeshBasicMaterial({ toneMapped: false }));
  const lit = track.material(new THREE.MeshStandardMaterial({ roughness: 0.5 }));

  const projectiles = new InstancedBatch(root, sphere, bright, 80, { renderOrder: 6 });
  const trails = new InstancedBatch(root, box, bright, 80, { renderOrder: 6 });
  const particles = new InstancedBatch(root, octa, bright, 200, { renderOrder: 7 });
  const orbs = new InstancedBatch(root, sphere, bright, 8);
  const items = new InstancedBatch(root, box, lit, 32, { castShadow: true });

  // Lightning: fixed buffer of 16 bolts × 6 segments.
  const maxBolts = 16;
  const boltPos = new Float32Array(maxBolts * LIGHTNING_STEPS * 2 * 3);
  const boltCol = new Float32Array(maxBolts * LIGHTNING_STEPS * 2 * 3);
  const boltGeom = track.geometry(new THREE.BufferGeometry());
  boltGeom.setAttribute('position', new THREE.BufferAttribute(boltPos, 3).setUsage(THREE.DynamicDrawUsage));
  boltGeom.setAttribute('color', new THREE.BufferAttribute(boltCol, 3).setUsage(THREE.DynamicDrawUsage));
  const bolts = new THREE.LineSegments(
    boltGeom,
    track.material(new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false }))
  );
  bolts.frustumCulled = false;
  const writeVertex = (i: number, x: number, y: number, c: THREE.Color) => {
    boltPos[i * 3] = toX(x);
    boltPos[i * 3 + 1] = toY(y);
    boltPos[i * 3 + 2] = 0.2;
    boltCol[i * 3] = c.r;
    boltCol[i * 3 + 1] = c.g;
    boltCol[i * 3 + 2] = c.b;
  };
  bolts.renderOrder = 8;
  root.add(bolts);

  // Grapple rope + aim reticle.
  const ropePos = new Float32Array(6);
  const ropeGeom = track.geometry(new THREE.BufferGeometry());
  ropeGeom.setAttribute('position', new THREE.BufferAttribute(ropePos, 3).setUsage(THREE.DynamicDrawUsage));
  const ropeMat = track.material(new THREE.LineBasicMaterial({ color: '#fbbf24' }));
  const rope = new THREE.Line(ropeGeom, ropeMat);
  rope.frustumCulled = false;
  root.add(rope);
  const reticleMat = track.material(
    new THREE.MeshBasicMaterial({ color: '#38bdf8', depthTest: false, transparent: true, toneMapped: false })
  );
  const reticle = new THREE.Mesh(track.geometry(new THREE.RingGeometry(0.075, 0.1, 24)), reticleMat);
  reticle.renderOrder = 99;
  root.add(reticle);

  const banners: TextSprite[] = [];
  const tmp = new THREE.Color();

  return {
    update(world, f) {
      projectiles.begin();
      trails.begin();
      for (const p of world.projectiles) {
        if (!p.active) continue;
        const c = cssColor(projectileColor(p));
        const z = p.crossZ ? laneSpan('both').z : LANE_Z[p.zLane];
        const r = p.isFireball || p.explosive ? 0.11 : p.isSwordBeam ? 0.09 : 0.06;
        const x = toX(p.x);
        const y = toY(p.y);
        projectiles.add(x, y, z, r, r, r, c);
        // Short streak behind it, along the velocity.
        const speed = Math.hypot(p.vx, p.vy);
        if (speed > 60) {
          const len = Math.min(0.5, speed * 0.0006);
          const ang = Math.atan2(-p.vy, p.vx);
          trails.add(x - Math.cos(ang) * len * 0.5, y - Math.sin(ang) * len * 0.5, z, len, r * 0.7, r * 0.7, c, ang);
        }
      }
      projectiles.end();
      trails.end();

      particles.begin();
      for (const p of world.particles) {
        if (!p.active) continue;
        const s = (p.size + 1) * S * Math.max(0.2, p.alpha);
        particles.add(toX(p.x), toY(p.y), 0.3, s, s, s, cssColor(p.color), f.t * 3 + p.x);
      }
      particles.end();

      orbs.begin();
      for (const o of world.bloodOrbs) {
        if (!o.active) continue;
        orbs.add(toX(o.x), toY(o.y), 0, 0.08, 0.08, 0.08, cssColor('#e11d48'));
      }
      orbs.end();

      items.begin();
      for (const it of world.worldItems) {
        if (it.collected || it.x < f.viewMinX || it.x > f.viewMaxX) continue;
        const z = it.zLane === 'both' ? 0 : LANE_Z[it.zLane];
        tmp.copy(cssColor(ITEM_COLOR[it.kind] ?? '#fde047'));
        items.add(toX(it.x), toY(it.y - 14), z, 0.22, 0.22, 0.22, tmp, 0.4, f.t * 2 + it.id);
      }
      items.end();

      // Lightning arcs: zig-zag polyline, colour faded by remaining life.
      let v = 0;
      for (let i = 0; i < world.lightningBolts.length && i < maxBolts; i++) {
        const lb = world.lightningBolts[i];
        if (!lb.active) continue;
        const dx = lb.x2 - lb.x1;
        const dy = lb.y2 - lb.y1;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        const k = Math.min(1, (lb.life / lb.maxLife) * 1.3);
        tmp.copy(cssColor(lb.color)).multiplyScalar(k);
        let px = lb.x1;
        let py = lb.y1;
        for (let s = 1; s <= LIGHTNING_STEPS; s++) {
          const t = s / LIGHTNING_STEPS;
          const off =
            s === LIGHTNING_STEPS ? 0 : (s % 2 === 0 ? 1 : -1) * (10 + Math.sin(f.t * 60 + s * 2.1 + i) * 6);
          const qx = lb.x1 + dx * t + nx * off;
          const qy = lb.y1 + dy * t + ny * off;
          writeVertex(v++, px, py, tmp);
          writeVertex(v++, qx, qy, tmp);
          px = qx;
          py = qy;
        }
      }
      boltGeom.setDrawRange(0, v);
      if (v > 0) {
        boltGeom.attributes.position.needsUpdate = true;
        boltGeom.attributes.color.needsUpdate = true;
      }
      bolts.visible = v > 0;

      const gt = world.player.grappleTarget;
      rope.visible = !!gt;
      if (gt) {
        const z = LANE_Z[world.combat.zLane];
        ropePos[0] = toX(world.player.x);
        ropePos[1] = toY(world.player.y - 24);
        ropePos[2] = z;
        ropePos[3] = toX(gt.x);
        ropePos[4] = toY(gt.y);
        ropePos[5] = 0;
        ropeGeom.attributes.position.needsUpdate = true;
        ropeMat.color.copy(cssColor(f.st.seasonId === 'ocean_palace' ? '#22d3ee' : f.cfg.accentColor));
      }

      reticle.visible = f.st.gameState === 'playing';
      reticle.position.set(toX(world.mouseWorldX), toY(world.mouseWorldY), 0);
      reticleMat.color.copy(cssColor(world.combat.awakenedTimer > 0 ? '#f43f5e' : '#38bdf8'));

      for (let i = 0; i < world.banners.length; i++) {
        const b = world.banners[i];
        if (i >= banners.length) banners.push(new TextSprite(track, root));
        const label = banners[i];
        if (!b.active) {
          label.hide();
          continue;
        }
        label.set(b.text, b.color);
        label.place(toX(b.x), toY(b.y), 0.5, Math.min(1, b.life * 1.5));
      }
    },
    dispose() {
      projectiles.dispose();
      trails.dispose();
      particles.dispose();
      orbs.dispose();
      items.dispose();
      scene.remove(root);
    },
  };
}

export const placeholderVfx: RenderModuleDef = { slot: 'vfx', name: 'vfx-placeholder', create };
