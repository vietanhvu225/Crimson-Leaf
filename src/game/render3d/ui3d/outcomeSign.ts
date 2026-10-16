import * as THREE from 'three';
import { SEASONS, type SeasonId } from '../../rules/index.ts';
import { BLOOM_LAYER } from '../post.ts';
import type { Tracker } from '../resources.ts';
import { CanvasPlate, UI_FONT, inkText } from './plate.ts';

// Victory / defeat sign (?ui=3d game over): a lacquer board with a gold frame that drops in and
// sways in camera space, next to (landscape) or above (portrait) the DOM result modal, which keeps
// all the stats and buttons.

const DEPTH = 6;
const TEX_W = 1024;
const TEX_H = 300;
const BOARD_W = 3.4;
const BOARD_H = (BOARD_W * TEX_H) / TEX_W;

export class OutcomeSign {
  readonly group = new THREE.Group();
  private plate: CanvasPlate;
  private shownAt = -1;
  private frame: THREE.Mesh;
  private frameMat: THREE.MeshStandardMaterial;

  constructor(track: Tracker) {
    this.plate = new CanvasPlate(track, TEX_W, TEX_H);
    this.frameMat = track.material(new THREE.MeshStandardMaterial({ color: '#b45309', roughness: 0.35, metalness: 0.6, fog: false }));
    const boardMat = track.material(new THREE.MeshStandardMaterial({ color: '#1c0a10', roughness: 0.4, fog: false }));
    this.frame = new THREE.Mesh(track.geometry(new THREE.BoxGeometry(BOARD_W + 0.16, BOARD_H + 0.16, 0.1)), this.frameMat);
    const board = new THREE.Mesh(track.geometry(new THREE.BoxGeometry(BOARD_W, BOARD_H, 0.14)), boardMat);
    const face = new THREE.Mesh(
      track.geometry(new THREE.PlaneGeometry(BOARD_W, BOARD_H)),
      track.material(
        new THREE.MeshBasicMaterial({ map: this.plate.texture, transparent: true, depthWrite: false, fog: false, toneMapped: false })
      )
    );
    face.position.z = 0.075;
    face.layers.enable(BLOOM_LAYER);
    // Two hanging cords.
    const cordGeo = track.geometry(new THREE.CylinderGeometry(0.015, 0.015, 1.2, 6));
    for (const sx of [-1, 1]) {
      const cord = new THREE.Mesh(cordGeo, this.frameMat);
      cord.position.set(sx * BOARD_W * 0.38, BOARD_H / 2 + 0.6, -0.02);
      this.group.add(cord);
    }
    this.group.add(this.frame, board, face);
    this.group.visible = false;
  }

  update(camera: THREE.PerspectiveCamera, outcome: 'victory' | 'defeat', seasonId: SeasonId, loop2: boolean, clock: number) {
    const win = outcome === 'victory';
    const cfg = SEASONS[seasonId];
    this.plate.draw(`${outcome}|${seasonId}|${loop2}`, (c, w, h) => {
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      const g = c.createLinearGradient(0, 40, 0, 200);
      if (win) {
        g.addColorStop(0, '#fef9c3');
        g.addColorStop(1, '#f59e0b');
      } else {
        g.addColorStop(0, '#fecdd3');
        g.addColorStop(1, '#e11d48');
      }
      inkText(c, win ? 'ĐẠI THẮNG' : 'BẠI TRẬN', w / 2, 118, 140, g, 900, w - 60);
      c.font = `700 40px ${UI_FONT}`;
      c.fillStyle = win ? '#fde68a' : '#fda4af';
      c.fillText(`${cfg.vietnameseTitle}${loop2 ? ' · Vòng 2' : ''}`, w / 2, 236, w - 80);
    });
    this.frameMat.color.set(win ? '#d97706' : '#7f1d1d');

    if (this.shownAt < 0) this.shownAt = clock;
    const age = clock - this.shownAt;
    const halfH = DEPTH * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const halfW = halfH * camera.aspect;
    const portrait = camera.aspect < 0.9;
    // Fit: at most 80 % of the view width (portrait) / 44 % (landscape, modal on the right).
    const fitW = (portrait ? 1.6 : 0.88) * halfW;
    const s = Math.min(1, fitW / BOARD_W);
    const x = portrait ? 0 : -halfW * 0.48;
    const y = portrait ? halfH * 0.62 : halfH * 0.2;
    // Drop in with a little overshoot, then sway.
    const k = Math.min(1, age / 0.7);
    const back = 1 + 2.2 * Math.pow(k - 1, 3) + 1.2 * Math.pow(k - 1, 2);
    this.group.position.set(x, y + (1 - back) * halfH * 1.2, -DEPTH);
    this.group.rotation.set(0.05, Math.sin(clock * 0.7) * 0.22, Math.sin(clock * 1.1) * 0.03);
    this.group.scale.setScalar(s);
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
    this.shownAt = -1;
  }
}
