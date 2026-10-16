import { INK } from '../../palette';
import { drawChibiCloud, drawChibiMiniPagoda } from '../shapes';
import { ChibiStagePalette } from '../stagePalette';

/** Sky and celestial phenomena for spring. */
export function paintSpringSky(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  camX: number,
  stageTimeSec: number,
  isLoop2: boolean,
  isAwakened: boolean,
  pal: ChibiStagePalette
) {
  // MÀN 1 (XUÂN): Rừng Đại Thụ Anh Đào — Giant Sakura Pink Blossom Moon + Mount Fuji Silhouette + Sakura Shrines
  const moonX = viewW * 0.76 - ((camX * 0.025) % 240);
  const moonY = viewH * 0.22;
  ctx.save();
  ctx.fillStyle = 'rgba(251, 113, 133, 0.26)';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 88, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isLoop2 || isAwakened ? '#fb7185' : '#ffe4e6';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 54, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Giant Chibi Mount Fuji in center-left background
  const fujiX = viewW * 0.36 - ((camX * 0.04) % 420);
  const fujiBaseY = viewH;
  const fujiTopY = viewH * 0.34;
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(fujiX - 280, fujiBaseY + 10);
  ctx.quadraticCurveTo(fujiX - 70, fujiTopY + 60, fujiX - 42, fujiTopY);
  ctx.lineTo(fujiX + 42, fujiTopY);
  ctx.quadraticCurveTo(fujiX + 70, fujiTopY + 60, fujiX + 280, fujiBaseY + 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Snow cap on Mount Fuji
  ctx.fillStyle = '#fff1f2';
  ctx.beginPath();
  ctx.moveTo(fujiX - 42, fujiTopY);
  ctx.lineTo(fujiX + 42, fujiTopY);
  ctx.lineTo(fujiX + 92, fujiTopY + 78);
  ctx.lineTo(fujiX + 35, fujiTopY + 56);
  ctx.lineTo(fujiX, fujiTopY + 82);
  ctx.lineTo(fujiX - 35, fujiTopY + 56);
  ctx.lineTo(fujiX - 92, fujiTopY + 78);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  for (let c = 0; c < 5; c++) {
    const cloudSpan = viewW + 320;
    const rawCx =
      ((((c * 310 - camX * 0.08 + stageTimeSec * 10) % cloudSpan) + cloudSpan) % cloudSpan) - 160;
    drawChibiCloud(ctx, rawCx, 82 + (c % 3) * 48, 0.78, pal.cloudFill, pal.cloudShade);
  }

  // Rolling Sakura Hills & Background Sakura Trees
  const hillSpan = 320;
  const startHill = Math.floor((camX * 0.14 - 320) / hillSpan);
  const endHill = startHill + Math.ceil((viewW + 640) / hillSpan);
  for (let h = startHill; h <= endHill; h++) {
    const hx = h * hillSpan - camX * 0.14;
    const hillH = 140 + Math.abs(Math.sin(h * 1.7)) * 70;
    const hillY = viewH - hillH;
    ctx.fillStyle = pal.farHillFill;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(hx - 80, viewH + 10);
    ctx.quadraticCurveTo(hx + hillSpan * 0.5, hillY - 80, hx + hillSpan + 80, viewH + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    if (Math.abs(h) % 2 === 0) {
      drawChibiMiniPagoda(ctx, hx + hillSpan * 0.5, hillY - 8, '#fb7185');
    }
  }
}
