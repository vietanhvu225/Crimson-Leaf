import { INK } from '../../palette';

/** Sky and celestial phenomena for thunder_peak. */
export function paintThunderPeakSky(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  camY: number,
  stageTimeSec: number
) {
  // MÀN 6 (ĐỈNH LÔI PHONG): Giant Sky Thunder-Drum Rosary + Floating Chained Sky Rocks + Crackling Lightning Arcs
  ctx.save();
  const centerX = viewW * 0.5;
  const centerY = viewH * 0.28;
  // Giant Rotating Ring of 8 Raijin Thunder Drums in the Sky!
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(stageTimeSec * 0.45);
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.45)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 128, 0, Math.PI * 2);
  ctx.stroke();

  for (let d = 0; d < 8; d++) {
    const ang = (Math.PI * 2 * d) / 8;
    const dx = Math.cos(ang) * 128;
    const dy = Math.sin(ang) * 128;
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(dx, dy, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Tomoe comma mark inside drum
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(dx, dy, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Floating Chained Sky-Islands in Background
  for (let r = 0; r < 4; r++) {
    const rx = viewW * (0.15 + r * 0.24);
    const ry =
      ((((r * 230 - camY * 0.18 + Math.sin(stageTimeSec * 2 + r) * 14) % (viewH + 180)) +
        (viewH + 180)) %
        (viewH + 180)) -
      90;
    // Heavy Iron Chain
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(rx, ry - 90);
    ctx.lineTo(rx, ry);
    ctx.stroke();
    ctx.setLineDash([]);

    // Floating Rock Island
    ctx.fillStyle = '#312e81';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(rx - 52, ry);
    ctx.lineTo(rx + 52, ry);
    ctx.lineTo(rx + 28, ry + 48);
    ctx.lineTo(rx, ry + 66);
    ctx.lineTo(rx - 28, ry + 48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#facc15';
    ctx.fillRect(rx - 44, ry - 6, 88, 10);
    ctx.strokeRect(rx - 44, ry - 6, 88, 10);
  }
  ctx.restore();
}
