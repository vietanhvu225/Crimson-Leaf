import { INK } from '../../palette';
import { drawChibiMiniPagoda } from '../shapes';
import type { ChibiStagePalette } from '../stagePalette';

/** Sky and celestial phenomena for ocean_palace. */
export function paintOceanPalaceSky(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  camX: number,
  stageTimeSec: number,
  pal: ChibiStagePalette
) {
  // MÀN 9 (THỦY CUNG ĐẠI CHIẾN): Full Underwater Abyssal Dragon Palace — Shimmering Sunbeams, Glowing Chibi Jellyfish, Crystal Dragon Palace Domes & Giant Coral Reefs!
  ctx.save();

  // 1. Diagonal Shimmering Underwater Sunbeams (God Rays) piercing from upper ocean surface
  for (let r = 0; r < 5; r++) {
    const rayX =
      ((((r * 280 - camX * 0.05 + Math.sin(stageTimeSec * 0.8 + r) * 30) % (viewW + 320)) +
        (viewW + 320)) %
        (viewW + 320)) -
      160;
    const rayGrad = ctx.createLinearGradient(rayX, 0, rayX + 120, viewH);
    rayGrad.addColorStop(0, 'rgba(103, 232, 249, 0.24)');
    rayGrad.addColorStop(0.65, 'rgba(34, 211, 238, 0.08)');
    rayGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(rayX - 36, 0);
    ctx.lineTo(rayX + 54, 0);
    ctx.lineTo(rayX + 190, viewH);
    ctx.lineTo(rayX + 35, viewH);
    ctx.closePath();
    ctx.fill();
  }

  // 2. Distant Underwater Crystal Dragon Palace (Long Cung Thủy Tinh) & Giant Coral Silhouettes
  const palSpan = 460;
  const startPal = Math.floor((camX * 0.14 - 460) / palSpan);
  const endPal = startPal + Math.ceil((viewW + 920) / palSpan);
  for (let p = startPal; p <= endPal; p++) {
    const px = p * palSpan - camX * 0.14 + 180;
    const baseY = viewH - 95;

    // Distant Seabed Ridge
    ctx.fillStyle = pal.farHillFill;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px - 220, viewH + 10);
    ctx.quadraticCurveTo(px, baseY - 75, px + 240, viewH + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing Pearl Dragon Palace Pagoda on Seabed Ridge
    drawChibiMiniPagoda(ctx, px, baseY - 26, '#22d3ee');
    // Translucent Air Bubble Dome enclosing the Dragon Palace
    ctx.fillStyle = 'rgba(165, 243, 252, 0.16)';
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(px, baseY - 46, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Giant Chibi Pink & Golden Sea Coral Branches beside the Palace
    for (const side of [-1, 1]) {
      const cx = px + side * 125;
      const cy = baseY + 12;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy + 40);
      ctx.quadraticCurveTo(cx + side * 18, cy - 10, cx + side * 28, cy - 42);
      ctx.moveTo(cx + side * 10, cy + 8);
      ctx.lineTo(cx - side * 14, cy - 26);
      ctx.stroke();

      ctx.strokeStyle = side === -1 ? '#fb7185' : '#fde047';
      ctx.lineWidth = 5.5;
      ctx.stroke();
    }
  }

  // 3. Cute Bioluminescent Chibi Jellyfish (Sứa Phát Quang) & Swimming Sea Fish in Midground
  for (let j = 0; j < 5; j++) {
    const jSpan = viewW + 260;
    const jx = ((((j * 290 - camX * 0.2 + stageTimeSec * 18) % jSpan) + jSpan) % jSpan) - 130;
    const jy = 130 + (j % 3) * 95 + Math.sin(stageTimeSec * 2.6 + j * 1.4) * 22;

    ctx.save();
    ctx.translate(jx, jy);
    // Wiggling tentacles
    ctx.strokeStyle = j % 2 === 0 ? '#f472b6' : '#67e8f9';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    for (const tx of [-9, 0, 9]) {
      const wag = Math.sin(stageTimeSec * 5 + tx) * 5;
      ctx.beginPath();
      ctx.moveTo(tx, 4);
      ctx.quadraticCurveTo(tx + wag, 16, tx - wag * 0.5, 28);
      ctx.stroke();
    }
    // Cute Chibi Jellyfish Bell
    ctx.fillStyle = j % 2 === 0 ? '#fb7185' : '#22d3ee';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, 4, 20, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Glossy spots on Jellyfish
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-7, -5, 4, 0, Math.PI * 2);
    ctx.arc(6, -7, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();
}
