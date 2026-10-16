import type { World } from '../world.ts';
import type { Frame } from './frame.ts';

// Camera follow.

export function updateCamera(world: World, f: Frame) {
  const targetCamX =
    f.cfg.scrollMode === 'horizontal'
      ? Math.max(0, Math.min(f.cfg.stageLength - world.viewW, world.player.x - world.viewW * 0.36))
      : 0;
  const targetCamY =
    f.cfg.scrollMode === 'vertical'
      ? Math.max(0, Math.min(f.cfg.stageLength - world.viewH, world.player.y - world.viewH * 0.6))
      : f.st.seasonId === 'ocean_palace' || f.st.seasonId === 'sky_sanctuary'
        ? 0
        : f.st.seasonId === 'earth_core'
          ? Math.max(0, world.player.y - world.viewH * 0.5)
          : world.player.y < 290
            ? Math.max(-140, world.player.y - 290)
            : 0;
  world.camX += (targetCamX - world.camX) * Math.min(1, f.dt * 9);
  world.camY += (targetCamY - world.camY) * Math.min(1, f.dt * 6);
}
