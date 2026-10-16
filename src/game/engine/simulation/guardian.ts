import { soundEngine } from '../../audio.ts';
import { applyMeleeHitReward, getGuardianBladeCount } from '../../rules/index.ts';
import { applyElementalAndRelicOnHit, dealDamageToEnemy } from '../damage.ts';
import { spawnParticle, spawnProjectile } from '../spawn.ts';
import type { World } from '../world.ts';
import type { Frame } from './frame.ts';

// Orbiting guardian spirit blades.

export function updateGuardianBlades(world: World, f: Frame) {
  // Orbiting Guardian Spirit Blades Update
  const bladeCount = getGuardianBladeCount(world.combat.skills.guardianLevel);
  if (bladeCount > 0) {
    const rotSpeed = world.combat.skills.guardianLevel >= 4 ? 5.2 : 3.6;
    world.player.guardianAngle += rotSpeed * f.dt;
    const orbitRadius = 64;

    for (let b = 0; b < bladeCount; b++) {
      const ang = world.player.guardianAngle + (Math.PI * 2 * b) / bladeCount;
      const bx = world.player.x + Math.cos(ang) * orbitRadius;
      const by = world.player.y - 24 + Math.sin(ang) * (orbitRadius * 0.68);

      for (const en of world.enemies) {
        if (en.hp <= 0 || en.koTimer > 0 || en.guardianHitCooldown > 0) continue;
        if (Math.hypot(en.x - bx, en.y - 24 - by) < 34) {
          en.guardianHitCooldown = 0.38;
          dealDamageToEnemy(world, en, 15);
          applyElementalAndRelicOnHit(world, en);
          if (en.hp <= 0) {
            en.koTimer = 0.35;
            world.combat = applyMeleeHitReward(
              world.combat,
              true,
              en.archetype === 'fire_monk' || en.archetype === 'elite_guard'
            );
            soundEngine.playHitEnemy(true);
          }
        }
      }

      if (world.combat.skills.guardianLevel >= 4 && world.player.guardianBlockCooldown <= 0) {
        for (const proj of world.projectiles) {
          if (!proj.active || proj.fromPlayer || proj.isFireball) continue;
          if (Math.hypot(proj.x - bx, proj.y - by) < 28) {
            proj.active = false;
            world.player.guardianBlockCooldown = 1.2;
            spawnParticle(world, bx, by, 0, -40, 4, '#c084fc', 0.25, 'spark');
            break;
          }
        }
      }
    }

    if (world.combat.skills.guardianLevel >= 5) {
      world.player.guardianFireTimer += f.dt;
      if (world.player.guardianFireTimer >= 2.4) {
        world.player.guardianFireTimer = 0;
        spawnProjectile(world, {
          x: world.player.x,
          y: world.player.y - 32,
          vx: world.player.facing * 720,
          vy: 0,
          fromPlayer: true,
          parried: false,
          piercing: true,
          explosive: false,
          homing: true,
          crossZ: true,
          isSwordBeam: true,
          isFireball: false,
          damage: 24,
          zLane: world.combat.zLane,
          life: 1.4,
        });
      }
    }
  }
}
