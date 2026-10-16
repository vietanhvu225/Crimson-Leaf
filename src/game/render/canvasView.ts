import type { GameRenderer } from '../view.ts';
import { renderScene } from './scene.ts';

/** Canvas 2D renderer bound to one <canvas>: owns the 2D context and the DPR backing-store size. */
export function createCanvasRenderer(canvas: HTMLCanvasElement): GameRenderer | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  return {
    kind: 'canvas',
    render(world) {
      renderScene(ctx, world);
    },
    resize(viewW, viewH) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(viewW * dpr));
      canvas.height = Math.max(1, Math.floor(viewH * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    },
    stats() {
      return { drawCalls: null, triangles: null };
    },
    dispose() {},
  };
}
