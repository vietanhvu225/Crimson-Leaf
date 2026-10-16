import * as THREE from 'three';
import { InstancedBatch, type InstancedBatchOptions } from '../instanced.ts';
import { BLOOM_LAYER } from '../post.ts';
import type { Tracker } from '../resources.ts';

// Shared VFX resources: procedural CanvasTextures (soft glow, beam, ring), additive materials and an
// InstancedBatch that can sit on the bloom layer. Built once per renderer, freed by the Tracker.

function canvasTexture(track: Tracker, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  const tex = track.texture(new THREE.CanvasTexture(canvas));
  // Additive masks: keep values linear so the falloff is exactly what was drawn.
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

/** Batch that re-applies the bloom layer after a capacity grow (grow() rebuilds the mesh). */
export class FxBatch extends InstancedBatch {
  private bloom: boolean;
  constructor(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    capacity: number,
    bloom: boolean,
    opts: InstancedBatchOptions = {}
  ) {
    super(parent, geometry, material, capacity, opts);
    this.bloom = bloom;
    this.applyLayer();
  }
  private applyLayer() {
    if (this.bloom) this.mesh.layers.enable(BLOOM_LAYER);
  }
  override end() {
    super.end();
    this.applyLayer();
    this.mesh.visible = this.mesh.count > 0;
  }
}

export interface FxKit {
  track: Tracker;
  root: THREE.Group;
  quad: THREE.PlaneGeometry;
  /** Soft round glow (additive). */
  glowMat: THREE.MeshBasicMaterial;
  /** Beam with soft edges across its width (additive): lightning, streaks, trails, god rays. */
  beamMat: THREE.MeshBasicMaterial;
  /** Thin bright ring (additive): shock waves, bubbles, pedestals. */
  ringMat: THREE.MeshBasicMaterial;
  /** Additive flat colour (flames, aura shapes). */
  addMat: THREE.MeshBasicMaterial;
  /** Opaque lit material for small solid props (kunai, items, ice). */
  litMat: THREE.MeshStandardMaterial;
  /** Unlit opaque (petals, shards): readable regardless of lighting. */
  flatMat: THREE.MeshBasicMaterial;
  batch(geometry: THREE.BufferGeometry, material: THREE.Material, capacity: number, bloom: boolean, opts?: InstancedBatchOptions): FxBatch;
  dispose(): void;
}

export function createFxKit(track: Tracker, scene: THREE.Scene): FxKit {
  const root = new THREE.Group();
  root.name = 'vfx';
  scene.add(root);

  const glowTex = canvasTexture(track, 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,255,255,0.65)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.16)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = '#000';
    c.fillRect(0, 0, 64, 64);
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  });
  const beamTex = canvasTexture(track, 4, 64, (c) => {
    const g = c.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgb(0,0,0)');
    g.addColorStop(0.3, 'rgb(90,90,90)');
    g.addColorStop(0.5, 'rgb(255,255,255)');
    g.addColorStop(0.7, 'rgb(90,90,90)');
    g.addColorStop(1, 'rgb(0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 4, 64);
  });
  const ringTex = canvasTexture(track, 64, 64, (c) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, 64, 64);
    const g = c.createRadialGradient(32, 32, 18, 32, 32, 31);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.25)');
    g.addColorStop(0.82, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 64, 64);
  });

  const additive = (map: THREE.Texture | null) =>
    track.material(
      new THREE.MeshBasicMaterial({
        map,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
        fog: false,
        side: THREE.DoubleSide,
      })
    );

  const quad = track.geometry(new THREE.PlaneGeometry(1, 1));
  const kit: FxKit = {
    track,
    root,
    quad,
    glowMat: additive(glowTex),
    beamMat: additive(beamTex),
    ringMat: additive(ringTex),
    addMat: additive(null),
    litMat: track.material(new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.25 })),
    flatMat: track.material(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })),
    batch(geometry, material, capacity, bloom, opts) {
      return new FxBatch(root, geometry, material, capacity, bloom, { renderOrder: 6, ...opts });
    },
    dispose() {
      scene.remove(root);
    },
  };
  return kit;
}

const segTmp = { x: 0, y: 0, len: 0, ang: 0 };

/** Midpoint, length and angle of a segment in three units (input in three units). */
export function segment(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  segTmp.x = (x1 + x2) / 2;
  segTmp.y = (y1 + y2) / 2;
  segTmp.len = Math.hypot(dx, dy);
  segTmp.ang = Math.atan2(dy, dx);
  return segTmp;
}

/** Cheap deterministic hash in [0, 1) for per-index visual variation. */
export function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
