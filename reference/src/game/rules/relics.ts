import type { PlayerCombatState } from './combat.ts';
import type { RelicId } from './types.ts';

export const RELIC_CATALOG: Record<
  RelicId,
  {
    id: RelicId;
    name: string;
    color: string;
    desc: string;
  }
> = {
  vampiric_fang: {
    id: 'vampiric_fang',
    name: 'Huyết Nha Giới Chỉ',
    color: '#e11d48',
    desc: 'Hạ gục kẻ địch hoặc Parry thành công hồi ngay +5 Sinh Mệnh (HP)',
  },
  thunder_drum: {
    id: 'thunder_drum',
    name: 'Lôi Công Cổ',
    color: '#f59e0b',
    desc: 'Mỗi đòn Combo thứ 5 giáng Thiên Lôi nổ 22 sát thương diện rộng',
  },
  mirror_shield: {
    id: 'mirror_shield',
    name: 'Bát Quái Hộ Tâm Kính',
    color: '#22d3ee',
    desc: 'Mở rộng vùng Parry +25% & phản đòn tách thành 2 tia truy kích',
  },
  wind_feather: {
    id: 'wind_feather',
    name: 'Thiên Vũ Linh',
    color: '#a78bfa',
    desc: '+8% Tốc độ chạy & giảm 20% Nội lực tiêu hao khi phóng Phi Tiêu',
  },
  dragon_seal: {
    id: 'dragon_seal',
    name: 'Long Ấn Cổ Ngọc',
    color: '#fb7185',
    desc: 'Tăng +35% tốc độ tích Nộ Huyết Ngọc & kéo dài Huyết Ảnh thêm +4 giây',
  },
  magnet_talisman: {
    id: 'magnet_talisman',
    name: 'Linh Từ Phù Chú',
    color: '#34d399',
    desc: 'Tự động hút mọi Bí Kíp, Linh Đan và Huyết Ngọc trong bán kính 220px',
  },
};

export const RELIC_ORDER: RelicId[] = [
  'vampiric_fang',
  'thunder_drum',
  'mirror_shield',
  'wind_feather',
  'dragon_seal',
  'magnet_talisman',
];

export function grantRandomRelic(state: PlayerCombatState): {
  nextState: PlayerCombatState;
  grantedRelic: RelicId | null;
} {
  const unowned = RELIC_ORDER.filter((r) => !state.skills.relics.includes(r));
  if (unowned.length === 0) {
    return {
      nextState: {
        ...state,
        score: state.score + 350,
        skills: {
          ...state.skills,
          unspentScrolls: state.skills.unspentScrolls + 1,
        },
      },
      grantedRelic: null,
    };
  }
  const nextRelic = unowned[state.skills.relics.length % unowned.length];
  return {
    nextState: {
      ...state,
      score: state.score + 300,
      skills: {
        ...state.skills,
        relics: [...state.skills.relics, nextRelic],
      },
    },
    grantedRelic: nextRelic,
  };
}
