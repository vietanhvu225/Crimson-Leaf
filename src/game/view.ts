import type { World } from './engine/world.ts';

// Contract between the React host (ui/GameView) and a renderer. Renderers only read the World.

export const RENDERER_KINDS = ['canvas'] as const;
export type RendererKind = (typeof RENDERER_KINDS)[number];
export const DEFAULT_RENDERER: RendererKind = 'canvas';

/** `?renderer=` value → renderer kind; unknown values fall back to the default. */
export function parseRendererKind(value: string | null): RendererKind {
  return (RENDERER_KINDS as readonly string[]).includes(value ?? '')
    ? (value as RendererKind)
    : DEFAULT_RENDERER;
}

export interface RenderStats {
  drawCalls: number | null;
  triangles: number | null;
}

export interface GameRenderer {
  readonly kind: RendererKind;
  /** Draws one frame of the world. */
  render(world: World): void;
  /** View size in CSS px (= sim px for the canvas renderer). */
  resize(viewW: number, viewH: number): void;
  /** Last frame's GPU-side counters, when the renderer has them. */
  stats(): RenderStats;
  /** Releases contexts / GPU resources. The host drops the renderer afterwards. */
  dispose(): void;
}
