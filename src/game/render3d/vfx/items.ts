import * as THREE from 'three';
import type { WorldItemPickup } from '../../engine/entities.ts';
import type { World } from '../../engine/world.ts';
import { LANE_Z, S, toX, toY } from '../coords.ts';
import { TextSprite } from '../label.ts';
import type { RenderFrame3D } from '../module.ts';
import { cssColor } from '../resources.ts';
import type { CombatFx } from './combat.ts';
import type { FxKit } from './shared.ts';

// World items and blood orbs (canvas: render/items.ts): small procedural props (scroll with rollers
// and ribbon, red chest with gold clasp, jade gourd, elemental crystal, pearl) floating over a
// glowing pedestal ring, with a pulsing halo and a name plate. Labels come from a small sprite pool
// handed to the nearest visible items.

function glowColor(kind: WorldItemPickup['kind']): string {
  switch (kind) {
    case 'scroll_kodachi':
      return '#fb7185';
    case 'scroll_kunai':
      return '#38bdf8';
    case 'scroll_mobility':
      return '#fbbf24';
    case 'scroll_deflect':
      return '#34d399';
    case 'scroll_guardian':
      return '#c084fc';
    case 'relic_chest':
      return '#f59e0b';
    case 'elemental_shrine':
      return '#22d3ee';
    case 'jade_elixir':
      return '#10b981';
    default:
      return '#a78bfa';
  }
}

const LABELS = 6;

export function createItemFx(kit: FxKit, combat: CombatFx) {
  const { track, root } = kit;
  const { glows, rings } = combat.shared;
  const box = track.geometry(new THREE.BoxGeometry(1, 1, 1));
  const cyl = track.geometry(new THREE.CylinderGeometry(1, 1, 1, 10));
  const ball = track.geometry(new THREE.SphereGeometry(1, 14, 10));
  const gem = track.geometry(new THREE.OctahedronGeometry(1, 0));
  const pedestal = track.geometry(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));

  const boxes = kit.batch(box, kit.litMat, 48, false, { castShadow: true });
  const cyls = kit.batch(cyl, kit.litMat, 32, false, { castShadow: true });
  const balls = kit.batch(ball, kit.litMat, 32, false, { castShadow: true });
  const gems = kit.batch(gem, kit.litMat, 8, false, { castShadow: true });
  const pads = kit.batch(pedestal, kit.ringMat, 16, false, { renderOrder: 2 });

  const labels: TextSprite[] = [];
  for (let i = 0; i < LABELS; i++) labels.push(new TextSprite(track, root));

  const c = new THREE.Color();
  const near: WorldItemPickup[] = [];

  function item(it: WorldItemPickup, f: RenderFrame3D) {
    const z = it.zLane === 'both' ? 0 : LANE_Z[it.zLane];
    const x = toX(it.x);
    const y = toY(it.y);
    const spin = f.t * 1.6 + it.id;
    const glow = cssColor(glowColor(it.kind));

    // Pedestal ring at the resting height + halo behind the prop.
    c.copy(glow).multiplyScalar(0.9);
    pads.add(x, toY(it.baseY + 20), z, 0.5, 1, 0.5, c);
    const pulse = 0.45 + Math.sin(f.t * 6 + it.id) * 0.15;
    c.copy(glow).multiplyScalar(pulse * 1.2);
    glows.add(x, y, z - 0.1, 0.75, 0.75, 1, c);

    if (it.kind.startsWith('scroll_')) {
      boxes.add(x, y, z, 0.3, 0.2, 0.05, cssColor('#fef3c7'), 0, Math.sin(spin) * 0.5);
      boxes.add(x, y, z + 0.005, 0.1, 0.205, 0.056, glow, 0, Math.sin(spin) * 0.5);
      for (const side of [-1, 1]) {
        const ox = side * 0.17 * Math.cos(Math.sin(spin) * 0.5);
        cyls.add(x + ox, y, z, 0.035, 0.27, 0.035, cssColor('#fde047'));
      }
    } else if (it.kind === 'relic_chest') {
      boxes.add(x, y - 0.03, z, 0.32, 0.18, 0.22, cssColor('#ef4444'), 0, Math.sin(spin) * 0.4);
      boxes.add(x, y + 0.09, z, 0.34, 0.08, 0.24, cssColor('#b91c1c'), 0, Math.sin(spin) * 0.4);
      boxes.add(x, y + 0.04, z + 0.11, 0.09, 0.09, 0.04, cssColor('#fde047'), 0, Math.sin(spin) * 0.4);
    } else if (it.kind === 'jade_elixir') {
      balls.add(x, y - 0.05, z, 0.105, 0.105, 0.105, glow);
      balls.add(x, y + 0.08, z, 0.07, 0.07, 0.07, glow);
      cyls.add(x, y + 0.17, z, 0.03, 0.05, 0.03, cssColor('#fde047'));
      cyls.add(x, y + 0.0, z, 0.1, 0.03, 0.1, cssColor('#f43f5e'));
    } else if (it.kind === 'elemental_shrine') {
      gems.add(x, y, z, 0.12, 0.17, 0.12, glow, 0, spin);
      c.copy(glow).multiplyScalar(1.3);
      glows.add(x, y, z + 0.15, 0.4, 0.4, 1, c);
    } else {
      balls.add(x, y, z, 0.115, 0.115, 0.115, glow);
      c.copy(glow).multiplyScalar(1.2);
      glows.add(x, y, z + 0.15, 0.35, 0.35, 1, c);
    }
  }

  return {
    update(world: World, f: RenderFrame3D) {
      for (const b of [boxes, cyls, balls, gems, pads]) b.begin();
      near.length = 0;
      for (const it of world.worldItems) {
        if (it.collected) continue;
        if (it.x < world.camX - 90 || it.x > world.camX + world.viewW + 90) continue;
        if (it.y < world.camY - 200 || it.y > world.camY + world.viewH + 200) continue;
        item(it, f);
        if (near.length < LABELS) near.push(it);
      }
      // Blood orbs: glossy red ball + soft red glow.
      for (const o of world.bloodOrbs) {
        if (!o.active) continue;
        const x = toX(o.x);
        const y = toY(o.y);
        balls.add(x, y, 0, 0.095, 0.095, 0.095, cssColor('#f43f5e'));
        c.copy(cssColor('#e11d48')).multiplyScalar(1.1 + Math.sin(f.t * 8) * 0.3);
        glows.add(x, y, 0.1, 0.45, 0.45, 1, c);
        c.copy(cssColor('#fb7185')).multiplyScalar(0.6);
        rings.add(x, y, 0.1, 0.3, 0.3, 1, c);
      }
      for (let i = 0; i < LABELS; i++) {
        const it = near[i];
        if (!it) {
          labels[i].hide();
          continue;
        }
        labels[i].set(it.label, '#f8fafc', 'rgba(9,13,22,0.88)');
        const z = it.zLane === 'both' ? 0 : LANE_Z[it.zLane];
        labels[i].place(toX(it.x), toY(it.y - 28), z + 0.3, 1);
        labels[i].sprite.scale.set(512 * S * 0.75, 24 * S * 0.75, 1);
      }
      for (const b of [boxes, cyls, balls, gems, pads]) b.end();
    },
    dispose() {
      for (const b of [boxes, cyls, balls, gems, pads]) b.dispose();
    },
  };
}
