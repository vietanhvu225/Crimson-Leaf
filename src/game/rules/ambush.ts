import type { EnemyArchetype } from './enemies.ts';
import { ROAD_NINJA_ARCHETYPES } from './enemies.ts';
import { computeSubterraneanSlopeY } from './physics.ts';
import { SEASONS, getIntraStageGateScaling, getStageDifficultyMultipliers } from './stages.ts';
import type { GameLoopRoute, SeasonId, ZLane } from './types.ts';

// Legend of Kage ambush spawns (canopy drops, tree vaults, trunk ambushes) and leap arcs.

export type KageSpawnStyle =
  | 'canopy_drop' // Phi thân lộn vòng từ tán cây cao / bầu trời xuống (Legend of Kage Treetop Ambush)
  | 'tree_vault' // Khinh công đại nhảy vọt từ mặt đất lên ngọn cây (Legend of Kage Super-Jump)
  | 'trunk_shadow' // Ẩn thân sau gốc đại thụ phóng ra kèm bom khói (Legend of Kage Trunk Ambush)
  | 'water_burst' // Lao vọt từ mặt nước / vực sâu lên (Legend of Kage Moat Ambush)
  | 'ground_patrol';

export interface KageAmbushPlan {
  archetype: EnemyArchetype;
  spawnStyle: KageSpawnStyle;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  zLane: ZLane;
  hp: number;
  zoneDamageMult: number;
  gatesCleared: number;
  spinDuration: number;
  bannerText: string;
  bannerColor: string;
}

/**
 * Pure calculation for spawning a Legend of Kage-style dynamic ambush enemy
 * using all 8 road ninja archetypes!
 */
export function computeKageAmbushSpawn(params: {
  playerX: number;
  playerY: number;
  playerFacing: 1 | -1;
  playerZLane: ZLane;
  seasonId: SeasonId;
  loopRoute: GameLoopRoute;
  waveIndex: number;
  stageLength: number;
  nearestTrunkX?: number | null;
  unlockedGatesCount?: number;
}): KageAmbushPlan {
  const cfg = SEASONS[params.seasonId];
  const diff = getStageDifficultyMultipliers(params.seasonId, params.loopRoute);
  const w = Math.max(0, Math.floor(params.waveIndex));
  const worldCoord = cfg.scrollMode === 'horizontal' ? params.playerX : params.playerY;
  const gateScale = getIntraStageGateScaling({
    seasonId: params.seasonId,
    worldCoord,
    unlockedGatesCount: params.unlockedGatesCount,
  });

  // Cycle through all 8 diverse Road Ninja archetypes!
  const archetype = ROAD_NINJA_ARCHETYPES[w % ROAD_NINJA_ARCHETYPES.length];

  const baseHpMap: Record<EnemyArchetype, number> = {
    blue_kiter: 56,
    red_ambusher: 64,
    fire_monk: 105,
    bomb_alchemist: 72,
    chain_kusarigama: 78,
    claw_assassin: 66,
    tessen_gale: 74,
    thunder_puppeteer: 82,
    elite_guard: 220,
    boss: 500,
  };
  const hp = Math.max(
    1,
    Math.round(baseHpMap[archetype] * diff.enemyHpMult * gateScale.zoneHpMult)
  );

  // Choose spawn side: mostly ahead of the player (in facing direction), occasionally pinching from behind
  const spawnAhead = w % 3 !== 2;
  const side: 1 | -1 = spawnAhead ? params.playerFacing : (-params.playerFacing as 1 | -1);

  if (cfg.scrollMode === 'vertical') {
    const rawX = params.playerX + side * (160 + (w % 3) * 45);
    const clampedX = Math.max(210, Math.min(930, rawX));
    const dirToPlayer: 1 | -1 = params.playerX >= clampedX ? 1 : -1;
    const isDrop = w % 2 === 0;
    return {
      archetype,
      spawnStyle: isDrop ? 'canopy_drop' : 'tree_vault',
      x: clampedX,
      y: isDrop
        ? Math.max(220, params.playerY - 250)
        : Math.min(cfg.stageLength - 120, params.playerY + 140),
      vx: dirToPlayer * (isDrop ? 135 : 175),
      vy: isDrop ? 120 : -560,
      facing: dirToPlayer,
      zLane: params.playerZLane,
      hp,
      zoneDamageMult: gateScale.zoneDamageMult,
      gatesCleared: gateScale.gatesCleared,
      spinDuration: isDrop ? 0.78 : 0.88,
      bannerText: isDrop ? 'THIÊN KHÔNG PHỤC KÍCH!' : 'KHINH CÔNG KAGE!',
      bannerColor: isDrop ? '#38bdf8' : '#fb7185',
    };
  }

  // Horizontal stages: select signature Legend of Kage entrance style
  const hasWater = cfg.waterLevelY !== null;
  let spawnStyle: KageSpawnStyle;
  if (w % 4 === 0) {
    spawnStyle = 'canopy_drop';
  } else if (w % 4 === 1) {
    spawnStyle = 'tree_vault';
  } else if (w % 4 === 2 && params.nearestTrunkX != null) {
    spawnStyle = 'trunk_shadow';
  } else if (hasWater) {
    spawnStyle = 'water_burst';
  } else {
    spawnStyle = 'canopy_drop';
  }

  const minX = 260;
  const maxX = Math.max(minX + 200, params.stageLength - 1100);

  if (spawnStyle === 'trunk_shadow' && params.nearestTrunkX != null) {
    const trunkX = Math.max(minX, Math.min(maxX, params.nearestTrunkX));
    const dirToPlayer: 1 | -1 = params.playerX >= trunkX ? 1 : -1;
    return {
      archetype,
      spawnStyle: 'trunk_shadow',
      x: trunkX,
      y: Math.min(445, params.playerY - 30),
      vx: dirToPlayer * 235,
      vy: -320,
      facing: dirToPlayer,
      zLane: params.playerZLane,
      hp,
      zoneDamageMult: gateScale.zoneDamageMult,
      gatesCleared: gateScale.gatesCleared,
      spinDuration: 0.65,
      bannerText: 'ẨN THÂN ĐẠI THỤ!',
      bannerColor: '#fb923c',
    };
  }

  if (spawnStyle === 'water_burst') {
    const rawX = params.playerX + side * 240;
    const clampedX = Math.max(minX, Math.min(maxX, rawX));
    const dirToPlayer: 1 | -1 = params.playerX >= clampedX ? 1 : -1;
    return {
      archetype,
      spawnStyle: 'water_burst',
      x: clampedX,
      y: (cfg.waterLevelY ?? 535) + 10,
      vx: dirToPlayer * 165,
      vy: -590,
      facing: dirToPlayer,
      zLane: params.playerZLane,
      hp,
      zoneDamageMult: gateScale.zoneDamageMult,
      gatesCleared: gateScale.gatesCleared,
      spinDuration: 0.85,
      bannerText: 'THỦY ẨN ĐỘT KÍCH!',
      bannerColor: '#22d3ee',
    };
  }

  if (spawnStyle === 'tree_vault') {
    const rawX = params.playerX + side * (290 + (w % 2) * 55);
    const clampedX = Math.max(minX, Math.min(maxX, rawX));
    const dirToPlayer: 1 | -1 = params.playerX >= clampedX ? 1 : -1;
    const floorY = params.seasonId === 'earth_core' ? computeSubterraneanSlopeY(clampedX) : 525;
    return {
      archetype,
      spawnStyle: 'tree_vault',
      x: clampedX,
      y: floorY,
      vx: dirToPlayer * 195,
      vy: -575,
      facing: dirToPlayer,
      zLane: params.playerZLane,
      hp,
      zoneDamageMult: gateScale.zoneDamageMult,
      gatesCleared: gateScale.gatesCleared,
      spinDuration: 0.9,
      bannerText: params.seasonId === 'earth_core' ? 'ĐỘT KÍCH ĐỊA TÂM!' : 'KHINH CÔNG VỌT ĐỈNH!',
      bannerColor: '#fb7185',
    };
  }

  // Default: 'canopy_drop' — Classic Legend of Kage ninja dropping from high canopy branches / cavern roof!
  const rawX = params.playerX + side * (190 + (w % 3) * 45);
  const clampedX = Math.max(minX, Math.min(maxX, rawX));
  const dirToPlayer: 1 | -1 = params.playerX >= clampedX ? 1 : -1;
  const minDropY = 95;
  return {
    archetype,
    spawnStyle: 'canopy_drop',
    x: clampedX,
    y: Math.max(minDropY, params.playerY - 265),
    vx: dirToPlayer * 145,
    vy: 115,
    facing: dirToPlayer,
    zLane: params.playerZLane,
    hp,
    zoneDamageMult: gateScale.zoneDamageMult,
    gatesCleared: gateScale.gatesCleared,
    spinDuration: 0.82,
    bannerText: 'PHI THÂN TÁN CÂY!',
    bannerColor: '#fde047',
  };
}

/**
 * Pure calculation for Legend of Kage agile vertical/diagonal ninja leaps between ground and canopy branches
 */
export function computeKageLeapVelocity(params: {
  enemyX: number;
  enemyY: number;
  playerX: number;
  playerY: number;
  archetype: EnemyArchetype;
  leapCounter: number;
}): { vx: number; vy: number; spinDuration: number } {
  const dx = params.playerX - params.enemyX;
  const dy = params.playerY - params.enemyY;
  const dir: 1 | -1 = dx >= 0 ? 1 : -1;

  if (params.archetype === 'fire_monk') {
    return {
      vx: dir * 110,
      vy: -380,
      spinDuration: 0.45,
    };
  }

  if (params.archetype === 'claw_assassin') {
    // Claw assassin leaps extra high to prepare for a diagonal dive pounce!
    return {
      vx: dir * 245,
      vy: -610,
      spinDuration: 0.92,
    };
  }

  // If player is on a higher branch (dy < -75), ninja leaps high upward toward that branch!
  if (dy < -75) {
    return {
      vx: dir * 175,
      vy: -565,
      spinDuration: 0.82,
    };
  }

  // Classic Legend of Kage acrobatic vault: alternate between high canopy leap and aggressive forward somersault
  const isHighCanopyLeap = params.leapCounter % 2 === 0;
  const isKiter =
    params.archetype === 'blue_kiter' ||
    params.archetype === 'bomb_alchemist' ||
    params.archetype === 'tessen_gale';
  const vxDir = isKiter && Math.abs(dx) < 160 ? (-dir as 1 | -1) : dir;
  return {
    vx: vxDir * (isHighCanopyLeap ? 165 : 220),
    vy: isHighCanopyLeap ? -540 : -445,
    spinDuration: isHighCanopyLeap ? 0.8 : 0.65,
  };
}
