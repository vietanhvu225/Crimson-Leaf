import { INK } from '../../palette';

/** Sky and celestial phenomena for autumn. */
export function paintAutumnSky(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  camY: number,
  stageTimeSec: number
) {
  // MÀN 3 (THU): Tường Thành Phong Hỏa — Blazing Sunset Sun + Colossal Castle Battlements + Spinning Wooden Gears & War Flags
  const sunX = viewW * 0.5;
  const sunY = viewH * 0.24;
  ctx.save();
  ctx.fillStyle = 'rgba(249, 115, 22, 0.28)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 110, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fde047';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 68, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Giant Spinning Chibi Wooden Mechanism Gears in Background
  for (let g = 0; g < 3; g++) {
    const gx = viewW * (0.22 + g * 0.28);
    const gy = ((((g * 260 - camY * 0.22) % (viewH + 220)) + (viewH + 220)) % (viewH + 220)) - 110;
    const r = g === 1 ? 74 : 54;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(stageTimeSec * (g % 2 === 0 ? 0.8 : -0.8));
    ctx.fillStyle = '#78350f';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.2;
    for (let t = 0; t < 8; t++) {
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-10, -r - 12, 20, 18);
      ctx.strokeRect(-10, -r - 12, 20, 18);
    }
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Distant Castle Battlement Wall with Crenellations & Fluttering War Banners
  const wallY = viewH - 190;
  ctx.fillStyle = '#292524';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.fillRect(0, wallY, viewW, 200);
  for (let cx = 0; cx < viewW + 60; cx += 64) {
    ctx.fillRect(cx, wallY - 24, 38, 26);
    ctx.strokeRect(cx, wallY - 24, 38, 26);
    if (Math.floor(cx / 64) % 3 === 0) {
      // Red Wuxia War Flag
      const wave = Math.sin(stageTimeSec * 6 + cx) * 8;
      ctx.beginPath();
      ctx.moveTo(cx + 19, wallY - 24);
      ctx.lineTo(cx + 19, wallY - 88);
      ctx.stroke();
      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.moveTo(cx + 19, wallY - 86);
      ctx.lineTo(cx + 64, wallY - 72 + wave);
      ctx.lineTo(cx + 19, wallY - 54);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#292524';
    }
  }
  ctx.restore();
}
