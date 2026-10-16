import { ROAD_NINJA_ARCHETYPES, SEASONS, type EnemyArchetype, type SeasonId } from '../../rules/index.ts';
import type { EnemyActor } from '../../engine/entities.ts';
import type { PlayerAnim } from './protagonist.ts';

// `?debug=1&gallery=actors`: a showcase row-up of every enemy archetype, the 11 bosses (each with
// its own stage) and the protagonist's animation states, drawn instead of the live actors.

export const GALLERY_SEASONS: SeasonId[] = [
  'spring',
  'summer',
  'autumn',
  'winter',
  'cavern',
  'thunder_peak',
  'blood_abyss',
  'celestial_altar',
  'ocean_palace',
  'earth_core',
  'sky_sanctuary',
];

export const GALLERY_POSES: PlayerAnim[] = ['idle', 'run', 'jump', 'fall', 'wall', 'dash', 'attack', 'parry', 'hurt', 'dead'];

export const POSE_LABEL: Record<PlayerAnim, string> = {
  idle: 'ĐỨNG',
  run: 'CHẠY',
  jump: 'NHẢY',
  fall: 'RƠI',
  wall: 'BÁM TƯỜNG',
  dash: 'LƯỚT',
  attack: 'CHÉM',
  parry: 'ĐỠ ĐÒN',
  hurt: 'TRÚNG ĐÒN',
  dead: 'GỤC NGÃ',
};

function fakeEnemy(id: number, archetype: EnemyArchetype): EnemyActor {
  return {
    id,
    archetype,
    x: 0,
    baseX: 0,
    y: 0,
    vx: 0,
    vy: 0,
    hp: 70,
    maxHp: 100,
    facing: 1,
    zLane: 0,
    ambushEntryTimer: 0,
    attackCooldown: 0,
    windupTimer: 0,
    hitFlashTimer: 0,
    koTimer: 0,
    aiTimer: 0,
    burnTimer: 0,
    chillTimer: 0,
    guardianHitCooldown: 0,
    onGround: true,
  };
}

export const GALLERY_ENEMIES: EnemyActor[] = [...ROAD_NINJA_ARCHETYPES, 'elite_guard' as const].map((a, i) =>
  fakeEnemy(9000 + i, a)
);

export const GALLERY_BOSSES: EnemyActor[] = GALLERY_SEASONS.map((_, i) => fakeEnemy(9100 + i, 'boss'));

/** Short boss tag: "M3 Đại Tướng Quân Thiết Chùy" (drops the parenthesised epithet). */
export function bossTag(i: number, s: SeasonId): string {
  return `M${i + 1} ${SEASONS[s].bossName.replace(/\s*\(.*\)\s*$/, '')}`;
}
