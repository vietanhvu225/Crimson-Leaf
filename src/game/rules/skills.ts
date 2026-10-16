import type { PlayerCombatState } from './combat.ts';
import { ELEMENTAL_STANCES } from './elements.ts';
import { PHYSICS_CONSTANTS } from './physics.ts';
import type { ElementalStanceId, SkillBranchId, SkillLevel } from './types.ts';

export const SKILL_UPGRADE_COSTS: Record<SkillLevel, number> = {
  1: 1, // Lv.1 -> Lv.2 costs 1 Bí Kíp
  2: 2, // Lv.2 -> Lv.3 costs 2 Bí Kíp
  3: 2, // Lv.3 -> Lv.4 costs 2 Bí Kíp
  4: 3, // Lv.4 -> Lv.5 costs 3 Bí Kíp
  5: 0, // Max level
};

export function getSkillUpgradeCost(currentLevel: SkillLevel): number {
  return SKILL_UPGRADE_COSTS[currentLevel] ?? 0;
}

export const SKILL_DESCRIPTIONS: Record<
  SkillBranchId,
  {
    name: string;
    shortName: string;
    hotkey: string;
    color: string;
    tierNames: [string, string, string, string, string];
    tierBonuses: [string, string, string, string, string];
  }
> = {
  kodachi: {
    name: 'Kiếm Pháp Kodachi',
    shortName: 'Kiếm Pháp',
    hotkey: 'U',
    color: '#fb7185',
    tierNames: [
      'Đoản Kiếm Cơ Bản',
      'Song Đoản Kiếm',
      'Huyết Phong Kiếm Khí',
      'Bán Nguyệt Trảm',
      'Thiên Địa Vô Cực Kiếm',
    ],
    tierBonuses: [
      'Sát thương 28 · Tầm chém 84px',
      'Sát thương 36 · Tầm chém 102px · +Khung Parry',
      'Sát thương 45 · Chém phóng 1 Kiếm Khí (Tốn 6 Nội lực)',
      'Sát thương 55 · Tầm 124px · Phóng 2 Kiếm Khí giao thoa',
      'Sát thương 68 · Tầm 142px · 3 Kiếm Khí xuyên cả 2 làn Z',
    ],
  },
  kunai: {
    name: 'Ám Khí Phi Tiêu',
    shortName: 'Ám Khí',
    hotkey: 'I',
    color: '#38bdf8',
    tierNames: [
      'Phi Tiêu Đơn',
      'Song Tiêu Xuyên Giáp',
      'Bạo Liệt Phi Tiêu (Nổ AoE)',
      'Tứ Phương Truy Hồn Tiêu',
      'Bão Tố Vạn Tiêu (5 Tia)',
    ],
    tierBonuses: [
      '1 tiêu (24 ST) · Tốn 20 Nội lực',
      '2 tiêu xuyên thấu (18 ST/tiêu) · Tốn 18 Nội lực',
      '3 tiêu hình quạt (16 ST + Nổ AoE) · Tốn 18 Nội lực',
      '4 tiêu tự động truy kích (14 ST/tiêu) · Tốn 16 Nội lực',
      '5 tiêu nổ liên hoàn + Truy kích · Tốn 16 Nội lực',
    ],
  },
  mobility: {
    name: 'Thân Pháp Khinh Công',
    shortName: 'Thân Pháp',
    hotkey: 'O',
    color: '#fbbf24',
    tierNames: [
      'Khinh Công Cơ Bản',
      'Đạp Không Nhị Đoạn',
      'Lôi Ảnh Thân Pháp',
      'Tam Đoạn Đạp Vân',
      'Hư Không Thiểm Điện',
    ],
    tierBonuses: [
      'Nhảy đơn chuẩn xác · Hồi Lướt 1.35s',
      'Mở khóa Nhảy Đôi (Double Jump) · Hồi Lướt 1.18s',
      '+7% Tốc độ · Lướt Không gây sát thương Lôi Ảnh (1.02s CD)',
      'Mở khóa Nhảy 3 Bậc (Triple Jump) · Hồi Lướt 0.88s',
      '+14% Tốc độ · Lướt Không phóng Bóng Ma Kiếm Khí (0.78s CD)',
    ],
  },
  deflect: {
    name: 'Phản Đòn & Nội Công',
    shortName: 'Phản Đòn',
    hotkey: 'Y',
    color: '#34d399',
    tierNames: [
      'Gạt Đỡ Cơ Bản',
      'Thiết Bích Phản Kích',
      'Hấp Tinh Đại Pháp',
      'Lôi Đình Chấn Vũ',
      'Vạn Kiếm Quy Tông Parry',
    ],
    tierBonuses: [
      'Parry trả 1 đạn · Hồi 32 Nội lực',
      'Khung Parry rộng hơn +25% · Đạn phản gây x1.35 sát thương',
      'Parry hồi +45 Nội lực & +6 Sinh Mệnh (HP)',
      'Parry phóng xung kích chấn thương kẻ địch gần (28 ST)',
      'Mỗi lần Parry bắn trả 3 luồng Linh Kiếm truy kích',
    ],
  },
  guardian: {
    name: 'Hộ Thể Linh Hoàn',
    shortName: 'Hộ Thể',
    hotkey: 'L',
    color: '#c084fc',
    tierNames: [
      'Tĩnh Tâm Quyết',
      'Nhất Linh Kiếm Hộ Thể',
      'Song Linh Kiếm Xoay Vòng',
      'Tam Tài Hộ Pháp Kiếm',
      'Bát Quái Tử Vi Kiếm Trận',
    ],
    tierBonuses: [
      'Hồi Nội lực cơ bản 8/s',
      'Triệu hồi 1 Linh Kiếm xoay quanh người chém địch áp sát',
      '2 Linh Kiếm xoay quanh người · Hồi Nội lực 11/s',
      '3 Linh Kiếm xoay tốc độ cao · Chắn đạn thường mỗi 1.2s',
      '4 Thần Kiếm hộ thể + Tự động bắn kiếm khí mỗi 2.4s',
    ],
  },
};

export const SKILL_BRANCH_ORDER: SkillBranchId[] = [
  'kodachi',
  'kunai',
  'mobility',
  'deflect',
  'guardian',
];

export function getBranchLevelKey(
  branch: SkillBranchId
): 'kodachiLevel' | 'kunaiLevel' | 'mobilityLevel' | 'deflectLevel' | 'guardianLevel' {
  switch (branch) {
    case 'kodachi':
      return 'kodachiLevel';
    case 'kunai':
      return 'kunaiLevel';
    case 'mobility':
      return 'mobilityLevel';
    case 'deflect':
      return 'deflectLevel';
    case 'guardian':
      return 'guardianLevel';
  }
}

export function upgradeSkillBranch(
  state: PlayerCombatState,
  branch: SkillBranchId,
  freeFromPickup: boolean = false
): { nextState: PlayerCombatState; upgraded: boolean; newLevel: SkillLevel } {
  const key = getBranchLevelKey(branch);
  const currentLevel = state.skills[key];

  if (currentLevel >= 5) {
    if (freeFromPickup) {
      return {
        nextState: {
          ...state,
          score: state.score + 250,
          skills: {
            ...state.skills,
            scrollsCollected: state.skills.scrollsCollected + 1,
            unspentScrolls: state.skills.unspentScrolls + 1,
          },
        },
        upgraded: false,
        newLevel: 5,
      };
    }
    return { nextState: state, upgraded: false, newLevel: 5 };
  }

  const requiredCost = getSkillUpgradeCost(currentLevel);

  if (freeFromPickup) {
    const availableWithPickup = state.skills.unspentScrolls + 1;
    if (requiredCost <= 1) {
      const nextLevel = (currentLevel + 1) as SkillLevel;
      return {
        nextState: {
          ...state,
          score: state.score + 220,
          skills: {
            ...state.skills,
            [key]: nextLevel,
            scrollsCollected: state.skills.scrollsCollected + 1,
          },
        },
        upgraded: true,
        newLevel: nextLevel,
      };
    }
    if (availableWithPickup >= requiredCost) {
      const nextLevel = (currentLevel + 1) as SkillLevel;
      return {
        nextState: {
          ...state,
          score: state.score + 260,
          skills: {
            ...state.skills,
            [key]: nextLevel,
            scrollsCollected: state.skills.scrollsCollected + 1,
            unspentScrolls: availableWithPickup - requiredCost,
          },
        },
        upgraded: true,
        newLevel: nextLevel,
      };
    }
    return {
      nextState: {
        ...state,
        score: state.score + 180,
        skills: {
          ...state.skills,
          scrollsCollected: state.skills.scrollsCollected + 1,
          unspentScrolls: availableWithPickup,
        },
      },
      upgraded: false,
      newLevel: currentLevel,
    };
  }

  if (state.skills.unspentScrolls < requiredCost) {
    return { nextState: state, upgraded: false, newLevel: currentLevel };
  }

  const nextLevel = (currentLevel + 1) as SkillLevel;
  return {
    nextState: {
      ...state,
      score: state.score + 220,
      skills: {
        ...state.skills,
        [key]: nextLevel,
        unspentScrolls: state.skills.unspentScrolls - requiredCost,
      },
    },
    upgraded: true,
    newLevel: nextLevel,
  };
}

export function getEffectiveKodachiStats(
  kodachiLevel: SkillLevel,
  isAwakened: boolean,
  activeElement: ElementalStanceId = 'crimson_fire'
): {
  damage: number;
  waveDamage: number;
  range: number;
  waveCount: number;
  crossZ: boolean;
  elementalProjectileStyle: 'fire_burst' | 'lightning_bolt' | 'ice_shard';
} {
  const baseDamageTable: Record<SkillLevel, number> = {
    1: 28,
    2: 36,
    3: 45,
    4: 55,
    5: 68,
  };
  const rangeTable: Record<SkillLevel, number> = {
    1: 84,
    2: 102,
    3: 116,
    4: 128,
    5: 142,
  };
  const elemProfile = ELEMENTAL_STANCES[activeElement];
  let dmg = Math.round(baseDamageTable[kodachiLevel] * elemProfile.damageMultiplier);
  if (isAwakened) {
    dmg = Math.round(dmg * 1.25);
  }
  // Every element shoots its signature elemental projectile (Ice Shard, Lightning Bolt, or Fire Wave) on slash!
  const waveCount = kodachiLevel >= 5 ? 3 : kodachiLevel === 4 ? 2 : 1;
  return {
    damage: dmg,
    waveDamage: Math.max(10, Math.round(dmg * 0.62)),
    range: rangeTable[kodachiLevel],
    waveCount,
    crossZ: kodachiLevel >= 5,
    elementalProjectileStyle: elemProfile.projectileStyle,
  };
}

export function getEffectiveKunaiDamage(
  kunaiLevel: SkillLevel,
  activeElement: ElementalStanceId = 'crimson_fire'
): number {
  const perProjectileTable: Record<SkillLevel, number> = {
    1: 24,
    2: 18,
    3: 16,
    4: 14,
    5: 13,
  };
  const base = perProjectileTable[kunaiLevel];
  const elemProfile = ELEMENTAL_STANCES[activeElement];
  return Math.max(8, Math.round(base * elemProfile.damageMultiplier));
}

export function getEffectiveDashCooldown(mobilityLevel: SkillLevel): number {
  const table: Record<SkillLevel, number> = {
    1: PHYSICS_CONSTANTS.AIR_DASH_COOLDOWN, // 1.35s
    2: 1.18,
    3: 1.02,
    4: 0.88,
    5: 0.78,
  };
  return table[mobilityLevel];
}

export function getMaxAirJumps(mobilityLevel: SkillLevel): number {
  if (mobilityLevel >= 4) return 2; // Triple Jump (1 ground + 2 air)
  if (mobilityLevel >= 2) return 1; // Double Jump
  return 0;
}

export function getGuardianBladeCount(guardianLevel: SkillLevel): number {
  if (guardianLevel === 1) return 0;
  return guardianLevel - 1; // Lv2 -> 1, Lv3 -> 2, Lv4 -> 3, Lv5 -> 4 orbiting blades
}
