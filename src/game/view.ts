import type { World } from './engine/world.ts';

// Contract between the React host (ui/GameView) and a renderer. Renderers only read the World.

export const RENDERER_KINDS = ['three', 'canvas'] as const;
export type RendererKind = (typeof RENDERER_KINDS)[number];
export const DEFAULT_RENDERER: RendererKind = 'three';

/** `?renderer=` value → renderer kind; unknown values fall back to the default. */
export function parseRendererKind(value: string | null): RendererKind {
  return (RENDERER_KINDS as readonly string[]).includes(value ?? '')
    ? (value as RendererKind)
    : DEFAULT_RENDERER;
}

export interface RenderStats {
  drawCalls: number | null;
  triangles: number | null;
  /** Live GPU resources (three: renderer.info.memory), to spot leaks. */
  geometries?: number | null;
  textures?: number | null;
}

/** Sim-space point (px, y down). */
export interface SimPoint {
  x: number;
  y: number;
}

export interface GameRenderer {
  readonly kind: RendererKind;
  /** Draws one frame of the world. */
  render(world: World): void;
  /** View size in CSS px (= sim px for the canvas renderer). */
  resize(viewW: number, viewH: number): void;
  /** Last frame's GPU-side counters, when the renderer has them. */
  stats(): RenderStats;
  /**
   * View px → sim point under the cursor, using the camera the world is at right now (called from
   * the sim's aim hook, once per step). Renderers without it use the canvas rule: view px + cam.
   */
  viewToWorld?(world: World, viewX: number, viewY: number, out: SimPoint): void;
  /** Releases contexts / GPU resources. The host drops the renderer afterwards. */
  dispose(): void;
}
