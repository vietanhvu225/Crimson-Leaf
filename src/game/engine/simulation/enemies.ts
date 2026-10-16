import { soundEngine } from '../../audio.ts';
import {
  PHYSICS_CONSTANTS,
  applyMeleeHitReward,
  applyPlayerDamage,
  computeBossSkillBurst,
  computeKageLeapVelocity,
  computeSubterraneanSlopeY,
} from '../../rules/index.ts';
import { spawnBanner, spawnParticle, spawnProjectile } from '../spawn.ts';
import type { World } from '../world.ts';
import type { Frame } from './frame.ts';

// Enemy AI, movement and attacks.

export function updateEnemies(world: World, f: Frame) {
  let activeAttackers = world.enemies.filter((e) => e.windupTimer > 0).length;

  for (const en of world.enemies) {
    if (en.hitFlashTimer > 0) en.hitFlashTimer = Math.max(0, en.hitFlashTimer - f.dt);
    if (en.guardianHitCooldown > 0) {
      en.guardianHitCooldown = Math.max(0, en.guardianHitCooldown - f.dt);
    }
    if (en.kageSpinTimer && en.kageSpinTimer > 0) {
      en.kageSpinTimer = Math.max(0, en.kageSpinTimer - f.dt);
    }
    if (en.koTimer > 0) {
      en.koTimer -= f.dt;
      en.x += en.vx * f.dt;
      en.y -= 60 * f.dt;
      continue;
    }
    if (en.hp <= 0) continue;

    if (en.burnTimer > 0) {
      en.burnTimer = Math.max(0, en.burnTimer - f.dt);
      en.hp -= 12 * f.dt;
      if (en.hp <= 0) {
        en.koTimer = 0.35;
        world.combat = applyMeleeHitReward(world.combat, true, false);
        continue;
      }
    }

    // Freeze (Hàn Băng) & Stun (Lôi Điện) completely immobilize enemy movement & attacks!
    const isFrozen = (en.freezeTimer ?? 0) > 0;
    const isStunned = (en.stunTimer ?? 0) > 0;
    if (en.freezeTimer && en.freezeTimer > 0) {
      en.freezeTimer = Math.max(0, en.freezeTimer - f.dt);
    }
    if (en.stunTimer && en.stunTimer > 0) {
      en.stunTimer = Math.max(0, en.stunTimer - f.dt);
    }
    if (isFrozen || isStunned) {
      en.vx = 0;
      en.windupTimer = 0;
      continue;
    }

    const chillSlow = en.chillTimer > 0 ? 0.55 : 1.0;
    if (en.chillTimer > 0) {
      en.chillTimer = Math.max(0, en.chillTimer - f.dt);
    }

    const dx = world.player.x - en.x;
    const dy = world.player.y - en.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 980) continue;

    en.facing = dx >= 0 ? 1 : -1;
    en.aiTimer += f.dt;

    // Trigger Legend of Kage Dramatic Entrance when player approaches a waiting ninja!
    if (en.kagePendingEntrance && dist < 490) {
      en.kagePendingEntrance = false;
      if (en.kageSpawnStyle === 'canopy_drop') {
        en.y = Math.max(95, en.y - 235);
        en.vy = 115;
        en.vx = en.facing * 140;
        en.onGround = false;
        en.kageSpinTimer = 0.85;
        spawnBanner(world, en.x, en.y - 30, 'PHI THÂN TÁN CÂY!', '#fde047');
      } else if (en.kageSpawnStyle === 'tree_vault') {
        en.vy = -545;
        en.vx = en.facing * 185;
        en.onGround = false;
        en.kageSpinTimer = 0.88;
        spawnBanner(world, en.x, en.y - 40, 'KHINH CÔNG VỌT ĐỈNH!', '#fb7185');
      } else if (en.kageSpawnStyle === 'trunk_shadow') {
        en.vy = -310;
        en.vx = en.facing * 215;
        en.onGround = false;
        en.kageSpinTimer = 0.65;
        spawnBanner(world, en.x, en.y - 40, 'ẨN THÂN ĐẠI THỤ!', '#fb923c');
      }
      for (let s = 0; s < 10; s++) {
        const ang = (Math.PI * 2 * s) / 10;
        spawnParticle(
          world,
          en.x,
          en.y - 24,
          Math.cos(ang) * 150,
          Math.sin(ang) * 150,
          4,
          '#fde047',
          0.38,
          'petal'
        );
      }
    }

    // Never freeze an enemy with `continue` on ambushEntryTimer!
    if (en.ambushEntryTimer > 0) {
      en.ambushEntryTimer = Math.max(0, en.ambushEntryTimer - f.dt);
      if (en.ambushEntryTimer === 0) {
        en.zLane = world.combat.zLane;
        spawnBanner(world, en.x, en.y - 50, 'PHỤC KÍCH TRỤC Z!', '#fb923c');
      }
    }

    // STAGE 9 (OCEAN PALACE) & STAGE 11 (SKY SANCTUARY): Enemies SWIM or FLY freely in 3D Space!
    if (f.st.seasonId === 'ocean_palace' || f.st.seasonId === 'sky_sanctuary') {
      en.onGround = false;
      en.kageSpinTimer = 0;
      if (dist < 620) {
        const targetSwimY = Math.max(
          95,
          Math.min(525, world.player.y + Math.sin(en.aiTimer * 2.6 + en.id * 1.3) * 65)
        );
        en.vy = (targetSwimY - en.y) * 1.95 * chillSlow;
        if (dist < 155 && en.archetype !== 'red_ambusher' && en.archetype !== 'claw_assassin') {
          en.vx = -en.facing * 130 * chillSlow;
        } else if (dist > 250) {
          en.vx = en.facing * 155 * chillSlow;
        } else {
          en.vx = Math.sin(en.aiTimer * 2.8 + en.id) * 120 * chillSlow;
        }
        en.x = Math.max(en.baseX - 380, Math.min(en.baseX + 380, en.x + en.vx * f.dt));
        en.y = Math.max(90, Math.min(535, en.y + en.vy * f.dt));
      } else {
        // Idle underwater / sky patrol undulation
        en.vx = Math.sin(en.aiTimer * 1.8 + en.id) * 70;
        en.vy = Math.cos(en.aiTimer * 2.2 + en.id) * 50;
        en.x = Math.max(en.baseX - 220, Math.min(en.baseX + 220, en.x + en.vx * f.dt));
        en.y = Math.max(105, Math.min(515, en.y + en.vy * f.dt));
      }
    } else {
      // Vertical Gravity, Platform Landing & Periodic Tree-Branch Leaps for Land/Subterranean Enemies (Stages 1-8 & 10)
      const slopeFloorY = f.st.seasonId === 'earth_core' ? computeSubterraneanSlopeY(en.x) : 560;
      if (!(en.onGround ?? true)) {
        const prevY = en.y;
        en.x += en.vx * chillSlow * f.dt;
        en.vy += PHYSICS_CONSTANTS.GRAVITY * 0.86 * f.dt;
        en.y += en.vy * f.dt;

        if (en.vy >= 0) {
          for (const p of world.platforms) {
            if (p.respawnTimer && p.respawnTimer > 0) continue;
            if (p.zLane !== 'both' && p.zLane !== en.zLane) continue;
            if (en.x >= p.x + 8 && en.x <= p.x + p.w - 8 && prevY <= p.y + 18 && en.y >= p.y) {
              en.y = p.y;
              en.vy = 0;
              en.vx = 0;
              en.onGround = true;
              en.kageSpinTimer = 0;
              break;
            }
          }
          const floorClampY =
            f.cfg.scrollMode === 'vertical' ? f.cfg.stageLength - 100 : slopeFloorY;
          if (!(en.onGround ?? true) && en.y >= floorClampY) {
            en.y = floorClampY;
            en.vy = 0;
            en.vx = 0;
            en.onGround = true;
            en.kageSpinTimer = 0;
          }
        }
      } else if (en.archetype !== 'boss' && en.archetype !== 'elite_guard') {
        // Grounded Kage Ninja: check if we should execute a Legend of Kage Tree Leap!
        en.kageLeapCooldown = (en.kageLeapCooldown ?? 2.4) - f.dt * chillSlow;
        if (en.kageLeapCooldown <= 0 && dist < 560 && en.gateId === undefined) {
          const leapCount = (en.kageLeapCount ?? 0) + 1;
          en.kageLeapCount = leapCount;
          const leap = computeKageLeapVelocity({
            enemyX: en.x,
            enemyY: en.y,
            playerX: world.player.x,
            playerY: world.player.y,
            archetype: en.archetype,
            leapCounter: leapCount,
          });
          en.vx = leap.vx;
          en.vy = leap.vy;
          en.onGround = false;
          en.kageSpinTimer = leap.spinDuration;
          en.kageLeapCooldown = 2.2 + (en.id % 3) * 0.45;
        }
      }

      // Active Ground Movement for all Archetypes (No deadzones where enemies stand frozen!)
      if (en.onGround ?? true) {
        if (
          en.archetype === 'blue_kiter' ||
          en.archetype === 'bomb_alchemist' ||
          en.archetype === 'tessen_gale' ||
          en.archetype === 'thunder_puppeteer'
        ) {
          if (dist < 175) {
            en.vx = -en.facing * 145 * chillSlow;
          } else if (dist > 310) {
            en.vx = en.facing * 135 * chillSlow;
          } else {
            en.vx = Math.sin(en.aiTimer * 2.8 + en.id) * 110 * chillSlow;
          }
          en.x += en.vx * f.dt;
        } else if (
          en.archetype === 'red_ambusher' ||
          en.archetype === 'claw_assassin' ||
          en.archetype === 'chain_kusarigama'
        ) {
          if (dist > 54) {
            en.vx = en.facing * 210 * chillSlow;
          } else {
            en.vx = Math.cos(en.aiTimer * 4 + en.id) * 95 * chillSlow;
          }
          en.x += en.vx * f.dt;
        } else if (en.archetype === 'fire_monk') {
          if (dist < 160) {
            en.vx = -en.facing * 95 * chillSlow;
          } else if (dist > 280) {
            en.vx = en.facing * 105 * chillSlow;
          } else {
            en.vx = Math.sin(en.aiTimer * 2.4 + en.id) * 80 * chillSlow;
          }
          en.x += en.vx * f.dt;
        } else if (en.archetype === 'elite_guard') {
          en.vx = (dist > 120 ? en.facing * 150 : Math.sin(en.aiTimer * 3) * 95) * chillSlow;
          en.x += en.vx * f.dt;
        } else if (en.archetype === 'boss') {
          const hpRatio = en.hp / en.maxHp;
          const speed = (hpRatio < 0.35 ? 215 : hpRatio < 0.65 ? 175 : 140) * chillSlow;
          en.vx = dist > 135 ? en.facing * speed : Math.sin(en.aiTimer * 3.2) * 120 * chillSlow;
          en.x += en.vx * f.dt;
        }
        if (f.st.seasonId === 'earth_core' && en.x < f.cfg.stageLength - 980) {
          en.y = computeSubterraneanSlopeY(en.x);
        }
      }
    }

    // Keep Gate Garrison Guards in front of their Seal Gate
    if (en.gateId !== undefined) {
      const gateObj = world.sealGates.find((g) => g.id === en.gateId);
      if (gateObj && !gateObj.unlocked) {
        if (f.cfg.scrollMode === 'horizontal') {
          en.x = Math.max(gateObj.coord - 680, Math.min(gateObj.coord - 42, en.x));
          if (f.st.seasonId === 'earth_core') {
            en.y = computeSubterraneanSlopeY(en.x);
          }
        } else {
          en.y = Math.max(gateObj.coord + 42, Math.min(gateObj.coord + 680, en.y));
        }
      }
    }

    const enemyEffDmgMult = f.diff.enemyDamageMult * (en.zoneDamageMult ?? 1.0);

    if (en.windupTimer > 0) {
      en.windupTimer -= f.dt * chillSlow;
      if (en.windupTimer <= 0) {
        if (en.archetype === 'boss') {
          // 11 STAGE-SPECIFIC BOSS SIGNATURE SKILLS (Scaling up HP & Damage per Stage)!
          const castIdx = (en.bossCastCount ?? 0) + 1;
          en.bossCastCount = castIdx;
          const burst = computeBossSkillBurst({
            seasonId: f.st.seasonId,
            bossX: en.x,
            bossY: en.y,
            playerX: world.player.x,
            playerY: world.player.y,
            castIndex: castIdx,
            hpRatio: en.hp / en.maxHp,
            enemyDamageMult: f.diff.enemyDamageMult,
            bossDamageMult: f.diff.bossDamageMult,
            projectileSpeedMult: f.diff.projectileSpeedMult,
          });
          spawnBanner(world, en.x, en.y - 72, burst.skillBanner, burst.bannerColor);
          if (burst.bossLeapVy < 0) {
            en.vx = burst.bossDashVx;
            en.vy = burst.bossLeapVy;
            en.onGround = false;
          }
          for (const spec of burst.projectiles) {
            spawnProjectile(world, {
              x: en.x + spec.offsetX,
              y: en.y + spec.offsetY,
              vx: spec.vx,
              vy: spec.vy,
              fromPlayer: false,
              parried: false,
              piercing: false,
              explosive: spec.explosive,
              homing: spec.homing,
              crossZ: spec.crossZ,
              isSwordBeam: spec.isSwordBeam,
              isFireball: spec.isFireball,
              damage: spec.damage,
              zLane: en.zLane,
              life: 2.8,
              gravity: spec.gravity,
              waveAmp: spec.waveAmp,
              boomerangReturn: spec.boomerangReturn,
              customColor: spec.color,
            });
          }
          en.attackCooldown = 1.35 * f.diff.bossAttackCooldownMult;
        } else if (
          (en.archetype === 'red_ambusher' || en.archetype === 'claw_assassin') &&
          dist < 95 &&
          en.zLane === world.combat.zLane
        ) {
          if (world.player.invulnTimer <= 0 && world.combat.dashTimer <= 0) {
            const dmg = Math.round(16 * enemyEffDmgMult);
            const hitRes = applyPlayerDamage(world.combat, dmg);
            world.combat = hitRes.nextState;
            world.player.invulnTimer = 0.65;
            if (hitRes.blockedByImmortality) {
              spawnBanner(
                world,
                world.player.x,
                world.player.y - 48,
                'KIM THÂN HỘ THỂ!',
                '#fde047'
              );
            } else {
              world.cameraTrauma = 0.32;
              soundEngine.playPlayerHurt();
            }
          }
        } else {
          const aimAng = Math.atan2(world.player.y - 24 - (en.y - 24), world.player.x - en.x);
          const projSpeed = 420 * f.diff.projectileSpeedMult;

          if (en.archetype === 'bomb_alchemist') {
            spawnProjectile(world, {
              x: en.x + en.facing * 18,
              y: en.y - 32,
              vx: en.facing * (240 + Math.min(180, Math.abs(dx) * 0.45)),
              vy: -360,
              fromPlayer: false,
              parried: false,
              piercing: false,
              explosive: true,
              homing: false,
              crossZ: false,
              isSwordBeam: false,
              isFireball: true,
              damage: Math.round(18 * enemyEffDmgMult),
              zLane: en.zLane,
              life: 2.6,
              gravity: 660,
              customColor: '#fb923c',
            });
          } else if (en.archetype === 'chain_kusarigama') {
            spawnProjectile(world, {
              x: en.x + en.facing * 20,
              y: en.y - 24,
              vx: Math.cos(aimAng) * 460 * f.diff.projectileSpeedMult,
              vy: Math.sin(aimAng) * 460 * f.diff.projectileSpeedMult,
              fromPlayer: false,
              parried: false,
              piercing: false,
              explosive: false,
              homing: false,
              crossZ: true,
              isSwordBeam: false,
              isFireball: false,
              damage: Math.round(16 * enemyEffDmgMult),
              zLane: en.zLane,
              life: 2.4,
              boomerangReturn: true,
              customColor: '#e879f9',
            });
          } else if (en.archetype === 'claw_assassin') {
            en.vx = en.facing * 310;
            en.vy = -290;
            en.onGround = false;
            en.kageSpinTimer = 0.55;
            spawnProjectile(world, {
              x: en.x + en.facing * 20,
              y: en.y - 24,
              vx: Math.cos(aimAng) * projSpeed * 1.15,
              vy: Math.sin(aimAng) * projSpeed * 1.15,
              fromPlayer: false,
              parried: false,
              piercing: false,
              explosive: false,
              homing: false,
              crossZ: false,
              isSwordBeam: true,
              isFireball: false,
              damage: Math.round(16 * enemyEffDmgMult),
              zLane: en.zLane,
              life: 1.8,
              customColor: '#22d3ee',
            });
          } else if (en.archetype === 'tessen_gale') {
            for (const s of [-0.12, 0.12]) {
              spawnProjectile(world, {
                x: en.x + en.facing * 18,
                y: en.y - 24,
                vx: Math.cos(aimAng + s) * 390 * f.diff.projectileSpeedMult,
                vy: Math.sin(aimAng + s) * 390 * f.diff.projectileSpeedMult,
                fromPlayer: false,
                parried: false,
                piercing: false,
                explosive: false,
                homing: false,
                crossZ: true,
                isSwordBeam: true,
                isFireball: false,
                damage: Math.round(15 * enemyEffDmgMult),
                zLane: en.zLane,
                life: 2.5,
                waveAmp: 130,
                customColor: '#34d399',
              });
            }
          } else if (en.archetype === 'thunder_puppeteer') {
            spawnProjectile(world, {
              x: en.x + en.facing * 18,
              y: en.y - 28,
              vx: Math.cos(aimAng) * 410 * f.diff.projectileSpeedMult,
              vy: Math.sin(aimAng) * 410 * f.diff.projectileSpeedMult,
              fromPlayer: false,
              parried: false,
              piercing: false,
              explosive: true,
              homing: true,
              crossZ: true,
              isSwordBeam: false,
              isFireball: false,
              damage: Math.round(17 * enemyEffDmgMult),
              zLane: en.zLane,
              life: 2.6,
              customColor: '#fde047',
            });
          } else {
            const isFire = en.archetype === 'fire_monk' || en.archetype === 'elite_guard';
            const count = en.archetype === 'elite_guard' ? 2 : 1;
            for (let c = 0; c < count; c++) {
              const spread = count > 1 ? (c - 0.5) * 0.18 : 0;
              spawnProjectile(world, {
                x: en.x + en.facing * 18,
                y: en.y - 24,
                vx: Math.cos(aimAng + spread) * projSpeed,
                vy: Math.sin(aimAng + spread) * projSpeed,
                fromPlayer: false,
                parried: false,
                piercing: false,
                explosive: false,
                homing: false,
                crossZ: false,
                isSwordBeam: false,
                isFireball: isFire,
                damage: Math.round((isFire ? 20 : 14) * enemyEffDmgMult),
                zLane: en.zLane,
                life: 2.6,
              });
            }
          }
          en.attackCooldown =
            (en.archetype === 'elite_guard' ? 1.4 : 1.65) * f.diff.attackCooldownMult;
        }
      }
    } else if (dist < 560 && activeAttackers < f.diff.maxSimultaneousAttackers) {
      en.attackCooldown -= f.dt * chillSlow;
      if (en.attackCooldown <= 0) {
        en.windupTimer = 0.38;
        activeAttackers++;
      }
    }
  }
}
