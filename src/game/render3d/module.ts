import type * as THREE from 'three';
import type { SeasonConfig } from '../rules/index.ts';
import type { HostState, World } from '../engine/world.ts';
import type { Tracker } from './resources.ts';

// Render modules: each owns one slice of the scene (env, actors, vfx…) and syncs it from the World
// every frame. scene.ts keeps the list; T03/T04/T05 register theirs there with one line each.

/** Which part of the picture a module draws. A registered module replaces the placeholder of its slot. */
export type RenderSlot = 'env' | 'actors' | 'vfx' | 'extra';

export interface RenderModuleContext {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  /** Everything a module creates goes through here so dispose() releases it. */
  track: Tracker;
}

/** Per-frame values shared by all modules (computed once in scene.ts). */
export interface RenderFrame3D {
  st: HostState;
  cfg: SeasonConfig;
  isLoop2: boolean;
  /** Seconds of sim time (world.stageTimeSec): animate from this, not wall clock. */
  t: number;
  /** Visible sim x-range (camera + margin), for culling. */
  viewMinX: number;
  viewMaxX: number;
  viewMinY: number;
  viewMaxY: number;
  /** Increments whenever the level was rebuilt (new platform list, stage or loop change). */
  levelVersion: number;
}

export interface RenderModule {
  update(world: World, f: RenderFrame3D): void;
  dispose(): void;
  /** Optional (T05 post-processing): draws the frame instead of renderer.render(scene, camera). */
  render?(): void;
  /** Optional: the drawing buffer was resized to w × h CSS px (after renderer.setSize). */
  resize?(w: number, h: number): void;
}

export interface RenderModuleDef {
  slot: RenderSlot;
  name: string;
  create(ctx: RenderModuleContext): RenderModule;
}
