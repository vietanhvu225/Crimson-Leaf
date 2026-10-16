import * as THREE from 'three';
import type { Tracker } from '../resources.ts';

// A CanvasTexture the ui3d pieces redraw only when their content changes (never per frame).

export const UI_FONT = '"Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
export const UI_INK = '#1a0f0a';

export class CanvasPlate {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly texture: THREE.CanvasTexture;
  private key = '';

  constructor(track: Tracker, w: number, h: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = track.texture(new THREE.CanvasTexture(this.canvas));
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
  }

  /** Redraws when `key` differs from the last draw. Returns true if it redrew. */
  draw(key: string, paint: (c: CanvasRenderingContext2D, w: number, h: number) => void): boolean {
    if (key === this.key) return false;
    this.key = key;
    const c = this.ctx;
    c.clearRect(0, 0, this.canvas.width, this.canvas.height);
    paint(c, this.canvas.width, this.canvas.height);
    this.texture.needsUpdate = true;
    return true;
  }
}

/**
 * Draws a camera-space UI object over the world-space labels (enemy tags, banners are transparent
 * with depthTest off, so they render in the transparent pass): every mesh joins that pass, skips
 * the depth test and gets a renderOrder above them, in child order.
 */
export function overlay(root: THREE.Object3D, order: number) {
  let i = 0;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      m.transparent = true;
      m.depthTest = false;
      m.depthWrite = false;
    }
    mesh.renderOrder = order + i++;
  });
}

/** Outlined text (ink stroke under the fill), like the canvas renderer's banners. */
export function inkText(
  c: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  fill: string | CanvasGradient,
  weight = 800,
  maxW?: number
) {
  c.font = `${weight} ${size}px ${UI_FONT}`;
  c.lineJoin = 'round';
  c.lineWidth = Math.max(3, size * 0.22);
  c.strokeStyle = UI_INK;
  c.strokeText(text, x, y, maxW);
  c.fillStyle = fill;
  c.fillText(text, x, y, maxW);
}
