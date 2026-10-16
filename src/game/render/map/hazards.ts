import { SeasonId } from '../../rules';
import { INK } from '../palette';
import { drawChibiCloud } from './shapes';
import { MapHazardZone } from './types';

// Environmental hazard zones.

/**
 * 3. Renders Chibi Stage Environmental Hazards (Puffy Wind Updrafts, Chunky Bamboo/Crystal Spikes, Bubbly Geysers, Chibi Icicles, Storm Cloud Lightning).
 */
export function renderChibiHazards(
  ctx: CanvasRenderingContext2D,
  hazards: MapHazardZone[],
  camX: number,
  viewW: number,
  stageTimeSec: number,
  seasonId: SeasonId
): void {
  for (const hz of hazards) {
    if (hz.x + hz.w < camX - 120 || hz.x > camX + viewW + 120) continue;
    ctx.save();

    if (hz.kind === 'updraft') {
      const isPurple = seasonId === 'cavern';
      const windGrad = ctx.createLinearGradient(0, hz.y + hz.h, 0, hz.y);
      windGrad.addColorStop(0, isPurple ? 'rgba(192, 132, 252, 0.32)' : 'rgba(134, 239, 172, 0.3)');
      windGrad.addColorStop(1, 'rgba(255, 255, 255, 0.03)');
      ctx.fillStyle = windGrad;
      ctx.beginPath();
      ctx.roundRect(hz.x, hz.y, hz.w, hz.h, 16);
      ctx.fill();

      ctx.strokeStyle = isPurple ? '#e879f9' : '#4ade80';
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';
      for (let s = 0; s < 3; s++) {
        const sy = hz.y + (hz.h - ((stageTimeSec * 195 + s * 130) % hz.h));
        const sx = hz.x + 16 + s * 22;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(sx + 8, sy - 20, sx, sy - 40);
        ctx.arc(sx - 5, sy - 40, 5, 0, Math.PI * 1.3, true);
        ctx.stroke();
      }
    } else if (hz.kind === 'spike_trap') {
      const spikeCount = Math.max(4, Math.floor(hz.w / 20));
      const sw = hz.w / spikeCount;

      for (let i = 0; i < spikeCount; i++) {
        const sx = hz.x + i * sw;
        ctx.fillStyle = i % 2 === 0 ? '#f1f5f9' : '#cbd5e1';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.6;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(sx + 1, hz.y + hz.h);
        ctx.quadraticCurveTo(sx + sw * 0.22, hz.y + hz.h * 0.35, sx + sw * 0.5, hz.y);
        ctx.quadraticCurveTo(sx + sw * 0.78, hz.y + hz.h * 0.35, sx + sw - 1, hz.y + hz.h);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Bright Rose-Pink Chibi Warning Tip
        ctx.fillStyle = '#f43f5e';
        ctx.beginPath();
        ctx.moveTo(sx + sw * 0.28, hz.y + 10);
        ctx.lineTo(sx + sw * 0.5, hz.y + 1);
        ctx.lineTo(sx + sw * 0.72, hz.y + 10);
        ctx.closePath();
        ctx.fill();
      }

      // Chunky Hazard Log Base
      ctx.fillStyle = '#dc2626';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.roundRect(hz.x - 2, hz.y + hz.h - 8, hz.w + 4, 10, 5);
      ctx.fill();
      ctx.stroke();
    } else if (hz.kind === 'geyser') {
      const gCol =
        seasonId === 'summer' ? '#38bdf8' : seasonId === 'cavern' ? '#c084fc' : '#fb923c';
      const gHighlight =
        seasonId === 'summer' ? '#bae6fd' : seasonId === 'cavern' ? '#f5d0fe' : '#fef08a';

      if (hz.active) {
        ctx.fillStyle = gCol;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(hz.x + 6, hz.y, hz.w - 12, hz.h, 16);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = gHighlight;
        ctx.beginPath();
        ctx.roundRect(hz.x + hz.w * 0.36, hz.y + 8, hz.w * 0.28, hz.h - 16, 8);
        ctx.fill();

        for (let b = 0; b < 4; b++) {
          const bx = hz.x + 12 + (b * (hz.w - 24)) / 3;
          const by = hz.y + Math.sin(stageTimeSec * 12 + b) * 6;
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(bx, by, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = gCol;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.roundRect(hz.x + 4, hz.y + hz.h - 14, hz.w - 8, 14, 7);
        ctx.fill();
        ctx.stroke();
      }
    } else if (hz.kind === 'icicle') {
      const iy = hz.fallY ?? hz.y;
      ctx.fillStyle = '#7dd3fc';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.8;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(hz.x + 4, iy);
      ctx.lineTo(hz.x + hz.w - 4, iy);
      ctx.lineTo(hz.x + hz.w * 0.5, iy + 48);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(hz.x + 9, iy + 4);
      ctx.lineTo(hz.x + hz.w * 0.46, iy + 4);
      ctx.lineTo(hz.x + hz.w * 0.48, iy + 32);
      ctx.closePath();
      ctx.fill();
    } else if (hz.kind === 'lightning') {
      const cx = hz.x + hz.w * 0.5;
      drawChibiCloud(ctx, cx, hz.y + 18, 0.65, '#475569', '#1e293b');

      if (hz.active) {
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(hz.x + 12, hz.y + 24, hz.w - 24, hz.h - 24, 10);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hz.x + hz.w * 0.35, hz.y + 28, hz.w * 0.3, hz.h - 32);
      } else if (hz.timer > hz.period - 1.2) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([8, 8]);
        ctx.strokeRect(hz.x + 16, hz.y + 28, hz.w - 32, hz.h - 28);
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
  }
}
