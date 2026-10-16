import { ZLane, PickupItemKind, EnemyArchetype, KageSpawnStyle, ElementalStanceId } from '../rules';

export interface TouchInputState {
  left: boolean;
  right: boolean;
  jump: boolean;
  melee: boolean;
  kunai: boolean;
  dash: boolean;
  grapple: boolean;
  switchZ: boolean;
}

export type PlatformSubType =
  | 'ground'
  | 'branch'
  | 'roof'
  | 'piling'
  | 'springboard'
  | 'moving'
  | 'ice'
  | 'collapsing'
  | 'bagua_pad';

export interface PlatformBranch {
  x: number;
  baseX: number;
  y: number;
  baseY: number;
  w: number;
  zLane: ZLane | 'both';
  type: PlatformSubType;
  moveAmpX?: number;
  moveAmpY?: number;
  moveSpeed?: number;
  movePhase?: number;
  collapseTimer?: number;
  respawnTimer?: number;
}

export interface StageHazardZone {
  id: number;
  kind: 'updraft' | 'geyser' | 'icicle' | 'lightning' | 'spike_trap';
  x: number;
  y: number;
  w: number;
  h: number;
  timer: number;
  period: number;
  active: boolean;
  fallY?: number;
}

export interface SealGateActor {
  id: number;
  coord: number; // X for horizontal, Y for vertical
  title: string;
  unlocked: boolean;
  hasEliteSubBoss: boolean;
}

export interface GrapplePoint {
  x: number;
  y: number;
}

export interface ShrineCheckpoint {
  id: number;
  x: number;
  y: number;
  label: string;
  activated: boolean;
}

export interface WorldItemPickup {
  id: number;
  kind: PickupItemKind;
  x: number;
  y: number;
  baseY: number;
  zLane: ZLane | 'both';
  collected: boolean;
  label: string;
}

export interface EnemyActor {
  id: number;
  archetype: EnemyArchetype;
  x: number;
  baseX: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  zLane: ZLane;
  gateId?: number; // If assigned to a Seal Gate, must be defeated to unlock that gate!
  ambushEntryTimer: number;
  attackCooldown: number;
  windupTimer: number;
  hitFlashTimer: number;
  koTimer: number;
  aiTimer: number;
  burnTimer: number;
  chillTimer: number;
  freezeTimer?: number;
  stunTimer?: number;
  gatesCleared?: number;
  zoneDamageMult?: number;
  guardianHitCooldown: number;
  onGround?: boolean;
  kageSpawnStyle?: KageSpawnStyle;
  kageSpinTimer?: number;
  kageLeapCooldown?: number;
  kageLeapCount?: number;
  kagePendingEntrance?: boolean;
  bossCastCount?: number;
}

export interface ProjectileActor {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  fromPlayer: boolean;
  parried: boolean;
  piercing: boolean;
  explosive: boolean;
  homing: boolean;
  crossZ: boolean;
  isSwordBeam: boolean;
  isFireball: boolean;
  damage: number;
  zLane: ZLane;
  life: number;
  gravity?: number;
  waveAmp?: number;
  boomerangReturn?: boolean;
  customColor?: string;
  element?: ElementalStanceId;
  elementalStyle?: 'fire_burst' | 'lightning_bolt' | 'ice_shard';
}

export interface BloodOrbPickup {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  life: number;
}

export interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  kind: 'petal' | 'spark' | 'slash' | 'ember' | 'snow' | 'lightning' | 'env';
}

export interface LightningBoltArc {
  active: boolean;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface FloatingBanner {
  active: boolean;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}
