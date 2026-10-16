import { ELEMENTAL_STANCES, cycleElementalStance } from './elements.ts';
import { PHYSICS_CONSTANTS } from './physics.ts';
import { RELIC_CATALOG, grantRandomRelic } from './relics.ts';
import { SKILL_DESCRIPTIONS, getSkillUpgradeCost, upgradeSkillBranch } from './skills.ts';
import type {
  PickupItemKind,
  RelicId,
  SkillBranchId,
  SkillLevel,
  SkillTreeState,
  ZLane,
} from './types.ts';

export interface PlayerCombatState {
  hp: number;
  maxHp: number;
  chakra: number;
  maxChakra: number;
  rage: number;
  maxRage: number;
  isImmortal: boolean;
  awakenedTimer: number;
  dashCooldown: number;
  dashTimer: number;
  coyoteTimer: number;
  jumpBufferTimer: number;
  zLane: ZLane;
  zSwitchCooldown: number;
  score: number;
  combo: number;
  comboTimer: number;
  parryCount: number;
  kills: number;
  skills: SkillTreeState;
}

export function createInitialPlayerCombatState(): PlayerCombatState {
  return {
    hp: PHYSICS_CONSTANTS.MAX_HP,
    maxHp: PHYSICS_CONSTANTS.MAX_HP,
    chakra: PHYSICS_CONSTANTS.MAX_CHAKRA,
    maxChakra: PHYSICS_CONSTANTS.MAX_CHAKRA,
    rage: 0,
    maxRage: PHYSICS_CONSTANTS.MAX_RAGE,
    isImmortal: false,
    awakenedTimer: 0,
    dashCooldown: 0,
    dashTimer: 0,
    coyoteTimer: 0,
    jumpBufferTimer: 0,
    zLane: 0,
    zSwitchCooldown: 0,
    score: 0,
    combo: 0,
    comboTimer: 0,
    parryCount: 0,
    kills: 0,
    skills: {
      kodachiLevel: 1,
      kunaiLevel: 1,
      mobilityLevel: 1,
      deflectLevel: 1,
      guardianLevel: 1,
      activeElement: 'crimson_fire',
      relics: [],
      scrollsCollected: 0,
      unspentScrolls: 1,
    },
  };
}

export function toggleImmortality(state: PlayerCombatState): PlayerCombatState {
  const nextImmortal = !state.isImmortal;
  return {
    ...state,
    isImmortal: nextImmortal,
    hp: nextImmortal ? state.maxHp : state.hp,
    chakra: nextImmortal ? state.maxChakra : state.chakra,
  };
}

export function applyPlayerDamage(
  state: PlayerCombatState,
  rawDamage: number
): {
  nextState: PlayerCombatState;
  damageTaken: number;
  blockedByImmortality: boolean;
} {
  if (state.isImmortal) {
    return {
      nextState: {
        ...state,
        hp: state.maxHp,
      },
      damageTaken: 0,
      blockedByImmortality: true,
    };
  }
  const dmg = Math.max(0, rawDamage);
  const nextHp = Math.max(0, state.hp - dmg);
  return {
    nextState: {
      ...state,
      hp: nextHp,
    },
    damageTaken: state.hp - nextHp,
    blockedByImmortality: false,
  };
}

export function applyItemPickup(
  state: PlayerCombatState,
  kind: PickupItemKind
): { nextState: PlayerCombatState; bannerText: string; bannerColor: string } {
  const branchMap: Partial<Record<PickupItemKind, SkillBranchId>> = {
    scroll_kodachi: 'kodachi',
    scroll_kunai: 'kunai',
    scroll_mobility: 'mobility',
    scroll_deflect: 'deflect',
    scroll_guardian: 'guardian',
  };

  const branch = branchMap[kind];
  if (branch) {
    const res = upgradeSkillBranch(state, branch, true);
    const meta = SKILL_DESCRIPTIONS[branch];
    const tierName = meta.tierNames[res.newLevel - 1];
    const nextCost = getSkillUpgradeCost(res.newLevel);
    return {
      nextState: res.nextState,
      bannerText: res.upgraded
        ? `NÂNG CẤP ${meta.shortName.toUpperCase()} LV.${res.newLevel}: ${tierName.toUpperCase()}!`
        : res.newLevel >= 5
          ? `BÍ KÍP ${meta.shortName.toUpperCase()} TỐI ĐA (+1 ĐIỂM BÍ KÍP)`
          : `THU THẬP BÍ KÍP (+1 ĐIỂM · CẦN ${nextCost} ĐỂ LÊN LV.${res.newLevel + 1})`,
      bannerColor: meta.color,
    };
  }

  if (kind === 'relic_chest') {
    const relRes = grantRandomRelic(state);
    if (relRes.grantedRelic) {
      const relicMeta = RELIC_CATALOG[relRes.grantedRelic];
      return {
        nextState: relRes.nextState,
        bannerText: `THÁNH VẬT CỔ: ${relicMeta.name.toUpperCase()}!`,
        bannerColor: relicMeta.color,
      };
    }
    return {
      nextState: relRes.nextState,
      bannerText: 'RƯƠNG CỔ BÍ KÍP (+1 ĐIỂM KỸ NĂNG)',
      bannerColor: '#fde047',
    };
  }

  if (kind === 'elemental_shrine') {
    const cycled = cycleElementalStance(state);
    const elemMeta = ELEMENTAL_STANCES[cycled.skills.activeElement];
    return {
      nextState: {
        ...cycled,
        chakra: Math.min(cycled.maxChakra, cycled.chakra + 40),
        score: cycled.score + 180,
      },
      bannerText: `CHUYỂN HÓA NGUYÊN TỐ: ${elemMeta.name.toUpperCase()} (+40 NỘI LỰC)`,
      bannerColor: elemMeta.color,
    };
  }

  if (kind === 'jade_elixir') {
    const nextMaxHp = Math.min(150, state.maxHp + 5);
    const nextHp = Math.min(nextMaxHp, state.hp + 28);
    return {
      nextState: {
        ...state,
        maxHp: nextMaxHp,
        hp: nextHp,
        score: state.score + 120,
      },
      bannerText: 'LINH ĐAN BÁCH THẢO! +28 HP & +5 SINH MỆNH TỐI ĐA',
      bannerColor: '#34d399',
    };
  }

  if (kind === 'chakra_pearl') {
    const nextMaxChakra = Math.min(140, state.maxChakra + 5);
    const nextChakra = Math.min(nextMaxChakra, state.chakra + 50);
    const nextRage = Math.min(state.maxRage, state.rage + 25);
    const awaken = nextRage >= state.maxRage;
    const duration = state.skills.relics.includes('dragon_seal')
      ? PHYSICS_CONSTANTS.AWAKENING_DURATION + 4
      : PHYSICS_CONSTANTS.AWAKENING_DURATION;
    return {
      nextState: {
        ...state,
        maxChakra: nextMaxChakra,
        chakra: nextChakra,
        rage: awaken ? 0 : nextRage,
        awakenedTimer: awaken ? duration : state.awakenedTimer,
        score: state.score + 140,
      },
      bannerText: 'LINH CHÂU NỘI LỰC! +50 NỘI LỰC & +25% NỘ KHÍ',
      bannerColor: '#a78bfa',
    };
  }

  // blood_orb
  const duration = state.skills.relics.includes('dragon_seal')
    ? PHYSICS_CONSTANTS.AWAKENING_DURATION + 4
    : PHYSICS_CONSTANTS.AWAKENING_DURATION;
  return {
    nextState: {
      ...state,
      rage: 0,
      awakenedTimer: duration,
      score: state.score + 280,
    },
    bannerText: `HUYẾT NGỌC THỨC TỈNH! ${duration} GIÂY HUYẾT ẢNH`,
    bannerColor: '#f43f5e',
  };
}

export function getEffectiveKunaiChakraCost(
  kunaiLevel: SkillLevel,
  relics: RelicId[] = []
): number {
  const baseCost =
    kunaiLevel >= 4 ? 16 : kunaiLevel >= 2 ? 18 : PHYSICS_CONSTANTS.KUNAI_CHAKRA_COST; // 20
  return relics.includes('wind_feather') ? Math.max(12, Math.round(baseCost * 0.8)) : baseCost;
}

export function canFireKunai(
  state: Pick<PlayerCombatState, 'chakra' | 'awakenedTimer'> & {
    skills?: Pick<SkillTreeState, 'kunaiLevel' | 'relics'>;
  }
): boolean {
  if (state.awakenedTimer > 0) return true;
  const cost = getEffectiveKunaiChakraCost(
    state.skills?.kunaiLevel ?? 1,
    state.skills?.relics ?? []
  );
  return state.chakra >= cost;
}

export function consumeKunaiChakra(state: PlayerCombatState): PlayerCombatState {
  if (state.awakenedTimer > 0) {
    return { ...state };
  }
  const cost = getEffectiveKunaiChakraCost(state.skills.kunaiLevel, state.skills.relics);
  if (state.chakra < cost) {
    return { ...state };
  }
  return {
    ...state,
    chakra: Math.max(0, state.chakra - cost),
  };
}

export function applyMeleeHitReward(
  state: PlayerCombatState,
  isKill: boolean,
  droppedBloodOrb: boolean = false
): PlayerCombatState {
  const nextCombo = state.combo + 1;
  const comboBonus = Math.min(nextCombo, 10) * 20;
  const basePoints = isKill ? 140 : 40;
  const nextChakra = Math.min(
    state.maxChakra,
    state.chakra + PHYSICS_CONSTANTS.CHAKRA_RESTORE_ON_MELEE
  );
  const hasDragonSeal = state.skills.relics.includes('dragon_seal');
  const rageMult = hasDragonSeal ? 1.35 : 1;
  const rageGain = Math.round((droppedBloodOrb ? 100 : isKill ? 18 : 7) * rageMult);
  const nextRage = Math.min(state.maxRage, state.rage + rageGain);
  const triggerAwakening = droppedBloodOrb || nextRage >= state.maxRage;
  const awakenDuration = hasDragonSeal
    ? PHYSICS_CONSTANTS.AWAKENING_DURATION + 4
    : PHYSICS_CONSTANTS.AWAKENING_DURATION;

  const vampHeal = isKill && state.skills.relics.includes('vampiric_fang') ? 5 : 0;

  return {
    ...state,
    hp: Math.min(state.maxHp, state.hp + vampHeal),
    chakra: nextChakra,
    rage: triggerAwakening ? 0 : nextRage,
    awakenedTimer: triggerAwakening ? awakenDuration : state.awakenedTimer,
    score: state.score + basePoints + comboBonus,
    combo: nextCombo,
    comboTimer: 3.2,
    kills: isKill ? state.kills + 1 : state.kills,
  };
}

export function applyParryDeflectReward(state: PlayerCombatState): PlayerCombatState {
  const nextCombo = state.combo + 2;
  const deflectLv = state.skills.deflectLevel;
  const chakraBonus = deflectLv >= 3 ? 45 : PHYSICS_CONSTANTS.CHAKRA_RESTORE_ON_PARRY;
  const nextChakra = Math.min(state.maxChakra, state.chakra + chakraBonus);

  const hpHeal = (deflectLv >= 3 ? 6 : 0) + (state.skills.relics.includes('vampiric_fang') ? 5 : 0);

  const hasDragonSeal = state.skills.relics.includes('dragon_seal');
  const nextRage = Math.min(
    state.maxRage,
    state.rage + Math.round(22 * (hasDragonSeal ? 1.35 : 1))
  );
  const triggerAwakening = nextRage >= state.maxRage;
  const awakenDuration = hasDragonSeal
    ? PHYSICS_CONSTANTS.AWAKENING_DURATION + 4
    : PHYSICS_CONSTANTS.AWAKENING_DURATION;

  return {
    ...state,
    hp: Math.min(state.maxHp, state.hp + hpHeal),
    chakra: nextChakra,
    rage: triggerAwakening ? 0 : nextRage,
    awakenedTimer: triggerAwakening ? awakenDuration : state.awakenedTimer,
    score: state.score + 220 + nextCombo * 25,
    combo: nextCombo,
    comboTimer: 3.8,
    parryCount: state.parryCount + 1,
  };
}

export function toggleZLane(state: PlayerCombatState): PlayerCombatState {
  if (state.zSwitchCooldown > 0) return state;
  return {
    ...state,
    zLane: state.zLane === 0 ? 1 : 0,
    zSwitchCooldown: PHYSICS_CONSTANTS.Z_LANE_SWITCH_COOLDOWN,
  };
}

export function compute360AimAngles(
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  isAwakened: boolean,
  kunaiLevel: SkillLevel = 1
): number[] {
  const dx = targetX - originX;
  const dy = targetY - originY;
  const baseAngle = dx === 0 && dy === 0 ? 0 : Math.atan2(dy, dx);
  if (kunaiLevel >= 5) {
    const s = 0.11;
    return [baseAngle - s * 2, baseAngle - s, baseAngle, baseAngle + s, baseAngle + s * 2];
  }
  if (kunaiLevel === 4) {
    const s = 0.09;
    return [baseAngle - s * 1.5, baseAngle - s * 0.5, baseAngle + s * 0.5, baseAngle + s * 1.5];
  }
  if (isAwakened || kunaiLevel === 3) {
    const spread = 0.16;
    return [baseAngle - spread, baseAngle, baseAngle + spread];
  }
  if (kunaiLevel === 2) {
    const spread = 0.07;
    return [baseAngle - spread, baseAngle + spread];
  }
  return [baseAngle];
}

export function checkProjectileParry(params: {
  playerX: number;
  playerY: number;
  facing: 1 | -1;
  isAttacking: boolean;
  attackElapsed: number;
  projX: number;
  projY: number;
  projZLane: ZLane;
  playerZLane: ZLane;
  kodachiLevel?: SkillLevel;
  deflectLevel?: SkillLevel;
  relics?: RelicId[];
}): boolean {
  if (!params.isAttacking) return false;
  if (params.projZLane !== params.playerZLane) return false;
  const bonusWindow =
    ((params.kodachiLevel ?? 1) >= 2 ? 0.03 : 0) + ((params.deflectLevel ?? 1) >= 2 ? 0.04 : 0);
  if (params.attackElapsed > PHYSICS_CONSTANTS.PARRY_WINDOW_DURATION + bonusWindow) {
    return false;
  }

  const dx = params.projX - params.playerX;
  const dy = params.projY - params.playerY;
  const distSq = dx * dx + dy * dy;
  let radius = (params.kodachiLevel ?? 1) >= 2 ? 98 : 84;
  if ((params.deflectLevel ?? 1) >= 2) radius += 14;
  if (params.relics?.includes('mirror_shield')) radius += 18;
  if (distSq > radius * radius) return false;
  if (params.facing === 1 && dx < -30) return false;
  if (params.facing === -1 && dx > 30) return false;
  return true;
}
