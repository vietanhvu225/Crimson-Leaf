import { soundEngine } from '../../audio.ts';
import { PHYSICS_CONSTANTS, applyPlayerDamage, computeSubterraneanSlopeY } from '../../rules/index.ts';
import { dealDamageToEnemy } from '../damage.ts';
import type { PlatformBranch } from '../entities.ts';
import { spawnBanner, spawnWorldItem } from '../spawn.ts';
import type { World } from '../world.ts';
import type { Frame } from './frame.ts';
import type { FrameInput } from './frameInput.ts';
import type { MoveState } from './movement.ts';

// Motion integration and terrain, seal gate, platform and pit collision.

export function integrateMotion(world: World, f: Frame, input: FrameInput) {
  const wasGroundedOnSlope =
    f.st.seasonId === 'earth_core' &&
    world.player.onGround &&
    (!world.player.standingPlatform || world.player.standingPlatform.type === 'ground') &&
    !input.jumpPressed &&
    world.player.vy >= 0;

  const prevX = world.player.x;
  const prevY = world.player.y;
  const prevVy = world.player.vy;
  world.player.x += world.player.vx * f.dt;
  world.player.y += world.player.vy * f.dt;

  return { prevX, prevY, prevVy, wasGroundedOnSlope };
}

export function resolveTerrainCollision(
  world: World,
  f: Frame,
  move: MoveState,
  motion: MotionState
) {
  if (f.cfg.scrollMode === 'horizontal') {
    world.player.x = Math.max(60, Math.min(f.cfg.stageLength - 80, world.player.x));
    if (move.isFree3DFlightOrSwim) {
      // Keep Kage within the vertical bounds of the Ocean (Stage 9) or Open Sky (Stage 11)
      const minY = move.moveProfile.isFreeFlyingInSky ? 76 : 92;
      const maxY = move.moveProfile.isFreeFlyingInSky ? 545 : 542;
      world.player.y = Math.max(minY, Math.min(maxY, world.player.y));
    } else if (
      f.st.seasonId === 'earth_core' &&
      world.player.x >= 170 &&
      world.player.x < f.cfg.stageLength - 980
    ) {
      // Stage 10 (Earth Core): 45° Diagonal Slope Traversal + 90° Sheer Vertical Shaft Drop!
      const targetSlopeY = computeSubterraneanSlopeY(world.player.x);
      const effX = Math.max(0, world.player.x - 180);
      const cycleIdx = Math.floor(effX / 900);
      const localX = effX - cycleIdx * 900;
      const cliffX = 180 + cycleIdx * 900 + 540;

      // Prevent walking left through the solid 360px-tall 90° vertical rock cliff wall
      if (
        motion.prevX >= cliffX &&
        world.player.x < cliffX &&
        world.player.y > computeSubterraneanSlopeY(cliffX - 2) + 36
      ) {
        world.player.x = cliffX + 2;
        world.player.vx = Math.max(0, world.player.vx);
      }

      if (motion.wasGroundedOnSlope) {
        if (Math.abs(world.player.y - targetSlopeY) < 48) {
          // 1. Smoothly descend the 45° diagonal slope (or walk along the horizontal ledge)
          world.player.y = targetSlopeY;
          world.player.vy = 0;
          world.player.onGround = true;
        } else if (targetSlopeY - world.player.y > 100) {
          // 2. Just stepped off the 90° vertical cliff edge (localX >= 540): Drop straight down 90 degrees!
          world.player.onGround = false;
          world.player.standingPlatform = null;
          world.player.x = Math.min(world.player.x, cliffX + 28);
          world.player.vx *= 0.15;
          world.player.vy = Math.max(world.player.vy, 540);
          spawnBanner(
            world,
            world.player.x,
            world.player.y - 44,
            '⬇ LAO THẲNG XUỐNG GIẾNG 90°!',
            '#fde047'
          );
        }
      } else if (
        !world.player.onGround &&
        !world.player.grappleTarget &&
        world.combat.dashTimer <= 0 &&
        localX >= 540 &&
        localX <= 640 &&
        world.player.y < targetSlopeY - 24
      ) {
        // Keep Kage falling straight down 90° inside the vertical drop shaft!
        world.player.vx *= 0.8;
        world.player.x = Math.min(world.player.x, cliffX + 56);
        world.player.vy = Math.max(world.player.vy, 520);
      }
    }
  } else {
    world.player.x = Math.max(120, Math.min(1080, world.player.x));
    world.player.y = Math.max(120, Math.min(f.cfg.stageLength - 90, world.player.y));
  }
}

export function enforceSealGates(world: World, f: Frame) {
  // SEAL GATE LOCKDOWN ENFORCEMENT (Kết Giới Phong Ấn):
  // Player CANNOT bypass a sealed gate until all garrison enemies assigned to that gate are defeated!
  for (const gate of world.sealGates) {
    if (gate.unlocked) continue;
    const aliveGuards = world.enemies.filter((e) => e.gateId === gate.id && e.hp > 0).length;
    if (aliveGuards === 0) {
      gate.unlocked = true;
      world.combat.hp = Math.min(world.combat.maxHp, world.combat.hp + 25);
      world.combat.chakra = Math.min(world.combat.maxChakra, world.combat.chakra + 40);
      world.combat.score += 450;
      world.cameraTrauma = 0.55;
      soundEngine.playAwakening();
      const dropX = f.cfg.scrollMode === 'horizontal' ? gate.coord - 40 : world.player.x;
      const dropY =
        f.cfg.scrollMode === 'horizontal'
          ? f.st.seasonId === 'earth_core'
            ? computeSubterraneanSlopeY(gate.coord) - 45
            : f.st.seasonId === 'sky_sanctuary' || f.st.seasonId === 'ocean_palace'
              ? world.player.y
              : 500
          : gate.coord + 30;
      spawnWorldItem(
        world,
        gate.id === 1 ? 'scroll_kodachi' : gate.id === 2 ? 'relic_chest' : 'scroll_mobility',
        dropX,
        dropY,
        'both'
      );
      spawnBanner(
        world,
        world.player.x,
        world.player.y - 75,
        `PHÁ VỠ ${gate.title.toUpperCase()}! (QUÁI ẢI SAU MẠNH HƠN!)`,
        '#4ade80'
      );
      continue;
    }

    if (f.cfg.scrollMode === 'horizontal') {
      if (world.player.x > gate.coord - 28) {
        world.player.x = gate.coord - 28;
        world.player.vx = -190;
        world.player.grappleTarget = null;
        if (world.gateReboundCooldown <= 0) {
          world.gateReboundCooldown = 0.85;
          world.cameraTrauma = 0.28;
          spawnBanner(
            world,
            gate.coord - 60,
            world.player.y - 65,
            `KẾT GIỚI PHONG ẤN! HẠ CÒN ${aliveGuards} HỘ PHÁP ĐỂ QUA!`,
            '#fbbf24'
          );
        }
      }
    } else {
      // Vertical stages: player climbs upward (decreasing Y)
      if (world.player.y < gate.coord + 28) {
        world.player.y = gate.coord + 28;
        world.player.vy = 180;
        world.player.grappleTarget = null;
        if (world.gateReboundCooldown <= 0) {
          world.gateReboundCooldown = 0.85;
          world.cameraTrauma = 0.28;
          spawnBanner(
            world,
            world.player.x,
            gate.coord - 30,
            `KẾT GIỚI PHONG ẤN! HẠ CÒN ${aliveGuards} HỘ PHÁP ĐỂ LÊN!`,
            '#fbbf24'
          );
        }
      }
    }
  }
}

export function resolvePlatformLanding(
  world: World,
  f: Frame,
  move: MoveState,
  motion: MotionState
) {
  // Platform Landing & Special Platform Mechanics (Disabled in Underwater & Sky Flight Modes so Kage always swims/flies freely!)
  world.player.onGround = false;
  world.player.onIce = false;
  world.player.standingPlatform = null;
  if (!move.isFree3DFlightOrSwim && world.player.vy >= 0 && !world.player.grappleTarget) {
    const dropThrough = world.keysHeld.has('KeyS') || world.keysHeld.has('ArrowDown');
    for (const plat of world.platforms) {
      if (plat.respawnTimer && plat.respawnTimer > 0) continue;
      if (plat.zLane !== 'both' && plat.zLane !== world.combat.zLane) continue;
      if (dropThrough && plat.type !== 'ground') continue;
      // On Stage 10 (earth_core), the main 45°/90° subterranean floor is handled by computeSubterraneanSlopeY below
      if (
        f.st.seasonId === 'earth_core' &&
        plat.type === 'ground' &&
        world.player.x >= 170 &&
        world.player.x < f.cfg.stageLength - 980
      ) {
        continue;
      }
      if (
        world.player.x >= plat.x - 14 &&
        world.player.x <= plat.x + plat.w + 14 &&
        motion.prevY <= plat.y + 8 &&
        world.player.y >= plat.y
      ) {
        world.player.y = plat.y;
        world.player.vy = 0;
        world.player.onGround = true;
        world.player.standingPlatform = plat;
        world.player.onIce = plat.type === 'ice';
        world.player.airJumpsUsed = 0;
        world.combat.coyoteTimer = PHYSICS_CONSTANTS.COYOTE_TIME;

        // Stage 7 (Blood Abyss) & Stage 10 (Earth Core): Meteor Slam Impact Detonation!
        if (move.moveProfile.canMeteorGroundSlam && motion.prevVy >= 750) {
          world.cameraTrauma = 0.65;
          soundEngine.playAwakening();
          spawnBanner(
            world,
            world.player.x,
            world.player.y - 58,
            'ĐỊA CHẤN DUNG NHAM NỔ TUNG!',
            '#f97316'
          );
          for (const en of world.enemies) {
            if (en.hp <= 0 || en.koTimer > 0) continue;
            if (Math.hypot(en.x - world.player.x, en.y - world.player.y) < 230) {
              dealDamageToEnemy(world, en, 45);
              en.vy = -420;
              en.onGround = false;
              if (en.hp <= 0) en.koTimer = 0.35;
            }
          }
        }

        if (plat.type === 'springboard') {
          world.player.vy =
            PHYSICS_CONSTANTS.SPRINGBOARD_VELOCITY * move.moveProfile.springboardMult;
          world.player.onGround = false;
          soundEngine.playJump();
          spawnBanner(world, world.player.x, world.player.y - 45, 'ĐỆM TRÚC ĐÀN HỒI!', '#4ade80');
        } else if (plat.type === 'bagua_pad') {
          world.player.vy = -840;
          world.player.vx = world.player.facing * 320;
          world.player.onGround = false;
          soundEngine.playJump();
          spawnBanner(
            world,
            world.player.x,
            world.player.y - 48,
            'BÁT QUÁI DỊCH CHUYỂN!',
            '#fde047'
          );
        } else if (plat.type === 'collapsing' && !plat.collapseTimer) {
          plat.collapseTimer = 0.85;
        }
        break;
      }
    }

    // Guarantee continuous diagonal subterranean slope footing on Stage 10 (earth_core)
    if (
      !world.player.onGround &&
      f.st.seasonId === 'earth_core' &&
      world.player.x >= 170 &&
      world.player.x < f.cfg.stageLength - 980
    ) {
      const slopeY = computeSubterraneanSlopeY(world.player.x);
      if (world.player.y >= slopeY - 8) {
        world.player.y = slopeY;
        world.player.vy = 0;
        world.player.onGround = true;
        world.player.airJumpsUsed = 0;
        world.combat.coyoteTimer = PHYSICS_CONSTANTS.COYOTE_TIME;
      }
    }
  }
}

export function recoverFromPits(world: World, f: Frame, move: MoveState) {
  // Chasm / Abyssal Pit / Magma Sea Recovery (also nudges player onto nearest safe ledge)
  const pitThresholdY =
    f.st.seasonId === 'earth_core' ? computeSubterraneanSlopeY(world.player.x) + 240 : 620;
  if (
    f.cfg.scrollMode === 'horizontal' &&
    !move.isFree3DFlightOrSwim &&
    world.player.y > pitThresholdY
  ) {
    let nearestGround: PlatformBranch | null = null;
    let bestDist = Infinity;
    for (const p of world.platforms) {
      if (p.type === 'ground') {
        const center = p.x + p.w * 0.5;
        const d = Math.abs(center - world.player.x);
        if (d < bestDist) {
          bestDist = d;
          nearestGround = p;
        }
      }
    }
    if (nearestGround) {
      world.player.x = Math.max(
        nearestGround.x + 28,
        Math.min(nearestGround.x + nearestGround.w - 28, world.player.x)
      );
    }
    world.player.y =
      f.st.seasonId === 'earth_core' ? computeSubterraneanSlopeY(world.player.x) - 35 : 480;
    world.player.vy = -580;
    world.player.airJumpsUsed = 0;
    if (world.player.invulnTimer <= 0) {
      const hitRes = applyPlayerDamage(world.combat, 16);
      world.combat = hitRes.nextState;
      world.player.invulnTimer = 0.9;
      if (hitRes.blockedByImmortality) {
        spawnBanner(
          world,
          world.player.x,
          world.player.y - 50,
          'KIM THÂN HỘ THỂ (MIỄN SÁT THƯƠNG)!',
          '#fde047'
        );
      } else {
        world.cameraTrauma = 0.45;
        soundEngine.playPlayerHurt();
        spawnBanner(
          world,
          world.player.x,
          world.player.y - 50,
          f.st.seasonId === 'blood_abyss' ? 'BỎNG DUNG NHAM (-16 HP)!' : 'RƠI XUỐNG VỰC (-16 HP)!',
          '#f43f5e'
        );
      }
    }
  }
}

export type MotionState = ReturnType<typeof integrateMotion>;
