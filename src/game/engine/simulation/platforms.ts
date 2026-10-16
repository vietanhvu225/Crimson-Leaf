import { spawnBanner } from '../spawn.ts';
import type { World } from '../world.ts';
import type { Frame } from './frame.ts';

// Moving / collapsing platforms.

export function updateMovingPlatforms(world: World, f: Frame) {
  // Dynamic Moving & Collapsing Platforms Update
  for (const plat of world.platforms) {
    const prevX = plat.x;
    const prevY = plat.y;
    if (plat.type === 'moving') {
      const sp = plat.moveSpeed ?? 1.8;
      const ph = plat.movePhase ?? 0;
      if (plat.moveAmpX) {
        plat.x = plat.baseX + Math.sin(world.stageTimeSec * sp + ph) * plat.moveAmpX;
      }
      if (plat.moveAmpY) {
        plat.y = plat.baseY + Math.cos(world.stageTimeSec * sp + ph) * plat.moveAmpY;
      }
      if (world.player.onGround && world.player.standingPlatform === plat) {
        world.player.x += plat.x - prevX;
        world.player.y += plat.y - prevY;
      }
    } else if (plat.type === 'collapsing') {
      if (plat.respawnTimer && plat.respawnTimer > 0) {
        plat.respawnTimer = Math.max(0, plat.respawnTimer - f.dt);
      } else if (plat.collapseTimer && plat.collapseTimer > 0) {
        plat.collapseTimer -= f.dt;
        if (plat.collapseTimer <= 0) {
          plat.collapseTimer = 0;
          plat.respawnTimer = 3.0;
          spawnBanner(world, plat.x + plat.w * 0.5, plat.y - 20, 'CẦU SẮT SỤP ĐỔ!', '#f97316');
        }
      }
    }
  }
}
