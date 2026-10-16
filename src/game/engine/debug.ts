import { stepSimulation } from './simulation/index.ts';
import type { FrameInput } from './simulation/frameInput.ts';
import type { World } from './world.ts';
import { teleportToBoss, toggleImmortal } from './actions.ts';
import { SEASONS } from '../rules/index.ts';

// window.render_game_to_text / window.advanceTime / window.__game hooks for automated playtests.

/** Renderer-side numbers the host reports through __game.stats(). */
export interface HostStats {
  fps: number;
  drawCalls: number | null;
  triangles: number | null;
}

export interface GameDebugApi {
  world: World;
  /** n fixed steps of 1/60 s, then one render. */
  step(n?: number): void;
  /** Holds/presses inputs as if from the keyboard: held flags stay until set false, *Pressed fire once. */
  setInput(input: Partial<FrameInput>): void;
  stats(): HostStats & { entities: number };
  teleportToBoss(): void;
  toggleImmortal(): void;
}

// FrameInput flag → key code that readFrameInput maps to it.
const HELD_KEYS = { moveLeft: 'KeyA', moveRight: 'KeyD', jumpHeld: 'KeyW' } as const;
const PRESSED_KEYS = {
  jumpPressed: 'KeyW',
  dashPressed: 'ShiftLeft',
  grapplePressed: 'KeyE',
  switchZPressed: 'KeyQ',
  meleePressed: 'KeyJ',
  kunaiPressed: 'KeyK',
} as const;

function applyInput(world: World, input: Partial<FrameInput>) {
  for (const [flag, code] of Object.entries(HELD_KEYS)) {
    const v = input[flag as keyof typeof HELD_KEYS];
    if (v === true) world.keysHeld.add(code);
    else if (v === false) world.keysHeld.delete(code);
  }
  for (const [flag, code] of Object.entries(PRESSED_KEYS)) {
    if (input[flag as keyof typeof PRESSED_KEYS]) world.keysJustPressed.add(code);
  }
}

function countEntities(world: World): number {
  let n = 1; // player
  for (const e of world.enemies) if (e.hp > 0 || e.koTimer > 0) n++;
  for (const p of world.projectiles) if (p.active) n++;
  for (const p of world.particles) if (p.active) n++;
  for (const b of world.bloodOrbs) if (b.active) n++;
  for (const b of world.lightningBolts) if (b.active) n++;
  for (const b of world.banners) if (b.active) n++;
  return n + world.worldItems.length;
}

/**
 * `render` draws one frame; passed in so the engine stays independent of the renderer.
 * `hostStats` reports fps / draw calls from the host (defaults to unknown).
 */
export function installDebugHooks(
  world: World,
  render: () => void,
  hostStats: () => HostStats = () => ({ fps: 0, drawCalls: null, triangles: null })
): () => void {
  const w = window as unknown as Record<string, unknown>;
  const api: GameDebugApi = {
    world,
    step(n = 1) {
      for (let i = 0; i < n; i++) stepSimulation(world, 1 / 60);
      render();
    },
    setInput(input) {
      applyInput(world, input);
    },
    stats() {
      return { ...hostStats(), entities: countEntities(world) };
    },
    teleportToBoss() {
      teleportToBoss(world);
    },
    toggleImmortal() {
      toggleImmortal(world);
    },
  };
  w.__game = api;
  (window as unknown as Record<string, unknown>).render_game_to_text = () => {
    const cfg = SEASONS[world.stateRef.current.seasonId];
    return JSON.stringify({
      gameState: world.stateRef.current.gameState,
      seasonId: world.stateRef.current.seasonId,
      vietnameseTitle: cfg.vietnameseTitle,
      movementStyleName: cfg.movementStyleName,
      grappleItemName: cfg.grappleItemName,
      bossSkillName: cfg.bossSkillName,
      player: {
        x: Math.round(world.player.x),
        y: Math.round(world.player.y),
        vx: Math.round(world.player.vx),
        vy: Math.round(world.player.vy),
        onGround: world.player.onGround,
        facing: world.player.facing,
      },
      counts: {
        platforms: world.platforms.length,
        trunks: world.trunks.length,
        grapples: world.grapples.length,
        checkpoints: world.checkpoints.length,
        activeEnemies: world.enemies.filter((e) => e.hp > 0).length,
      },
    });
  };

  (window as unknown as Record<string, unknown>).advanceTime = (ms: number) => {
    const steps = Math.max(1, Math.round(ms / 16.67));
    for (let i = 0; i < steps; i++) {
      stepSimulation(world, 0.01667);
    }
    render();
  };

  return () => {
    if (w.__game === api) delete w.__game;
  };
}
