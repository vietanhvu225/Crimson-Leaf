import { computeKageAmbushSpawn } from '../../rules';
import { spawnBanner, spawnParticle } from '../spawn';
import { World } from '../world';
import { Frame } from './frame';

// Legend of Kage ambush wave spawner.

export function updateAmbushWaves(world: World, f: Frame) {
  // Dynamic Legend of Kage Ambush Wave Spawner (Canopy Drops, Super-Jump Tree Vaults, Trunk Ambushes & Water Bursts)
  const inBossZone =
    f.cfg.scrollMode === 'horizontal'
      ? world.player.x > f.cfg.stageLength - 1150
      : world.player.y < 420;
  if (!inBossZone && !world.outcomeTriggered) {
    world.kageWaveTimer -= f.dt;
    if (world.kageWaveTimer <= 0) {
      const nearbyActiveCount = world.enemies.filter(
        (e) =>
          e.hp > 0 &&
          e.archetype !== 'boss' &&
          e.gateId === undefined &&
          Math.hypot(e.x - world.player.x, e.y - world.player.y) < 640
      ).length;

      if (nearbyActiveCount < 2) {
        let nearestTrunkX: number | null = null;
        let bestTrunkDist = 360;
        for (const tr of world.trunks) {
          if (tr.zDepth !== 0) continue;
          const td = Math.abs(tr.x - (world.player.x + world.player.facing * 160));
          if (td < bestTrunkDist) {
            bestTrunkDist = td;
            nearestTrunkX = tr.x;
          }
        }

        const unlockedGatesCount = world.sealGates.filter((g) => g.unlocked).length;
        const plan = computeKageAmbushSpawn({
          playerX: world.player.x,
          playerY: world.player.y,
          playerFacing: world.player.facing,
          playerZLane: world.combat.zLane,
          seasonId: f.st.seasonId,
          loopRoute: f.st.loopRoute,
          waveIndex: world.kageWaveCount++,
          stageLength: f.cfg.stageLength,
          nearestTrunkX,
          unlockedGatesCount,
        });

        world.enemies.push({
          id: world.enemyIdCounter++,
          archetype: plan.archetype,
          x: plan.x,
          baseX: plan.x,
          y: plan.y,
          vx: plan.vx,
          vy: plan.vy,
          hp: plan.hp,
          maxHp: plan.hp,
          facing: plan.facing,
          zLane: plan.zLane,
          gatesCleared: plan.gatesCleared,
          zoneDamageMult: plan.zoneDamageMult,
          ambushEntryTimer: plan.spawnStyle === 'trunk_shadow' ? 0.35 : 0,
          attackCooldown: 1.05 * f.diff.attackCooldownMult,
          windupTimer: 0,
          hitFlashTimer: 0,
          koTimer: 0,
          aiTimer: 0,
          burnTimer: 0,
          chillTimer: 0,
          guardianHitCooldown: 0,
          onGround: false,
          kageSpawnStyle: plan.spawnStyle,
          kageSpinTimer: plan.spinDuration,
          kageLeapCooldown: 2.2,
          kageLeapCount: world.kageWaveCount,
        });

        spawnBanner(world, plan.x, plan.y - 36, plan.bannerText, plan.bannerColor);
        for (let s = 0; s < 12; s++) {
          const ang = (Math.PI * 2 * s) / 12;
          spawnParticle(
            world,
            plan.x,
            plan.y - 20,
            Math.cos(ang) * 165,
            Math.sin(ang) * 165,
            4.2,
            plan.bannerColor,
            0.42,
            plan.spawnStyle === 'canopy_drop' ? 'petal' : 'spark'
          );
        }
        world.kageWaveTimer = Math.max(2.6, 3.8 * f.diff.attackCooldownMult);
      } else {
        world.kageWaveTimer = 1.4;
      }
    }
  }
}
