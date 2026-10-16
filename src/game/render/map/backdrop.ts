import type { SeasonConfig, SeasonId } from '../../rules';
import { INK } from '../palette';
import { drawCleanChibiPuff } from './shapes';
import { paintAutumnSky } from './sky/autumn';
import { paintBloodAbyssSky } from './sky/bloodAbyss';
import { paintCavernSky } from './sky/cavern';
import { paintDefaultSky } from './sky/default';
import { paintEarthCoreSky } from './sky/earthCore';
import { paintOceanPalaceSky } from './sky/oceanPalace';
import { paintSkySanctuarySky } from './sky/skySanctuary';
import { paintSpringSky } from './sky/spring';
import { paintSummerSky } from './sky/summer';
import { paintThunderPeakSky } from './sky/thunderPeak';
import { paintWinterSky } from './sky/winter';
import { getChibiStagePalette } from './stagePalette';
import type { MapTrunk } from './types';

// Sky, moon, clouds, hills and background trees.

/**
 * 1. Renders 8 Completely Distinct Chibi Cel-Shaded Stage Backdrops (Sky, Celestial Bodies, Far Architecture & Midground Landmarks).
 */
export function renderChibiBackdrop(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  camX: number,
  camY: number,
  stageTimeSec: number,
  seasonId: SeasonId,
  cfg: SeasonConfig,
  isLoop2: boolean,
  isAwakened: boolean,
  trunks: MapTrunk[]
): void {
  const pal = getChibiStagePalette(seasonId, isLoop2);

  // 1A. Vibrant Cel-Shaded Sky / Cavern Ceiling Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, viewH);
  skyGrad.addColorStop(0, pal.skyTop);
  skyGrad.addColorStop(0.55, pal.skyMid);
  skyGrad.addColorStop(1, pal.skyBottom);
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, viewW, viewH);

  // STAGE-SPECIFIC SKY & CELESTIAL PHENOMENA
  if (seasonId === 'spring') {
    paintSpringSky(ctx, viewW, viewH, camX, stageTimeSec, isLoop2, isAwakened, pal);
  } else if (seasonId === 'summer') {
    paintSummerSky(ctx, viewW, viewH, camX);
  } else if (seasonId === 'autumn') {
    paintAutumnSky(ctx, viewW, viewH, camY, stageTimeSec);
  } else if (seasonId === 'winter') {
    paintWinterSky(ctx, viewW, viewH, camX, stageTimeSec);
  } else if (seasonId === 'cavern') {
    paintCavernSky(ctx, viewW, viewH, camX);
  } else if (seasonId === 'thunder_peak') {
    paintThunderPeakSky(ctx, viewW, viewH, camY, stageTimeSec);
  } else if (seasonId === 'blood_abyss') {
    paintBloodAbyssSky(ctx, viewW, viewH, camX);
  } else if (seasonId === 'ocean_palace') {
    paintOceanPalaceSky(ctx, viewW, viewH, camX, stageTimeSec, pal);
  } else if (seasonId === 'earth_core') {
    paintEarthCoreSky(ctx, viewW, viewH, camX, stageTimeSec);
  } else if (seasonId === 'sky_sanctuary') {
    paintSkySanctuarySky(ctx, viewW, viewH, camX, stageTimeSec);
  } else {
    paintDefaultSky(ctx, viewW, viewH, camX, stageTimeSec);
  }

  // 1E. Background Z-Plane Pillars / Trees (zDepth === -1) — Stage-Themed!
  ctx.save();
  for (const tr of trunks) {
    if (tr.zDepth !== -1) continue;
    const sx = tr.x - camX * 0.52;
    if (sx + tr.w < -140 || sx - tr.w > viewW + 140) continue;

    if (seasonId === 'spring') {
      const bw = tr.w * 0.68;
      ctx.fillStyle = pal.nearHillFill;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.roundRect(sx - bw * 0.5, 90, bw, viewH, 12);
      ctx.fill();
      ctx.stroke();
      drawCleanChibiPuff(ctx, sx, 96, 1.95, '#fb7185', '#fda4af');
    } else if (seasonId === 'winter') {
      // Distant Translucent Ice Spires
      ctx.fillStyle = 'rgba(125, 211, 252, 0.28)';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(sx - 28, viewH);
      ctx.lineTo(sx, 140);
      ctx.lineTo(sx + 28, viewH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}
