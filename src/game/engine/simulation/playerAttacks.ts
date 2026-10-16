import { soundEngine } from '../../audio.ts';
import {
  ELEMENTAL_STANCES,
  PHYSICS_CONSTANTS,
  applyMeleeHitReward,
  canFireKunai,
  compute360AimAngles,
  consumeKunaiChakra,
  getEffectiveKodachiStats,
  getEffectiveKunaiDamage,
} from '../../rules/index.ts';
import { triggerAwakening } from '../actions.ts';
import { applyElementalAndRelicOnHit, dealDamageToEnemy } from '../damage.ts';
import {
  spawnBanner,
  spawnBloodOrb,
  spawnLightningBolt,
  spawnParticle,
  spawnProjectile,
} from '../spawn.ts';
import type { World } from '../world.ts';
import type { Frame } from './frame.ts';
import type { FrameInput } from './frameInput.ts';
import type { MoveState } from './movement.ts';

// Player Kodachi melee and 360-degree kunai fire.

export function updateMeleeAttack(world: World, f: Frame, input: FrameInput, move: MoveState) {
  // Kodachi Melee Slash + Chakra-Gated Sword Waves
  const kodachiStats = getEffectiveKodachiStats(
    world.combat.skills.kodachiLevel,
    world.combat.awakenedTimer > 0,
    world.combat.skills.activeElement
  );

  if (input.meleePressed && !world.player.isAttacking) {
    world.player.isAttacking = true;
    world.player.attackElapsed = 0;
    const aimTargetX = world.lmbJustPressed
      ? world.mouseWorldX
      : world.player.x + world.player.facing * 240;
    const aimTargetY = world.lmbJustPressed
      ? world.mouseWorldY
      : world.player.y - 28 + (input.jumpHeld ? -70 : move.swimDownHeld ? 70 : 0);
    if (world.lmbJustPressed && aimTargetX !== world.player.x) {
      world.player.facing = aimTargetX >= world.player.x ? 1 : -1;
    }
    world.player.attackAngle = Math.atan2(
      aimTargetY - (world.player.y - 28),
      aimTargetX - world.player.x
    );
    soundEngine.playSlash();

    const activeElem = world.combat.skills.activeElement;
    const elemStyle = kodachiStats.elementalProjectileStyle;

    // Every sword swing ALWAYS unleashes the active Element's signature projectile wave (Fireball Wave, Jagged Lightning Bolt, or Ice Shard)!
    const canAffordMultiWave =
      world.combat.awakenedTimer > 0 ||
      world.combat.chakra >= PHYSICS_CONSTANTS.SWORD_WAVE_CHAKRA_COST;
    const wc = canAffordMultiWave ? kodachiStats.waveCount : 1;
    if (wc > 1 && world.combat.awakenedTimer <= 0) {
      world.combat.chakra = Math.max(
        0,
        world.combat.chakra - PHYSICS_CONSTANTS.SWORD_WAVE_CHAKRA_COST
      );
    }

    for (let w = 0; w < wc; w++) {
      const spread = wc === 1 ? 0 : (w - (wc - 1) * 0.5) * 0.16;
      const ang = world.player.attackAngle + spread;
      spawnProjectile(world, {
        x: world.player.x + Math.cos(ang) * 26,
        y: world.player.y - 28 + Math.sin(ang) * 18,
        vx: Math.cos(ang) * 760,
        vy: Math.sin(ang) * 760,
        fromPlayer: true,
        parried: false,
        piercing: true,
        explosive: world.combat.skills.kodachiLevel >= 4 || activeElem === 'crimson_fire',
        homing: false,
        crossZ: kodachiStats.crossZ,
        isSwordBeam: true,
        isFireball: activeElem === 'crimson_fire',
        damage: kodachiStats.waveDamage,
        zLane: world.combat.zLane,
        life: 0.72,
        element: activeElem,
        elementalStyle: elemStyle,
      });
    }

    // Immediate Elemental Slash Burst right in front of Kage (Flames for Fire, Lightning Arc for Thunder, Frost Shards for Ice!)
    if (activeElem === 'crimson_fire') {
      for (let f = 0; f < 8; f++) {
        const a = world.player.attackAngle + (f - 3.5) * 0.18;
        spawnParticle(
          world,
          world.player.x + Math.cos(a) * 34,
          world.player.y - 26 + Math.sin(a) * 24,
          Math.cos(a) * (170 + world.rng() * 90),
          Math.sin(a) * 160 - 40,
          4.8,
          f % 2 === 0 ? '#f97316' : '#ef4444',
          0.32,
          'ember'
        );
      }
    } else if (activeElem === 'thunder_lightning') {
      spawnLightningBolt(
        world,
        world.player.x + Math.cos(world.player.attackAngle) * 16,
        world.player.y - 28 + Math.sin(world.player.attackAngle) * 12,
        world.player.x + Math.cos(world.player.attackAngle) * (kodachiStats.range + 22),
        world.player.y - 28 + Math.sin(world.player.attackAngle) * (kodachiStats.range + 22),
        '#fde047',
        0.2
      );
      for (let l = 0; l < 8; l++) {
        const a = world.player.attackAngle + (l - 3.5) * 0.2;
        spawnParticle(
          world,
          world.player.x + Math.cos(a) * 38,
          world.player.y - 26 + Math.sin(a) * 24,
          Math.cos(a) * 210,
          Math.sin(a) * 210,
          4.5,
          l % 2 === 0 ? '#fde047' : '#38bdf8',
          0.28,
          'lightning'
        );
      }
    } else {
      for (let c = 0; c < 8; c++) {
        const a = world.player.attackAngle + (c - 3.5) * 0.18;
        spawnParticle(
          world,
          world.player.x + Math.cos(a) * 34,
          world.player.y - 26 + Math.sin(a) * 24,
          Math.cos(a) * 175,
          Math.sin(a) * 175,
          4.4,
          c % 2 === 0 ? '#38bdf8' : '#e0f2fe',
          0.32,
          'snow'
        );
      }
    }

    for (const en of world.enemies) {
      if (en.hp <= 0 || en.koTimer > 0) continue;
      if (en.zLane !== world.combat.zLane && !kodachiStats.crossZ) continue;
      const dist = Math.hypot(en.x - world.player.x, en.y - world.player.y);
      if (dist <= kodachiStats.range) {
        dealDamageToEnemy(world, en, kodachiStats.damage);
        en.vx = world.player.facing * 165;
        applyElementalAndRelicOnHit(world, en);
        const killed = en.hp <= 0;
        const dropOrb = killed && (en.archetype === 'fire_monk' || en.archetype === 'elite_guard');
        world.combat = applyMeleeHitReward(world.combat, killed, dropOrb);
        soundEngine.playHitEnemy(killed);
        if (killed) {
          en.koTimer = 0.38;
          world.hitstopTimer = PHYSICS_CONSTANTS.HITSTOP_HEAVY;
          world.cameraTrauma = Math.min(1, world.cameraTrauma + 0.32);
          if (dropOrb) {
            spawnBloodOrb(world, en.x, en.y - 20);
            spawnBanner(world, en.x, en.y - 45, 'RƠI HUYẾT NGỌC!', '#f43f5e');
          }
        }
        for (let s = 0; s < 10; s++) {
          const a = world.rng() * Math.PI * 2;
          const hitColor =
            activeElem === 'crimson_fire'
              ? s % 2 === 0
                ? '#f97316'
                : '#ef4444'
              : activeElem === 'thunder_lightning'
                ? s % 2 === 0
                  ? '#fde047'
                  : '#38bdf8'
                : s % 2 === 0
                  ? '#38bdf8'
                  : '#e0f2fe';
          const hitKind =
            activeElem === 'crimson_fire'
              ? 'ember'
              : activeElem === 'thunder_lightning'
                ? 'lightning'
                : 'snow';
          spawnParticle(
            world,
            en.x,
            en.y - 24,
            Math.cos(a) * 190,
            Math.sin(a) * 190,
            4.4,
            hitColor,
            0.32,
            hitKind
          );
        }
      }
    }
  }

  if (world.player.isAttacking) {
    world.player.attackElapsed += f.dt;
    if (world.player.attackElapsed >= 0.22) {
      world.player.isAttacking = false;
    }
  }
}

export function updateKunaiFire(world: World, f: Frame, input: FrameInput, move: MoveState) {
  // 360° Kunai Ranged Fire
  if (input.kunaiPressed) {
    if (canFireKunai(world.combat)) {
      world.combat = consumeKunaiChakra(world.combat);
      soundEngine.playKunai();
      const aimX = world.rmbJustPressed
        ? world.mouseWorldX
        : world.player.x + world.player.facing * 260;
      const aimY = world.rmbJustPressed
        ? world.mouseWorldY
        : world.player.y - 24 + (input.jumpHeld ? -75 : move.swimDownHeld ? 75 : 0);
      if (world.rmbJustPressed && aimX !== world.player.x) {
        world.player.facing = aimX >= world.player.x ? 1 : -1;
      }
      const angles = compute360AimAngles(
        world.player.x,
        world.player.y - 24,
        aimX,
        aimY,
        world.combat.awakenedTimer > 0,
        world.combat.skills.kunaiLevel
      );
      const kunaiDmg = getEffectiveKunaiDamage(
        world.combat.skills.kunaiLevel,
        world.combat.skills.activeElement
      );
      const elemStyle = ELEMENTAL_STANCES[world.combat.skills.activeElement].projectileStyle;
      for (const ang of angles) {
        spawnProjectile(world, {
          x: world.player.x + Math.cos(ang) * 20,
          y: world.player.y - 24 + Math.sin(ang) * 20,
          vx: Math.cos(ang) * 820,
          vy: Math.sin(ang) * 820,
          fromPlayer: true,
          parried: false,
          piercing: world.combat.awakenedTimer > 0 || world.combat.skills.kunaiLevel >= 2,
          explosive:
            world.combat.skills.kunaiLevel >= 3 ||
            world.combat.skills.activeElement === 'crimson_fire',
          homing: world.combat.skills.kunaiLevel >= 4,
          crossZ: world.combat.skills.kunaiLevel >= 5,
          isSwordBeam: false,
          isFireball: false,
          damage: kunaiDmg,
          zLane: world.combat.zLane,
          life: 1.45,
          elementalStyle: elemStyle,
        });
      }
    } else {
      spawnBanner(
        world,
        world.player.x,
        world.player.y - 50,
        'CẦN CHÉM/PARRY HỒI NỘI LỰC!',
        '#22d3ee'
      );
    }
  }

  for (const orb of world.bloodOrbs) {
    if (!orb.active) continue;
    orb.vy += 600 * f.dt;
    orb.y += orb.vy * f.dt;
    if (orb.y > 540) {
      orb.y = 540;
      orb.vy = -180;
    }
    orb.life -= f.dt;
    if (orb.life <= 0) orb.active = false;
    if (Math.hypot(orb.x - world.player.x, orb.y - (world.player.y - 20)) < 52) {
      orb.active = false;
      triggerAwakening(world);
    }
  }
}
