import { soundEngine } from '../../audio';
import { applyItemPickup } from '../../rules';
import { spawnBanner, spawnParticle } from '../spawn';
import { World } from '../world';
import { Frame } from './frame';

// Checkpoint shrines and world item pickups.

export function updateCheckpointsAndPickups(world: World, f: Frame) {
  // Checkpoint Torii Gates
  for (const cp of world.checkpoints) {
    if (!cp.activated && Math.hypot(world.player.x - cp.x, world.player.y - cp.y) < 95) {
      cp.activated = true;
      world.combat.hp = Math.min(world.combat.maxHp, world.combat.hp + 30);
      world.combat.chakra = world.combat.maxChakra;
      world.combat.score += 350;
      soundEngine.playAwakening();
      spawnBanner(world, cp.x, cp.y - 75, `TRẠM PHONG ẤN: ${cp.label.toUpperCase()}`, '#fde047');
    }
  }

  // World Collectible Pickups
  const hasMagnet = world.combat.skills.relics.includes('magnet_talisman');
  for (const item of world.worldItems) {
    if (item.collected) continue;
    item.y = item.baseY + Math.sin(world.stageTimeSec * 4 + item.id) * 6;
    const distToItem = Math.hypot(world.player.x - item.x, world.player.y - 24 - item.y);
    if (hasMagnet && distToItem < 220 && distToItem > 20) {
      item.x += ((world.player.x - item.x) / distToItem) * 420 * f.dt;
      item.baseY += ((world.player.y - 24 - item.baseY) / distToItem) * 420 * f.dt;
    }
    if (distToItem < 48) {
      item.collected = true;
      const res = applyItemPickup(world.combat, item.kind);
      world.combat = res.nextState;
      soundEngine.playItemPickup();
      spawnBanner(world, item.x, item.y - 36, res.bannerText, res.bannerColor);
      for (let s = 0; s < 16; s++) {
        const ang = (Math.PI * 2 * s) / 16;
        spawnParticle(
          world,
          item.x,
          item.y,
          Math.cos(ang) * 180,
          Math.sin(ang) * 180,
          4,
          res.bannerColor,
          0.42,
          'spark'
        );
      }
    }
  }
}
