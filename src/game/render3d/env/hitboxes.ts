import * as THREE from 'three';
import type { World } from '../../engine/world.ts';
import { S, laneSpan } from '../coords.ts';
import type { RenderFrame3D } from '../module.ts';
import type { Tracker } from '../resources.ts';

// `?debug=1` hitbox overlay: wireframe of what the sim collides with, drawn on top of the kit so
// it proves the platform mesh matches the collision rule. Platforms: the landing band of
// simulation/collision.ts (x - 14 … x + w + 14, y … y + 8) on the platform's lane (front face);
// green = player's lane, grey = other lane. Hazards: their zone rect in red.

const MAX_RECTS = 1024;

export class HitboxOverlay {
  private lines: THREE.LineSegments;
  private pos: Float32Array;
  private col: Float32Array;
  private geo: THREE.BufferGeometry;
  private n = 0;

  constructor(track: Tracker, parent: THREE.Object3D) {
    this.pos = new Float32Array(MAX_RECTS * 8 * 3);
    this.col = new Float32Array(MAX_RECTS * 8 * 3);
    this.geo = track.geometry(new THREE.BufferGeometry());
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    const mat = track.material(
      new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true, toneMapped: false, fog: false })
    );
    this.lines = new THREE.LineSegments(this.geo, mat);
    this.lines.frustumCulled = false;
    this.lines.renderOrder = 999;
    parent.add(this.lines);
  }

  private rect(x0: number, y0: number, x1: number, y1: number, z: number, r: number, g: number, b: number) {
    if (this.n >= MAX_RECTS) return;
    const X0 = x0 * S;
    const X1 = x1 * S;
    const Y0 = -y0 * S;
    const Y1 = -y1 * S;
    const v = [X0, Y0, X1, Y0, X1, Y0, X1, Y1, X1, Y1, X0, Y1, X0, Y1, X0, Y0];
    let o = this.n * 24;
    for (let i = 0; i < 16; i += 2) {
      this.pos[o] = v[i];
      this.pos[o + 1] = v[i + 1];
      this.pos[o + 2] = z;
      this.col[o] = r;
      this.col[o + 1] = g;
      this.col[o + 2] = b;
      o += 3;
    }
    this.n++;
  }

  update(world: World, f: RenderFrame3D) {
    this.n = 0;
    const lane = world.combat.zLane;
    for (const p of world.platforms) {
      if (p.respawnTimer && p.respawnTimer > 0) continue;
      if (p.x + p.w < f.viewMinX || p.x > f.viewMaxX) continue;
      if (p.y > f.viewMaxY + 300 || p.y < f.viewMinY - 300) continue;
      const { z, depth } = laneSpan(p.zLane);
      const same = p.zLane === 'both' || p.zLane === lane;
      if (same) this.rect(p.x - 14, p.y, p.x + p.w + 14, p.y + 8, z + depth / 2 + 0.02, 0.2, 1, 0.3);
      else this.rect(p.x - 14, p.y, p.x + p.w + 14, p.y + 8, z + depth / 2 + 0.02, 0.6, 0.6, 0.6);
      // Visual extent of the platform top (x … x + w) as a second, tighter box.
      this.rect(p.x, p.y - 1, p.x + p.w, p.y + 1, z + depth / 2 + 0.02, 1, 1, 1);
    }
    for (const hz of world.hazards) {
      if (hz.x + hz.w < f.viewMinX || hz.x > f.viewMaxX) continue;
      const y = hz.kind === 'icicle' ? hz.fallY ?? hz.y : hz.y;
      this.rect(hz.x, y, hz.x + hz.w, y + hz.h, 0.7, 1, 0.2, 0.2);
    }
    this.geo.setDrawRange(0, this.n * 8);
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }
}
