import * as THREE from 'three';
import type { SeasonId } from '../../rules/index.ts';
import type { ChibiStagePalette } from '../../render/map/stagePalette.ts';
import { cssColor } from '../resources.ts';
import { Batch, hash01, type EnvGeometries, type EnvMaterials } from './kit.ts';

// Multi-layer backdrop in real depth (z = -16 … -90) instead of canvas fake parallax: every layer is
// world-fixed tiles (hash per tile index, no RNG state), so the camera's perspective does the
// parallax. Stage looks follow render/map/sky/<stage>.ts; stages 5–11 get the generic hills (T06).

/** What the camera sees on the plane z (centre + half extents, three units). */
export interface DepthView {
  cx: number;
  cy: number;
  halfW: number;
  halfH: number;
}

const tmp = new THREE.Color();
const tmp2 = new THREE.Color();

export function viewAtDepth(camera: THREE.PerspectiveCamera, target: THREE.Vector3, z: number, out: DepthView) {
  const p = camera.position;
  const s = (p.z - z) / Math.max(1e-3, p.z - target.z);
  out.cx = p.x + (target.x - p.x) * s;
  out.cy = p.y + (target.y - p.y) * s;
  out.halfH = (p.z - z) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  out.halfW = out.halfH * camera.aspect;
  return out;
}

function tiles(v: DepthView, spacing: number, margin: number, cb: (i: number, x: number) => void) {
  const i0 = Math.floor((v.cx - v.halfW - margin) / spacing);
  const i1 = Math.ceil((v.cx + v.halfW + margin) / spacing);
  for (let i = i0; i <= i1; i++) cb(i, i * spacing);
}

export class Backdrop {
  private facet: Batch;
  private hills: Batch;
  private decor: Batch;
  private round: Batch;
  private arches: Batch;
  private discs: Batch;
  private skyGlow: Batch;
  private skyHalo: Batch;
  private v: DepthView = { cx: 0, cy: 0, halfW: 1, halfH: 1 };
  private seasonId: SeasonId = 'spring';
  private isLoop2 = false;
  private pal!: ChibiStagePalette;

  constructor(parent: THREE.Object3D, g: EnvGeometries, m: EnvMaterials) {
    this.facet = new Batch(parent, g.pyramid, m.facet, 64);
    this.hills = new Batch(parent, g.puff, m.solid, 96);
    this.decor = new Batch(parent, g.box, m.solid, 256);
    this.round = new Batch(parent, g.sphere, m.solid, 64);
    this.arches = new Batch(parent, g.arch, m.solid, 16);
    this.discs = new Batch(parent, g.disc, m.solid, 32);
    this.skyGlow = new Batch(parent, g.sphere, m.skyGlow, 48, { renderOrder: -50 });
    this.skyHalo = new Batch(parent, g.quad, m.skyHalo, 128, { renderOrder: -49 });
  }

  setStage(seasonId: SeasonId, isLoop2: boolean, pal: ChibiStagePalette) {
    this.seasonId = seasonId;
    this.isLoop2 = isLoop2;
    this.pal = pal;
  }

  update(camera: THREE.PerspectiveCamera, target: THREE.Vector3, t: number, isAwakened: boolean) {
    const all = [this.facet, this.hills, this.decor, this.round, this.arches, this.discs, this.skyGlow, this.skyHalo];
    for (const b of all) b.begin();
    switch (this.seasonId) {
      case 'spring':
        this.spring(camera, target, t, isAwakened);
        break;
      case 'summer':
        this.summer(camera, target, t);
        break;
      case 'autumn':
        this.autumn(camera, target, t);
        break;
      case 'winter':
        this.winter(camera, target, t);
        break;
      default:
        this.generic(camera, target, t);
    }
    for (const b of all) b.end();
  }

  dispose() {
    for (const b of [this.facet, this.hills, this.decor, this.round, this.arches, this.discs, this.skyGlow, this.skyHalo]) {
      b.dispose();
    }
  }

  // ---------- shared pieces ----------

  private celestial(camera: THREE.PerspectiveCamera, target: THREE.Vector3, fx: number, fy: number, r: number, body: string, halo: string) {
    const v = viewAtDepth(camera, target, -95, this.v);
    const x = v.cx + v.halfW * fx;
    const y = v.cy + v.halfH * fy;
    const d = v.halfH * r * 2;
    this.skyHalo.add(x, y, -96, d * 3.2, d * 3.2, 1, cssColor(halo));
    this.skyGlow.add(x, y, -95, d, d, d, cssColor(body));
  }

  private clouds(camera: THREE.PerspectiveCamera, target: THREE.Vector3, t: number, z: number, top: number) {
    const v = viewAtDepth(camera, target, z, this.v);
    const fill = cssColor(this.pal.cloudFill);
    const shade = cssColor(this.pal.cloudShade);
    const drift = t * 0.25;
    const spacing = v.halfW * 0.75;
    v.cx -= drift; // tile in drifting space
    tiles(v, spacing, spacing, (i, x0) => {
      const x = x0 + drift;
      const y = v.cy + v.halfH * (top - 0.18 * (Math.abs(i) % 3));
      const s = v.halfH * 0.11;
      this.skyGlow.add(x - s * 0.9, y - s * 0.25, z - 0.5, s * 1.6, s * 1.1, s, shade);
      this.skyGlow.add(x + s * 0.9, y - s * 0.25, z - 0.5, s * 1.6, s * 1.1, s, shade);
      this.skyGlow.add(x - s * 0.8, y, z, s * 1.6, s * 1.4, s, fill);
      this.skyGlow.add(x + s * 0.8, y, z, s * 1.6, s * 1.4, s, fill);
      this.skyGlow.add(x, y + s * 0.4, z, s * 2, s * 1.8, s, fill);
    });
  }

  /** Rolling hills (half-buried puffs) rising from the bottom of the view at depth z. */
  private hillRow(camera: THREE.PerspectiveCamera, target: THREE.Vector3, z: number, spacing: number, hMin: number, hMax: number, color: string, salt: number, onTop?: (i: number, x: number, topY: number) => void) {
    const v = viewAtDepth(camera, target, z, this.v);
    const base = v.cy - v.halfH;
    const c = cssColor(color);
    tiles(v, spacing, spacing * 2, (i, x) => {
      const h = v.halfH * (hMin + (hMax - hMin) * hash01(i, salt)) * 2;
      const w = spacing * (1.6 + hash01(i, salt + 1) * 0.6);
      this.hills.add(x, base, z, w, h, 3, c);
      onTop?.(i, x, base + h / 2);
    });
  }

  /** Mini pagoda: stacked tiers with pyramid roofs (canvas drawChibiMiniPagoda). */
  private pagoda(x: number, baseY: number, z: number, s: number, roof: string) {
    const body = cssColor('#7f1d1d');
    const r = cssColor(roof);
    let y = baseY;
    for (let k = 0; k < 3; k++) {
      const w = s * (1 - k * 0.22);
      this.decor.add(x, y + s * 0.22, z, w * 0.62, s * 0.44, w * 0.5, body);
      this.facet.add(x, y + s * 0.56, z, w * 1.15, s * 0.3, w * 0.8, r, 0, Math.PI / 4);
      y += s * 0.55;
    }
    this.decor.add(x, y + s * 0.15, z, s * 0.05, s * 0.4, s * 0.05, cssColor('#fde047'));
  }

  // ---------- stages ----------

  private spring(camera: THREE.PerspectiveCamera, target: THREE.Vector3, t: number, isAwakened: boolean) {
    const pal = this.pal;
    const moon = this.isLoop2 || isAwakened ? '#fb7185' : '#ffe4e6';
    this.celestial(camera, target, 0.52, 0.5, 0.12, moon, '#fb7185');
    this.clouds(camera, target, t, -62, 0.62);

    // Mount Fuji silhouettes with snow caps (z = -72).
    const z0 = -72;
    const v = viewAtDepth(camera, target, z0, this.v);
    const base = v.cy - v.halfH;
    const fuji = cssColor(this.isLoop2 ? pal.farHillFill : '#1e293b');
    const snow = cssColor(this.isLoop2 ? '#fda4af' : '#fff1f2');
    tiles(v, v.halfW * 1.7, v.halfW, (i, x) => {
      const h = v.halfH * (1.15 + hash01(i, 3) * 0.3);
      const r = h * 1.25;
      this.facet.add(x, base + h / 2, z0, r * 2, h, r * 0.8, fuji, 0, Math.PI / 4);
      const sh = h * 0.27;
      this.facet.add(x, base + h - sh / 2 + 0.01, z0 + 0.05, r * 2 * 0.27 * 1.04, sh * 1.02, r * 0.8 * 0.27, snow, 0, Math.PI / 4);
    });

    // Rolling sakura hills with pagodas (z = -44).
    this.hillRow(camera, target, -44, 7, 0.32, 0.5, pal.farHillFill, 11, (i, x, top) => {
      if (Math.abs(i) % 2 === 0) this.pagoda(x, top - 0.25, -43, 1.5, '#fb7185');
    });
    // Near hills (z = -26), darker.
    this.hillRow(camera, target, -26, 5, 0.12, 0.24, pal.nearHillFill, 17);
  }

  private summer(camera: THREE.PerspectiveCamera, target: THREE.Vector3, t: number) {
    this.celestial(camera, target, -0.5, 0.55, 0.11, this.isLoop2 ? '#fda4af' : '#cffafe', '#22d3ee');
    this.clouds(camera, target, t, -62, 0.6);
    const lakeY = -4.95; // sim waterLevelY 495
    // Far shore hills behind the lake.
    this.hillRow(camera, target, -70, 12, 0.18, 0.3, this.pal.farHillFill, 23);
    // Red arched bridges + water pavilions on stilts + giant lotus (z = -34).
    const z = -34;
    const v = viewAtDepth(camera, target, z, this.v);
    const red = cssColor('#e11d48');
    const stilt = cssColor('#7c2d12');
    tiles(v, 16, 16, (i, x) => {
      this.arches.add(x, lakeY - 0.2, z, 2.6, 2.0, 2.2, red);
      this.decor.add(x, lakeY + 1.72, z, 0.5, 0.1, 0.5, red);
      const px = x + 8;
      for (const dx of [-0.6, 0.6]) this.decor.add(px + dx, lakeY + 0.4, z, 0.12, 1.2, 0.12, stilt);
      this.decor.add(px, lakeY + 1.0, z, 1.8, 0.14, 1.2, stilt);
      this.pagoda(px, lakeY + 1.05, z, 1.4, '#22d3ee');
      // Lotus on the lake.
      const lx = x + 3.5 + hash01(i, 5) * 2;
      const lz = -18 - hash01(i, 6) * 6;
      this.round.add(lx, lakeY + 0.05, lz, 1.8, 0.12, 1.2, cssColor('#10b981'));
      for (const a of [-0.5, -0.25, 0, 0.25, 0.5]) {
        this.round.add(lx + Math.sin(a) * 0.3, lakeY + 0.35 + Math.cos(a) * 0.12, lz, 0.22, 0.5, 0.22, cssColor('#fb7185'), -a);
      }
    });
  }

  private autumn(camera: THREE.PerspectiveCamera, target: THREE.Vector3, t: number) {
    this.celestial(camera, target, 0, 0.45, 0.16, '#fde047', '#f97316');
    // Spinning wooden gears, world-fixed in y (real parallax while climbing), z = -32.
    const z = -32;
    const v = viewAtDepth(camera, target, z, this.v);
    const wood = cssColor('#78350f');
    const hub = cssColor('#fb923c');
    const rows0 = Math.floor((v.cy - v.halfH - 6) / 7);
    const rows1 = Math.ceil((v.cy + v.halfH + 6) / 7);
    for (let row = rows0; row <= rows1; row++) {
      for (let col = -1; col <= 1; col++) {
        if (hash01(row * 3 + col, 31) < 0.35) continue;
        const x = v.cx + col * v.halfW * 0.62 + (hash01(row, 32) - 0.5) * 3;
        const y = row * 7 + (col & 1) * 3.5;
        const r = col === 0 ? 1.9 : 1.4;
        const dir = (row + col) & 1 ? 1 : -1;
        const a0 = t * 0.8 * dir;
        this.discs.add(x, y, z, r * 2, r * 2, 0.5, wood, a0);
        this.discs.add(x, y, z + 0.3, r * 0.76, r * 0.76, 0.3, hub, a0);
        for (let k = 0; k < 8; k++) {
          const a = a0 + (k * Math.PI) / 4;
          this.decor.add(x + Math.cos(a) * r * 1.08, y + Math.sin(a) * r * 1.08, z, 0.55, 0.5, 0.45, wood, a);
        }
      }
    }
    // Castle battlement wall with crenellations and war flags along the bottom of the view (z = -17).
    const zw = -17;
    const w = viewAtDepth(camera, target, zw, this.v);
    const stone = cssColor('#292524');
    const wallTop = w.cy - w.halfH * 0.48;
    this.decor.add(w.cx, (wallTop + w.cy - w.halfH - 2) / 2, zw, w.halfW * 2.4, wallTop - (w.cy - w.halfH - 2), 1.2, stone);
    tiles(w, 1.1, 2, (i, x) => {
      this.decor.add(x, wallTop + 0.2, zw, 0.65, 0.4, 1.2, stone);
      if (Math.abs(i) % 3 === 0) {
        this.decor.add(x, wallTop + 0.95, zw, 0.06, 1.1, 0.06, stone);
        const wave = Math.sin(t * 6 + i) * 0.12;
        this.decor.add(x + 0.38, wallTop + 1.25, zw, 0.7, 0.42, 0.04, cssColor('#e11d48'), wave);
      }
    });
  }

  private winter(camera: THREE.PerspectiveCamera, target: THREE.Vector3, t: number) {
    // Aurora ribbons: additive soft cards along three sine bands (z = -88).
    const za = -88;
    const a = viewAtDepth(camera, target, za, this.v);
    const bands = ['#34d399', '#38bdf8', '#a78bfa'];
    for (let b = 0; b < 3; b++) {
      tmp.copy(cssColor(bands[b])).multiplyScalar(0.55);
      const n = 26;
      for (let k = 0; k <= n; k++) {
        const x = a.cx - a.halfW * 1.1 + (k / n) * a.halfW * 2.2;
        const y = a.cy + a.halfH * (0.62 - b * 0.11) + Math.sin(x * 0.12 + t * 1.6 + b) * a.halfH * 0.07;
        this.skyHalo.add(x, y, za, a.halfW * 0.22, a.halfH * 0.16, 1, tmp);
      }
    }
    this.skyGlow.add(a.cx + a.halfW * 0.6, a.cy + a.halfH * 0.75, za, a.halfH * 0.08, a.halfH * 0.08, 1, cssColor('#f8fafc'));

    // Faceted crystal icebergs (z = -46): flat shading gives the light/shade facets of the canvas.
    const z = -46;
    const v = viewAtDepth(camera, target, z, this.v);
    const base = v.cy - v.halfH;
    const ice1 = cssColor('#bae6fd');
    const ice2 = cssColor('#7dd3fc');
    const loopTint = cssColor(this.pal.farHillFill);
    tiles(v, 6.5, 8, (i, x) => {
      const h = v.halfH * (0.85 + hash01(i, 41) * 0.5);
      tmp2.copy(i & 1 ? ice1 : ice2);
      if (this.isLoop2) tmp2.lerp(loopTint, 0.55);
      this.facet.add(x, base + h / 2, z, 7.2, h, 4, tmp2, 0, Math.PI / 4 + hash01(i, 42) * 0.3);
    });
    // Snowmen on the near snow drifts (z = -27).
    const zs = -27;
    const s = viewAtDepth(camera, target, zs, this.v);
    const sb = s.cy - s.halfH;
    this.hillRow(camera, target, zs - 1, 6, 0.14, 0.22, this.isLoop2 ? this.pal.nearHillFill : '#e2e8f0', 43);
    tiles(s, 12, 12, (i, x) => {
      if (Math.abs(i) % 2) return;
      const y = sb + s.halfH * 0.3;
      const white = cssColor('#ffffff');
      this.round.add(x, y, zs, 0.8, 0.8, 0.8, white);
      this.round.add(x, y + 0.62, zs, 0.56, 0.56, 0.56, white);
      this.decor.add(x, y + 0.36, zs + 0.1, 0.5, 0.12, 0.5, cssColor('#f43f5e'));
      this.decor.add(x, y + 0.66, zs + 0.3, 0.06, 0.06, 0.25, cssColor('#f97316'));
    });
  }

  private generic(camera: THREE.PerspectiveCamera, target: THREE.Vector3, t: number) {
    this.celestial(camera, target, 0.45, 0.5, 0.1, this.pal.cloudFill, this.pal.cloudShade);
    this.clouds(camera, target, t, -62, 0.6);
    this.hillRow(camera, target, -48, 7, 0.3, 0.55, this.pal.farHillFill, 51);
    this.hillRow(camera, target, -26, 4.5, 0.12, 0.26, this.pal.nearHillFill, 53);
  }
}
