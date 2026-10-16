import * as THREE from 'three';
import { S } from './coords.ts';
import type { Tracker } from './resources.ts';

// World-space text (banners, gate labels): a Sprite with its own CanvasTexture, redrawn only when
// the text or colour changes. Sized so 1 canvas px ≈ 1 sim px at z = 0, like the canvas renderer.

const FONT = 'bold 26px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
const TEX_W = 1024;
const TEX_H = 48;
/** Canvas is drawn at 2× the canvas renderer's 13px font. */
const PX_PER_SIM = 2;

export class TextSprite {
  readonly sprite: THREE.Sprite;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private material: THREE.SpriteMaterial;
  private text = '';
  private color = '';
  private bg = '';

  constructor(track: Tracker, parent: THREE.Object3D) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = TEX_W;
    this.canvas.height = TEX_H;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = track.texture(new THREE.CanvasTexture(this.canvas));
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
    this.material = track.material(
      new THREE.SpriteMaterial({
        map: this.texture,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        fog: false,
      })
    );
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.scale.set((TEX_W / PX_PER_SIM) * S, (TEX_H / PX_PER_SIM) * S, 1);
    this.sprite.renderOrder = 100;
    this.sprite.visible = false;
    parent.add(this.sprite);
  }

  /** `bg`: optional plate colour behind the text. */
  set(text: string, color: string, bg = '') {
    if (text === this.text && color === this.color && bg === this.bg) return;
    this.text = text;
    this.color = color;
    this.bg = bg;
    const c = this.ctx;
    c.clearRect(0, 0, TEX_W, TEX_H);
    c.font = FONT;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    if (bg) {
      const w = Math.min(TEX_W - 4, c.measureText(text).width + 36);
      c.fillStyle = bg;
      c.beginPath();
      c.roundRect((TEX_W - w) / 2, 2, w, TEX_H - 4, 14);
      c.fill();
    }
    c.lineJoin = 'round';
    c.lineWidth = 7;
    c.strokeStyle = '#1a0f0a';
    c.strokeText(text, TEX_W / 2, TEX_H / 2 + 1);
    c.fillStyle = color;
    c.fillText(text, TEX_W / 2, TEX_H / 2 + 1);
    this.texture.needsUpdate = true;
  }

  place(x: number, y: number, z: number, opacity: number) {
    this.sprite.position.set(x, y, z);
    this.material.opacity = opacity;
    this.sprite.visible = opacity > 0.01;
  }

  hide() {
    this.sprite.visible = false;
  }
}
