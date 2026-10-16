import { ROAD_NINJA_ARCHETYPES, getIntraStageGateScaling } from '../../rules';
import { spawnWorldItem } from '../spawn';
import { World } from '../world';
import { ITEM_ROTATION, pushPlat } from './builders';
import { LevelContext } from './context';

/** Vertical-scrolling stage layout. */
export function buildVerticalStage(world: World, L: LevelContext) {
  // VERTICAL STAGES: Màn 3 (Autumn Twin-Wall Rampart Climb) vs Màn 6 (Thunder Peak Open-Sky Floating Island Zip-Chain!)
  pushPlat(world, 100, L.cfg.stageLength - 100, 1000, 'both', 'ground');

  world.checkpoints.push(
    {
      id: 1,
      x: 560,
      y: L.cps.cp1,
      label: L.cfg.sectors[1],
      activated: false,
    },
    {
      id: 2,
      x: 560,
      y: L.cps.cp2,
      label: L.cfg.sectors[2],
      activated: false,
    }
  );

  if (L.sId === 'autumn') {
    world.trunks.push({ x: 180, w: 68, zDepth: 0 });
    world.trunks.push({ x: 960, w: 68, zDepth: 0 });
  }

  spawnWorldItem(world, 'scroll_guardian', 410, L.cfg.stageLength - 145, 'both');
  spawnWorldItem(world, 'relic_chest', 660, L.cfg.stageLength - 145, 'both');

  for (let y = L.cfg.stageLength - 210; y >= 240; y -= 118) {
    const stepIdx = Math.round(y / 118);
    const leftSide = stepIdx % 2 === 0;

    if (L.sId === 'thunder_peak') {
      const colIdx = stepIdx % 3;
      const islandX = colIdx === 0 ? 210 : colIdx === 1 ? 495 : 775;
      pushPlat(
        world,
        islandX,
        y,
        155,
        'both',
        stepIdx % 3 === 0 ? 'bagua_pad' : 'moving',
        stepIdx % 3 !== 0
          ? {
              moveAmpX: 55,
              moveSpeed: 1.95,
              movePhase: stepIdx,
            }
          : undefined
      );
      pushPlat(world, colIdx === 0 ? 740 : 230, y - 35, 130, 'both', 'roof');

      world.grapples.push({ x: 375, y: y - 58 });
      world.grapples.push({ x: 695, y: y - 58 });

      if (stepIdx % 2 === 1) {
        world.hazards.push({
          id: world.hazardIdCounter++,
          kind: 'lightning',
          x: leftSide ? 360 : 680,
          y: y - 300,
          w: 64,
          h: 300,
          timer: (stepIdx * 0.8) % 3.2,
          period: 3.2,
          active: false,
        });
      }
    } else {
      const isMoving = stepIdx % 3 === 0;
      const isSpring = stepIdx % 4 === 0;
      pushPlat(
        world,
        leftSide ? 210 : 540,
        y,
        380,
        'both',
        isSpring ? 'springboard' : isMoving ? 'moving' : 'roof',
        isMoving
          ? {
              moveAmpX: 75,
              moveSpeed: 1.6,
              movePhase: stepIdx,
            }
          : undefined
      );
      world.grapples.push({ x: leftSide ? 660 : 400, y: y - 65 });
    }

    if (stepIdx % 5 === 0) {
      const itemKind = ITEM_ROTATION[(stepIdx / 5) % ITEM_ROTATION.length];
      spawnWorldItem(world, itemKind, leftSide ? 390 : 700, y - 38, 'both');
    }

    if (stepIdx % 2 === 0 && y > 460) {
      const gateScale = getIntraStageGateScaling({
        seasonId: L.sId,
        worldCoord: y,
      });
      const kiterHp = Math.round(60 * L.diff.enemyHpMult * gateScale.zoneHpMult);
      const vArch = ROAD_NINJA_ARCHETYPES[stepIdx % ROAD_NINJA_ARCHETYPES.length];
      world.enemies.push({
        id: world.enemyIdCounter++,
        archetype: vArch,
        x: leftSide ? 360 : 680,
        baseX: leftSide ? 360 : 680,
        y: y - 48,
        vx: 0,
        vy: 0,
        hp: kiterHp,
        maxHp: kiterHp,
        facing: leftSide ? 1 : -1,
        zLane: 0,
        gatesCleared: gateScale.gatesCleared,
        zoneDamageMult: gateScale.zoneDamageMult,
        ambushEntryTimer: 0,
        attackCooldown: 1.45 * L.diff.attackCooldownMult,
        windupTimer: 0,
        hitFlashTimer: 0,
        koTimer: 0,
        aiTimer: 0,
        burnTimer: 0,
        chillTimer: 0,
        guardianHitCooldown: 0,
      });
    }
  }

  // Garrison Guards for Vertical Seal Gates (Scales up per Gate 1 -> 2 -> 3)
  for (const gate of world.sealGates) {
    const gy = gate.coord;
    const gateScale = getIntraStageGateScaling({
      seasonId: L.sId,
      worldCoord: gy + 10,
      unlockedGatesCount: gate.id - 1,
    });
    pushPlat(world, 220, gy + 90, 720, 'both', 'roof');
    for (let g = 0; g < 2; g++) {
      const gHp = Math.round(85 * L.diff.enemyHpMult * gateScale.zoneHpMult);
      const gx = 360 + g * 280;
      world.enemies.push({
        id: world.enemyIdCounter++,
        archetype: g === 0 ? 'fire_monk' : 'red_ambusher',
        x: gx,
        baseX: gx,
        y: gy + 45,
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
        aiTimer: 0,
        burnTimer: 0,
        chillTimer: 0,
        guardianHitCooldown: 0,
      });
    }
    if (gate.hasEliteSubBoss) {
      const eliteHp = Math.round(220 * L.diff.enemyHpMult * gateScale.zoneHpMult);
      world.enemies.push({
        id: world.enemyIdCounter++,
        archetype: 'elite_guard',
        x: 560,
        baseX: 560,
        y: gy + 45,
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
      });
    }
  }

  const bossHp = L.diff.bossEffectiveMaxHp;
  world.enemies.push({
    id: world.enemyIdCounter++,
    archetype: 'boss',
    x: 580,
    baseX: 580,
    y: 190,
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
  });
}
