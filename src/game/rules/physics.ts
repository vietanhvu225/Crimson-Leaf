import { SEASONS } from './stages.ts';
import type { GameLoopRoute, RelicId, SeasonId, SkillLevel } from './types.ts';

// Grounded, weighty Wuxia action platformer constants (prevents floaty overspeed & stage-skipping)
export const PHYSICS_CONSTANTS = {
  GRAVITY: 1320,
  SUPER_JUMP_VELOCITY: -545, // Crisp ~112px jump height (no longer launches off-screen)
  DOUBLE_JUMP_VELOCITY: -485,
  SPRINGBOARD_VELOCITY: -710,
  WALL_JUMP_VX: 260,
  WALL_JUMP_VY: -510,
  MOVE_SPEED: 185, // Deliberate, weighty martial arts run speed (was 255)
  GROUND_ACCEL: 1450,
  GROUND_DECEL: 1650,
  AIR_ACCEL: 980,
  WATER_SPEED_MULTIPLIER: 0.68,
  AWAKENED_SPEED_MULTIPLIER: 1.12,
  AIR_DASH_SPEED: 440, // Tactical combat dodge (was 640)
  AIR_DASH_DURATION: 0.14,
  AIR_DASH_COOLDOWN: 1.35,
  COYOTE_TIME: 0.11,
  JUMP_BUFFER_TIME: 0.12,
  JUMP_CUT_MULTIPLIER: 0.45,
  KUNAI_CHAKRA_COST: 20,
  SWORD_WAVE_CHAKRA_COST: 6,
  CHAKRA_REGEN_PER_SEC: 8,
  CHAKRA_RESTORE_ON_MELEE: 14,
  CHAKRA_RESTORE_ON_PARRY: 32,
  MAX_CHAKRA: 100,
  MAX_HP: 100,
  MAX_RAGE: 100,
  AWAKENING_DURATION: 12.0,
  PARRY_WINDOW_DURATION: 0.15,
  HITSTOP_PARRY: 0.09,
  HITSTOP_HEAVY: 0.06,
  Z_LANE_SWITCH_COOLDOWN: 0.35,
};

export function clampDt(rawDt: number): number {
  if (!Number.isFinite(rawDt) || rawDt < 0) return 0;
  return Math.min(rawDt, 0.05);
}

export function calculateEffectiveMoveSpeed(params: {
  baseSpeed?: number;
  isAwakened: boolean;
  isInWater: boolean;
  loopRoute?: GameLoopRoute;
  seasonId?: SeasonId;
  mobilityLevel?: SkillLevel;
  relics?: RelicId[];
}): number {
  const base = params.baseSpeed ?? PHYSICS_CONSTANTS.MOVE_SPEED;
  let mult = 1.0;
  if (params.isAwakened) {
    mult *= PHYSICS_CONSTANTS.AWAKENED_SPEED_MULTIPLIER;
  }
  const mob = params.mobilityLevel ?? 1;
  if (mob >= 5) {
    mult *= 1.14;
  } else if (mob === 4) {
    mult *= 1.1;
  } else if (mob === 3) {
    mult *= 1.07;
  } else if (mob === 2) {
    mult *= 1.03;
  }
  if (params.relics?.includes('wind_feather')) {
    mult *= 1.08;
  }
  if (params.isInWater) {
    if (params.seasonId === 'ocean_palace') {
      mult *= 1.15;
    } else if (params.loopRoute === 2 && params.seasonId === 'summer') {
      mult *= 1.1;
    } else {
      mult *= PHYSICS_CONSTANTS.WATER_SPEED_MULTIPLIER;
    }
  }
  return Math.round(base * mult);
}

export interface StageMovementProfile {
  seasonId: SeasonId;
  styleName: string;
  grappleItemName: string;
  gravityMult: number;
  iceSkateSpeedMult: number;
  iceJumpBoostVx: number;
  hasFrostChargeRam: boolean;
  canClingTreeTrunks: boolean;
  canWallRunUpward: boolean;
  wallRunUpSpeed: number;
  canWaterSkim: boolean;
  canWaterSwimJump: boolean;
  waterSwimJumpVy: number;
  isFreeSwimmingUnderwater: boolean;
  isFreeFlyingInSky: boolean;
  isAerialLevitation: boolean;
  hasAntiGravityCeilingFlight: boolean;
  hasCosmicSwordFlight: boolean;
  hasEarthCoreDrill: boolean;
  downhillSlopeFactor: number;
  canHoverGlide: boolean;
  hoverGlideMaxFallVy: number;
  grappleRangeMult: number;
  grapplePullSpeed: number;
  grappleResetsDashAndJump: boolean;
  grappleShockwaveDamage: number;
  dashCooldownMult: number;
  dashSpeedMult: number;
  allowEightWayAirDash: boolean;
  canMeteorGroundSlam: boolean;
  lavaThermalBounceVy: number | null;
  bonusAirJumps: number;
  springboardMult: number;
}

/**
 * Pure helper calculating the downward subterranean floor Y(x) for Stage 10 (Màn 10: Địa Tâm Hoang Cổ).
 * Features alternating 45-degree diagonal downhill ramps (Dốc Chéo 45°) and sheer 90-degree vertical drop shafts (Giếng Thẳng Đứng 90°)!
 */
export function computeSubterraneanSlopeY(
  x: number,
  seasonIdOrStageLen: SeasonId | number = 'earth_core'
): number {
  if (typeof seasonIdOrStageLen === 'string' && seasonIdOrStageLen !== 'earth_core') {
    return 0;
  }
  const effectiveX = Math.max(0, Math.min(41200, x - 180));
  const cycleLen = 900;
  const cycleDrop = 720;
  const cycleIdx = Math.floor(effectiveX / cycleLen);
  const localX = effectiveX - cycleIdx * cycleLen;
  const baseY = 180 + cycleIdx * cycleDrop;

  if (localX <= 420) {
    // 1. Đoạn Dốc Chéo 45° (45-degree diagonal downhill ramp: 360px drop over 420px horizontal!)
    return Math.round(baseY + localX * (360 / 420));
  }
  if (localX < 540) {
    // 2. Đài Đá Mép Vực trước Giếng Thẳng Đứng 90° (Cliff-edge ledge before 90-degree vertical drop)
    return Math.round(baseY + 360);
  }
  // 3. Giếng Thẳng Đứng 90° (Sheer 90-degree vertical drop of +360px straight down onto the lower shaft floor!)
  return Math.round(baseY + 720);
}

/**
 * Returns the distinct movement & physics profile for each of the 11 stages
 * so every stage plays and moves in a genuinely unique way.
 */
export function getStageMovementProfile(seasonId: SeasonId): StageMovementProfile {
  const base: StageMovementProfile = {
    seasonId,
    styleName: SEASONS[seasonId].movementStyleName,
    grappleItemName: SEASONS[seasonId].grappleItemName,
    gravityMult: 1.0,
    iceSkateSpeedMult: 1.0,
    iceJumpBoostVx: 0,
    hasFrostChargeRam: false,
    canClingTreeTrunks: false,
    canWallRunUpward: false,
    wallRunUpSpeed: 0,
    canWaterSkim: false,
    canWaterSwimJump: false,
    waterSwimJumpVy: -440,
    isFreeSwimmingUnderwater: false,
    isFreeFlyingInSky: false,
    isAerialLevitation: false,
    hasAntiGravityCeilingFlight: false,
    hasCosmicSwordFlight: false,
    hasEarthCoreDrill: false,
    downhillSlopeFactor: 0,
    canHoverGlide: false,
    hoverGlideMaxFallVy: 860,
    grappleRangeMult: 1.0,
    grapplePullSpeed: 640,
    grappleResetsDashAndJump: false,
    grappleShockwaveDamage: 0,
    dashCooldownMult: 1.0,
    dashSpeedMult: 1.0,
    allowEightWayAirDash: false,
    canMeteorGroundSlam: false,
    lavaThermalBounceVy: null,
    bonusAirJumps: 0,
    springboardMult: 1.0,
  };

  switch (seasonId) {
    case 'spring':
      return {
        ...base,
        canClingTreeTrunks: true,
        springboardMult: 1.14,
      };
    case 'summer':
      return {
        ...base,
        canWaterSkim: true,
        canWaterSwimJump: true,
        waterSwimJumpVy: -495,
      };
    case 'autumn':
      return {
        ...base,
        canClingTreeTrunks: true,
        canWallRunUpward: true,
        wallRunUpSpeed: -315,
      };
    case 'winter':
      return {
        ...base,
        iceSkateSpeedMult: 1.58,
        iceJumpBoostVx: 135,
        hasFrostChargeRam: true,
      };
    case 'cavern':
      return {
        ...base,
        gravityMult: 0.42,
        hasAntiGravityCeilingFlight: true,
        canHoverGlide: true,
        hoverGlideMaxFallVy: 75,
        grappleRangeMult: 1.48,
      };
    case 'thunder_peak':
      return {
        ...base,
        dashCooldownMult: 0.48,
        allowEightWayAirDash: true,
        grappleRangeMult: 1.38,
        grapplePullSpeed: 980,
        grappleResetsDashAndJump: true,
        grappleShockwaveDamage: 38,
      };
    case 'blood_abyss':
      return {
        ...base,
        canMeteorGroundSlam: true,
        lavaThermalBounceVy: -735,
      };
    case 'celestial_altar':
      return {
        ...base,
        gravityMult: 0.46,
        hasCosmicSwordFlight: true,
        bonusAirJumps: 3,
        dashSpeedMult: 1.32,
        dashCooldownMult: 0.68,
      };
    case 'ocean_palace':
      return {
        ...base,
        gravityMult: 0.0,
        isFreeSwimmingUnderwater: true,
        canWaterSwimJump: true,
        waterSwimJumpVy: -360,
        canHoverGlide: true,
        hoverGlideMaxFallVy: 90,
        allowEightWayAirDash: true,
        dashSpeedMult: 1.38,
        dashCooldownMult: 0.55,
        grappleRangeMult: 1.38,
        grapplePullSpeed: 820,
      };
    case 'earth_core':
      return {
        ...base,
        hasEarthCoreDrill: true,
        downhillSlopeFactor: 0.42,
        canMeteorGroundSlam: true,
        allowEightWayAirDash: true,
        dashSpeedMult: 1.35,
        dashCooldownMult: 0.62,
        grappleRangeMult: 1.36,
        grapplePullSpeed: 880,
        grappleResetsDashAndJump: true,
      };
    case 'sky_sanctuary':
      return {
        ...base,
        gravityMult: 0.0,
        isFreeFlyingInSky: true,
        isAerialLevitation: true,
        allowEightWayAirDash: true,
        dashSpeedMult: 1.45,
        dashCooldownMult: 0.48,
        grappleRangeMult: 1.42,
        grapplePullSpeed: 940,
        grappleResetsDashAndJump: true,
      };
  }
}

/**
 * Pure 360° Mid-Air Levitation & Aerial Dogfight Physics Step for Stage 11 (Màn 11: Cửu Thiên Không Chiến).
 * Allows weightless 4-directional aerial flight [W/A/S/D] + hovering wind-levitation without walking or jumping!
 */
export function computeAerialFlightStep(params: {
  vx: number;
  vy: number;
  moveLeft: boolean;
  moveRight: boolean;
  flyUp: boolean;
  flyDown: boolean;
  maxFlySpeed: number;
  stageTimeSec: number;
  dt: number;
}): { vx: number; vy: number; flightBankRad: number; hoverTiltRad: number } {
  const targetVx = params.moveLeft
    ? -params.maxFlySpeed
    : params.moveRight
      ? params.maxFlySpeed
      : 0;
  const verticalFlySpeed = params.maxFlySpeed * 1.0;
  const hoverBobVy = Math.sin(params.stageTimeSec * 3.4) * 18;
  const targetVy = params.flyUp
    ? -verticalFlySpeed
    : params.flyDown
      ? verticalFlySpeed
      : hoverBobVy;

  const accelH = (params.moveLeft || params.moveRight ? 1850 : 1050) * params.dt;
  const accelV = (params.flyUp || params.flyDown ? 1850 : 1100) * params.dt;

  const deltaVx = targetVx - params.vx;
  const nextVx = Math.abs(deltaVx) <= accelH ? targetVx : params.vx + Math.sign(deltaVx) * accelH;

  const deltaVy = targetVy - params.vy;
  const nextVy = Math.abs(deltaVy) <= accelV ? targetVy : params.vy + Math.sign(deltaVy) * accelV;

  const flightBankRad = Math.max(
    -0.28,
    Math.min(0.28, (Math.abs(nextVx) / 480) * 0.22 + nextVy / 950)
  );
  return {
    vx: nextVx,
    vy: nextVy,
    flightBankRad,
    hoverTiltRad: flightBankRad,
  };
}

export const computeAerialLevitationStep = computeAerialFlightStep;

/**
 * Pure 360° Underwater Free-Swimming Physics Step for Stage 9 (Màn 9: Thủy Cung Đại Chiến).
 * Allows smooth 4-directional swimming [W/A/S/D] + neutral water buoyancy without walking or jumping!
 */
export function computeUnderwaterSwimStep(params: {
  vx: number;
  vy: number;
  moveLeft: boolean;
  moveRight: boolean;
  swimUp: boolean;
  swimDown: boolean;
  maxSwimSpeed: number;
  stageTimeSec: number;
  dt: number;
}): { vx: number; vy: number; swimPitchRad: number } {
  const targetVx = params.moveLeft
    ? -params.maxSwimSpeed
    : params.moveRight
      ? params.maxSwimSpeed
      : 0;
  const verticalSwimSpeed = params.maxSwimSpeed * 0.92;
  const idleBuoyancyVy = Math.sin(params.stageTimeSec * 2.8) * 24;
  const targetVy = params.swimUp
    ? -verticalSwimSpeed
    : params.swimDown
      ? verticalSwimSpeed
      : idleBuoyancyVy;

  const accelH = (params.moveLeft || params.moveRight ? 1380 : 760) * params.dt;
  const accelV = (params.swimUp || params.swimDown ? 1380 : 820) * params.dt;

  const deltaVx = targetVx - params.vx;
  const nextVx = Math.abs(deltaVx) <= accelH ? targetVx : params.vx + Math.sign(deltaVx) * accelH;

  const deltaVy = targetVy - params.vy;
  const nextVy = Math.abs(deltaVy) <= accelV ? targetVy : params.vy + Math.sign(deltaVy) * accelV;

  // Dynamic swimming body pitch in radians (tilted horizontally for swimming + pitched up/down by vertical swim)
  const baseSwimLean = 0.52;
  const verticalPitch = Math.max(-0.42, Math.min(0.42, nextVy / 520));
  const swimPitchRad = baseSwimLean + verticalPitch;

  return {
    vx: nextVx,
    vy: nextVy,
    swimPitchRad,
  };
}
