import { stepSimulation } from './simulation/index.ts';
import type { World } from './world.ts';
import { SEASONS } from '../rules/index.ts';

// window.render_game_to_text / window.advanceTime hooks for automated playtests.

/** `render` draws one frame; passed in so the engine stays independent of the renderer. */
export function installDebugHooks(world: World, render: () => void): void {
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
}
