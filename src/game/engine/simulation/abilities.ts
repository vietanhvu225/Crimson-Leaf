import { soundEngine } from '../../audio.ts';
import { PHYSICS_CONSTANTS, applyMeleeHitReward, getEffectiveDashCooldown } from '../../rules/index.ts';
import { applyElementalAndRelicOnHit, dealDamageToEnemy } from '../damage.ts';
import type { GrapplePoint } from '../entities.ts';
import { spawnBanner, spawnParticle, spawnProjectile } from '../spawn.ts';
import type { World } from '../world.ts';
import type { Frame } from './frame.ts';
import type { FrameInput } from './frameInput.ts';
import type { MoveState } from './movement.ts';

// Stage traversal abilities: ice ram, earth drill, water skimming, dash, grapple.

export function updateStageAbilities(world: World, f: Frame, input: FrameInput, move: MoveState) {
  // STAGE 4 (WINTER): HÀN BĂNG XUNG KÍCH — High-Speed Ice Ski-Charge Rams & Shatters Enemies on Contact!
  if (move.moveProfile.hasFrostChargeRam && Math.abs(world.player.vx) > 220) {
    for (const en of world.enemies) {
      if (en.hp <= 0 || en.koTimer > 0 || en.hitFlashTimer > 0) continue;
      if (Math.hypot(en.x - world.player.x, en.y - world.player.y) < 58) {
        dealDamageToEnemy(world, en, 26);
        en.chillTimer = 3.2;
        en.vx = world.player.facing * 240;
        const killed = en.hp <= 0;
        world.combat = applyMeleeHitReward(world.combat, killed, false);
        soundEngine.playHitEnemy(killed);
        if (killed) en.koTimer = 0.35;
        spawnBanner(world, en.x, en.y - 48, 'HÀN BĂNG XUNG KÍCH!', '#38bdf8');
      }
    }
  }

  // STAGE 10 (EARTH CORE): MŨI KHOAN ĐỊA TÂM — Diagonal Downward Drill-Charge along the Subterranean Slope!
  const drillTriggered =
    move.moveProfile.hasEarthCoreDrill &&
    (world.keysJustPressed.has('KeyS') || world.keysJustPressed.has('ArrowDown'));
  if (drillTriggered && world.combat.dashCooldown <= 0) {
    world.combat.dashTimer = 0.28;
    world.combat.dashCooldown = 0.65;
    world.player.vx = world.player.facing * 540;
    world.player.vy = world.player.facing > 0 ? 230 : -180;
    soundEngine.playDash();
    spawnBanner(
      world,
      world.player.x,
      world.player.y - 48,
      'MŨI KHOAN ĐỊA TÂM XUYÊN ĐÁ!',
      '#f59e0b'
    );
  }

  // STAGE 2 (SUMMER) THỦY THƯỢNG PHIÊU (Water-Skimming when running fast or dashing across surface!)
  if (
    move.moveProfile.canWaterSkim &&
    move.currentWaterY !== null &&
    Math.abs(world.player.x) > 0 &&
    (Math.abs(world.player.vx) >= 150 || world.combat.dashTimer > 0) &&
    world.player.y >= move.currentWaterY - 14 &&
    world.player.y <= move.currentWaterY + 28 &&
    world.player.vy >= 0
  ) {
    world.player.y = move.currentWaterY - 4;
    world.player.vy = 0;
    world.player.onGround = true;
    world.player.airJumpsUsed = 0;
    if (Math.random() < 0.35) {
      spawnParticle(
        world,
        world.player.x - world.player.facing * 12,
        world.player.y,
        -world.player.facing * 90,
        -45,
        3.5,
        '#cffafe',
        0.25,
        'spark'
      );
    }
  }

  if (input.dashPressed && world.combat.dashCooldown <= 0) {
    world.combat.dashTimer = PHYSICS_CONSTANTS.AIR_DASH_DURATION;
    world.combat.dashCooldown =
      getEffectiveDashCooldown(world.combat.skills.mobilityLevel) *
      move.moveProfile.dashCooldownMult;
    const dashSpeed = PHYSICS_CONSTANTS.AIR_DASH_SPEED * move.moveProfile.dashSpeedMult;
    if (move.isFree3DFlightOrSwim) {
      // Stage 9 (Ocean Palace) & Stage 11 (Sky Sanctuary): 8-Way Free 3D Dash!
      const dirX = input.moveLeft
        ? -1
        : input.moveRight
          ? 1
          : move.swimDownHeld || input.jumpHeld
            ? 0
            : world.player.facing;
      const dirY = input.jumpHeld ? -1 : move.swimDownHeld ? 1 : 0;
      const mag = Math.hypot(dirX, dirY) || 1;
      world.player.vx = (dirX / mag) * dashSpeed;
      world.player.vy = (dirY / mag) * dashSpeed;
      spawnBanner(
        world,
        world.player.x,
        world.player.y - 45,
        move.moveProfile.isFreeFlyingInSky
          ? 'NGỰ PHONG PHI KÍCH CỬU THIÊN!'
          : 'LƯỚT THỦY LÔI XOÁY NƯỚC!',
        move.moveProfile.isFreeFlyingInSky ? '#fde047' : '#22d3ee'
      );
    } else if (f.st.seasonId === 'earth_core') {
      // Stage 10 (Earth Core): Diagonal Downhill Drill-Dash following the subterranean slope!
      world.player.vx = world.player.facing * dashSpeed;
      world.player.vy = world.player.facing > 0 ? dashSpeed * 0.42 : -dashSpeed * 0.35;
      spawnBanner(world, world.player.x, world.player.y - 45, 'MŨI KHOAN ĐỊA TÂM!', '#f59e0b');
    } else if (move.moveProfile.allowEightWayAirDash && input.jumpHeld) {
      // Stage 6 (Thunder Peak): 8-Way Lightning Dash!
      world.player.vx =
        (input.moveLeft ? -1 : input.moveRight ? 1 : world.player.facing * 0.5) * dashSpeed * 0.85;
      world.player.vy = -dashSpeed * 0.92;
      spawnBanner(world, world.player.x, world.player.y - 45, 'NGỰ LÔI THIỂM ĐẠP!', '#fde047');
    } else {
      world.player.vx = world.player.facing * dashSpeed;
      world.player.vy = 0;
    }
    world.player.grappleTarget = null;
    soundEngine.playDash();

    if (world.combat.skills.mobilityLevel >= 5) {
      spawnProjectile(world, {
        x: world.player.x,
        y: world.player.y - 24,
        vx: world.player.facing * 640,
        vy: 0,
        fromPlayer: true,
        parried: false,
        piercing: true,
        explosive: false,
        homing: false,
        crossZ: true,
        isSwordBeam: true,
        isFireball: false,
        damage: 28,
        zLane: world.combat.zLane,
        life: 0.75,
      });
    }

    for (let i = 0; i < 8; i++) {
      spawnParticle(
        world,
        world.player.x,
        world.player.y - 22,
        -world.player.facing * (80 + Math.random() * 110),
        (Math.random() - 0.5) * 60,
        4,
        world.combat.skills.mobilityLevel >= 3 ? '#fde047' : '#38bdf8',
        0.25,
        'spark'
      );
    }
  }

  if (
    world.combat.dashTimer > 0 &&
    (world.combat.skills.mobilityLevel >= 3 ||
      move.isFree3DFlightOrSwim ||
      move.moveProfile.hasEarthCoreDrill)
  ) {
    for (const en of world.enemies) {
      if (en.hp <= 0 || en.koTimer > 0 || en.hitFlashTimer > 0) continue;
      if (Math.hypot(en.x - world.player.x, en.y - world.player.y) < 58) {
        dealDamageToEnemy(world, en, 32);
        applyElementalAndRelicOnHit(world, en);
        const killed = en.hp <= 0;
        world.combat = applyMeleeHitReward(world.combat, killed, false);
        soundEngine.playHitEnemy(killed);
        if (killed) en.koTimer = 0.35;
      }
    }
  }
}

export function updateGrapple(world: World, f: Frame, input: FrameInput, move: MoveState) {
  // Tactical Grapple to Stage-Specific Anchor Items [E]
  if (input.grapplePressed) {
    let best: GrapplePoint | null = null;
    let bestDist = 285 * move.moveProfile.grappleRangeMult;
    for (const g of world.grapples) {
      const d = Math.hypot(g.x - world.player.x, g.y - (world.player.y - 24));
      if (d < bestDist && (move.isFree3DFlightOrSwim || g.y < world.player.y + 80)) {
        bestDist = d;
        best = g;
      }
    }
    if (best) {
      world.player.grappleTarget = best;
      world.player.onGround = false;
      if (move.moveProfile.grappleResetsDashAndJump) {
        world.combat.dashCooldown = 0;
        world.player.airJumpsUsed = 0;
      }
      // Stage 6 (Thunder Peak): Grappling a Raijin Thunder-Orb detonates an AoE Lightning Shockwave!
      if (move.moveProfile.grappleShockwaveDamage > 0) {
        spawnBanner(world, best.x, best.y - 36, 'LÔI CẦU NỔ SÉT LIÊN HOÀN!', '#fde047');
        for (const en of world.enemies) {
          if (en.hp <= 0 || en.koTimer > 0) continue;
          if (Math.hypot(en.x - best.x, en.y - best.y) < 210) {
            dealDamageToEnemy(world, en, move.moveProfile.grappleShockwaveDamage);
            if (en.hp <= 0) en.koTimer = 0.35;
          }
        }
      } else {
        spawnBanner(
          world,
          world.player.x,
          world.player.y - 45,
          `MÓC ${f.cfg.grappleItemName.toUpperCase()}!`,
          f.cfg.accentColor
        );
      }
      soundEngine.playJump();
    }
  }
}
