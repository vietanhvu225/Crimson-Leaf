import * as THREE from 'three';
import { S } from '../coords.ts';
import { cssColor, type Tracker } from '../resources.ts';
import { INK } from './parts.ts';

// Overhead health bars and name tags for every enemy in two draw calls: bars are instanced quads
// (ink frame + fill), tags are instanced quads sampling one CanvasTexture atlas with one row per
// distinct string (rows are drawn once and cached).

const ATLAS_W = 1024;
const ROW_H = 32;
const ROWS = 64;
/** Atlas text is drawn at 2× the canvas renderer's px. */
const PX = 2;

const m4 = new THREE.Matrix4();
const pos = new THREE.Vector3();
const quat = new THREE.Quaternion();
const scl = new THREE.Vector3();

export class Overhead {
  private bars: THREE.InstancedMesh;
  private tags: THREE.InstancedMesh;
  private tagRow: THREE.InstancedBufferAttribute;
  private barCount = 0;
  private tagCount = 0;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private tex: THREE.CanvasTexture;
  private rows = new Map<string, { row: number; w: number }>();
  private nextRow = 0;
  private parent: THREE.Object3D;

  constructor(parent: THREE.Object3D, track: Tracker, capacity = 256) {
    this.parent = parent;
    const quad = track.geometry(new THREE.PlaneGeometry(1, 1));
    const barMat = track.material(
      new THREE.MeshBasicMaterial({ color: '#ffffff', depthTest: false, depthWrite: false, fog: false })
    );
    this.bars = new THREE.InstancedMesh(quad, barMat, capacity * 2);
    this.bars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bars.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 6), 3);
    this.bars.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.bars.frustumCulled = false;
    this.bars.renderOrder = 95;
    this.bars.count = 0;

    this.canvas = document.createElement('canvas');
    this.canvas.width = ATLAS_W;
    this.canvas.height = ROW_H * ROWS;
    this.ctx = this.canvas.getContext('2d')!;
    this.tex = track.texture(new THREE.CanvasTexture(this.canvas));
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.generateMipmaps = false;
    this.tex.minFilter = THREE.LinearFilter;

    const tagGeo = track.geometry(new THREE.PlaneGeometry(1, 1));
    this.tagRow = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 2), 2);
    this.tagRow.setUsage(THREE.DynamicDrawUsage);
    tagGeo.setAttribute('aRow', this.tagRow);
    const tagMat = track.material(
      new THREE.ShaderMaterial({
        uniforms: { map: { value: this.tex } },
        vertexShader: /* glsl */ `
          attribute vec2 aRow; // x = atlas row, y = used width fraction
          varying vec2 vUv;
          void main() {
            vUv = vec2((0.5 + (uv.x - 0.5) * aRow.y), 1.0 - (aRow.x + 1.0 - uv.y) / ${ROWS.toFixed(1)});
            gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D map;
          varying vec2 vUv;
          void main() {
            vec4 c = texture2D(map, vUv);
            if (c.a < 0.02) discard;
            gl_FragColor = linearToOutputTexel(c);
          }`,
        transparent: true,
        depthTest: false,
        depthWrite: false,
      })
    );
    this.tags = new THREE.InstancedMesh(tagGeo, tagMat, capacity);
    this.tags.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.tags.frustumCulled = false;
    this.tags.renderOrder = 96;
    this.tags.count = 0;
    parent.add(this.bars, this.tags);
  }

  private rowFor(text: string, color: string, size: number) {
    const key = `${size}|${color}|${text}`;
    let r = this.rows.get(key);
    if (r) return r;
    if (this.nextRow >= ROWS) {
      // Atlas full (many distinct strings): start over; rows are redrawn on demand.
      this.rows.clear();
      this.nextRow = 0;
      this.ctx.clearRect(0, 0, ATLAS_W, ROW_H * ROWS);
    }
    const row = this.nextRow++;
    const c = this.ctx;
    const y = row * ROW_H;
    c.clearRect(0, y, ATLAS_W, ROW_H);
    c.font = `bold ${size * PX}px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = size * 0.7;
    c.strokeStyle = INK;
    c.strokeText(text, ATLAS_W / 2, y + ROW_H / 2 + 1, ATLAS_W - 8);
    c.fillStyle = color;
    c.fillText(text, ATLAS_W / 2, y + ROW_H / 2 + 1, ATLAS_W - 8);
    const w = Math.min(ATLAS_W, c.measureText(text).width + size * 2);
    this.tex.needsUpdate = true;
    r = { row, w };
    this.rows.set(key, r);
    return r;
  }

  begin() {
    this.barCount = 0;
    this.tagCount = 0;
  }

  private quad(mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, w: number, h: number) {
    pos.set(x, y, z);
    scl.set(w, h, 1);
    m4.compose(pos, quat, scl);
    mesh.setMatrixAt(i, m4);
  }

  /** Health bar centred at sim (x, y) (y = top of the bar, canvas units), depth z in three units. */
  bar(x: number, y: number, z: number, w: number, h: number, ratio: number, fill: string) {
    if (this.barCount + 2 > this.bars.instanceMatrix.count) return;
    const cx = x * S;
    const cy = -(y + h / 2) * S;
    this.quad(this.bars, this.barCount, cx, cy, z, (w + 4) * S, (h + 4) * S);
    this.bars.setColorAt(this.barCount++, cssColor(INK));
    const fw = w * Math.max(0, Math.min(1, ratio));
    if (fw > 0.01) {
      this.quad(this.bars, this.barCount, cx - ((w - fw) / 2) * S, cy, z + 0.001, fw * S, h * S);
      this.bars.setColorAt(this.barCount++, cssColor(fill));
    }
  }

  /** Text tag centred at sim (x, y) (baseline-ish centre), font size in canvas px. */
  tag(text: string, color: string, x: number, y: number, z: number, size = 9) {
    if (this.tagCount >= this.tags.instanceMatrix.count) return;
    const r = this.rowFor(text, color, size);
    const wPx = r.w / PX;
    this.quad(this.tags, this.tagCount, x * S, -y * S, z, wPx * S, (ROW_H / PX) * S);
    this.tagRow.setXY(this.tagCount, r.row, r.w / ATLAS_W);
    this.tagCount++;
  }

  end() {
    this.bars.count = this.barCount;
    this.tags.count = this.tagCount;
    this.bars.visible = this.barCount > 0;
    this.tags.visible = this.tagCount > 0;
    if (this.barCount) {
      this.bars.instanceMatrix.needsUpdate = true;
      this.bars.instanceColor!.needsUpdate = true;
    }
    if (this.tagCount) {
      this.tags.instanceMatrix.needsUpdate = true;
      this.tagRow.needsUpdate = true;
    }
  }

  dispose() {
    this.parent.remove(this.bars, this.tags);
    this.bars.dispose();
    this.tags.dispose();
  }
}
