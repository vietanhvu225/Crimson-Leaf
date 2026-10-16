import { soundEngine } from '../../audio';
import {
  ELEMENTAL_STANCES,
  PHYSICS_CONSTANTS,
  applyMeleeHitReward,
  applyParryDeflectReward,
  applyPlayerDamage,
  checkProjectileParry,
} from '../../rules';
import { applyElementalAndRelicOnHit, dealDamageToEnemy } from '../damage';
import { EnemyActor } from '../entities';
import { spawnBanner, spawnBloodOrb, spawnParticle, spawnProjectile } from '../spawn';
import { World } from '../world';
import { Frame } from './frame';

// Projectile flight, parry and hits.

export function updateProjectiles(world: World, f: Frame) {
  for (const proj of world.projectiles) {
    if (!proj.active) continue;

    if (proj.gravity) {
      proj.vy += proj.gravity * f.dt;
    }
    if (proj.waveAmp) {
      proj.y += Math.sin(world.stageTimeSec * 14 + proj.x * 0.03) * proj.waveAmp * f.dt;
    }
    if (proj.boomerangReturn && proj.life < 1.55) {
      proj.vx -= Math.sign(proj.vx || 1) * 920 * f.dt;
    }

    if (proj.homing) {
      if (proj.fromPlayer) {
        let nearest: EnemyActor | null = null;
        let bestDist = 400;
        for (const en of world.enemies) {
          if (en.hp <= 0 || en.koTimer > 0) continue;
          const d = Math.hypot(en.x - proj.x, en.y - 24 - proj.y);
          if (d < bestDist) {
            bestDist = d;
            nearest = en;
          }
        }
        if (nearest) {
          const desiredAng = Math.atan2(nearest.y - 24 - proj.y, nearest.x - proj.x);
          const speed = Math.hypot(proj.vx, proj.vy) || 820;
          proj.vx += (Math.cos(desiredAng) * speed - proj.vx) * Math.min(1, f.dt * 5.5);
          proj.vy += (Math.sin(desiredAng) * speed - proj.vy) * Math.min(1, f.dt * 5.5);
        }
      } else {
        const desiredAng = Math.atan2(world.player.y - 24 - proj.y, world.player.x - proj.x);
        const speed = Math.hypot(proj.vx, proj.vy) || 410;
        proj.vx += (Math.cos(desiredAng) * speed - proj.vx) * Math.min(1, f.dt * 2.8);
        proj.vy += (Math.sin(desiredAng) * speed - proj.vy) * Math.min(1, f.dt * 2.8);
      }
    }

    proj.x += proj.vx * f.dt;
    proj.y += proj.vy * f.dt;
    proj.life -= f.dt;
    if (proj.life <= 0) {
      proj.active = false;
      continue;
    }

    // In-Flight Elemental Trail Particles (Flames for Hỏa Viêm, Electric Bolts for Lôi Điện, Ice Crystals for Hàn Băng)
    if (!world.isHeadless && proj.fromPlayer && Math.random() < 0.65) {
      const pStyle =
        proj.elementalStyle ?? ELEMENTAL_STANCES[world.combat.skills.activeElement].projectileStyle;
      if (pStyle === 'fire_burst') {
        spawnParticle(
          world,
          proj.x - proj.vx * 0.015 + (Math.random() - 0.5) * 10,
          proj.y - proj.vy * 0.015 + (Math.random() - 0.5) * 10,
          -proj.vx * 0.12 + (Math.random() - 0.5) * 40,
          -45 - Math.random() * 45,
          4.2,
          Math.random() < 0.5 ? '#f97316' : '#ef4444',
          0.22,
          'ember'
        );
      } else if (pStyle === 'lightning_bolt') {
        spawnParticle(
          world,
          proj.x + (Math.random() - 0.5) * 14,
          proj.y + (Math.random() - 0.5) * 14,
          (Math.random() - 0.5) * 90,
          (Math.random() - 0.5) * 90,
          4.0,
          Math.random() < 0.6 ? '#fde047' : '#38bdf8',
          0.18,
          'lightning'
        );
      } else if (pStyle === 'ice_shard') {
        spawnParticle(
          world,
          proj.x - proj.vx * 0.015,
          proj.y - proj.vy * 0.015,
          (Math.random() - 0.5) * 45,
          (Math.random() - 0.5) * 45,
          3.8,
          Math.random() < 0.5 ? '#38bdf8' : '#e0f2fe',
          0.22,
          'snow'
        );
      }
    }

    if (!proj.fromPlayer) {
      if (
        checkProjectileParry({
          playerX: world.player.x,
          playerY: world.player.y - 24,
          facing: world.player.facing,
          isAttacking: world.player.isAttacking,
          attackElapsed: world.player.attackElapsed,
          projX: proj.x,
          projY: proj.y,
          projZLane: proj.zLane,
          playerZLane: world.combat.zLane,
          kodachiLevel: world.combat.skills.kodachiLevel,
          deflectLevel: world.combat.skills.deflectLevel,
          relics: world.combat.skills.relics,
        })
      ) {
        proj.fromPlayer = true;
        proj.parried = true;
        proj.homing =
          world.combat.skills.deflectLevel >= 5 ||
          world.combat.skills.relics.includes('mirror_shield');
        proj.vx = -proj.vx * 1.65;
        proj.vy = -proj.vy * 1.65;
        proj.damage = Math.round(52 * (world.combat.skills.deflectLevel >= 2 ? 1.35 : 1));
        proj.life = 1.6;

        const extraCount =
          world.combat.skills.deflectLevel >= 5
            ? 2
            : world.combat.skills.relics.includes('mirror_shield')
              ? 1
              : 0;
        const baseAng = Math.atan2(proj.vy, proj.vx);
        for (let ex = 0; ex < extraCount; ex++) {
          const offset = (ex === 0 ? 1 : -1) * 0.22;
          spawnProjectile(world, {
            x: proj.x,
            y: proj.y,
            vx: Math.cos(baseAng + offset) * 800,
            vy: Math.sin(baseAng + offset) * 800,
            fromPlayer: true,
            parried: true,
            piercing: true,
            explosive: false,
            homing: true,
            crossZ: true,
            isSwordBeam: true,
            isFireball: false,
            damage: 34,
            zLane: world.combat.zLane,
            life: 1.3,
          });
        }

        if (world.combat.skills.deflectLevel >= 4) {
          for (const en of world.enemies) {
            if (en.hp > 0 && Math.hypot(en.x - world.player.x, en.y - world.player.y) < 170) {
              dealDamageToEnemy(world, en, 28);
            }
          }
        }

        world.combat = applyParryDeflectReward(world.combat);
        world.hitstopTimer = PHYSICS_CONSTANTS.HITSTOP_PARRY;
        world.cameraTrauma = 0.55;
        soundEngine.playParry();
        spawnBanner(world, proj.x, proj.y - 30, 'PARRY HOÀN HẢO!', '#fbbf24');
        for (let s = 0; s < 18; s++) {
          const a = Math.random() * Math.PI * 2;
          spawnParticle(
            world,
            proj.x,
            proj.y,
            Math.cos(a) * (180 + Math.random() * 200),
            Math.sin(a) * (180 + Math.random() * 200),
            4.5,
            s % 2 === 0 ? '#fef08a' : '#38bdf8',
            0.36,
            'spark'
          );
        }
        continue;
      }

      if (
        proj.zLane === world.combat.zLane &&
        world.player.invulnTimer <= 0 &&
        world.combat.dashTimer <= 0 &&
        Math.hypot(proj.x - world.player.x, proj.y - (world.player.y - 24)) < 25
      ) {
        proj.active = false;
        const hitRes = applyPlayerDamage(world.combat, proj.damage);
        world.combat = hitRes.nextState;
        if (hitRes.blockedByImmortality) {
          for (let s = 0; s < 8; s++) {
            const a = Math.random() * Math.PI * 2;
            spawnParticle(
              world,
              world.player.x,
              world.player.y - 24,
              Math.cos(a) * 150,
              Math.sin(a) * 150,
              3.8,
              '#fde047',
              0.28,
              'spark'
            );
          }
        } else {
          world.player.invulnTimer = 0.65;
          world.cameraTrauma = 0.45;
          soundEngine.playPlayerHurt();
          for (let s = 0; s < 12; s++) {
            const a = Math.random() * Math.PI * 2;
            spawnParticle(
              world,
              world.player.x,
              world.player.y - 24,
              Math.cos(a) * 160,
              Math.sin(a) * 160,
              4,
              '#e11d48',
              0.35,
              'slash'
            );
          }
        }
      }
    } else {
      for (const en of world.enemies) {
        if (en.hp <= 0 || en.koTimer > 0) continue;
        if (en.zLane !== proj.zLane && !proj.isSwordBeam && !proj.crossZ) continue;
        if (Math.hypot(proj.x - en.x, proj.y - (en.y - 24)) < 36) {
          dealDamageToEnemy(world, en, proj.damage);
          applyElementalAndRelicOnHit(world, en);

          if (proj.explosive) {
            for (const other of world.enemies) {
              if (
                other.id !== en.id &&
                other.hp > 0 &&
                Math.hypot(other.x - en.x, other.y - en.y) < 105
              ) {
                dealDamageToEnemy(world, other, 12);
              }
            }
          }

          const killed = en.hp <= 0;
          const dropOrb =
            killed && (en.archetype === 'fire_monk' || en.archetype === 'elite_guard');
          world.combat = applyMeleeHitReward(world.combat, killed, dropOrb);
          soundEngine.playHitEnemy(killed);
          if (killed) {
            en.koTimer = 0.38;
            world.hitstopTimer = 0.04;
            world.cameraTrauma = Math.min(1, world.cameraTrauma + 0.25);
            if (dropOrb) {
              spawnBloodOrb(world, en.x, en.y - 20);
            }
          }
          const hitStyle =
            proj.elementalStyle ??
            ELEMENTAL_STANCES[world.combat.skills.activeElement].projectileStyle;
          for (let s = 0; s < (proj.explosive ? 14 : 10); s++) {
            const a = Math.random() * Math.PI * 2;
            const pColor = proj.parried
              ? '#fbbf24'
              : hitStyle === 'fire_burst'
                ? s % 2 === 0
                  ? '#f97316'
                  : '#ef4444'
                : hitStyle === 'lightning_bolt'
                  ? s % 2 === 0
                    ? '#fde047'
                    : '#38bdf8'
                  : s % 2 === 0
                    ? '#38bdf8'
                    : '#e0f2fe';
            const pKind =
              hitStyle === 'fire_burst'
                ? 'ember'
                : hitStyle === 'lightning_bolt'
                  ? 'lightning'
                  : 'snow';
            spawnParticle(
              world,
              en.x,
              en.y - 24,
              Math.cos(a) * (proj.explosive ? 200 : 155),
              Math.sin(a) * (proj.explosive ? 200 : 155),
              proj.explosive ? 4.8 : 4.2,
              pColor,
              0.32,
              pKind
            );
          }
          if (!proj.piercing) {
            proj.active = false;
            break;
          }
        }
      }
    }
  }
}
