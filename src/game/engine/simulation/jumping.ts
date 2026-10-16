import { soundEngine } from '../../audio';
import { PHYSICS_CONSTANTS, getMaxAirJumps } from '../../rules';
import { spawnBanner } from '../spawn';
import { World } from '../world';
import { Frame } from './frame';
import { FrameInput } from './frameInput';
import { MoveState } from './movement';

// Jump, wall-jump, cloud-step and lava bounce.

export function updateJumping(world: World, f: Frame, input: FrameInput, move: MoveState) {
  if (world.player.grappleTarget) {
    const dx = world.player.grappleTarget.x - world.player.x;
    const dy = world.player.grappleTarget.y - world.player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 38 || (input.jumpPressed && !move.isFree3DFlightOrSwim)) {
      world.player.grappleTarget = null;
      world.player.vy = move.isFree3DFlightOrSwim ? -220 : -485;
      world.player.airJumpsUsed = 0;
    } else {
      world.player.vx = (dx / dist) * move.moveProfile.grapplePullSpeed;
      world.player.vy = (dy / dist) * move.moveProfile.grapplePullSpeed;
    }
  }

  // Standard Jump / Wall-Jump / Cloud-Step ONLY for Grounded/Vertical Stages (Disabled in Stage 9 Underwater & Stage 11 Sky Flight!)
  if (!move.isFree3DFlightOrSwim) {
    if (input.jumpPressed) {
      world.combat.jumpBufferTimer = PHYSICS_CONSTANTS.JUMP_BUFFER_TIME;
    }

    const maxAirJumps =
      getMaxAirJumps(world.combat.skills.mobilityLevel) + move.moveProfile.bonusAirJumps;

    if (world.combat.jumpBufferTimer > 0) {
      if (move.moveProfile.canWaterSwimJump && move.isInWater) {
        // Stage 2 (Summer): Water-Vault out of the Lotus River!
        world.player.vy = move.moveProfile.waterSwimJumpVy;
        world.player.onGround = false;
        world.player.airJumpsUsed = 0;
        world.combat.jumpBufferTimer = 0;
        soundEngine.playJump();
        spawnBanner(world, world.player.x, world.player.y - 42, 'THỦY LONG XUNG THIÊN!', '#22d3ee');
      } else if (world.player.onGround || world.combat.coyoteTimer > 0) {
        const wasOnIce = world.player.onIce;
        world.player.vy =
          wasOnIce && move.moveProfile.iceJumpBoostVx > 0
            ? PHYSICS_CONSTANTS.SUPER_JUMP_VELOCITY - 35
            : PHYSICS_CONSTANTS.SUPER_JUMP_VELOCITY;
        if (wasOnIce && move.moveProfile.iceJumpBoostVx > 0 && Math.abs(world.player.vx) > 90) {
          world.player.vx += world.player.facing * move.moveProfile.iceJumpBoostVx;
          spawnBanner(
            world,
            world.player.x,
            world.player.y - 44,
            'NHẢY ĐÀI PHÓNG BĂNG!',
            '#7dd3fc'
          );
        }
        world.player.onGround = false;
        world.player.standingPlatform = null;
        world.player.airJumpsUsed = 0;
        world.combat.coyoteTimer = 0;
        world.combat.jumpBufferTimer = 0;
        world.player.scaleX = 0.82;
        world.player.scaleY = 1.2;
        soundEngine.playJump();
      } else if (world.player.wallCling !== 0) {
        world.player.vx = -world.player.wallCling * PHYSICS_CONSTANTS.WALL_JUMP_VX;
        world.player.vy = PHYSICS_CONSTANTS.WALL_JUMP_VY;
        world.player.facing = (-world.player.wallCling as 1 | -1) || 1;
        world.player.wallCling = 0;
        world.player.airJumpsUsed = 0;
        world.combat.jumpBufferTimer = 0;
        soundEngine.playJump();
      } else if (world.player.airJumpsUsed < maxAirJumps) {
        world.player.vy = PHYSICS_CONSTANTS.DOUBLE_JUMP_VELOCITY;
        world.player.airJumpsUsed += 1;
        world.combat.jumpBufferTimer = 0;
        world.player.scaleX = 0.84;
        world.player.scaleY = 1.18;
        soundEngine.playJump();
        spawnBanner(
          world,
          world.player.x,
          world.player.y - 45,
          f.st.seasonId === 'celestial_altar'
            ? `NGỰ KIẾM ĐẠP VÂN BẬC ${world.player.airJumpsUsed}!`
            : world.player.airJumpsUsed === 1
              ? 'ĐẠP KHÔNG NHỊ ĐOẠN!'
              : 'TAM ĐOẠN ĐẠP VÂN!',
          '#fbbf24'
        );
      }
    }

    // Stage 5 (Cavern): Từ Trường Phản Trọng Lực (Hold W/Space to levitate smoothly up to the Crystal Ceiling!)
    if (
      move.moveProfile.hasAntiGravityCeilingFlight &&
      input.jumpHeld &&
      !world.player.onGround &&
      world.combat.dashTimer <= 0 &&
      !world.player.grappleTarget
    ) {
      world.player.vy = Math.max(-290, world.player.vy - 1180 * f.dt);
    }

    // Stage 7 (Blood Abyss): Hỏa Chấn Thiên (Meteor Ground-Slam when pressing S/Down in mid-air!)
    const slamPressed = world.keysJustPressed.has('KeyS') || world.keysJustPressed.has('ArrowDown');
    if (move.moveProfile.canMeteorGroundSlam && !world.player.onGround && slamPressed) {
      world.player.vy = 920;
      spawnBanner(
        world,
        world.player.x,
        world.player.y - 40,
        'HỎA CHẤN THIÊN GIÁNG THẾ!',
        '#f97316'
      );
    }

    if (!input.jumpHeld && world.player.vy < -210 && !world.player.grappleTarget) {
      world.player.vy *= Math.pow(PHYSICS_CONSTANTS.JUMP_CUT_MULTIPLIER, f.dt * 8);
    }

    // Stage-Specific Gravity & Cavern Hover-Glide
    const gravMult = move.isInWater ? 0.42 : move.moveProfile.gravityMult;
    if (world.combat.dashTimer <= 0 && !world.player.grappleTarget) {
      const maxFall =
        move.moveProfile.canHoverGlide && input.jumpHeld && world.player.vy > 0
          ? move.moveProfile.hoverGlideMaxFallVy
          : 860;
      world.player.vy = Math.min(
        maxFall,
        world.player.vy + PHYSICS_CONSTANTS.GRAVITY * gravMult * f.dt
      );
    }
  }

  // Stage 7 (Blood Abyss): Nhiệt Phản Đẩy (Lava Thermal Super-Bounce!)
  if (
    move.moveProfile.lavaThermalBounceVy !== null &&
    move.currentWaterY !== null &&
    world.player.y >= move.currentWaterY + 4 &&
    world.player.vy >= 0
  ) {
    world.player.y = move.currentWaterY;
    world.player.vy = move.moveProfile.lavaThermalBounceVy;
    world.player.onGround = false;
    world.player.airJumpsUsed = 0;
    soundEngine.playJump();
    spawnBanner(world, world.player.x, world.player.y - 46, 'NHIỆT PHẢN ĐẨY DUNG NHAM!', '#fb923c');
  }
}
