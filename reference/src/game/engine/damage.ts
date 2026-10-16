import { EnemyActor } from './entities';
import { spawnLightningBolt, spawnBanner, spawnParticle } from './spawn';
import { World } from './world';
import { rollElementalProc } from '../rules';

// Damage application + elemental / relic on-hit effects.

export function dealDamageToEnemy(world: World, target: EnemyActor, rawDmg: number) {
  const cappedDmg =
    target.archetype === 'boss'
      ? Math.min(rawDmg, 110)
      : target.archetype === 'elite_guard'
        ? Math.min(rawDmg, Math.round(target.maxHp * 0.25))
        : rawDmg;
  target.hp -= cappedDmg;
  target.hitFlashTimer = 0.12;
}

export function applyElementalAndRelicOnHit(world: World, target: EnemyActor) {
  const elem = world.combat.skills.activeElement;
  const proc = rollElementalProc(elem, Math.random());

  if (proc.burnDuration > 0) {
    target.burnTimer = Math.max(target.burnTimer, proc.burnDuration);
    // Hỏa Viêm (Highest Damage): Explosive Roaring Fire Burst on hit!
    for (let f = 0; f < 10; f++) {
      const ang = (Math.PI * 2 * f) / 10;
      spawnParticle(
        world,
        target.x + (Math.random() - 0.5) * 16,
        target.y - 24,
        Math.cos(ang) * 155,
        Math.sin(ang) * 145 - 55,
        5.0,
        f % 3 === 0 ? '#fde047' : f % 2 === 0 ? '#ef4444' : '#f97316',
        0.38,
        'ember'
      );
    }
  }

  if (proc.chillDuration > 0) {
    target.chillTimer = Math.max(target.chillTimer, proc.chillDuration);
    for (let c = 0; c < 6; c++) {
      const ang = (Math.PI * 2 * c) / 6;
      spawnParticle(
        world,
        target.x,
        target.y - 24,
        Math.cos(ang) * 120,
        Math.sin(ang) * 120,
        4.2,
        c % 2 === 0 ? '#38bdf8' : '#e0f2fe',
        0.34,
        'snow'
      );
    }
  }

  if (proc.triggeredFreeze) {
    // Hàn Băng (Lowest Damage, Freeze Proc): Encases enemy in an Ice Crystal Block!
    const freezeDur =
      target.archetype === 'boss' ? proc.freezeDuration * 0.55 : proc.freezeDuration;
    target.freezeTimer = Math.max(target.freezeTimer ?? 0, freezeDur);
    target.vx = 0;
    spawnBanner(world, target.x, target.y - 58, proc.bannerText, proc.bannerColor);
    for (let s = 0; s < 12; s++) {
      const ang = (Math.PI * 2 * s) / 12;
      spawnParticle(
        world,
        target.x,
        target.y - 24,
        Math.cos(ang) * 165,
        Math.sin(ang) * 165,
        4.8,
        s % 2 === 0 ? '#38bdf8' : '#e0f2fe',
        0.42,
        'snow'
      );
    }
  } else if (proc.triggeredStun) {
    // Lôi Điện (2nd Highest Damage, Stun Proc): Paralyzes enemy with Sky & Direct Lightning Strike!
    const stunDur = target.archetype === 'boss' ? proc.stunDuration * 0.55 : proc.stunDuration;
    target.stunTimer = Math.max(target.stunTimer ?? 0, stunDur);
    target.vx = 0;
    spawnBanner(world, target.x, target.y - 58, proc.bannerText, proc.bannerColor);
    spawnLightningBolt(world, target.x, target.y - 160, target.x, target.y - 12, '#fde047', 0.32);
    for (let s = 0; s < 12; s++) {
      const ang = (Math.PI * 2 * s) / 12;
      spawnParticle(
        world,
        target.x,
        target.y - 28,
        Math.cos(ang) * 185,
        Math.sin(ang) * 185,
        4.6,
        s % 2 === 0 ? '#fde047' : '#38bdf8',
        0.36,
        'lightning'
      );
    }
  }

  if (elem === 'thunder_lightning') {
    // Direct Electric Arc from Kage to the struck enemy + Chain Lightning to nearby enemy!
    spawnLightningBolt(
      world,
      world.player.x + world.player.facing * 18,
      world.player.y - 26,
      target.x,
      target.y - 24,
      '#fde047',
      0.22
    );
    for (let s = 0; s < 7; s++) {
      const ang = (Math.PI * 2 * s) / 7;
      spawnParticle(
        world,
        target.x,
        target.y - 24,
        Math.cos(ang) * 155,
        Math.sin(ang) * 155,
        4.2,
        s % 2 === 0 ? '#fde047' : '#38bdf8',
        0.28,
        'lightning'
      );
    }
    for (const other of world.enemies) {
      if (
        other.id !== target.id &&
        other.hp > 0 &&
        Math.hypot(other.x - target.x, other.y - target.y) < 210
      ) {
        dealDamageToEnemy(world, other, proc.chainShockDamage || 16);
        spawnLightningBolt(world, target.x, target.y - 26, other.x, other.y - 26, '#38bdf8', 0.28);
        for (let c = 0; c < 6; c++) {
          const ang = (Math.PI * 2 * c) / 6;
          spawnParticle(
            world,
            other.x,
            other.y - 24,
            Math.cos(ang) * 140,
            Math.sin(ang) * 140,
            4.2,
            c % 2 === 0 ? '#fde047' : '#38bdf8',
            0.28,
            'lightning'
          );
        }
        break;
      }
    }
  }

  if (
    world.combat.skills.relics.includes('thunder_drum') &&
    world.combat.combo > 0 &&
    world.combat.combo % 5 === 0
  ) {
    spawnBanner(world, target.x, target.y - 54, 'THIÊN LÔI TRỐNG TRẬN!', '#f59e0b');
    for (const other of world.enemies) {
      if (other.hp > 0 && Math.hypot(other.x - target.x, other.y - target.y) < 135) {
        dealDamageToEnemy(world, other, 22);
      }
    }
  }
}
