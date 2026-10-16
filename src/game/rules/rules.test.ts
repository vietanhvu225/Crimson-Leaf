import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PHYSICS_CONSTANTS,
  SEASONS,
  SEASON_ORDER,
  createInitialPlayerCombatState,
  clampDt,
  calculateEffectiveMoveSpeed,
  canFireKunai,
  consumeKunaiChakra,
  applyMeleeHitReward,
  applyParryDeflectReward,
  toggleZLane,
  compute360AimAngles,
  checkProjectileParry,
  evaluateStageClear,
  getActiveStageSector,
  getCheckpointCoordinates,
  getStageSealGates,
  upgradeSkillBranch,
  applyItemPickup,
  getEffectiveKodachiStats,
  getEffectiveDashCooldown,
  getMaxAirJumps,
  getGuardianBladeCount,
  cycleElementalStance,
  getSkillUpgradeCost,
  getStageDifficultyMultipliers,
  toggleImmortality,
  applyPlayerDamage,
  computeKageAmbushSpawn,
  computeKageLeapVelocity,
  ROAD_NINJA_ARCHETYPES,
  getStageMovementProfile,
  computeUnderwaterSwimStep,
  computeAerialLevitationStep,
  computeSubterraneanSlopeY,
  computeBossSkillBurst,
  rollElementalProc,
  getEffectiveKunaiDamage,
  getIntraStageGateScaling,
} from './index.ts';

test('clampDt bounds delta time safely to <= 0.05s', () => {
  assert.equal(clampDt(0.016), 0.016);
  assert.equal(clampDt(0.25), 0.05);
  assert.equal(clampDt(-1), 0);
  assert.equal(clampDt(Number.NaN), 0);
});

test('grounded movement & jump physics prevent excessive speed and stage skipping', () => {
  assert.ok(PHYSICS_CONSTANTS.MOVE_SPEED <= 195);
  assert.ok(Math.abs(PHYSICS_CONSTANTS.SUPER_JUMP_VELOCITY) <= 560);
  assert.ok(PHYSICS_CONSTANTS.AIR_DASH_SPEED <= 460);
  assert.ok(PHYSICS_CONSTANTS.AIR_DASH_COOLDOWN >= 1.25);
});

test('all 11 stages have balanced stageLength, 3 Seal Gates, distinct mechanics, and progressive enemy + boss difficulty scaling', () => {
  assert.equal(SEASON_ORDER.length, 11);
  const mechanicIds = new Set(SEASON_ORDER.map((s) => SEASONS[s].mechanicId));
  assert.equal(mechanicIds.size, 11);

  const expectedBossHps = [500, 700, 1000, 1400, 1900, 2500, 3200, 4000, 4900, 5900, 7000];
  SEASON_ORDER.forEach((sId, idx) => {
    const cfg = SEASONS[sId];
    assert.equal(
      cfg.bossMaxHp,
      expectedBossHps[idx],
      `${sId} bossMaxHp should be ${expectedBossHps[idx]}`
    );
    const gates = getStageSealGates(sId);
    assert.equal(gates.length, 3);
    assert.equal(gates[1].hasEliteSubBoss, true);
    assert.equal(gates[2].hasEliteSubBoss, true);
  });

  // Progressive difficulty scaling across all 11 stages
  for (let i = 1; i < SEASON_ORDER.length; i++) {
    const prevDiff = getStageDifficultyMultipliers(SEASON_ORDER[i - 1], 1);
    const currDiff = getStageDifficultyMultipliers(SEASON_ORDER[i], 1);
    assert.ok(currDiff.enemyHpMult > prevDiff.enemyHpMult);
    assert.ok(currDiff.enemyDamageMult > prevDiff.enemyDamageMult);
    assert.ok(currDiff.bossEffectiveMaxHp > prevDiff.bossEffectiveMaxHp);
    assert.ok(currDiff.bossDamageMult > prevDiff.bossDamageMult);
  }

  const stage1Diff = getStageDifficultyMultipliers('spring', 1);
  const stage11Diff = getStageDifficultyMultipliers('sky_sanctuary', 1);
  const stage11Loop2Diff = getStageDifficultyMultipliers('sky_sanctuary', 2);

  assert.equal(stage1Diff.enemyHpMult, 1);
  assert.ok(stage11Diff.enemyHpMult > 2.2);
  assert.ok(stage11Loop2Diff.enemyHpMult > stage11Diff.enemyHpMult);
  assert.ok(stage11Diff.attackCooldownMult < stage1Diff.attackCooldownMult);

  const s0 = getActiveStageSector('spring', 12);
  assert.equal(s0.index, 0);
  const s1 = getActiveStageSector('spring', 50);
  assert.equal(s1.index, 1);
  const s2 = getActiveStageSector('spring', 85);
  assert.equal(s2.index, 2);

  const cps = getCheckpointCoordinates('spring');
  assert.ok(cps.cp1 > 1000 && cps.cp2 > 2000 && cps.bossPos > 3000);
});

test('progressive skill upgrade costs (1 -> 2 -> 2 -> 3 Bí Kíp) prevent early snowballing and balance 5-branch progression', () => {
  assert.equal(getSkillUpgradeCost(1), 1);
  assert.equal(getSkillUpgradeCost(2), 2);
  assert.equal(getSkillUpgradeCost(3), 2);
  assert.equal(getSkillUpgradeCost(4), 3);
  assert.equal(getSkillUpgradeCost(5), 0);

  let state = createInitialPlayerCombatState();
  assert.equal(state.skills.unspentScrolls, 1);
  assert.equal(state.skills.kodachiLevel, 1);

  const up2 = upgradeSkillBranch(state, 'kodachi');
  assert.equal(up2.upgraded, true);
  state = up2.nextState;
  assert.equal(state.skills.kodachiLevel, 2);
  assert.equal(state.skills.unspentScrolls, 0);

  state = applyItemPickup(state, 'scroll_kodachi').nextState;
  assert.equal(state.skills.kodachiLevel, 2);
  assert.equal(state.skills.unspentScrolls, 1);

  state = applyItemPickup(state, 'scroll_kodachi').nextState;
  assert.equal(state.skills.kodachiLevel, 3);
  assert.equal(state.skills.unspentScrolls, 0);

  state.skills.unspentScrolls = 20;
  state = upgradeSkillBranch(state, 'kodachi').nextState; // Lv.4
  state = upgradeSkillBranch(state, 'kodachi').nextState; // Lv.5
  assert.equal(state.skills.kodachiLevel, 5);
  const kodachiLv5 = getEffectiveKodachiStats(state.skills.kodachiLevel, false);
  assert.equal(kodachiLv5.waveCount, 3);
  assert.equal(kodachiLv5.crossZ, true);

  for (let i = 0; i < 4; i++) {
    state = upgradeSkillBranch(state, 'kunai').nextState;
  }
  assert.equal(state.skills.kunaiLevel, 5);
  assert.equal(compute360AimAngles(0, 0, 100, 0, false, state.skills.kunaiLevel).length, 5);

  state.skills.unspentScrolls = 15;
  state = upgradeSkillBranch(state, 'mobility').nextState; // Lv.2
  state = upgradeSkillBranch(state, 'mobility').nextState; // Lv.3
  state = upgradeSkillBranch(state, 'mobility').nextState; // Lv.4
  assert.equal(state.skills.mobilityLevel, 4);
  assert.equal(getMaxAirJumps(state.skills.mobilityLevel), 2);
  assert.ok(getEffectiveDashCooldown(state.skills.mobilityLevel) >= 0.75);

  state = upgradeSkillBranch(state, 'guardian').nextState; // Lv.2
  state = upgradeSkillBranch(state, 'guardian').nextState; // Lv.3
  assert.equal(getGuardianBladeCount(state.skills.guardianLevel), 2);

  state = applyItemPickup(state, 'relic_chest').nextState;
  assert.equal(state.skills.relics.length, 1);

  assert.equal(state.skills.activeElement, 'crimson_fire');
  state = cycleElementalStance(state);
  assert.equal(state.skills.activeElement, 'thunder_lightning');
});

test('calculateEffectiveMoveSpeed applies water slow and Huyet Anh awakening boost', () => {
  const normal = calculateEffectiveMoveSpeed({ isAwakened: false, isInWater: false });
  assert.equal(normal, PHYSICS_CONSTANTS.MOVE_SPEED);

  const awakened = calculateEffectiveMoveSpeed({ isAwakened: true, isInWater: false });
  assert.equal(
    awakened,
    Math.round(PHYSICS_CONSTANTS.MOVE_SPEED * PHYSICS_CONSTANTS.AWAKENED_SPEED_MULTIPLIER)
  );

  const summerWater = calculateEffectiveMoveSpeed({
    isAwakened: false,
    isInWater: true,
    loopRoute: 1,
    seasonId: 'summer',
  });
  assert.ok(summerWater < normal);

  const summerIceLoop2 = calculateEffectiveMoveSpeed({
    isAwakened: false,
    isInWater: true,
    loopRoute: 2,
    seasonId: 'summer',
  });
  assert.ok(summerIceLoop2 > normal);

  const oceanPalaceUnderwater = calculateEffectiveMoveSpeed({
    isAwakened: false,
    isInWater: true,
    loopRoute: 1,
    seasonId: 'ocean_palace',
  });
  assert.ok(oceanPalaceUnderwater > normal);
});

test('Chakra system consumes on Kunai and restores immediately on melee/parry', () => {
  let state = createInitialPlayerCombatState();
  assert.equal(canFireKunai(state), true);

  state = consumeKunaiChakra(state);
  assert.equal(state.chakra, 100 - PHYSICS_CONSTANTS.KUNAI_CHAKRA_COST);

  state.chakra = 10;
  assert.equal(canFireKunai(state), false);

  state = applyMeleeHitReward(state, false, false);
  assert.equal(state.chakra, 10 + PHYSICS_CONSTANTS.CHAKRA_RESTORE_ON_MELEE);
  assert.equal(canFireKunai(state), true);

  state = applyParryDeflectReward(state);
  assert.equal(state.parryCount, 1);
  assert.ok(state.chakra >= 50);
});

test('Huyết Ngọc / Rage triggers Huyết Ảnh awakening and 3-way kunai spread', () => {
  let state = createInitialPlayerCombatState();
  state = applyMeleeHitReward(state, true, true);
  assert.equal(state.awakenedTimer, PHYSICS_CONSTANTS.AWAKENING_DURATION);

  const singleAim = compute360AimAngles(100, 100, 200, 100, false);
  assert.equal(singleAim.length, 1);
  assert.equal(singleAim[0], 0);

  const tripleAim = compute360AimAngles(100, 100, 200, 100, true);
  assert.equal(tripleAim.length, 3);
  assert.ok(tripleAim[0] < 0 && tripleAim[2] > 0);
});

test('Z-Axis lane switching toggles between plane 0 and plane 1 with cooldown', () => {
  let state = createInitialPlayerCombatState();
  assert.equal(state.zLane, 0);
  state = toggleZLane(state);
  assert.equal(state.zLane, 1);
  assert.ok(state.zSwitchCooldown > 0);

  const blocked = toggleZLane(state);
  assert.equal(blocked.zLane, 1);
});

test('Kodachi parry deflects projectiles within timing window and matching Z-lane', () => {
  const success = checkProjectileParry({
    playerX: 200,
    playerY: 300,
    facing: 1,
    isAttacking: true,
    attackElapsed: 0.08,
    projX: 245,
    projY: 295,
    projZLane: 0,
    playerZLane: 0,
  });
  assert.equal(success, true);

  const wrongLane = checkProjectileParry({
    playerX: 200,
    playerY: 300,
    facing: 1,
    isAttacking: true,
    attackElapsed: 0.08,
    projX: 245,
    projY: 295,
    projZLane: 1,
    playerZLane: 0,
  });
  assert.equal(wrongLane, false);
});

test('evaluateStageClear handles 11-stage progression and Mother Rescue upon defeating the Final Boss on Stage 11', () => {
  const springClear = evaluateStageClear('spring', 1);
  assert.equal(springClear.nextSeason, 'summer');
  assert.equal(springClear.nextLoopRoute, 1);
  assert.equal(springClear.isLoopTwist, false);
  assert.equal(springClear.isMotherRescued, false);

  const stage9Clear = evaluateStageClear('ocean_palace', 1);
  assert.equal(stage9Clear.nextSeason, 'earth_core');

  const stage10Clear = evaluateStageClear('earth_core', 1);
  assert.equal(stage10Clear.nextSeason, 'sky_sanctuary');

  const finalStageLoop1 = evaluateStageClear('sky_sanctuary', 1);
  assert.equal(finalStageLoop1.nextSeason, 'spring');
  assert.equal(finalStageLoop1.nextLoopRoute, 2);
  assert.equal(finalStageLoop1.isLoopTwist, true);
  assert.equal(finalStageLoop1.isMotherRescued, true);

  const finalStageLoop2 = evaluateStageClear('sky_sanctuary', 2);
  assert.equal(finalStageLoop2.isTrueEnding, true);
  assert.equal(finalStageLoop2.isMotherRescued, true);
});

test('toggleImmortality and applyPlayerDamage grant complete invincibility and restore full HP/Chakra when enabled', () => {
  let state = createInitialPlayerCombatState();
  assert.equal(state.isImmortal, false);

  // Normal damage reduces HP
  const normalHit = applyPlayerDamage(state, 35);
  assert.equal(normalHit.blockedByImmortality, false);
  assert.equal(normalHit.damageTaken, 35);
  state = normalHit.nextState;
  assert.equal(state.hp, 65);
  state.chakra = 20;

  // Toggle immortality ON -> restores full HP & Chakra, sets isImmortal = true
  state = toggleImmortality(state);
  assert.equal(state.isImmortal, true);
  assert.equal(state.hp, state.maxHp);
  assert.equal(state.chakra, state.maxChakra);

  // Damage while immortal is completely negated
  const immortalHit = applyPlayerDamage(state, 999);
  assert.equal(immortalHit.blockedByImmortality, true);
  assert.equal(immortalHit.damageTaken, 0);
  assert.equal(immortalHit.nextState.hp, state.maxHp);

  // Toggle immortality OFF -> returns to mortal mode
  state = toggleImmortality(state);
  assert.equal(state.isImmortal, false);
});

test('computeKageAmbushSpawn generates Legend of Kage canopy drops, super-jump tree vaults, trunk ambushes, and water bursts', () => {
  const dropPlan = computeKageAmbushSpawn({
    playerX: 1200,
    playerY: 460,
    playerFacing: 1,
    playerZLane: 0,
    seasonId: 'spring',
    loopRoute: 1,
    waveIndex: 0,
    stageLength: 36000,
    nearestTrunkX: 1380,
  });
  assert.equal(dropPlan.spawnStyle, 'canopy_drop');
  assert.ok(dropPlan.y < 250);
  assert.ok(dropPlan.vy > 0);
  assert.ok(dropPlan.spinDuration > 0.5);

  const vaultPlan = computeKageAmbushSpawn({
    playerX: 1200,
    playerY: 460,
    playerFacing: 1,
    playerZLane: 0,
    seasonId: 'spring',
    loopRoute: 1,
    waveIndex: 1,
    stageLength: 36000,
    nearestTrunkX: 1380,
  });
  assert.equal(vaultPlan.spawnStyle, 'tree_vault');
  assert.ok(vaultPlan.vy < -500);

  const trunkPlan = computeKageAmbushSpawn({
    playerX: 1200,
    playerY: 460,
    playerFacing: 1,
    playerZLane: 1,
    seasonId: 'spring',
    loopRoute: 1,
    waveIndex: 2,
    stageLength: 36000,
    nearestTrunkX: 1380,
  });
  assert.equal(trunkPlan.spawnStyle, 'trunk_shadow');
  assert.equal(trunkPlan.x, 1380);
  assert.equal(trunkPlan.zLane, 1);

  const waterPlan = computeKageAmbushSpawn({
    playerX: 1500,
    playerY: 480,
    playerFacing: 1,
    playerZLane: 0,
    seasonId: 'summer',
    loopRoute: 1,
    waveIndex: 3,
    stageLength: 38000,
    nearestTrunkX: null,
  });
  assert.equal(waterPlan.spawnStyle, 'water_burst');
  assert.equal(waterPlan.archetype, 'bomb_alchemist');
  assert.ok(waterPlan.vy < -550);

  const spawnedArchetypes = new Set(
    Array.from(
      { length: 8 },
      (_, idx) =>
        computeKageAmbushSpawn({
          playerX: 1500,
          playerY: 480,
          playerFacing: 1,
          playerZLane: 0,
          seasonId: 'spring',
          loopRoute: 1,
          waveIndex: idx,
          stageLength: 36000,
          nearestTrunkX: 1650,
        }).archetype
    )
  );
  assert.equal(spawnedArchetypes.size, 8);
});

test('computeKageLeapVelocity launches ninjas upward toward higher branches or in acrobatic vaults', () => {
  const highBranchLeap = computeKageLeapVelocity({
    enemyX: 900,
    enemyY: 540,
    playerX: 1050,
    playerY: 305,
    archetype: 'red_ambusher',
    leapCounter: 0,
  });
  assert.ok(highBranchLeap.vy <= -550);
  assert.ok(highBranchLeap.vx > 0);
  assert.ok(highBranchLeap.spinDuration > 0.7);
});

test('all 11 stages have distinct movement profiles, boss skill profiles, and 8 road ninja archetypes', () => {
  assert.equal(ROAD_NINJA_ARCHETYPES.length, 8);
  const movementNames = new Set(SEASON_ORDER.map((s) => getStageMovementProfile(s).styleName));
  assert.equal(movementNames.size, 11);

  const summerMove = getStageMovementProfile('summer');
  assert.equal(summerMove.canWaterSkim, true);
  assert.equal(summerMove.canWaterSwimJump, true);

  const autumnMove = getStageMovementProfile('autumn');
  assert.equal(autumnMove.canWallRunUpward, true);
  assert.ok(autumnMove.wallRunUpSpeed < 0);

  const winterMove = getStageMovementProfile('winter');
  assert.ok(winterMove.iceSkateSpeedMult > 1.2);

  const thunderMove = getStageMovementProfile('thunder_peak');
  assert.equal(thunderMove.grappleResetsDashAndJump, true);
  assert.equal(thunderMove.allowEightWayAirDash, true);

  const bloodMove = getStageMovementProfile('blood_abyss');
  assert.equal(bloodMove.canMeteorGroundSlam, true);
  assert.ok(bloodMove.lavaThermalBounceVy !== null);

  const oceanMove = getStageMovementProfile('ocean_palace');
  assert.equal(oceanMove.canWaterSwimJump, true);
  assert.equal(oceanMove.allowEightWayAirDash, true);
  assert.ok(oceanMove.gravityMult < 0.5);

  const earthMove = getStageMovementProfile('earth_core');
  assert.equal(earthMove.hasEarthCoreDrill, true);
  assert.ok(earthMove.downhillSlopeFactor > 0.3);

  const skyMove = getStageMovementProfile('sky_sanctuary');
  assert.equal(skyMove.isFreeFlyingInSky, true);
  assert.equal(skyMove.isAerialLevitation, true);
  assert.equal(skyMove.gravityMult, 0);

  const bossSkillNames = new Set(SEASON_ORDER.map((s) => SEASONS[s].bossSkillName));
  assert.equal(bossSkillNames.size, 11);

  for (const sId of SEASON_ORDER) {
    const burst = computeBossSkillBurst({
      seasonId: sId,
      bossX: 1000,
      bossY: 400,
      playerX: 700,
      playerY: 420,
      castIndex: 1,
      hpRatio: 0.4,
      enemyDamageMult: 1.2,
      projectileSpeedMult: 1.0,
    });
    assert.ok(burst.skillBanner.length > 5);
    assert.ok(burst.projectiles.length > 0, `Boss in ${sId} should fire skill projectiles`);
  }
});

test('all 11 stages have unique thematic grapple anchor items (no generic paper lanterns) and bespoke gameplay mechanics', () => {
  const grappleItems = new Set(SEASON_ORDER.map((s) => SEASONS[s].grappleItemName));
  assert.equal(grappleItems.size, 11);
  for (const sId of SEASON_ORDER) {
    assert.ok(
      !SEASONS[sId].grappleItemName.toLowerCase().includes('lồng đèn'),
      `${sId} must not use paper lantern`
    );
  }

  assert.equal(getStageMovementProfile('winter').hasFrostChargeRam, true);
  assert.equal(getStageMovementProfile('cavern').hasAntiGravityCeilingFlight, true);
  assert.ok(getStageMovementProfile('thunder_peak').grappleShockwaveDamage > 0);
  assert.equal(getStageMovementProfile('celestial_altar').hasCosmicSwordFlight, true);
  assert.equal(getStageMovementProfile('ocean_palace').isFreeSwimmingUnderwater, true);
  assert.equal(getStageMovementProfile('ocean_palace').gravityMult, 0);
});

test('computeUnderwaterSwimStep, computeAerialLevitationStep, computeSubterraneanSlopeY, elemental hierarchy, and intra-stage gate scaling work accurately', () => {
  const swimUpStep = computeUnderwaterSwimStep({
    vx: 0,
    vy: 50,
    moveLeft: false,
    moveRight: true,
    swimUp: true,
    swimDown: false,
    maxSwimSpeed: 240,
    stageTimeSec: 1.2,
    dt: 0.05,
  });
  assert.ok(swimUpStep.vy < 0, 'Holding swimUp should propel character upward in water');
  assert.ok(swimUpStep.vx > 0, 'Moving right while swimming should propel character forward');

  // Stage 11 (sky_sanctuary): Up and Down aerial flight
  const flyUpStep = computeAerialLevitationStep({
    vx: 0,
    vy: 0,
    moveLeft: false,
    moveRight: true,
    flyUp: true,
    flyDown: false,
    maxFlySpeed: 260,
    stageTimeSec: 1.0,
    dt: 0.05,
  });
  assert.ok(flyUpStep.vy < -50, 'Holding flyUp on Stage 11 must propel character upward');
  assert.ok(flyUpStep.vx > 50, 'Holding moveRight on Stage 11 must propel character right');

  const flyDownStep = computeAerialLevitationStep({
    vx: 0,
    vy: 0,
    moveLeft: false,
    moveRight: false,
    flyUp: false,
    flyDown: true,
    maxFlySpeed: 260,
    stageTimeSec: 1.0,
    dt: 0.05,
  });
  assert.ok(flyDownStep.vy > 50, 'Holding flyDown on Stage 11 must propel character downward');

  // Stage 10 (earth_core): Progressive downward slope
  const yStart = computeSubterraneanSlopeY(200);
  const yMid = computeSubterraneanSlopeY(2000);
  const yDeep = computeSubterraneanSlopeY(4000);
  assert.ok(yMid > yStart + 500, 'Stage 10 floor must descend deeply by X=2000');
  assert.ok(yDeep > yMid + 600, 'Stage 10 floor must descend even deeper by X=4000');

  // 3-Tier Elemental Stances: Frost (weakest + Freeze), Lightning (2nd highest + Stun), Fire (highest + Burn)
  const frostKodachi = getEffectiveKodachiStats(3, false, 'frost_venom');
  const lightningKodachi = getEffectiveKodachiStats(3, false, 'thunder_lightning');
  const fireKodachi = getEffectiveKodachiStats(3, false, 'crimson_fire');
  assert.ok(frostKodachi.damage < lightningKodachi.damage);
  assert.ok(lightningKodachi.damage < fireKodachi.damage);

  const frostKunai = getEffectiveKunaiDamage(2, 'frost_venom');
  const lightningKunai = getEffectiveKunaiDamage(2, 'thunder_lightning');
  const fireKunai = getEffectiveKunaiDamage(2, 'crimson_fire');
  assert.ok(frostKunai < lightningKunai);
  assert.ok(lightningKunai < fireKunai);

  assert.equal(rollElementalProc('frost_venom', 0.1).triggeredFreeze, true);
  assert.equal(rollElementalProc('thunder_lightning', 0.1).triggeredStun, true);
  assert.equal(rollElementalProc('crimson_fire', 0.5).triggeredBurn, true);

  // Intra-Stage Gate Scaling: Zone 0 < Zone 1 < Zone 2 < Zone 3
  const z0 = getIntraStageGateScaling({ seasonId: 'spring', worldCoord: 1500 });
  const z1 = getIntraStageGateScaling({ seasonId: 'spring', worldCoord: 12000 });
  const z2 = getIntraStageGateScaling({ seasonId: 'spring', worldCoord: 24000 });
  const z3 = getIntraStageGateScaling({ seasonId: 'spring', worldCoord: 33000 });
  assert.equal(z0.zoneHpMult, 1.0);
  assert.ok(z1.zoneHpMult > z0.zoneHpMult);
  assert.ok(z2.zoneHpMult > z1.zoneHpMult);
  assert.ok(z3.zoneHpMult > z2.zoneHpMult);
  assert.ok(z3.zoneDamageMult > z2.zoneDamageMult);
});
