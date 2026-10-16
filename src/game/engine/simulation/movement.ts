import {
  PHYSICS_CONSTANTS,
  calculateEffectiveMoveSpeed,
  computeAerialLevitationStep,
  computeUnderwaterSwimStep,
  getStageMovementProfile,
} from '../../rules';
import { spawnParticle } from '../spawn';
import { World } from '../world';
import { Frame } from './frame';
import { FrameInput } from './frameInput';

// Movement profile per stage, free swim/flight, wall cling and cloak.

export function resolveMoveState(world: World, f: Frame) {
  const moveProfile = getStageMovementProfile(f.st.seasonId);

  // Dynamic Tidal Water Level in Stage 2 (Summer)
  const currentWaterY =
    f.cfg.waterLevelY !== null
      ? f.st.seasonId === 'summer'
        ? f.cfg.waterLevelY + Math.sin(world.stageTimeSec * 1.35) * 32
        : f.cfg.waterLevelY
      : null;

  const isInWater = currentWaterY !== null && world.player.y > currentWaterY + 6;
  const baseEffSpeed = calculateEffectiveMoveSpeed({
    isAwakened: world.combat.awakenedTimer > 0,
    isInWater: isInWater && !moveProfile.canWaterSkim,
    loopRoute: f.st.loopRoute,
    seasonId: f.st.seasonId,
    mobilityLevel: world.combat.skills.mobilityLevel,
    relics: world.combat.skills.relics,
  });
  const effSpeed =
    world.player.onGround && world.player.onIce
      ? baseEffSpeed * moveProfile.iceSkateSpeedMult
      : baseEffSpeed;

  // Stage 3 (Autumn) Periodic Crosswind Gusts
  const crosswindVx = f.st.seasonId === 'autumn' ? Math.sin(world.stageTimeSec * 0.9) * 95 : 0;

  const swimDownHeld = world.keysHeld.has('KeyS') || world.keysHeld.has('ArrowDown');

  const isFree3DFlightOrSwim =
    moveProfile.isFreeSwimmingUnderwater || moveProfile.isFreeFlyingInSky;

  return {
    moveProfile,
    currentWaterY,
    isInWater,
    effSpeed,
    crosswindVx,
    swimDownHeld,
    isFree3DFlightOrSwim,
  };
}

export function updateFreeSwimOrFlight(world: World, f: Frame, input: FrameInput, move: MoveState) {
  // STAGE 9 (OCEAN PALACE): TRUE 360° FREE-SWIMMING UNDERWATER PHYSICS (No walking or jumping!)
  if (move.moveProfile.isFreeSwimmingUnderwater) {
    if (world.combat.dashTimer <= 0 && !world.player.grappleTarget) {
      const swimStep = computeUnderwaterSwimStep({
        vx: world.player.vx,
        vy: world.player.vy,
        moveLeft: input.moveLeft,
        moveRight: input.moveRight,
        swimUp: input.jumpHeld,
        swimDown: move.swimDownHeld,
        maxSwimSpeed: move.effSpeed,
        stageTimeSec: world.stageTimeSec,
        dt: f.dt,
      });
      world.player.vx = swimStep.vx;
      world.player.vy = swimStep.vy;
      if (input.moveLeft) world.player.facing = -1;
      if (input.moveRight) world.player.facing = 1;
    }
    world.player.onGround = false;
    world.player.standingPlatform = null;
    world.player.airJumpsUsed = 0;
    world.player.gaitPhase +=
      f.dt * (input.moveLeft || input.moveRight || input.jumpHeld || move.swimDownHeld ? 16 : 9);

    if (
      (input.moveLeft || input.moveRight || input.jumpHeld || move.swimDownHeld) &&
      Math.random() < 0.35
    ) {
      spawnParticle(
        world,
        world.player.x - world.player.facing * 16,
        world.player.y - 16,
        -world.player.vx * 0.25 + (Math.random() - 0.5) * 40,
        -55 - Math.random() * 45,
        3.6,
        '#a5f3fc',
        0.35,
        'spark'
      );
    }
  } else if (move.moveProfile.isFreeFlyingInSky) {
    // STAGE 11 (SKY SANCTUARY): TRUE 360° FREE AERIAL LEVITATION & DOGFIGHT FLIGHT (Move freely Up/Down/Left/Right!)
    if (world.combat.dashTimer <= 0 && !world.player.grappleTarget) {
      const flyStep = computeAerialLevitationStep({
        vx: world.player.vx,
        vy: world.player.vy,
        moveLeft: input.moveLeft,
        moveRight: input.moveRight,
        flyUp: input.jumpHeld,
        flyDown: move.swimDownHeld,
        maxFlySpeed: move.effSpeed * 1.12,
        stageTimeSec: world.stageTimeSec,
        dt: f.dt,
      });
      world.player.vx = flyStep.vx;
      world.player.vy = flyStep.vy;
      if (input.moveLeft) world.player.facing = -1;
      if (input.moveRight) world.player.facing = 1;
    }
    world.player.onGround = false;
    world.player.standingPlatform = null;
    world.player.airJumpsUsed = 0;
    world.player.gaitPhase +=
      f.dt * (input.moveLeft || input.moveRight || input.jumpHeld || move.swimDownHeld ? 15 : 8);

    if (
      (input.moveLeft || input.moveRight || input.jumpHeld || move.swimDownHeld) &&
      Math.random() < 0.38
    ) {
      spawnParticle(
        world,
        world.player.x - world.player.facing * 16,
        world.player.y - 12,
        -world.player.vx * 0.25 + (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
        3.8,
        '#fde047',
        0.32,
        'spark'
      );
    }
  } else if (world.combat.dashTimer <= 0 && !world.player.grappleTarget) {
    // Grounded / Airborne Horizontal Acceleration for Stages 1-8 & 10
    const slopeSpeedBoost = f.st.seasonId === 'earth_core' && input.moveRight ? 1.18 : 1.0;
    const desiredVx =
      (input.moveLeft ? -move.effSpeed : input.moveRight ? move.effSpeed * slopeSpeedBoost : 0) +
      move.crosswindVx;
    if (world.player.onGround && world.player.onIce) {
      world.player.vx += (desiredVx - world.player.vx) * Math.min(1, f.dt * 3.2);
    } else {
      const accelRate = !world.player.onGround
        ? PHYSICS_CONSTANTS.AIR_ACCEL
        : input.moveLeft || input.moveRight
          ? PHYSICS_CONSTANTS.GROUND_ACCEL
          : PHYSICS_CONSTANTS.GROUND_DECEL;
      const deltaVx = desiredVx - world.player.vx;
      const maxStep = accelRate * f.dt;
      if (Math.abs(deltaVx) <= maxStep) {
        world.player.vx = desiredVx;
      } else {
        world.player.vx += Math.sign(deltaVx) * maxStep;
      }
    }
    if (input.moveLeft) world.player.facing = -1;
    if (input.moveRight) world.player.facing = 1;
  }
}

export function updateWallClingAndCloak(
  world: World,
  f: Frame,
  input: FrameInput,
  move: MoveState
) {
  // Wall Cling & Stage 3 (Autumn) Phi Diêm Tẩu Bích (Vertical Wall-Running Upward!)
  world.player.wallCling = 0;
  if (!world.player.onGround) {
    for (const tr of world.trunks) {
      if (tr.zDepth !== 0) continue;
      if (Math.abs(world.player.x - tr.x) < tr.w * 0.5 + 14) {
        if (
          input.moveLeft ||
          input.moveRight ||
          (move.moveProfile.canWallRunUpward && input.jumpHeld)
        ) {
          world.player.wallCling = world.player.x < tr.x ? 1 : -1;
          if (move.moveProfile.canWallRunUpward && input.jumpHeld) {
            world.player.vy = move.moveProfile.wallRunUpSpeed;
            world.player.airJumpsUsed = 0;
          } else if (world.player.vy > 0) {
            world.player.vy = Math.min(world.player.vy, 90);
          }
          break;
        }
      }
    }
  }

  world.player.scaleX += (1 - world.player.scaleX) * Math.min(1, f.dt * 14);
  world.player.scaleY += (1 - world.player.scaleY) * Math.min(1, f.dt * 14);
  if (world.player.onGround && Math.abs(world.player.vx) > 20) {
    world.player.gaitPhase += f.dt * 13;
  }

  // 6-Node Cloak Ribbon
  world.player.cloakNodes[0].x = world.player.x - world.player.facing * 8;
  world.player.cloakNodes[0].y = world.player.y - 36;
  for (let i = 1; i < world.player.cloakNodes.length; i++) {
    const prev = world.player.cloakNodes[i - 1];
    const cur = world.player.cloakNodes[i];
    const targetX = prev.x - world.player.facing * 10 - world.player.vx * 0.015;
    const targetY = prev.y + 4 + Math.sin(world.stageTimeSec * 12 + i) * 2.5;
    cur.x += (targetX - cur.x) * Math.min(1, f.dt * 20);
    cur.y += (targetY - cur.y) * Math.min(1, f.dt * 20);
  }
}

export type MoveState = ReturnType<typeof resolveMoveState>;
