import React, { useEffect, useRef } from 'react';
import type { SkillBranchId } from '../game/rules';
import { createWorld, type HostState, type World } from '../game/engine/world';
import type { TouchInputState } from '../game/engine/entities';
import { attachInput } from '../game/engine/input';
import { rebuildLevel } from '../game/engine/level';
import { stepSimulation } from '../game/engine/simulation';
import { installDebugHooks } from '../game/engine/debug';
import {
  cycleElement,
  toggleImmortal,
  triggerAwakening,
  upgradeSkill,
} from '../game/engine/actions';
import { renderScene } from '../game/render/scene';

interface GameCanvasProps extends HostState {
  resetToken?: number;
  touchInputRef: React.MutableRefObject<TouchInputState>;
  awakenTriggerToken: number;
  immortalToggleToken: number;
  skillUpgradeRequest: { branch: SkillBranchId; token: number } | null;
  elementCycleToken: number;
}

/** React host for the canvas engine: owns the <canvas>, the rAF loop and prop → engine wiring. */
export const GameCanvas: React.FC<GameCanvasProps> = ({
  resetToken = 0,
  touchInputRef,
  awakenTriggerToken,
  immortalToggleToken,
  skillUpgradeRequest,
  elementCycleToken,
  ...host
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const worldRef = useRef<World | null>(null);

  // Engine reads host state through this ref every frame.
  const stateRef = useRef<HostState>(host);
  useEffect(() => {
    stateRef.current = host;
  });

  const { seasonId, loopRoute, gameState } = host;

  useEffect(() => {
    if (worldRef.current && gameState === 'playing') {
      rebuildLevel(worldRef.current, seasonId, loopRoute);
    }
  }, [seasonId, loopRoute, gameState, resetToken]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const world = createWorld(canvas, ctx, stateRef, touchInputRef);
    worldRef.current = world;

    const updateCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      world.viewW = window.innerWidth;
      world.viewH = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(world.viewW * dpr));
      canvas.height = Math.max(1, Math.floor(world.viewH * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      world.canvasRect = canvas.getBoundingClientRect();
    };
    updateCanvasSize();
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(canvas);

    const detachInput = attachInput(world);
    rebuildLevel(world, stateRef.current.seasonId, stateRef.current.loopRoute);
    installDebugHooks(world, () => renderScene(world));

    let rafId = 0;
    const loop = (now: number) => {
      const rawDt = (now - world.lastTime) / 1000;
      world.lastTime = now;
      try {
        stepSimulation(world, rawDt);
        renderScene(world);
      } catch (err) {
        console.error('Game loop frame error recovered:', err);
      }
      rafId = window.requestAnimationFrame(loop);
    };
    rafId = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      detachInput();
      worldRef.current = null;
    };
  }, [touchInputRef]);

  return (
    <canvas
      ref={canvasRef}
      data-testid="game-canvas"
      tabIndex={0}
      className="fixed inset-0 w-full h-full block focus:outline-none cursor-crosshair"
    />
  );
};
