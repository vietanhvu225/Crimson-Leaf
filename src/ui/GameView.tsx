import React, { useEffect, useRef } from 'react';
import type { SkillBranchId } from '../game/rules';
import { createWorld, setAimWorld, type HostState, type World } from '../game/engine/world.ts';
import type { TouchInputState } from '../game/engine/entities.ts';
import { attachInput, type PointerState } from '../game/engine/input.ts';
import { rebuildLevel } from '../game/engine/level/index.ts';
import { stepSimulation } from '../game/engine/simulation/index.ts';
import { installDebugHooks, type HostStats } from '../game/engine/debug.ts';
import {
  cycleElement,
  toggleImmortal,
  triggerAwakening,
  upgradeSkill,
} from '../game/engine/actions.ts';
import type { GameRenderer, RenderStats, RendererKind, SimPoint } from '../game/view.ts';
import { createCanvasRenderer } from '../game/render/canvasView.ts';
import { createThreeRenderer } from '../game/render3d/scene.ts';

interface GameViewProps extends HostState {
  resetToken?: number;
  touchInputRef: React.MutableRefObject<TouchInputState>;
  awakenTriggerToken: number;
  immortalToggleToken: number;
  skillUpgradeRequest: { branch: SkillBranchId; token: number } | null;
  elementCycleToken: number;
  /** Sim RNG seed (`?seed`). */
  seed: number;
  /** `math`: sim draws from the global Math.random (parity tests only, `?rng=math`). */
  rngMode: 'seeded' | 'math';
  /** `?renderer`. */
  renderer: RendererKind;
  /** `?debug=1`: FPS / draw calls / triangles overlay. */
  debug: boolean;
  /** `?cam=flat`: the three camera looks straight down -z (no tilt). */
  camFlat?: boolean;
  /** `?ui=3d`: rebuild the level when the stage changes on the title too (live 3D preview behind it). */
  rebuildOnTitle?: boolean;
}

function createRenderer(
  kind: RendererKind,
  canvas: HTMLCanvasElement,
  camFlat: boolean
): GameRenderer | null {
  switch (kind) {
    case 'canvas':
      return createCanvasRenderer(canvas);
    case 'three':
      return createThreeRenderer(canvas, { flat: camFlat });
  }
}

/**
 * React host for the engine: owns the World, the rAF loop (one stepSimulation per frame, as the
 * original), input, prop → engine wiring, and the renderer chosen by `renderer`.
 */
export const GameView: React.FC<GameViewProps> = ({
  resetToken = 0,
  touchInputRef,
  awakenTriggerToken,
  immortalToggleToken,
  skillUpgradeRequest,
  elementCycleToken,
  seed,
  rngMode,
  renderer,
  debug,
  camFlat = false,
  rebuildOnTitle = false,
  ...host
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const worldRef = useRef<World | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  // Extra renderer counters (geometries/textures) ride along into __game.stats().
  const statsRef = useRef<HostStats & RenderStats>({ fps: 0, drawCalls: null, triangles: null });

  // Engine reads host state through this ref every frame.
  const stateRef = useRef<HostState>(host);
  useEffect(() => {
    stateRef.current = host;
  });

  const { seasonId, loopRoute, gameState } = host;

  useEffect(() => {
    if (worldRef.current && (gameState === 'playing' || (rebuildOnTitle && gameState === 'title'))) {
      rebuildLevel(worldRef.current, seasonId, loopRoute);
    }
  }, [seasonId, loopRoute, gameState, resetToken, rebuildOnTitle]);

  useEffect(() => {
    if (awakenTriggerToken > 0 && worldRef.current) triggerAwakening(worldRef.current);
  }, [awakenTriggerToken]);

  useEffect(() => {
    if (immortalToggleToken > 0 && worldRef.current) toggleImmortal(worldRef.current);
  }, [immortalToggleToken]);

  useEffect(() => {
    if (skillUpgradeRequest && skillUpgradeRequest.token > 0 && worldRef.current) {
      upgradeSkill(worldRef.current, skillUpgradeRequest.branch);
    }
  }, [skillUpgradeRequest]);

  useEffect(() => {
    if (elementCycleToken > 0 && worldRef.current) cycleElement(worldRef.current);
  }, [elementCycleToken]);

  // World, input and loop. Independent of the renderer, so switching renderers keeps the run.
  useEffect(() => {
    const world = createWorld({
      stateRef,
      touchInputRef,
      seed,
      rng: rngMode === 'math' ? () => Math.random() : undefined,
      viewW: window.innerWidth,
      viewH: window.innerHeight,
      isHeadless: /HeadlessChrome/i.test(navigator.userAgent),
    });
    worldRef.current = world;

    // Aim, with the camera of the step that reads input. Canvas: view px + cam (1 px = 1 sim unit).
    // Three: the renderer raycasts the cursor onto the z = 0 plane for that same camera.
    const pointer: PointerState = { viewX: world.viewW * 0.65, viewY: world.viewH * 0.45 };
    const aim: SimPoint = { x: 0, y: 0 };
    world.aimSync = () => {
      const view = rendererRef.current;
      if (view?.viewToWorld) {
        view.viewToWorld(world, pointer.viewX, pointer.viewY, aim);
        setAimWorld(world, aim.x, aim.y);
      } else {
        setAimWorld(world, pointer.viewX + world.camX, pointer.viewY + world.camY);
      }
    };
    world.onAimReset = (x, y) => {
      pointer.viewX = x;
      pointer.viewY = y;
    };
    const detachInput = attachInput(world, pointer, () =>
      canvasRef.current ? canvasRef.current.getBoundingClientRect() : { left: 0, top: 0 }
    );
    rebuildLevel(world, stateRef.current.seasonId, stateRef.current.loopRoute);
    const render = () => rendererRef.current?.render(world);
    // Renderer counters are read live (not from the 500 ms rAF window) so __game.step() callers
    // see the frame they just rendered, also with the rAF loop stopped (bot.mjs).
    const uninstallHooks = installDebugHooks(world, render, () => ({
      ...statsRef.current,
      ...(rendererRef.current?.stats() ?? {}),
    }));

    let rafId = 0;
    let fpsFrames = 0;
    let fpsWindowStart = performance.now();
    const loop = (now: number) => {
      const rawDt = (now - world.lastTime) / 1000;
      world.lastTime = now;
      try {
        stepSimulation(world, rawDt);
        render();
      } catch (err) {
        console.error('Game loop frame error recovered:', err);
      }
      fpsFrames++;
      if (now - fpsWindowStart >= 500) {
        const r: RenderStats = rendererRef.current?.stats() ?? { drawCalls: null, triangles: null };
        statsRef.current = {
          fps: Math.round((fpsFrames * 10000) / (now - fpsWindowStart)) / 10,
          drawCalls: r.drawCalls,
          triangles: r.triangles,
          geometries: r.geometries,
          textures: r.textures,
        };
        fpsFrames = 0;
        fpsWindowStart = now;
        const overlay = overlayRef.current;
        if (overlay) {
          const s = statsRef.current;
          overlay.textContent =
            `${rendererRef.current?.kind ?? '-'} · ${s.fps.toFixed(0)} fps` +
            ` · draws ${s.drawCalls ?? '-'} · tris ${s.triangles ?? '-'}` +
            (r.geometries != null ? ` · geo ${r.geometries} · tex ${r.textures}` : '');
        }
      }
      rafId = window.requestAnimationFrame(loop);
    };
    rafId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(rafId);
      detachInput();
      uninstallHooks();
      worldRef.current = null;
    };
  }, [touchInputRef, seed, rngMode]);

  // Renderer bound to the current <canvas> (keyed by kind, so a switch gets a fresh element).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // No WebGL → fall back to the canvas renderer on the same (still context-free) element.
    const view =
      createRenderer(renderer, canvas, camFlat) ??
      (renderer === 'three' ? createCanvasRenderer(canvas) : null);
    if (!view) return;
    rendererRef.current = view;
    const updateSize = () => {
      const world = worldRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (world) {
        world.viewW = w;
        world.viewH = h;
      }
      view.resize(w, h);
    };
    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(canvas);
    return () => {
      resizeObserver.disconnect();
      if (rendererRef.current === view) rendererRef.current = null;
      view.dispose();
    };
  }, [renderer, camFlat]);

  return (
    <>
      <canvas
        key={renderer}
        ref={canvasRef}
        data-testid="game-canvas"
        data-renderer={renderer}
        tabIndex={0}
        className="fixed inset-0 w-full h-full block focus:outline-none cursor-crosshair"
      />
      {debug && (
        <div
          ref={overlayRef}
          data-testid="debug-overlay"
          className="fixed top-1 left-1/2 -translate-x-1/2 z-50 px-2 py-0.5 rounded bg-black/70 text-[11px] font-mono text-lime-300 pointer-events-none"
        />
      )}
    </>
  );
};
