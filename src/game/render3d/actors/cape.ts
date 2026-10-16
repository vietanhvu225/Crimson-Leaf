import * as THREE from 'three';
import { S } from '../coords.ts';
import { cssColor, type Tracker } from '../resources.ts';

// The protagonist's red cloak: a ribbon through the sim's cloakNodes (verlet-ish chain the engine
// already updates), rebuilt every frame into a fixed-size buffer. Four rows across the width give
// a coloured hem along the top edge and a billow away from the camera in the middle.

const ROWS = 4;

export interface CapeNode {
  x: number;
  y: number;
}

export class Cape {
  readonly mesh: THREE.Mesh;
  private geo: THREE.BufferGeometry;
  private pos: Float32Array;
  private col: Float32Array;
  private cols: number;

  constructor(parent: THREE.Object3D, track: Tracker, material: THREE.Material, nodes = 6) {
    this.cols = nodes + 1; // + tip
    const n = ROWS * this.cols;
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.geo = track.geometry(new THREE.BufferGeometry());
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    const idx: number[] = [];
    for (let r = 0; r < ROWS - 1; r++) {
      for (let c = 0; c < this.cols - 1; c++) {
        const a = r * this.cols + c;
        const b = a + 1;
        const d = a + this.cols;
        const e = d + 1;
        idx.push(a, d, b, b, d, e);
      }
    }
    this.geo.setIndex(idx);
    this.mesh = new THREE.Mesh(this.geo, material);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
    parent.add(this.mesh);
  }

  /**
   * nodes: sim px (y down). z: three-units depth of the wearer. Widths follow drawChibiCloak.
   */
  update(nodes: CapeNode[], facing: 1 | -1, z: number, t: number, awakened: boolean, hem: string) {
    const count = Math.min(nodes.length, this.cols - 1);
    const red = cssColor(awakened ? '#f43f5e' : '#e11d48');
    const band = cssColor(awakened ? '#fef08a' : hem);
    const dark = cssColor('#9f1239');
    let lastTopX = 0;
    let lastTopY = 0;
    let lastBotX = 0;
    let lastBotY = 0;
    for (let i = 0; i < this.cols; i++) {
      let cx: number;
      let cy: number;
      let nx: number;
      let ny: number;
      let half: number;
      let wave: number;
      const tt = i / Math.max(1, count - 1);
      if (i < count) {
        const cur = nodes[i];
        const next = nodes[Math.min(count - 1, i + 1)];
        const prev = nodes[Math.max(0, i - 1)];
        const dx = next.x - prev.x || -facing;
        const dy = next.y - prev.y;
        const len = Math.hypot(dx, dy) || 1;
        nx = -dy / len;
        ny = dx / len;
        half = (awakened ? 1.25 : 1) * (5 + Math.sin(Math.min(1, tt) * Math.PI) * 11 * (1 - tt * 0.15));
        wave = Math.sin(t * 13 - i * 1.1) * (tt * 2.8);
        cx = cur.x;
        cy = cur.y - 4 + wave;
      } else {
        // Tip: midpoint of the last edge pushed outward (canvas midEnd).
        cx = (lastTopX + lastBotX) * 0.5 - facing * 5;
        cy = (lastTopY + lastBotY) * 0.5 + 1;
        nx = 0;
        ny = 0;
        half = 0;
        wave = 0;
      }
      const topX = cx + nx * half;
      const topY = cy + ny * half;
      const botX = cx - nx * half;
      const botY = cy - ny * half + (i < count ? tt * 6 : 0);
      if (i < count) {
        lastTopX = topX;
        lastTopY = topY;
        lastBotX = botX;
        lastBotY = botY;
      }
      // Rows: hem (top edge), just under the hem, billowed middle, bottom edge.
      const billow = -(0.04 + Math.sin(Math.min(1, tt) * Math.PI) * 0.08);
      const rowsXY = [
        [topX, topY, 0],
        [topX + (botX - topX) * 0.14, topY + (botY - topY) * 0.14, billow * 0.4],
        [(topX + botX) * 0.5, (topY + botY) * 0.5, billow],
        [botX, botY, 0],
      ];
      for (let r = 0; r < ROWS; r++) {
        const k = (r * this.cols + i) * 3;
        this.pos[k] = rowsXY[r][0] * S;
        this.pos[k + 1] = -rowsXY[r][1] * S;
        this.pos[k + 2] = z - 0.1 + rowsXY[r][2];
        const c = r === 0 ? band : r === 3 ? dark : red;
        this.col[k] = c.r;
        this.col[k + 1] = c.g;
        this.col[k + 2] = c.b;
      }
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
    this.geo.computeVertexNormals();
    this.mesh.visible = true;
  }

  hide() {
    this.mesh.visible = false;
  }

  dispose(parent: THREE.Object3D) {
    parent.remove(this.mesh);
  }
}
