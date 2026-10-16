import { PlayerCombatState, SeasonConfig, SEASONS } from '../rules';
import { EnemyActor } from './entities';
import { World } from './world';

/** Stage completion 0–100 based on scroll direction. */
export function getStageProgressPct(world: World, cfg: SeasonConfig): number {
  return cfg.scrollMode === 'horizontal'
    ? Math.min(100, Math.max(0, (world.player.x / (cfg.stageLength - 320)) * 100))
    : Math.min(
        100,
        Math.max(0, ((cfg.stageLength - world.player.y) / (cfg.stageLength - 220)) * 100)
      );
}

/** Copy of combat state safe to hand to React (no shared mutable arrays). */
export function snapshotCombat(combat: PlayerCombatState): PlayerCombatState {
  return { ...combat, skills: { ...combat.skills, relics: [...combat.skills.relics] } };
}

export function findBoss(world: World): EnemyActor | undefined {
  return world.enemies.find((e) => e.archetype === 'boss');
}

/** Pushes player/boss status to the React HUD. */
export function syncHud(world: World, boss: EnemyActor | undefined = findBoss(world)): void {
  const st = world.stateRef.current;
  const bossVisible =
    boss && Math.hypot(boss.x - world.player.x, boss.y - world.player.y) < 860 ? boss : null;
  st.onSyncHud(
    snapshotCombat(world.combat),
    world.trailingHp,
    getStageProgressPct(world, SEASONS[st.seasonId]),
    bossVisible ? Math.max(0, bossVisible.hp) : null,
    bossVisible ? bossVisible.maxHp : null
  );
}
