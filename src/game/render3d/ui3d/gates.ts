import * as THREE from 'three';
import { SEASONS, SEASON_ORDER, type SeasonId } from '../../rules/index.ts';
import { BLOOM_LAYER } from '../post.ts';
import { cssColor, type Tracker } from '../resources.ts';
import { CanvasPlate, inkText } from './plate.ts';

// Stage select as 11 clickable torii gates (?ui=3d title). The gates hang in camera space (children
// of the camera) so the fly-through behind them never pushes them off screen; the layout is fitted
// to the view each frame (landscape: right of the DOM panel; portrait: above it). Instanced: one
// draw call each for pillars, beams and portals; labels are 11 small CanvasTexture planes.
// Picking is a raycast against the portal + pillar instances.

const N = SEASON_ORDER.length;
/** Distance in front of the camera (three units). */
const DEPTH = 6;
const LABEL_W = 320;
const LABEL_H = 112;

const m4 = new THREE.Matrix4();
const baseM = new THREE.Matrix4();
const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();
const eul = new THREE.Euler();
const scl = new THREE.Vector3();
const col = new THREE.Color();
const ndc = new THREE.Vector2();
const ray = new THREE.Raycaster();
const tmp = new THREE.Vector3();

const identity = new THREE.Quaternion();

/** One box/plane of a gate, in the gate's local frame (`base`). */
function placePart(
  base: THREE.Matrix4,
  mesh: THREE.InstancedMesh,
  idx: number,
  px: number,
  py: number,
  sx: number,
  sy: number,
  sz: number
) {
  m4.compose(pos.set(px, py, 0), identity, scl.set(sx, sy, sz));
  m4.premultiply(base);
  mesh.setMatrixAt(idx, m4);
}

interface Slot {
  x: number;
  y: number;
  size: number;
}

export class StageGates {
  readonly group = new THREE.Group();
  private pillars: THREE.InstancedMesh;
  private beams: THREE.InstancedMesh;
  private portals: THREE.InstancedMesh;
  private labels: { mesh: THREE.Mesh; plate: CanvasPlate }[] = [];
  private slots: Slot[] = Array.from({ length: N }, () => ({ x: 0, y: 0, size: 1 }));
  hover = -1;
  private lift = new Float32Array(N);

  constructor(track: Tracker) {
    const box = track.geometry(new THREE.BoxGeometry(1, 1, 1));
    const wood = track.material(new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.1, fog: false }));
    this.pillars = new THREE.InstancedMesh(box, wood, N * 2);
    this.beams = new THREE.InstancedMesh(box, wood, N * 2);
    const portalMat = track.material(
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.88, fog: false, toneMapped: false })
    );
    this.portals = new THREE.InstancedMesh(track.geometry(new THREE.PlaneGeometry(1, 1)), portalMat, N);
    this.portals.layers.enable(BLOOM_LAYER);
    for (const m of [this.pillars, this.beams, this.portals]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      this.group.add(m);
    }

    for (let i = 0; i < N; i++) {
      const cfg = SEASONS[SEASON_ORDER[i]];
      const plate = new CanvasPlate(track, LABEL_W, LABEL_H);
      const [num, ...rest] = cfg.vietnameseTitle.split(':');
      const title = rest.join(':').trim() || cfg.vietnameseTitle;
      plate.draw(cfg.id, (c, w) => {
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        inkText(c, num.trim().toUpperCase(), w / 2, 30, 34, cfg.accentColor, 900, w - 12);
        inkText(c, title, w / 2, 78, 28, '#f8fafc', 800, w - 12);
      });
      const mat = track.material(
        new THREE.MeshBasicMaterial({ map: plate.texture, transparent: true, depthWrite: false, fog: false, toneMapped: false })
      );
      const mesh = new THREE.Mesh(track.geometry(new THREE.PlaneGeometry(1, LABEL_H / LABEL_W)), mat);
      mesh.renderOrder = 5;
      this.group.add(mesh);
      this.labels.push({ mesh, plate });
    }
    this.group.visible = false;
  }

  /** Fits the 11 gates into the free part of the view for this aspect ratio. */
  private layout(aspect: number, fovDeg: number) {
    const halfH = DEPTH * Math.tan(THREE.MathUtils.degToRad(fovDeg / 2));
    const halfW = halfH * aspect;
    // Region in NDC: landscape → right of the DOM panel; portrait → top part above the panel.
    const portrait = aspect < 0.9;
    const x0 = portrait ? -0.94 : -0.12;
    const x1 = portrait ? 0.94 : 0.96;
    const y0 = portrait ? 0.08 : -0.72;
    const y1 = portrait ? 0.9 : 0.62;
    const rows = portrait ? [4, 4, 3] : aspect > 1.6 ? [6, 5] : [4, 4, 3];
    const cellW = ((x1 - x0) * halfW) / Math.max(...rows);
    const cellH = ((y1 - y0) * halfH) / rows.length;
    const size = Math.min(cellW * 0.8, cellH / 1.5);
    let i = 0;
    rows.forEach((n, r) => {
      const cy = (y1 * halfH) - cellH * (r + 0.5);
      const rowW = n * cellW;
      const left = ((x0 + x1) / 2) * halfW - rowW / 2;
      for (let k = 0; k < n; k++, i++) {
        const s = this.slots[i];
        s.x = left + cellW * (k + 0.5);
        s.y = cy + size * 0.18;
        s.size = size;
      }
    });
  }

  update(camera: THREE.PerspectiveCamera, selected: SeasonId, time: number, dt: number) {
    this.layout(camera.aspect, camera.fov);
    const sel = SEASON_ORDER.indexOf(selected);
    for (let i = 0; i < N; i++) {
      const cfg = SEASONS[SEASON_ORDER[i]];
      const s = this.slots[i];
      const active = i === sel;
      const hot = i === this.hover;
      const goal = active ? 1 : hot ? 0.6 : 0;
      this.lift[i] += (goal - this.lift[i]) * Math.min(1, dt * 10);
      const L = this.lift[i];
      const k = s.size * (1 + L * 0.18);
      // Each gate idles on its own phase; the selected one turns to show it is 3D.
      const yaw = active ? Math.sin(time * 0.9) * 0.45 : Math.sin(time * 0.6 + i * 1.7) * 0.18;
      const bob = Math.sin(time * 1.4 + i) * 0.02 * s.size + L * 0.12 * s.size;
      eul.set(-0.08, yaw, 0);
      quat.setFromEuler(eul);
      const base = baseM.compose(
        pos.set(s.x, s.y - s.size * 0.5 + bob, -DEPTH),
        quat,
        scl.set(k, k, k)
      );
      placePart(base, this.pillars, i * 2, -0.36, 0.45, 0.1, 0.9, 0.1);
      placePart(base, this.pillars, i * 2 + 1, 0.36, 0.45, 0.1, 0.9, 0.1);
      placePart(base, this.beams, i * 2, 0, 0.95, 1.06, 0.09, 0.14);
      placePart(base, this.beams, i * 2 + 1, 0, 0.8, 0.86, 0.06, 0.09);
      placePart(base, this.portals, i, 0, 0.4, 0.62, 0.76, 1);
      // Torii lacquer red; the selected gate turns gold.
      col.set(active ? '#f59e0b' : '#b91c1c');
      this.pillars.setColorAt(i * 2, col);
      this.pillars.setColorAt(i * 2 + 1, col);
      col.set(active ? '#fde047' : '#1f1414');
      this.beams.setColorAt(i * 2, col);
      col.set(active ? '#fde047' : '#7f1d1d');
      this.beams.setColorAt(i * 2 + 1, col);
      // Portal: the stage's sky, brighter when selected or hovered (bloom layer).
      col.copy(cssColor(cfg.skyBottom)).lerp(cssColor(cfg.accentColor), 0.45);
      col.multiplyScalar(0.55 + L * 0.9);
      this.portals.setColorAt(i, col);

      const label = this.labels[i].mesh;
      label.position.set(s.x, s.y - s.size * 0.5 - s.size * 0.12 + bob, -DEPTH + 0.05);
      const lw = s.size * 1.25 * (1 + L * 0.12);
      label.scale.set(lw, lw, 1);
      (label.material as THREE.MeshBasicMaterial).opacity = 0.75 + L * 0.25;
    }
    for (const m of [this.pillars, this.beams, this.portals]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }

  /** Gate under the view px (x, y) of a w × h view, or -1. */
  pick(camera: THREE.PerspectiveCamera, x: number, y: number, w: number, h: number): number {
    if (!this.group.visible) return -1;
    ndc.set((x / w) * 2 - 1, -(y / h) * 2 + 1);
    camera.updateMatrixWorld();
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects([this.portals, this.pillars, this.beams], false);
    for (const hit of hits) {
      if (hit.instanceId === undefined) continue;
      return hit.object === this.portals ? hit.instanceId : Math.floor(hit.instanceId / 2);
    }
    return -1;
  }

  /** Screen px centre of every gate portal (for tests: window.__ui3d.gates()). */
  screenPositions(camera: THREE.PerspectiveCamera, w: number, h: number) {
    const out: { id: SeasonId; x: number; y: number }[] = [];
    for (let i = 0; i < N; i++) {
      this.portals.getMatrixAt(i, m4);
      tmp.setFromMatrixPosition(m4).applyMatrix4(this.group.matrixWorld).project(camera);
      out.push({ id: SEASON_ORDER[i], x: ((tmp.x + 1) / 2) * w, y: ((1 - tmp.y) / 2) * h });
    }
    return out;
  }
}
