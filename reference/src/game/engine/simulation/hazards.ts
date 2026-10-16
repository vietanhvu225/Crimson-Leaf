import { soundEngine } from '../../audio';
import { applyPlayerDamage } from '../../rules';
import { dealDamageToEnemy } from '../damage';
import { spawnBanner } from '../spawn';
import { World } from '../world';
import { Frame } from './frame';

// Stage environmental hazards (updrafts, geysers, icicles, lightning...).

export function updateHazards(world: World, f: Frame) {
  // Stage Environmental Hazards Update (Updrafts, Geysers, Falling Icicles, Sky Lightning, Spike Traps)
  for (const hz of world.hazards) {
    if (hz.kind === 'updraft') {
      if (
        world.player.x >= hz.x &&
        world.player.x <= hz.x + hz.w &&
        world.player.y >= hz.y &&
        world.player.y <= hz.y + hz.h
      ) {
        world.player.vy = Math.max(-520, world.player.vy - 1650 * f.dt);
      }
    } else if (hz.kind === 'spike_trap') {
      if (
        world.player.invulnTimer <= 0 &&
        world.combat.dashTimer <= 0 &&
        world.player.x >= hz.x + 6 &&
        world.player.x <= hz.x + hz.w - 6 &&
        world.player.y >= hz.y - 4 &&
        world.player.y <= hz.y + hz.h + 12
      ) {
        const hitRes = applyPlayerDamage(world.combat, 14);
        world.combat = hitRes.nextState;
        world.player.invulnTimer = 0.75;
        world.player.vy = -440;
        world.player.onGround = false;
        if (hitRes.blockedByImmortality) {
          spawnBanner(
            world,
            world.player.x,
            world.player.y - 52,
            'KIM THÂN BẤT TỬ (MIỄN CHÔNG)!',
            '#fde047'
          );
        } else {
          world.cameraTrauma = 0.38;
          soundEngine.playPlayerHurt();
          spawnBanner(
            world,
            world.player.x,
            world.player.y - 52,
            'DẪM BẪY CHÔNG SẮT (-14 HP)!',
            '#f43f5e'
          );
        }
      }
    } else if (hz.kind === 'geyser') {
      hz.timer = (hz.timer + f.dt) % hz.period;
      hz.active = hz.timer > hz.period - 1.1;
      if (
        hz.active &&
        world.player.x >= hz.x &&
        world.player.x <= hz.x + hz.w &&
        world.player.y >= hz.y &&
        world.player.y <= hz.y + hz.h
      ) {
        world.player.vy = -680;
        if (
          f.st.seasonId !== 'summer' &&
          world.player.invulnTimer <= 0 &&
          world.combat.dashTimer <= 0
        ) {
          const hitRes = applyPlayerDamage(world.combat, 14);
          world.combat = hitRes.nextState;
          world.player.invulnTimer = 0.7;
          if (!hitRes.blockedByImmortality) {
            soundEngine.playPlayerHurt();
            spawnBanner(
              world,
              world.player.x,
              world.player.y - 50,
              'TRÚNG MẠCH ĐỘC / LỬA!',
              '#f97316'
            );
          }
        }
      }
    } else if (hz.kind === 'icicle') {
      hz.timer = (hz.timer + f.dt) % hz.period;
      hz.active = hz.timer > hz.period - 0.95;
      if (hz.active) {
        hz.fallY = (hz.fallY ?? hz.y) + 520 * f.dt;
        if (
          world.player.invulnTimer <= 0 &&
          world.combat.dashTimer <= 0 &&
          Math.abs(world.player.x - (hz.x + hz.w * 0.5)) < 28 &&
          Math.abs(world.player.y - 24 - (hz.fallY ?? hz.y)) < 36
        ) {
          const hitRes = applyPlayerDamage(world.combat, 15);
          world.combat = hitRes.nextState;
          world.player.invulnTimer = 0.7;
          if (!hitRes.blockedByImmortality) {
            soundEngine.playPlayerHurt();
            spawnBanner(
              world,
              world.player.x,
              world.player.y - 52,
              'BĂNG NHŨ RƠI TRÚNG!',
              '#38bdf8'
            );
          }
        }
      } else {
        hz.fallY = hz.y;
      }
    } else if (hz.kind === 'lightning') {
      hz.timer = (hz.timer + f.dt) % hz.period;
      const prevActive = hz.active;
      hz.active = hz.timer > hz.period - 0.35;
      if (hz.active && !prevActive) {
        // ONLY shake camera if the lightning strike is near the player (Fixes off-screen frame jitter!)
        if (Math.abs(world.player.x - hz.x) < 260) {
          world.cameraTrauma = Math.max(world.cameraTrauma, 0.18);
        }
        if (
          world.player.invulnTimer <= 0 &&
          world.combat.dashTimer <= 0 &&
          world.player.x >= hz.x &&
          world.player.x <= hz.x + hz.w
        ) {
          const hitRes = applyPlayerDamage(world.combat, 16);
          world.combat = hitRes.nextState;
          world.player.invulnTimer = 0.75;
          if (!hitRes.blockedByImmortality) {
            soundEngine.playPlayerHurt();
            spawnBanner(
              world,
              world.player.x,
              world.player.y - 55,
              'THIÊN LÔI GIÁNG THẾ!',
              '#fde047'
            );
          }
        }
        for (const en of world.enemies) {
          if (en.hp > 0 && en.x >= hz.x - 20 && en.x <= hz.x + hz.w + 20) {
            dealDamageToEnemy(world, en, 35);
          }
        }
      }
    }
  }
}
