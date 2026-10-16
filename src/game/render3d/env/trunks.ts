import * as THREE from 'three';
import type { SeasonId } from '../../rules/index.ts';
import type { World } from '../../engine/world.ts';
import type { ChibiStagePalette } from '../../render/map/stagePalette.ts';
import { S } from '../coords.ts';
import type { RenderFrame3D } from '../module.ts';
import { cssColor } from '../resources.ts';
import { Batch, type EnvGeometries, type EnvMaterials } from './kit.ts';
import { viewAtDepth, type DepthView } from './backdrop.ts';

// World trunks (render/map/trunks.ts + backdrop zDepth -1): giant sakura trunks with blossom puffs
// (spring), red mooring posts (summer), stone towers with iron bands (autumn), faceted glacier
// pillars (winter). zDepth 0 stands right behind lane 1, zDepth -1 further back in real depth.

/** zDepth 0 trunks: behind lane 1 (z = -3) so they never hide gameplay. */
export const TRUNK_Z = -4.8;
/** zDepth -1 trunks (canvas: parallax 0.52 background trees). */
const BACK_TRUNK_Z = -13;
const RING_STEP = 125;

export class Trunks {
  private cyl: Batch;
  private box: Batch;
  private hex: Batch;
  private canopy: Batch;
  private studs: Batch;
  private spires: Batch;
  private v: DepthView = { cx: 0, cy: 0, halfW: 1, halfH: 1 };

  constructor(parent: THREE.Object3D, g: EnvGeometries, m: EnvMaterials) {
    this.cyl = new Batch(parent, g.cyl, m.solid, 64, { receiveShadow: true });
    this.box = new Batch(parent, g.box, m.solid, 256, { receiveShadow: true });
    this.hex = new Batch(parent, g.hex, m.ice, 32, { renderOrder: 1 });
    this.canopy = new Batch(parent, g.puff, m.sway, 256);
    this.studs = new Batch(parent, g.sphere, m.solid, 128);
    this.spires = new Batch(parent, g.pyramid, m.ice, 32, { renderOrder: 1 });
  }

  update(world: World, f: RenderFrame3D, pal: ChibiStagePalette, camera: THREE.PerspectiveCamera, target: THREE.Vector3) {
    const all = [this.cyl, this.box, this.hex, this.canopy, this.studs, this.spires];
    for (const b of all) b.begin();
    const seasonId = f.st.seasonId;
    const top = world.camY - 320;
    const bottom = world.camY + world.viewH + 320;
    for (const tr of world.trunks) {
      if (tr.zDepth === 0) {
        if (tr.x + tr.w < f.viewMinX - 200 || tr.x - tr.w > f.viewMaxX + 200) continue;
        this.front(seasonId, tr.x, tr.w, top, bottom, pal);
      }
    }
    // Background trunks: fixed in x on their own plane, so they slide at the perspective parallax.
    const v = viewAtDepth(camera, target, BACK_TRUNK_Z, this.v);
    for (const tr of world.trunks) {
      if (tr.zDepth !== -1) continue;
      const x = tr.x * S;
      if (x < v.cx - v.halfW - 3 || x > v.cx + v.halfW + 3) continue;
      this.back(seasonId, x, tr.w * S, v, pal);
    }
    for (const b of all) b.end();
  }

  private front(seasonId: SeasonId, x: number, w: number, top: number, bottom: number, pal: ChibiStagePalette) {
    const z = TRUNK_Z;
    const h = bottom - top;
    const cy = top + h / 2;
    if (seasonId === 'summer') {
      // Short red-lacquered mooring post with a gold cap (canvas: y 250 → 630).
      this.cyl.at(x, 250 + 190, z, 44, 380, 0.44, cssColor('#be123c'));
      this.cyl.at(x, 250 - 1, z, 56, 18, 0.56, cssColor('#fde047'));
      this.box.at(x, 330, z, 50, 8, 0.5, cssColor('#a16207'));
      return;
    }
    if (seasonId === 'winter') {
      // Faceted translucent glacier pillar + bright inner core.
      this.hex.at(x, cy, z, w - 16, h, (w - 16) * S, cssColor('#38bdf8'));
      this.box.at(x - w * 0.2, cy, z + 0.12, 10, h, 0.08, cssColor('#e0f2fe'));
      return;
    }
    const first = Math.floor(top / RING_STEP) * RING_STEP;
    if (seasonId === 'autumn' || seasonId === 'thunder_peak' || seasonId === 'blood_abyss') {
      // Stone wall tower with iron bands and studs.
      this.box.at(x, cy, z, w, h, w * S, cssColor(pal.trunkFill));
      this.box.at(x - w * 0.36, cy, z + (w * S) / 2, Math.max(6, w * 0.16), h, 0.02, cssColor(pal.trunkHighlight));
      for (let ry = first; ry < bottom; ry += RING_STEP) {
        this.box.at(x, ry, z, w + 10, 16, w * S + 0.1, cssColor('#1f2937'));
        for (const o of [-0.28, 0, 0.28]) {
          this.studs.at(x + o * w, ry, z + (w * S) / 2 + 0.05, 9, 9, 0.09, cssColor(pal.canopySecondary));
        }
      }
      return;
    }
    // Giant tree trunk (spring sakura; generic for stages 5–11 until T06).
    this.cyl.at(x, cy, z, w, h, w * S, cssColor(pal.trunkFill));
    const spring = seasonId === 'spring';
    const prim = cssColor(pal.canopyPrimary);
    const sec = cssColor(pal.canopySecondary);
    for (let ry = first; ry < bottom; ry += RING_STEP) {
      this.cyl.at(x, ry, z, w + 8, 10, (w + 8) * S, cssColor(pal.trunkHighlight));
      if (!spring) continue;
      const side = Math.abs(Math.round(ry / RING_STEP)) % 2 === 0 ? 1 : -1;
      const sx = x + side * w * 0.62;
      // Branch stub + blossom cluster (canvas drawCleanChibiPuff), swaying in the wind shader.
      this.box.at(x + side * w * 0.38, ry - 8, z, w * 0.5, 9, 0.12, cssColor(pal.trunkFill), side * 0.5);
      this.canopy.at(sx, ry - 20, z + 0.15, 46, 38, 0.4, prim);
      this.canopy.at(sx + side * 22, ry - 12, z + 0.05, 34, 30, 0.34, sec);
      this.canopy.at(sx - side * 18, ry - 30, z + 0.25, 30, 26, 0.3, sec);
    }
  }

  private back(seasonId: SeasonId, x: number, w: number, v: DepthView, pal: ChibiStagePalette) {
    const z = BACK_TRUNK_Z;
    const bottom = v.cy - v.halfH - 1;
    const top = v.cy + v.halfH * 0.62;
    if (seasonId === 'winter') {
      tmpC.copy(cssColor('#7dd3fc'));
      this.spires.add(x, (top + bottom) / 2, z, w * 1.1, top - bottom, w * 0.8, tmpC, 0, Math.PI / 4);
      return;
    }
    if (seasonId === 'spring') {
      const bw = w * 0.68;
      this.cyl.add(x, (top + bottom) / 2, z, bw, top - bottom, bw, cssColor(pal.nearHillFill));
      const s = w * 1.3;
      this.canopy.add(x, top + s * 0.2, z + 0.2, s * 1.4, s, s * 0.8, cssColor('#fb7185'));
      this.canopy.add(x - s * 0.55, top - s * 0.05, z + 0.4, s * 0.9, s * 0.7, s * 0.6, cssColor('#fda4af'));
      this.canopy.add(x + s * 0.55, top, z + 0.4, s * 0.9, s * 0.7, s * 0.6, cssColor('#fda4af'));
      return;
    }
    // Generic dark pillar (other stages).
    this.box.add(x, (top + bottom) / 2, z, w, top - bottom, w, cssColor(pal.trunkShade));
  }

  dispose() {
    for (const b of [this.cyl, this.box, this.hex, this.canopy, this.studs, this.spires]) b.dispose();
  }
}

const tmpC = new THREE.Color();
