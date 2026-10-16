import { INK } from '../../palette';
import { drawChibiCloud, drawChibiMiniPagoda } from '../shapes';

/** Fallback sky for stages without a bespoke painter. */
export function paintDefaultSky(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  camX: number,
  stageTimeSec: number
) {
  // MÀN 8 (THIÊN ĐÀN NGUYỆT THỰC): Giant Black-Gold Solar Eclipse + Rotating Celestial Bagua Array + Floating Jade Palaces
  ctx.save();
  const ecX = viewW * 0.52;
  const ecY = viewH * 0.28;

  // Rotating Outer Golden Bagua Ring in the Cosmos
  ctx.save();
  ctx.translate(ecX, ecY);
  ctx.rotate(stageTimeSec * 0.32);
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(0, 0, 118, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 96, 0, Math.PI * 2);
  ctx.stroke();
  for (let k = 0; k < 8; k++) {
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(-14, -112, 28, 10);
  }
  ctx.restore();

  // Black-Crimson Total Eclipse Sun/Moon Core
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.arc(ecX, ecY, 72, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(ecX, ecY, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Floating Astral Jade Palaces in the Starry Void
  const palSpan = 420;
  const startPal = Math.floor((camX * 0.14 - 420) / palSpan);
  const endPal = startPal + Math.ceil((viewW + 840) / palSpan);
  for (let p = startPal; p <= endPal; p++) {
    const px = p * palSpan - camX * 0.14 + 160;
    const py = viewH * 0.62 + Math.sin(stageTimeSec * 2 + p) * 12;
    drawChibiCloud(ctx, px, py + 16, 1.05, '#fef3c7', '#fde047');
    drawChibiMiniPagoda(ctx, px, py + 6, '#f43f5e');
  }
  ctx.restore();
}
