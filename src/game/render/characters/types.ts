import { EnemyArchetype, KageSpawnStyle, ZLane } from '../../rules';

// Minimal shapes the character renderers need from engine entities.

export interface RenderablePlayer {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  onGround: boolean;
  wallCling: -1 | 0 | 1;
  scaleX: number;
  scaleY: number;
  gaitPhase: number;
  isAttacking: boolean;
  attackElapsed: number;
  attackAngle: number;
  invulnTimer: number;
  guardianAngle: number;
  cloakNodes: { x: number; y: number }[];
}

export interface RenderableEnemy {
  id: number;
  archetype: EnemyArchetype;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  facing: 1 | -1;
  zLane: ZLane;
  ambushEntryTimer: number;
  windupTimer: number;
  hitFlashTimer: number;
  koTimer: number;
  burnTimer: number;
  chillTimer: number;
  freezeTimer?: number;
  stunTimer?: number;
  gatesCleared?: number;
  zoneDamageMult?: number;
  onGround?: boolean;
  kageSpinTimer?: number;
  kageSpawnStyle?: KageSpawnStyle;
}
