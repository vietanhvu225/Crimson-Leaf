import * as THREE from 'three';
import { computeSubterraneanSlopeY, type SeasonId } from '../../rules/index.ts';
import { S } from '../coords.ts';
import { cssColor } from '../resources.ts';
import type { Backdrop } from './backdrop.ts';
import { tiles, viewAtDepth, type DepthView } from './backdrop.ts';
import { Batch, hash01, type EnvGeometries, type EnvMaterials } from './kit.ts';

// T06 backdrops for stages 5–11 (render/map/sky/<stage>.ts), same rules as backdrop.ts: layers sit
// at real depth, tiles are world-fixed (hash per index, no RNG), sky objects ride the camera.
//   cavern          stalactite ceiling + crystal tips, giant glowing mushrooms, amethyst geodes
//   thunder_peak    rotating ring of 8 thunder drums, chained floating rock islands, far lightning
//   blood_abyss     hanging demon furnaces pouring lava falls, chains, ember glow
//   celestial_altar black-gold eclipse inside a rotating bagua ring, starfield, jade palaces on clouds
//   ocean_palace    god rays, seabed ridges with dragon-palace bubble domes + coral, jellyfish, bubbles
//   earth_core      tilted rock strata with gold veins, glowing core, mine-timber arches on the slope
//   sky_sanctuary   sun halo, wind ribbons, flying cranes, winged temples, cloud sea at many depths

const c1 = new THREE.Color();

export class DeepBackdrop {
  private b: Backdrop;
  private v: DepthView = { cx: 0, cy: 0, halfW: 1, halfH: 1 };
  private v2: DepthView = { cx: 0, cy: 0, halfW: 1, halfH: 1 };
  /** Lit pieces. */
  private cyl: Batch;
  private dome: Batch;
  private cone: Batch;
  /** Unlit glowing pieces (with fog). */
  private glowBox: Batch;
  private glowBall: Batch;
  private glowOcta: Batch;
  /** Sky pieces (no fog). */
  private skyRing: Batch;
  private skyDisc: Batch;
  private skyBox: Batch;
  /** Additive halos that live in the scene (with depth test, unlike skyHalo). */
  private halo: Batch;
  private rays: Batch;
  private glass: Batch;
  private clouds: Batch;
  private all: Batch[];

  constructor(b: Backdrop, parent: THREE.Object3D, g: EnvGeometries, m: EnvMaterials) {
    this.b = b;
    this.cyl = new Batch(parent, g.cyl, m.solid, 96);
    this.dome = new Batch(parent, g.dome, m.solid, 32);
    this.cone = new Batch(parent, g.cone, m.solid, 64);
    this.glowBox = new Batch(parent, g.box, m.glow, 96);
    this.glowBall = new Batch(parent, g.sphere, m.glow, 96);
    this.glowOcta = new Batch(parent, g.octa, m.glow, 64);
    this.skyRing = new Batch(parent, g.ring, m.skyGlow, 8, { renderOrder: -48 });
    this.skyDisc = new Batch(parent, g.disc, m.skyGlow, 24, { renderOrder: -47 });
    this.skyBox = new Batch(parent, g.box, m.skyGlow, 32, { renderOrder: -47 });
    // Fog-free: an additive card far away would otherwise add the fog colour over its whole quad.
    this.halo = new Batch(parent, g.quad, m.skyHalo, 96, { renderOrder: 5 });
    this.rays = new Batch(parent, g.quad, m.ray, 16, { renderOrder: 4 });
    this.glass = new Batch(parent, g.sphere, m.glass, 48, { renderOrder: 3 });
    this.clouds = new Batch(parent, g.sphere, m.cloud, 160, { renderOrder: 2 });
    this.all = [
      this.cyl, this.dome, this.cone, this.glowBox, this.glowBall, this.glowOcta,
      this.skyRing, this.skyDisc, this.skyBox, this.halo, this.rays, this.glass, this.clouds,
    ];
  }

  begin() {
    for (const x of this.all) x.begin();
  }

  end() {
    for (const x of this.all) x.end();
  }

  dispose() {
    for (const x of this.all) x.dispose();
  }

  /** Draws the stage's backdrop; false = not a T06 stage. */
  update(seasonId: SeasonId, isLoop2: boolean, camera: THREE.PerspectiveCamera, target: THREE.Vector3, t: number) {
    switch (seasonId) {
      case 'cavern':
        this.cavern(camera, target, t, isLoop2);
        return true;
      case 'thunder_peak':
        this.thunder(camera, target, t);
        return true;
      case 'blood_abyss':
        this.bloodAbyss(camera, target, t);
        return true;
      case 'celestial_altar':
        this.celestialAltar(camera, target, t);
        return true;
      case 'ocean_palace':
        this.ocean(camera, target, t);
        return true;
      case 'earth_core':
        this.earthCore(camera, target, t);
        return true;
      case 'sky_sanctuary':
        this.skySanctuary(camera, target, t, isLoop2);
        return true;
      default:
        return false;
    }
  }

  // ---------- 5. cavern ----------

  private cavern(camera: THREE.PerspectiveCamera, target: THREE.Vector3, t: number, isLoop2: boolean) {
    const b = this.b;
    const pal = b.pal;
    // Far cave wall with amethyst geodes glowing in it (z = -70).
    b.hillRow(camera, target, -72, 10, 0.4, 0.75, pal.farHillFill, 61);
    const gv = viewAtDepth(camera, target, -66, this.v);
    const geode = cssColor(isLoop2 ? '#fb7185' : '#e879f9');
    tiles(gv, 13, 13, (i, x) => {
      const y = gv.cy - gv.halfH * (0.1 + hash01(i, 62) * 0.5);
      const pulse = 0.75 + 0.25 * Math.sin(t * 1.7 + i);
      this.halo.add(x, y, -65.5, 9 * pulse, 9 * pulse, 1, geode);
      for (let k = 0; k < 3; k++) {
        this.glowOcta.add(x + (k - 1) * 0.9, y + (k === 1 ? 0.6 : 0), -66, 1, k === 1 ? 2.8 : 1.9, 1, geode, (k - 1) * 0.35);
      }
    });

    // Stalactite ceiling (two depths), hanging from the top of the view like the canvas sky.
    for (const [z, spacing, salt] of [[-40, 4.4, 63], [-22, 3.2, 64]] as const) {
      const v = viewAtDepth(camera, target, z, this.v);
      const top = v.cy + v.halfH + 0.6;
      const rock = cssColor(z < -30 ? '#1b073b' : '#2e1065');
      b.decor.add(v.cx, top + 0.8, z, v.halfW * 2.6, 2.4, 3, rock);
      tiles(v, spacing, spacing, (i, x) => {
        const len = v.halfH * (0.22 + hash01(i, salt) * 0.4);
        const crystal = Math.abs(i) % 3 === 0;
        c1.copy(cssColor(crystal ? '#c084fc' : '#2e1065'));
        if (isLoop2 && crystal) c1.copy(cssColor('#f43f5e'));
        b.facet.add(x, top - len / 2, z, spacing * 1.15, len, spacing * 0.7, c1, Math.PI, Math.PI / 4);
        if (crystal) {
          this.glowBall.add(x, top - len * 0.82, z + 0.4, 0.35, 0.35, 0.35, cssColor('#f5d0fe'));
          this.halo.add(x, top - len * 0.82, z + 0.6, 2.6, 2.6, 1, cssColor('#c084fc'));
        }
      });
    }

    // Giant bioluminescent mushrooms on the cave floor (z = -28).
    const mz = -28;
    const mv = viewAtDepth(camera, target, mz, this.v);
    const floor = mv.cy - mv.halfH;
    b.hillRow(camera, target, mz - 3, 6, 0.4, 0.55, pal.nearHillFill, 65);
    tiles(mv, 8.5, 8.5, (i, x) => {
      const s = 1.4 + hash01(i, 66) * 0.8;
      const stemH = 2.6 * s;
      // Raised above the crystal water sheet so they are not hidden behind it.
      const base = mv.cy - mv.halfH * 0.15;
      this.cyl.add(x, base + stemH / 2, mz, 0.85 * s, stemH, 0.85 * s, cssColor('#e9d5ff'));
      const cap = cssColor(Math.abs(i) % 2 === 0 ? '#a855f7' : '#ec4899');
      this.dome.add(x, base + stemH - 0.15, mz, 3.2 * s, 2.2 * s, 3.2 * s, cap);
      const glow = 0.8 + 0.2 * Math.sin(t * 2 + i * 1.3);
      for (const sx of [-0.85, 0, 0.8]) {
        this.glowBall.add(x + sx * s, base + stemH + 0.55 * s, mz + 1.15 * s, 0.32 * s, 0.32 * s, 0.1, cssColor('#fef08a'));
      }
      this.halo.add(x, base + stemH + 0.3 * s, mz + 1.8, 6 * s * glow, 4 * s * glow, 1, cap);
    });
  }

  // ---------- 6. thunder peak ----------

  private thunder(camera: THREE.PerspectiveCamera, target: THREE.Vector3, t: number) {
    const b = this.b;
    // Rotating ring of 8 Raijin thunder drums in the sky (fixed to the view like the canvas).
    const sv = viewAtDepth(camera, target, -92, this.v);
    const cx = sv.cx;
    const cy = sv.cy + sv.halfH * 0.42;
    const R = sv.halfH * 0.42;
    c1.copy(cssColor('#facc15')).multiplyScalar(0.55);
    this.skyRing.add(cx, cy, -93, R * 2, R * 2, R * 2, c1);
    b.skyHalo.add(cx, cy, -94, R * 3.4, R * 3.4, 1, cssColor('#4338ca'));
    const a0 = t * 0.45;
    for (let d = 0; d < 8; d++) {
      const a = a0 + (d * Math.PI) / 4;
      const x = cx + Math.cos(a) * R;
      const y = cy + Math.sin(a) * R;
      this.skyDisc.add(x, y, -92.5, R * 0.34, R * 0.34, 0.2, cssColor('#fef08a'));
      this.skyDisc.add(x, y, -92.2, R * 0.14, R * 0.14, 0.2, cssColor('#dc2626'));
    }
    // Far storm spires (z = -64) and dark storm clouds.
    const fv = viewAtDepth(camera, target, -64, this.v);
    tiles(fv, 9, 9, (i, x) => {
      const h = fv.halfH * (0.9 + hash01(i, 71) * 0.9);
      b.facet.add(x, fv.cy - fv.halfH + h / 2 - 2, -64, 6, h, 4, cssColor(b.pal.farHillFill), 0, Math.PI / 4 + hash01(i, 72));
    });
    // Dark storm cloud banks at the top of the sky.
    const cv = viewAtDepth(camera, target, -84, this.v2);
    tiles(cv, cv.halfW * 0.5, cv.halfW * 0.5, (i, x) => {
      const y = cv.cy + cv.halfH * (0.82 - hash01(i, 78) * 0.15);
      const s = cv.halfH * 0.16;
      b.skyGlow.add(x, y, -84, s * 3, s * 1.2, s, cssColor('#1e1b4b'));
      b.skyGlow.add(x + s, y + s * 0.3, -83.5, s * 2, s * 1.2, s, cssColor('#312e81'));
    });
    // Far lightning: one bolt flashes every ~2.3 s at a hashed spot, lights the clouds around it.
    const cycle = Math.floor(t / 2.3);
    const phase = t - cycle * 2.3;
    if (phase < 0.22) {
      const lv = viewAtDepth(camera, target, -80, this.v2);
      const bx = lv.cx + (hash01(cycle, 73) - 0.5) * lv.halfW * 1.6;
      let y = lv.cy + lv.halfH * 0.85;
      let x = bx;
      const bolt = cssColor('#fef9c3');
      for (let k = 0; k < 6; k++) {
        const nx = x + (hash01(cycle * 7 + k, 74) - 0.5) * 3;
        const ny = y - lv.halfH * 0.22;
        const len = Math.hypot(nx - x, ny - y);
        this.skyBox.add((x + nx) / 2, (y + ny) / 2, -80, 0.35, len, 0.35, bolt, Math.atan2(ny - y, nx - x) - Math.PI / 2);
        x = nx;
        y = ny;
      }
      b.skyHalo.add(bx, lv.cy + lv.halfH * 0.3, -81, lv.halfW * 0.9, lv.halfH * 1.6, 1, cssColor('#a5b4fc'));
    }
    // Chained floating rock islands, world-fixed in y (vertical parallax while climbing), z = -30.
    const z = -30;
    const v = viewAtDepth(camera, target, z, this.v);
    const r0 = Math.floor((v.cy - v.halfH - 4) / 6.5);
    const r1 = Math.ceil((v.cy + v.halfH + 4) / 6.5);
    const rock = cssColor('#312e81');
    const gold = cssColor('#facc15');
    const chain = cssColor('#94a3b8');
    for (let row = r0; row <= r1; row++) {
      for (let col = -2; col <= 2; col++) {
        if (hash01(row * 5 + col, 75) < 0.45) continue;
        const x = v.cx + col * v.halfW * 0.48 + (hash01(row, 76) - 0.5) * 3;
        const y = row * 6.5 + Math.sin(t * 2 + row + col) * 0.15;
        const w = 2.6 + hash01(row * 5 + col, 77) * 1.6;
        b.facet.add(x, y - w * 0.42, z, w, w * 0.85, w * 0.7, rock, Math.PI, Math.PI / 4);
        b.decor.add(x, y + 0.05, z, w * 0.86, 0.2, w * 0.55, gold);
        for (let k = 0; k < 4; k++) b.decor.add(x, y + 0.5 + k * 0.6, z, 0.12, 0.38, 0.12, chain);
      }
    }
  }

  // ---------- 7. blood abyss ----------

  private bloodAbyss(camera: THREE.PerspectiveCamera, target: THREE.Vector3, t: number) {
    const b = this.b;
    b.hillRow(camera, target, -74, 11, 0.3, 0.55, b.pal.farHillFill, 81);
    // Ember glow along the far lava sea.
    const ev = viewAtDepth(camera, target, -60, this.v);
    tiles(ev, 10, 10, (i, x) => {
      const p = 0.8 + 0.2 * Math.sin(t * 1.5 + i);
      b.skyHalo.add(x, ev.cy - ev.halfH * 0.8, -60, 18 * p, 7 * p, 1, cssColor('#7f1d1d'));
    });
    // Demon smelting furnaces hanging on chains, pouring lava falls (z = -30).
    const z = -30;
    const v = viewAtDepth(camera, target, z, this.v);
    const top = v.cy + v.halfH + 1;
    const fy = v.cy + v.halfH * 0.28;
    const bottom = v.cy - v.halfH - 1;
    const chain = cssColor('#52525b');
    const iron = cssColor('#27272a');
    tiles(v, 13, 13, (i, x) => {
      const sway = Math.sin(t * 0.8 + i) * 0.08;
      // Chains (tilted, inward toward the furnace).
      for (const side of [-1, 1]) {
        const x0 = x + side * 2.2;
        const x1 = x + side * 1.4;
        const len = Math.hypot(x1 - x0, top - fy);
        b.decor.add((x0 + x1) / 2, (top + fy) / 2, z, 0.16, len, 0.16, chain, Math.atan2(x1 - x0, top - fy) + sway);
      }
      // Furnace head with horns and burning eyes.
      b.decor.add(x, fy, z, 3.4, 2.4, 2, iron);
      b.decor.add(x, fy - 1.25, z, 3.8, 0.35, 2.2, cssColor('#3f3f46'));
      for (const side of [-1, 1]) {
        this.cone.add(x + side * 1.3, fy + 1.5, z, 0.6, 1.2, 0.6, iron, -side * 0.4);
        this.glowBall.add(x + side * 0.7, fy + 0.3, z + 1.02, 0.6, 0.6, 0.1, cssColor('#fb923c'));
      }
      this.halo.add(x, fy + 0.3, z + 1.3, 4.2, 2.4, 1, cssColor('#f97316'));
      // Lava fall from the furnace mouth to the bottom of the view: gold → orange → red.
      const mouth = fy - 1.4;
      const span = mouth - bottom;
      const cols = ['#fef08a', '#f97316', '#dc2626'];
      for (let k = 0; k < 3; k++) {
        const y0 = mouth - (span * k) / 3;
        const ripple = Math.sin(t * 6 + i + k) * 0.05;
        this.glowBox.add(x, y0 - span / 6, z + 0.2, 1.3 + ripple + k * 0.12, span / 3 + 0.02, 0.6, cssColor(cols[k]));
      }
      this.halo.add(x, bottom + 1.2, z + 0.8, 7, 3, 1, cssColor('#f97316'));
    });
  }

  // ---------- 8. celestial altar ----------

  private celestialAltar(camera: THREE.PerspectiveCamera, target: THREE.Vector3, t: number) {
    const b = this.b;
    // Starfield (fixed grid cells, hashed positions, twinkle).
    const sv = viewAtDepth(camera, target, -96, this.v);
    const cell = sv.halfH * 0.22;
    const gx0 = Math.floor((sv.cx - sv.halfW) / cell);
    const gx1 = Math.ceil((sv.cx + sv.halfW) / cell);
    const gy0 = Math.floor((sv.cy - sv.halfH * 0.2) / cell);
    const gy1 = Math.ceil((sv.cy + sv.halfH) / cell);
    const star = cssColor('#fef3c7');
    for (let gx = gx0; gx <= gx1; gx++) {
      for (let gy = gy0; gy <= gy1; gy++) {
        const h = hash01(gx * 131 + gy, 91);
        if (h < 0.55) continue;
        const sx = (gx + hash01(gx * 17 + gy, 92)) * cell;
        const sy = (gy + hash01(gx * 23 + gy, 93)) * cell;
        const tw = 0.6 + 0.4 * Math.sin(t * 3 + h * 40);
        const r = cell * 0.05 * tw * (h > 0.9 ? 1.8 : 1);
        b.skyGlow.add(sx, sy, -96, r, r, r, star);
      }
    }
    // Black-crimson eclipse inside a rotating golden bagua ring.
    const ev = viewAtDepth(camera, target, -92, this.v);
    const ex = ev.cx + ev.halfW * 0.04;
    const ey = ev.cy + ev.halfH * 0.44;
    const R = ev.halfH * 0.2;
    b.skyHalo.add(ex, ey, -94, R * 6, R * 6, 1, cssColor('#f43f5e'));
    b.skyGlow.add(ex, ey, -93.5, R * 2, R * 2, 0.1, cssColor('#f43f5e'));
    this.skyDisc.add(ex, ey, -92.5, R * 1.68, R * 1.68, 0.1, cssColor('#1a0f0a'));
    this.skyRing.add(ex, ey, -92.4, R * 1.7, R * 1.7, R, cssColor('#fde047'));
    const a0 = t * 0.32;
    this.skyRing.add(ex, ey, -92.6, R * 3.3, R * 3.3, R, cssColor('#fde047'));
    this.skyRing.add(ex, ey, -92.6, R * 2.7, R * 2.7, R, cssColor('#fde047'));
    for (let k = 0; k < 8; k++) {
      const a = a0 + (k * Math.PI) / 4;
      this.skyBox.add(ex + Math.cos(a) * R * 1.55, ey + Math.sin(a) * R * 1.55, -92.5, R * 0.42, R * 0.15, 0.1, cssColor('#f43f5e'), a + Math.PI / 2);
    }
    // Low violet nebula hills.
    b.hillRow(camera, target, -70, 12, 0.15, 0.3, b.pal.farHillFill, 94);
    // Floating jade palaces on golden clouds (z = -40), bobbing.
    const z = -40;
    const v = viewAtDepth(camera, target, z, this.v);
    tiles(v, 15, 15, (i, x) => {
      const y = v.cy - v.halfH * 0.25 + Math.sin(t * 2 + i) * 0.25 + (hash01(i, 95) - 0.5) * 3;
      for (const [dx, s, col] of [[-1.3, 1.6, '#fde047'], [1.3, 1.6, '#fde047'], [0, 2.2, '#fef3c7']] as const) {
        b.round.add(x + dx, y - 0.4, z, s * 1.4, s * 0.8, s, cssColor(col));
      }
      b.pagoda(x, y, z + 0.3, 1.6, '#f43f5e');
      this.halo.add(x, y + 1, z + 1.5, 7, 6, 1, cssColor('#fde68a'));
    });
  }

  // ---------- 9. ocean palace ----------

  private ocean(camera: THREE.PerspectiveCamera, target: THREE.Vector3, t: number) {
    const b = this.b;
    const pal = b.pal;
    // God rays piercing from the surface (z = -24 … -40), drifting.
    for (let r = 0; r < 6; r++) {
      const z = -24 - (r % 3) * 7;
      const v = viewAtDepth(camera, target, z, this.v);
      const span = v.halfW * 2.4;
      const x = v.cx - v.halfW * 1.2 + ((((r * span) / 6 + Math.sin(t * 0.4 + r) * 1.5 - v.cx * 0.3) % span) + span) % span;
      const h = v.halfH * 2.3;
      c1.copy(cssColor('#67e8f9')).multiplyScalar(0.28 + 0.08 * Math.sin(t * 0.9 + r * 2));
      this.rays.add(x, v.cy + v.halfH - h / 2 + 0.5, z, 2.2 + (r % 2) * 1.4, h, 1, c1, -0.3);
    }
    // Far seabed ridges with crystal dragon palaces under bubble domes + coral (z = -56).
    const z = -56;
    const v = viewAtDepth(camera, target, z, this.v);
    const floor = v.cy - v.halfH;
    b.hillRow(camera, target, z - 2, 14, 0.18, 0.32, pal.farHillFill, 101);
    tiles(v, 16, 16, (i, x) => {
      const by = floor + v.halfH * 0.42;
      b.round.add(x, by - 1.6, z, 14, 4, 6, cssColor(pal.farHillFill));
      b.pagoda(x, by, z + 0.5, 1.8, '#22d3ee');
      this.glass.add(x, by + 1.3, z + 0.5, 5.6, 5.6, 5.6, cssColor('#a5f3fc'));
      this.halo.add(x, by + 1.3, z + 3.5, 9, 9, 1, cssColor('#0e7490'));
      for (const side of [-1, 1]) {
        const cx = x + side * 4.5;
        const col = cssColor(side < 0 ? '#fb7185' : '#fde047');
        this.cyl.add(cx, by, z + 1, 0.35, 2.6, 0.35, col, side * 0.35);
        this.cyl.add(cx + side * 0.6, by + 0.4, z + 1, 0.28, 1.6, 0.28, col, -side * 0.5);
        this.cyl.add(cx - side * 0.4, by + 0.2, z + 1, 0.25, 1.4, 0.25, col, side * 0.9);
      }
    });
    // Near seabed (z = -24).
    b.hillRow(camera, target, -24, 6, 0.06, 0.14, pal.nearHillFill, 102);
    // Glowing jellyfish drifting through the midground (z = -18).
    const jz = -18;
    const jv = viewAtDepth(camera, target, jz, this.v);
    const jspan = jv.halfW * 2.6;
    for (let j = 0; j < 6; j++) {
      const x = jv.cx - jv.halfW * 1.3 + ((((j * jspan) / 6 + t * 0.35) % jspan) + jspan) % jspan;
      const y = jv.cy + jv.halfH * (0.5 - (j % 3) * 0.32) + Math.sin(t * 2.6 + j * 1.4) * 0.3;
      const col = cssColor(j % 2 === 0 ? '#fb7185' : '#22d3ee');
      const pulse = 1 + Math.sin(t * 3 + j) * 0.08;
      this.dome.add(x, y, jz, 1.5 * pulse, 1.1 / pulse, 1.5 * pulse, col);
      for (const tx of [-0.45, 0, 0.45]) {
        const wag = Math.sin(t * 5 + tx * 4 + j) * 0.25;
        this.glowBox.add(x + tx + wag * 0.4, y - 0.7, jz, 0.08, 1.3, 0.08, cssColor(j % 2 === 0 ? '#f472b6' : '#67e8f9'), wag);
      }
      this.halo.add(x, y, jz + 0.5, 4, 4, 1, col);
    }
    // Rising bubbles (z = -6 … -14), world-fixed columns.
    const bv = viewAtDepth(camera, target, -10, this.v2);
    const bubble = cssColor('#cffafe');
    const bTop = bv.cy + bv.halfH;
    const bBottom = bv.cy - bv.halfH;
    tiles(bv, 2.7, 3, (i, x) => {
      if (hash01(i, 103) < 0.4) return;
      const z = -6 - hash01(i, 104) * 8;
      const range = bTop - bBottom + 2;
      for (let k = 0; k < 2; k++) {
        const y = bBottom - 1 + (((t * (0.7 + hash01(i, 105) * 0.6) + k * range * 0.5 + hash01(i, 106) * range) % range) + range) % range;
        const r = 0.12 + hash01(i * 3 + k, 107) * 0.18;
        this.glass.add(x + Math.sin(t * 2 + i + k) * 0.2, y, z, r, r, r, bubble);
      }
    });
  }

  // ---------- 10. earth core ----------

  private earthCore(camera: THREE.PerspectiveCamera, target: THREE.Vector3, t: number) {
    const b = this.b;
    // Pulsing golden earth core deep below, lower right.
    const cv = viewAtDepth(camera, target, -90, this.v);
    const pulse = 0.85 + 0.15 * Math.sin(t * 1.6);
    b.skyHalo.add(cv.cx + cv.halfW * 0.56, cv.cy - cv.halfH * 0.44, -90, cv.halfH * 1.6 * pulse, cv.halfH * 1.6 * pulse, 1, cssColor('#f59e0b'));
    b.skyHalo.add(cv.cx + cv.halfW * 0.56, cv.cy - cv.halfH * 0.44, -89, cv.halfH * 0.5 * pulse, cv.halfH * 0.5 * pulse, 1, cssColor('#fef08a'));
    // Tilted rock strata with molten gold veins, world-fixed along the descent (z = -34).
    const z = -34;
    const v = viewAtDepth(camera, target, z, this.v);
    const slope = 0.8; // average descent of the tunnel (720 px per 900 px)
    const ang = -Math.atan(slope);
    const band = 2.4;
    const w = (v.halfW * 2.6) / Math.cos(ang);
    // Bands are lines y = -slope·x + k·band (three units); index range covering the view.
    const k0 = Math.floor((v.cy - v.halfH + slope * (v.cx - v.halfW)) / band) - 2;
    const k1 = Math.ceil((v.cy + v.halfH + slope * (v.cx + v.halfW)) / band) + 2;
    for (let k = k0; k <= k1; k++) {
      const y = -slope * v.cx + k * band;
      b.decor.add(v.cx, y, z, w, band * 0.52, 1.2, cssColor(k % 2 === 0 ? '#451a03' : '#5c2a0b'), ang);
      const vein = cssColor(k % 2 === 0 ? '#fbbf24' : '#f59e0b');
      c1.copy(vein).multiplyScalar(0.7 + 0.3 * Math.sin(t * 2 + k));
      this.glowBox.add(v.cx, y + band * 0.27, z + 0.65, w, 0.08, 0.1, c1, ang);
    }
    // Mine-timber support arches standing on the tunnel floor (z = -11).
    const az = -11;
    const av = viewAtDepth(camera, target, az, this.v2);
    const timber = cssColor('#451a03');
    const beam = cssColor('#78350f');
    tiles(av, 3.8, 4, (_i, x) => {
      const floor = -computeSubterraneanSlopeY(x / S) * S;
      const topY = floor + 4.3;
      b.decor.add(x, (floor + topY) / 2 - 0.4, az, 0.28, topY - floor + 0.8, 0.28, timber);
      b.decor.add(x + 1.9, topY - 0.25, az, 4.1, 0.24, 0.3, beam, -0.18);
      this.glowBall.add(x, topY - 0.55, az + 0.18, 0.22, 0.22, 0.1, cssColor('#fde047'));
      this.halo.add(x, topY - 0.55, az + 0.3, 1.4, 1.4, 1, cssColor('#f59e0b'));
    });
  }

  // ---------- 11. sky sanctuary ----------

  private skySanctuary(camera: THREE.PerspectiveCamera, target: THREE.Vector3, t: number, isLoop2: boolean) {
    const b = this.b;
    b.celestial(camera, target, 0.44, 0.5, 0.13, isLoop2 ? '#fda4af' : '#fef08a', isLoop2 ? '#f43f5e' : '#fde047');
    // Golden / cyan wind-current ribbons (soft additive cards along sine bands, z = -84).
    const za = -84;
    const a = viewAtDepth(camera, target, za, this.v);
    for (let w = 0; w < 4; w++) {
      c1.copy(cssColor(w % 2 === 0 ? '#fef08a' : '#bae6fd')).multiplyScalar(0.35);
      const n = 30;
      for (let k = 0; k <= n; k++) {
        const x = a.cx - a.halfW * 1.1 + (k / n) * a.halfW * 2.2;
        const y = a.cy + a.halfH * (0.55 - w * 0.3) + Math.sin(x * 0.1 + t * 3.5 + w) * a.halfH * 0.05;
        b.skyHalo.add(x, y, za, a.halfW * 0.16, a.halfH * 0.05, 1, c1);
      }
    }
    // Winged sky temples on clouds (z = -48).
    const tz = -48;
    const tv = viewAtDepth(camera, target, tz, this.v);
    tiles(tv, 18, 18, (i, x) => {
      const y = tv.cy + (hash01(i, 111) - 0.4) * tv.halfH * 0.8 + Math.sin(t * 1.5 + i) * 0.3;
      this.clouds.add(x, y - 0.6, tz, 6, 1.8, 3, cssColor('#ffffff'));
      b.pagoda(x, y, tz, 1.8, isLoop2 ? '#e11d48' : '#38bdf8');
      const flap = Math.sin(t * 2 + i) * 0.12;
      for (const side of [-1, 1]) {
        b.decor.add(x + side * 2.2, y + 1.2, tz, 2.6, 0.5, 0.2, cssColor('#fde047'), side * (0.35 + flap));
      }
    });
    // Immortal white cranes flying across (z = -26).
    const cz = -26;
    const cv = viewAtDepth(camera, target, cz, this.v2);
    const span = cv.halfW * 2.6;
    const white = cssColor('#ffffff');
    for (let c = 0; c < 5; c++) {
      const x = cv.cx - cv.halfW * 1.3 + ((((c * span) / 5 + t * 1.6) % span) + span) % span;
      const y = cv.cy + cv.halfH * (0.55 - (c % 3) * 0.28) + Math.sin(t * 3.8 + c) * 0.3;
      const flap = Math.sin(t * 11 + c * 1.7) * 0.6;
      b.round.add(x, y, cz, 1.3, 0.5, 0.5, white);
      b.round.add(x + 0.75, y + 0.2, cz, 0.3, 0.3, 0.3, white);
      b.round.add(x + 0.85, y + 0.32, cz + 0.05, 0.14, 0.14, 0.14, cssColor('#f43f5e'));
      b.decor.add(x - 0.1, y + 0.4 + flap * 0.4, cz, 1.4, 0.12, 0.6, white, flap);
    }
    // Cloud sea: drifting banks at several depths around the flight path (z = -64, -36, -12).
    for (const [z, rows, salt] of [[-64, 2, 113], [-36, 3, 114], [-12, 3, 115]] as const) {
      const v = viewAtDepth(camera, target, z, this.v);
      const drift = t * (z > -20 ? 0.6 : 0.25);
      const spacing = v.halfW * 0.45;
      v.cx -= drift;
      for (let r = 0; r < rows; r++) {
        tiles(v, spacing, spacing, (i, x0) => {
          if (r > 0 && hash01(i * 7 + r, salt) < 0.5) return;
          const x = x0 + drift + (r * spacing) / 2;
          const y = r === 0 ? v.cy - v.halfH * 0.9 : v.cy + v.halfH * (hash01(i * 3 + r, salt + 1) * 1.4 - 0.6);
          const s = v.halfH * (r === 0 ? 0.3 : 0.12) * (0.8 + hash01(i, salt + 2) * 0.5);
          const shade = cssColor(isLoop2 ? '#fda4af' : '#bae6fd');
          this.clouds.add(x, y - s * 0.2, z - s * 0.3, s * 3.2, s * 1.1, s * 1.4, shade);
          this.clouds.add(x - s * 0.8, y, z, s * 1.8, s * 1.4, s * 1.2, white);
          this.clouds.add(x + s * 0.7, y + s * 0.1, z, s * 2, s * 1.6, s * 1.2, white);
          this.clouds.add(x, y + s * 0.45, z + s * 0.1, s * 1.6, s * 1.5, s * 1.1, white);
        });
      }
    }
  }
}
