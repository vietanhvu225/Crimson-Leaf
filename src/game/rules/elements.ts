import type { PlayerCombatState } from './combat.ts';
import type { ElementalStanceId } from './types.ts';

export interface ElementalCombatProfile {
  id: ElementalStanceId;
  name: string;
  shortName: string;
  color: string;
  secondaryColor: string;
  desc: string;
  damageMultiplier: number; // crimson_fire (1.32) > thunder_lightning (1.12) > frost_venom (0.85)
  projectileStyle: 'fire_burst' | 'lightning_bolt' | 'ice_shard';
  freezeChance: number;
  freezeDuration: number;
  stunChance: number;
  stunDuration: number;
  burnDuration: number;
  burnDps: number;
  chainLightningDamage: number;
}

export const ELEMENTAL_STANCES: Record<ElementalStanceId, ElementalCombatProfile> = {
  crimson_fire: {
    id: 'crimson_fire',
    name: 'Hỏa Viêm Hệ (Sát Thương Cao Nhất)',
    shortName: 'Hỏa Viêm',
    color: '#f43f5e',
    secondaryColor: '#fb923c',
    desc: 'Sát thương TO NHẤT (+32% ST) · Đánh ra Lửa Hỏa Viêm & thiêu đốt 12 HP/s trong 2.8s',
    damageMultiplier: 1.32,
    projectileStyle: 'fire_burst',
    freezeChance: 0,
    freezeDuration: 0,
    stunChance: 0,
    stunDuration: 0,
    burnDuration: 2.8,
    burnDps: 12,
    chainLightningDamage: 0,
  },
  thunder_lightning: {
    id: 'thunder_lightning',
    name: 'Lôi Điện Hệ (Sát Thương Thứ Nhì · Tỷ Lệ Choáng)',
    shortName: 'Lôi Điện',
    color: '#fbbf24',
    secondaryColor: '#38bdf8',
    desc: 'Sát thương TO NHÌ (+12% ST) · Đánh ra Sét Lôi Điện + 38% tỷ lệ làm CHOÁNG địch (1.45s) & giật sét lan',
    damageMultiplier: 1.12,
    projectileStyle: 'lightning_bolt',
    freezeChance: 0,
    freezeDuration: 0,
    stunChance: 0.38,
    stunDuration: 1.45,
    burnDuration: 0,
    burnDps: 0,
    chainLightningDamage: 16,
  },
  frost_venom: {
    id: 'frost_venom',
    name: 'Hàn Băng Hệ (Bắn Băng & Đóng Băng · Sát Thương Thấp Nhất)',
    shortName: 'Hàn Băng',
    color: '#38bdf8',
    secondaryColor: '#e0f2fe',
    desc: 'Sát thương YẾU NHẤT (-15% ST) · Bắn ra Băng Tinh + 42% tỷ lệ ĐÓNG BĂNG cứng kẻ địch (1.85s) & làm chậm 45%',
    damageMultiplier: 0.85,
    projectileStyle: 'ice_shard',
    freezeChance: 0.42,
    freezeDuration: 1.85,
    stunChance: 0,
    stunDuration: 0,
    burnDuration: 0,
    burnDps: 0,
    chainLightningDamage: 0,
  },
};

export function getElementalCombatProfile(element: ElementalStanceId): ElementalCombatProfile {
  return ELEMENTAL_STANCES[element];
}

export function rollElementalProc(
  element: ElementalStanceId,
  randomRoll: number
): {
  triggeredFreeze: boolean;
  freezeDuration: number;
  chillDuration: number;
  triggeredStun: boolean;
  stunDuration: number;
  chainShockDamage: number;
  triggeredBurn: boolean;
  burnDuration: number;
  procBannerText: string | null;
  procBannerColor: string;
  bannerText: string;
  bannerColor: string;
} {
  const profile = ELEMENTAL_STANCES[element];
  if (element === 'frost_venom') {
    const frozen = randomRoll < profile.freezeChance;
    return {
      triggeredFreeze: frozen,
      freezeDuration: frozen ? profile.freezeDuration : 0,
      chillDuration: 2.8,
      triggeredStun: false,
      stunDuration: 0,
      chainShockDamage: 0,
      triggeredBurn: false,
      burnDuration: 0,
      procBannerText: frozen ? 'HÀN BĂNG ĐÓNG BĂNG!' : null,
      procBannerColor: '#38bdf8',
      bannerText: 'HÀN BĂNG ĐÓNG BĂNG!',
      bannerColor: '#38bdf8',
    };
  }
  if (element === 'thunder_lightning') {
    const stunned = randomRoll < profile.stunChance;
    return {
      triggeredFreeze: false,
      freezeDuration: 0,
      chillDuration: 0,
      triggeredStun: stunned,
      stunDuration: stunned ? profile.stunDuration : 0,
      chainShockDamage: profile.chainLightningDamage,
      triggeredBurn: false,
      burnDuration: 0,
      procBannerText: stunned ? 'LÔI ĐIỆN CHOÁNG TÊ LIỆT!' : null,
      procBannerColor: '#fde047',
      bannerText: 'LÔI ĐIỆN CHOÁNG TÊ LIỆT!',
      bannerColor: '#fde047',
    };
  }
  return {
    triggeredFreeze: false,
    freezeDuration: 0,
    chillDuration: 0,
    triggeredStun: false,
    stunDuration: 0,
    chainShockDamage: 0,
    triggeredBurn: true,
    burnDuration: profile.burnDuration,
    procBannerText: 'HỎA VIÊM THIÊU ĐỐT!',
    procBannerColor: '#f43f5e',
    bannerText: 'HỎA VIÊM THIÊU ĐỐT!',
    bannerColor: '#f43f5e',
  };
}

export const ELEMENTAL_ORDER: ElementalStanceId[] = [
  'crimson_fire',
  'thunder_lightning',
  'frost_venom',
];

export function cycleElementalStance(state: PlayerCombatState): PlayerCombatState {
  const idx = ELEMENTAL_ORDER.indexOf(state.skills.activeElement);
  const nextElement = ELEMENTAL_ORDER[(idx + 1) % ELEMENTAL_ORDER.length];
  return {
    ...state,
    skills: {
      ...state.skills,
      activeElement: nextElement,
    },
  };
}
