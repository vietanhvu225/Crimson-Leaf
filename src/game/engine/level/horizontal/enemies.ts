import {
  type EnemyArchetype,
  type KageSpawnStyle,
  ROAD_NINJA_ARCHETYPES,
  computeSubterraneanSlopeY,
  getIntraStageGateScaling,
} from '../../../rules/index.ts';
import type { World } from '../../world.ts';
import type { LevelContext } from '../context.ts';
import type { HorizontalLayout } from './layout.ts';

// Opening squad, road patrols, gate garrisons and the stage boss.

export function spawnOpeningSquad(world: World, L: LevelContext, H: HorizontalLayout) {
  // Opening Squad (Underwater swimmers in Stage 9, Aerial flyers in Stage 11, Land/Canopy ambushers in others)
  const openArch1: EnemyArchetype =
    L.sId === 'spring'
      ? 'bomb_alchemist'
      : L.sId === 'summer'
        ? 'tessen_gale'
        : L.sId === 'winter'
          ? 'claw_assassin'
          : L.sId === 'cavern'
            ? 'chain_kusarigama'
            : 'thunder_puppeteer';
  const openArch2: EnemyArchetype =
    L.sId === 'spring'
      ? 'chain_kusarigama'
      : L.sId === 'summer'
        ? 'claw_assassin'
        : 'bomb_alchemist';
  const openHp1 = Math.round(68 * L.diff.enemyHpMult);
  const openHp2 = Math.round(72 * L.diff.enemyHpMult);
  world.enemies.push(
    {
      id: world.enemyIdCounter++,
      archetype: openArch1,
      x: 455,
      baseX: 455,
      y: H.isFree3DStage ? 240 : 135,
      vx: -115,
      vy: H.isFree3DStage ? 20 : 110,
      hp: openHp1,
      maxHp: openHp1,
      facing: -1,
      zLane: 0,
      gatesCleared: 0,
      zoneDamageMult: 1.0,
      ambushEntryTimer: 0,
      attackCooldown: 1.35 * L.diff.attackCooldownMult,
      windupTimer: 0,
      hitFlashTimer: 0,
      koTimer: 0,
      aiTimer: 0,
      burnTimer: 0,
      chillTimer: 0,
      guardianHitCooldown: 0,
      onGround: false,
      kageSpawnStyle: H.isFree3DStage ? 'water_burst' : 'canopy_drop',
      kageSpinTimer: H.isFree3DStage ? 0 : 0.95,
      kageLeapCooldown: 1.9,
      kageLeapCount: 0,
    },
    {
      id: world.enemyIdCounter++,
      archetype: openArch2,
      x: 590,
      baseX: 590,
      y: H.isFree3DStage ? 390 : L.sId === 'earth_core' ? computeSubterraneanSlopeY(590) - 10 : 515,
      vx: -155,
      vy: H.isFree3DStage ? -30 : -535,
      hp: openHp2,
      maxHp: openHp2,
      facing: -1,
      zLane: 0,
      gatesCleared: 0,
      zoneDamageMult: 1.0,
      ambushEntryTimer: 0,
      attackCooldown: 1.45 * L.diff.attackCooldownMult,
      windupTimer: 0,
      hitFlashTimer: 0,
      koTimer: 0,
      aiTimer: 0.4,
      burnTimer: 0,
      chillTimer: 0,
      guardianHitCooldown: 0,
      onGround: false,
      kageSpawnStyle: H.isFree3DStage ? 'water_burst' : 'tree_vault',
      kageSpinTimer: H.isFree3DStage ? 0 : 0.9,
      kageLeapCooldown: 2.2,
      kageLeapCount: 1,
    }
  );
}

export function spawnRoadPatrols(world: World, L: LevelContext, H: HorizontalLayout) {
  // Diverse Road Ninja Patrol & Kage Ambush Squads along the Stage (Scales up HP & Damage after each Seal Gate!)
  for (let x = 760; x < H.bossArenaStart - 250; x += 460) {
    const spawnIdx = Math.round(x / 460);
    const gateScale = getIntraStageGateScaling({
      seasonId: L.sId,
      worldCoord: x,
    });
    const arch1 = ROAD_NINJA_ARCHETYPES[spawnIdx % ROAD_NINJA_ARCHETYPES.length];
    const arch2 = ROAD_NINJA_ARCHETYPES[(spawnIdx + 3) % ROAD_NINJA_ARCHETYPES.length];
    const tierY = H.isFree3DStage
      ? 190 + (spawnIdx % 3) * 115
      : L.sId === 'earth_core'
        ? computeSubterraneanSlopeY(x)
        : arch1 === 'fire_monk'
          ? 515
          : spawnIdx % 2 === 0
            ? 300
            : 435;
    const scaledHp1 = Math.round(72 * L.diff.enemyHpMult * gateScale.zoneHpMult);
    const scaledHp2 = Math.round(68 * L.diff.enemyHpMult * gateScale.zoneHpMult);
    const kageStyle: KageSpawnStyle = H.isFree3DStage
      ? 'water_burst'
      : spawnIdx % 3 === 0
        ? 'canopy_drop'
        : spawnIdx % 3 === 1
          ? 'tree_vault'
          : 'trunk_shadow';

    world.enemies.push({
      id: world.enemyIdCounter++,
      archetype: arch1,
      x,
      baseX: x,
      y: tierY,
      vx: 0,
      vy: 0,
      hp: scaledHp1,
      maxHp: scaledHp1,
      facing: -1,
      zLane: 0,
      gatesCleared: gateScale.gatesCleared,
      zoneDamageMult: gateScale.zoneDamageMult,
      ambushEntryTimer: 0,
      attackCooldown: 1.4 * L.diff.attackCooldownMult,
      windupTimer: 0,
      hitFlashTimer: 0,
      koTimer: 0,
      aiTimer: (spawnIdx * 0.7) % 2,
      burnTimer: 0,
      chillTimer: 0,
      guardianHitCooldown: 0,
      onGround: !H.isFree3DStage,
      kageSpawnStyle: kageStyle,
      kageSpinTimer: 0,
      kageLeapCooldown: 1.8 + (spawnIdx % 3) * 0.6,
      kageLeapCount: spawnIdx,
      kagePendingEntrance: !H.isFree3DStage && arch1 !== 'fire_monk',
    });

    world.enemies.push({
      id: world.enemyIdCounter++,
      archetype: arch2,
      x: x + 210,
      baseX: x + 210,
      y: H.isFree3DStage
        ? 260 + ((spawnIdx + 1) % 3) * 95
        : L.sId === 'earth_core'
          ? computeSubterraneanSlopeY(x + 210)
          : 435,
      vx: 0,
      vy: 0,
      hp: scaledHp2,
      maxHp: scaledHp2,
      facing: -1,
      zLane: spawnIdx % 2 === 0 ? 1 : 0,
      gatesCleared: gateScale.gatesCleared,
      zoneDamageMult: gateScale.zoneDamageMult,
      ambushEntryTimer: 0,
      attackCooldown: 1.5 * L.diff.attackCooldownMult,
      windupTimer: 0,
      hitFlashTimer: 0,
      koTimer: 0,
      aiTimer: 0.3,
      burnTimer: 0,
      chillTimer: 0,
      guardianHitCooldown: 0,
      onGround: !H.isFree3DStage,
      kageSpawnStyle: H.isFree3DStage
        ? 'water_burst'
        : spawnIdx % 2 === 0
          ? 'canopy_drop'
          : 'trunk_shadow',
      kageSpinTimer: 0,
      kageLeapCooldown: 2.1 + (spawnIdx % 2) * 0.5,
      kageLeapCount: spawnIdx + 1,
      kagePendingEntrance: !H.isFree3DStage,
    });
  }
}

export function spawnGateGarrisons(world: World, L: LevelContext, H: HorizontalLayout) {
  // Spawn Dedicated Garrison Squads & Elite Sub-Bosses at Each of the 3 Seal Gates (Scaling up per Gate 1 -> 2 -> 3)!
  for (const gate of world.sealGates) {
    const gx = gate.coord;
    const gateScale = getIntraStageGateScaling({
      seasonId: L.sId,
      worldCoord: gx - 10,
      unlockedGatesCount: gate.id - 1,
    });
    const guardCount = 3;
    for (let g = 0; g < guardCount; g++) {
      const isMonk = g === 0;
      const gHp = Math.round((isMonk ? 120 : 72) * L.diff.enemyHpMult * gateScale.zoneHpMult);
      const posX = gx - 340 + g * 115;
      world.enemies.push({
        id: world.enemyIdCounter++,
        archetype: isMonk ? 'fire_monk' : g % 2 === 0 ? 'red_ambusher' : 'blue_kiter',
        x: posX,
        baseX: posX,
        y: H.isFree3DStage
          ? 250 + g * 95
          : L.sId === 'earth_core'
            ? computeSubterraneanSlopeY(posX)
            : g % 2 === 0
              ? 520
              : 435,
        vx: 0,
        vy: 0,
        hp: gHp,
        maxHp: gHp,
        facing: -1,
        zLane: 0,
        gateId: gate.id,
        gatesCleared: gateScale.gatesCleared,
        zoneDamageMult: gateScale.zoneDamageMult,
        ambushEntryTimer: 0,
        attackCooldown: 1.35 * L.diff.attackCooldownMult,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        aiTimer: g * 0.4,
        burnTimer: 0,
        chillTimer: 0,
        guardianHitCooldown: 0,
        onGround: !H.isFree3DStage,
      });
    }

    if (gate.hasEliteSubBoss) {
      const eliteHp = Math.round(230 * L.diff.enemyHpMult * gateScale.zoneHpMult);
      world.enemies.push({
        id: world.enemyIdCounter++,
        archetype: 'elite_guard',
        x: gx - 110,
        baseX: gx - 110,
        y: H.isFree3DStage
          ? 340
          : L.sId === 'earth_core'
            ? computeSubterraneanSlopeY(gx - 110)
            : 515,
        vx: 0,
        vy: 0,
        hp: eliteHp,
        maxHp: eliteHp,
        facing: -1,
        zLane: 0,
        gateId: gate.id,
        gatesCleared: gateScale.gatesCleared,
        zoneDamageMult: gateScale.zoneDamageMult,
        ambushEntryTimer: 0,
        attackCooldown: 1.2 * L.diff.attackCooldownMult,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        aiTimer: 0,
        burnTimer: 0,
        chillTimer: 0,
        guardianHitCooldown: 0,
        onGround: !H.isFree3DStage,
      });
    }
  }
}

export function spawnStageBoss(world: World, L: LevelContext, H: HorizontalLayout) {
  const bossHp = L.diff.bossEffectiveMaxHp;
  world.enemies.push({
    id: world.enemyIdCounter++,
    archetype: 'boss',
    x: L.cfg.stageLength - 340,
    baseX: L.cfg.stageLength - 340,
    y: H.isFree3DStage ? 340 : L.sId === 'earth_core' ? H.earthBossFloorY - 20 : 500,
    vx: 0,
    vy: 0,
    hp: bossHp,
    maxHp: bossHp,
    facing: -1,
    zLane: 0,
    ambushEntryTimer: 0,
    attackCooldown: 1.15 * L.diff.bossAttackCooldownMult,
    windupTimer: 0,
    hitFlashTimer: 0,
    koTimer: 0,
    aiTimer: 0,
    burnTimer: 0,
    chillTimer: 0,
    guardianHitCooldown: 0,
    onGround: !H.isFree3DStage,
  });
}
