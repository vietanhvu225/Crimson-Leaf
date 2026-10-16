export type SeasonId =
  | 'spring'
  | 'summer'
  | 'autumn'
  | 'winter'
  | 'cavern'
  | 'thunder_peak'
  | 'blood_abyss'
  | 'celestial_altar'
  | 'ocean_palace'
  | 'earth_core'
  | 'sky_sanctuary';

export type GameLoopRoute = 1 | 2; // 1 = Normal (Điệu Hổ Ly Sơn), 2 = True Route (Huyết Điện)
export type GameStateMode = 'title' | 'playing' | 'paused' | 'gameover';
export type ZLane = 0 | 1; // 0 = Main Plane (Ngoài), 1 = Inner Plane (Trong)

export type SkillBranchId = 'kodachi' | 'kunai' | 'mobility' | 'deflect' | 'guardian';
export type SkillLevel = 1 | 2 | 3 | 4 | 5;

export type ElementalStanceId = 'crimson_fire' | 'thunder_lightning' | 'frost_venom';

export type RelicId =
  | 'vampiric_fang'
  | 'thunder_drum'
  | 'mirror_shield'
  | 'wind_feather'
  | 'dragon_seal'
  | 'magnet_talisman';

export type PickupItemKind =
  | 'scroll_kodachi'
  | 'scroll_kunai'
  | 'scroll_mobility'
  | 'scroll_deflect'
  | 'scroll_guardian'
  | 'jade_elixir'
  | 'chakra_pearl'
  | 'blood_orb'
  | 'relic_chest'
  | 'elemental_shrine';

export type StageMechanicId =
  | 'updraft_bamboo'
  | 'tidal_rafts'
  | 'crosswind_towers'
  | 'ice_icicles'
  | 'crystal_geysers'
  | 'lightning_storm'
  | 'lava_collapse'
  | 'bagua_eclipse'
  | 'underwater_combat'
  | 'earth_core_descent'
  | 'aerial_levitation';

export interface SkillTreeState {
  kodachiLevel: SkillLevel;
  kunaiLevel: SkillLevel;
  mobilityLevel: SkillLevel;
  deflectLevel: SkillLevel;
  guardianLevel: SkillLevel;
  activeElement: ElementalStanceId;
  relics: RelicId[];
  scrollsCollected: number;
  unspentScrolls: number;
}
