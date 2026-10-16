import type {
  TouchInputState,
  PlatformBranch,
  StageHazardZone,
  SealGateActor,
  GrapplePoint,
  ShrineCheckpoint,
  WorldItemPickup,
  EnemyActor,
  ProjectileActor,
  BloodOrbPickup,
  PooledParticle,
  LightningBoltArc,
  FloatingBanner,
} from './entities.ts';
import {
  type PlayerCombatState,
  type SeasonId,
  type GameLoopRoute,
  type GameStateMode,
  createInitialPlayerCombatState,
} from '../rules/index.ts';
import { mulberry32, type Rng } from './rng.ts';

/** Callbacks + settings the React host exposes to the engine (read every frame). */
export interface HostState {
  gameState: GameStateMode;
  seasonId: SeasonId;
  loopRoute: GameLoopRoute;
  muted: boolean;
  onSyncHud: (
    state: PlayerCombatState,
    trailingHp: number,
    stageProgressPct: number,
    bossHp: number | null,
    bossMaxHp: number | null
  ) => void;
  onStageOutcome?: (
    outcome: 'victory' | 'defeat',
    finalCombat: PlayerCombatState,
    clearTimeSec: number,
    progressPct: number,
    bossHpRemaining: number
  ) => void;
  onStageClear?: () => void;
  onPlayerDefeated?: () => void;
  onTogglePause: () => void;
  onToggleMute: () => void;
  onOpenGdd: () => void;
  onQuickRestart: () => void;
  onSelectSeasonQuick: (s: SeasonId) => void;
}

export interface CreateWorldOptions {
  stateRef: { current: HostState };
  touchInputRef: { current: TouchInputState };
  /** Seed for the default RNG (mulberry32). */
  seed: number;
  /** Overrides the RNG (`?rng=math` parity runs share the page-wide global random sequence). */
  rng?: Rng;
  /** Visible sim area in px (camera follow, ambient spawns, end-beat). Host keeps it updated. */
  viewW: number;
  viewH: number;
  /** Headless browser / Node: skips purely cosmetic particle spawns (as the original did). */
  isHeadless: boolean;
}

/** All mutable game state: input, player, level, actors, pools, camera. */
export function createWorld({
  stateRef,
  touchInputRef,
  seed,
  rng,
  viewW,
  viewH,
  isHeadless,
}: CreateWorldOptions) {
  // Input Tracking
  const keysHeld = new Set<string>();
  const keysJustPressed = new Set<string>();
  let mouseWorldX = 600;
  let mouseWorldY = 300;
  let lmbJustPressed = false;
  let rmbJustPressed = false;
  const player = {
    x: 180,
    y: 460,
    vx: 0,
    vy: 0,
    facing: 1 as 1 | -1,
    onGround: false,
    onIce: false,
    standingPlatform: null as PlatformBranch | null,
    airJumpsUsed: 0,
    wallCling: 0 as -1 | 0 | 1,
    scaleX: 1,
    scaleY: 1,
    gaitPhase: 0,
    isAttacking: false,
    attackElapsed: 0,
    attackAngle: 0,
    grappleTarget: null as GrapplePoint | null,
    invulnTimer: 0,
    guardianAngle: 0,
    guardianFireTimer: 0,
    guardianBlockCooldown: 0,
    cloakNodes: Array.from({ length: 6 }, () => ({ x: 180, y: 460 })),
  };
  let combat: PlayerCombatState = {
    ...createInitialPlayerCombatState(),
    rage: 25,
  };
  let trailingHp = 100;
  let camX = 0;
  let camY = 0;
  let titlePanTime = 0;
  let stageTimeSec = 0;
  let hitstopTimer = 0;
  let cameraTrauma = 0;
  let outcomeTriggered = false;
  let endBeatTimer = 0;
  let pendingOutcome = null as 'victory' | 'defeat' | null;
  let gateReboundCooldown = 0;
  let kageWaveTimer = 1.6;
  let kageWaveCount = 0;
  let platforms: PlatformBranch[] = [];
  let hazards: StageHazardZone[] = [];
  let hazardIdCounter = 1;
  let sealGates: SealGateActor[] = [];
  let grapples: GrapplePoint[] = [];
  let trunks: { x: number; w: number; zDepth: number }[] = [];
  let checkpoints: ShrineCheckpoint[] = [];
  let worldItems: WorldItemPickup[] = [];
  let itemIdCounter = 1;
  let enemies: EnemyActor[] = [];
  let enemyIdCounter = 1;
  const projectiles: ProjectileActor[] = Array.from({ length: 80 }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    fromPlayer: false,
    parried: false,
    piercing: false,
    explosive: false,
    homing: false,
    crossZ: false,
    isSwordBeam: false,
    isFireball: false,
    damage: 20,
    zLane: 0,
    life: 0,
  }));
  const bloodOrbs: BloodOrbPickup[] = Array.from({ length: 8 }, () => ({
    active: false,
    x: 0,
    y: 0,
    vy: 0,
    life: 0,
  }));
  const particles: PooledParticle[] = Array.from({ length: 200 }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    size: 3,
    color: '#fda4af',
    alpha: 1,
    life: 0,
    maxLife: 1,
    kind: 'env',
  }));
  let particleCursor = 0;
  const banners: FloatingBanner[] = Array.from({ length: 14 }, () => ({
    active: false,
    x: 0,
    y: 0,
    text: '',
    color: '#ffffff',
    life: 0,
  }));
  let bannerCursor = 0;
  const lightningBolts: LightningBoltArc[] = Array.from({ length: 16 }, () => ({
    active: false,
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    life: 0,
    maxLife: 0.24,
    color: '#fde047',
  }));
  let lightningCursor = 0;
  let lastTime = performance.now();
  let hudSyncTimer = 0;

  return {
    seed,
    rng: rng ?? mulberry32(seed),
    isHeadless,
    viewW,
    viewH,
    keysHeld,
    keysJustPressed,
    mouseWorldX,
    mouseWorldY,
    aimSync: null as AimSync | null,
    onAimReset: null as AimReset | null,
    lmbJustPressed,
    rmbJustPressed,
    player,
    combat,
    trailingHp,
    camX,
    camY,
    titlePanTime,
    stageTimeSec,
    hitstopTimer,
    cameraTrauma,
    outcomeTriggered,
    endBeatTimer,
    pendingOutcome,
    gateReboundCooldown,
    kageWaveTimer,
    kageWaveCount,
    platforms,
    hazards,
    hazardIdCounter,
    sealGates,
    grapples,
    trunks,
    checkpoints,
    worldItems,
    itemIdCounter,
    enemies,
    enemyIdCounter,
    projectiles,
    bloodOrbs,
    particles,
    particleCursor,
    banners,
    bannerCursor,
    lightningBolts,
    lightningCursor,
    lastTime,
    hudSyncTimer,
    stateRef,
    touchInputRef,
  };
}

export type World = ReturnType<typeof createWorld>;

/**
 * Optional host hook the sim calls once per step, right before reading input, so a host that aims
 * in screen space (canvas: client px + camera) converts with the camera of that exact step.
 * Hosts that already know the world point (3D raycast) just call setAimWorld and leave this null.
 */
export type AimSync = () => void;

/** Level reset puts the pointer back at a fixed view-px spot (the original wrote mouseClientX/Y). */
export type AimReset = (viewX: number, viewY: number) => void;

/** Aim point in sim (world) px: where kunai / aimed skills go. */
export function setAimWorld(world: World, x: number, y: number) {
  world.mouseWorldX = x;
  world.mouseWorldY = y;
}
