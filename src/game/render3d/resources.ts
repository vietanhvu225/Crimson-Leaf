import * as THREE from 'three';

// Ownership of GPU resources: whatever a module creates is registered here and freed on dispose,
// so switching renderers (or tearing the 3D view down) leaves renderer.info.memory at zero.

interface Disposable {
  dispose(): void;
}

export class Tracker {
  private items = new Set<Disposable>();

  add<T extends Disposable>(item: T): T {
    this.items.add(item);
    return item;
  }

  /** Disposes one item early (e.g. a pool that grew and replaced its geometry). */
  release(item: Disposable) {
    if (this.items.delete(item)) item.dispose();
  }

  geometry<T extends THREE.BufferGeometry>(g: T): T {
    return this.add(g);
  }

  material<T extends THREE.Material>(m: T): T {
    return this.add(m);
  }

  texture<T extends THREE.Texture>(t: T): T {
    return this.add(t);
  }

  disposeAll() {
    for (const item of this.items) item.dispose();
    this.items.clear();
  }
}

// CSS colour string → THREE.Color, cached so the per-frame sync does not re-parse or allocate.
const colorCache = new Map<string, THREE.Color>();

export function cssColor(css: string): THREE.Color {
  let c = colorCache.get(css);
  if (!c) {
    c = new THREE.Color();
    try {
      c.setStyle(css);
    } catch {
      c.set(0xff00ff);
    }
    if (colorCache.size > 512) colorCache.clear();
    colorCache.set(css, c);
  }
  return c;
}

/** mulberry32 for purely visual randomness. render3d never calls world.rng() (sim parity). */
export function visualRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
