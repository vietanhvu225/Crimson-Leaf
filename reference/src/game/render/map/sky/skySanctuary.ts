import { INK } from '../../palette';
import { drawChibiCloud } from '../shapes';

/** Sky and celestial phenomena for sky_sanctuary. */
export function paintSkySanctuarySky(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  camX: number,
  stageTimeSec: number
) {
  // MÀN 11 (CỬU THIÊN KHÔNG CHIẾN): Radiant Nine-Heavens Sun Halo + Golden Wind-Current Streams + Soaring White Cranes & Floating Winged Temples!
  ctx.save();

  // 1. Radiant Nine-Heavens Sun & Golden Wind-Wheel Halo
  const sunX = viewW * 0.72;
  const sunY = viewH * 0.24;
  ctx.fillStyle = 'rgba(254, 240, 138, 0.35)';
  ctx.beginPath();
  ctx.arc(sunX, sunY, 125, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fef08a';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 2. Flowing Cyan & Gold Aerial Wind-Current Ribbons across the sky
  for (let w = 0; w < 4; w++) {
    const wy = 135 + w * 135;
    ctx.strokeStyle = w % 2 === 0 ? 'rgba(254, 240, 138, 0.45)' : 'rgba(186, 230, 253, 0.45)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let wx = 0; wx <= viewW; wx += 60) {
      const waveY = wy + Math.sin(wx * 0.012 + stageTimeSec * 3.5 + w) * 18;
      if (wx === 0) ctx.moveTo(wx, waveY);
      else ctx.lineTo(wx, waveY);
    }
    ctx.stroke();
  }

  // 3. Soaring Chibi White Immortal Cranes (Hạc Trắng Tiên Giới) & Floating Winged Sky-Pagodas
  for (let c = 0; c < 5; c++) {
    const cSpan = viewW + 280;
    const cx = ((((c * 310 - camX * 0.24 + stageTimeSec * 52) % cSpan) + cSpan) % cSpan) - 140;
    const cy = 120 + (c % 3) * 115 + Math.sin(stageTimeSec * 3.8 + c) * 18;
    const flap = Math.sin(stageTimeSec * 11 + c * 1.7) * 12;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = INK;
    ctx.fillStyle = '#ffffff';
    ctx.lineWidth = 2.6;
    // Crane Body
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // Flapping Crane Wings
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.quadraticCurveTo(-12, -18 + flap, -22, -10 + flap);
    ctx.lineTo(4, -2);
    ctx.fill();
    ctx.stroke();
    // Red Crown on Crane Head
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(14, -4, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Distant Floating Cloud Sea at the bottom of the sky
  for (let cl = -1; cl <= 5; cl++) {
    const clX = cl * 280 - ((camX * 0.16) % 280);
    drawChibiCloud(ctx, clX, viewH - 36, 1.35, '#ffffff', '#bae6fd');
  }

  ctx.restore();
}
