import { spawnParticle } from '../spawn.ts';
import type { World } from '../world.ts';
import type { Frame } from './frame.ts';

// Ambient seasonal particles and short-lived FX pools (particles, banners, lightning).

export function updateAmbientEffects(world: World, f: Frame) {
  // Ambient Seasonal Particles (including rising underwater bubbles on Stage 9)
  if (!world.isHeadless && Math.random() < 0.45) {
    const isBubbles = f.cfg.particleType === 'bubbles';
    const px = world.camX + Math.random() * world.viewW;
    const py = isBubbles
      ? world.camY + world.viewH * (0.55 + Math.random() * 0.45)
      : world.camY - 20 + Math.random() * (world.viewH * 0.4);
    const color =
      f.cfg.particleType === 'petals'
        ? '#fda4af'
        : f.cfg.particleType === 'fireflies'
          ? '#67e8f9'
          : f.cfg.particleType === 'maple'
            ? '#fb923c'
            : f.cfg.particleType === 'embers'
              ? '#f87171'
              : isBubbles
                ? '#a5f3fc'
                : '#f1f5f9';
    spawnParticle(
      world,
      px,
      py,
      isBubbles ? (Math.random() - 0.5) * 35 : -35 - Math.random() * 45,
      isBubbles ? -65 - Math.random() * 65 : 45 + Math.random() * 55,
      isBubbles ? 4.2 : 3.5,
      color,
      3.2,
      'env'
    );
  }

  for (let i = 0; i < world.particles.length; i++) {
    const p = world.particles[i];
    if (!p.active) continue;
    p.x += p.vx * f.dt;
    p.y += p.vy * f.dt;
    p.life -= f.dt;
    p.alpha = Math.max(0, p.life / p.maxLife);
    if (p.life <= 0) p.active = false;
  }

  for (let i = 0; i < world.banners.length; i++) {
    const b = world.banners[i];
    if (!b.active) continue;
    b.y -= 28 * f.dt;
    b.life -= f.dt;
    if (b.life <= 0) b.active = false;
  }

  for (let i = 0; i < world.lightningBolts.length; i++) {
    const lb = world.lightningBolts[i];
    if (!lb.active) continue;
    lb.life -= f.dt;
    if (lb.life <= 0) lb.active = false;
  }
}
