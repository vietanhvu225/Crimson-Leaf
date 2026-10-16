import { INK } from '../palette';
import { drawChibiEye } from './parts';

// Captive mother shrine on the final stage.

/**
 * Renders Kage's Captive Mother ("Mẫu Thân Bạch Y") on the Final Stage (Màn 11: Cửu Thiên Không Chiến).
 * While the Final Boss is alive, she is imprisoned inside a Crimson Seal Cage.
 * As soon as the Final Boss dies, the cage shatters into golden lotus light and she is rescued!
 */
export function renderCaptiveMotherShrine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  bossAlive: boolean,
  stageTimeSec: number
): void {
  const hoverY = y + Math.sin(stageTimeSec * 2.6) * 6;
  ctx.save();
  ctx.translate(x, hoverY);

  // 1. Floating Golden Lotus Cloud Altar Pedestal beneath Mother
  ctx.fillStyle = '#fde047';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.8;
  ctx.beginPath();
  ctx.ellipse(0, 8, 46, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.ellipse(0, 4, 36, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 2. Radiant Halo behind Mother
  const haloGrad = ctx.createRadialGradient(0, -28, 4, 0, -28, 52);
  if (bossAlive) {
    haloGrad.addColorStop(0, 'rgba(244, 63, 94, 0.38)');
    haloGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
  } else {
    haloGrad.addColorStop(0, 'rgba(253, 224, 71, 0.65)');
    haloGrad.addColorStop(1, 'rgba(56, 189, 248, 0)');
  }
  ctx.fillStyle = haloGrad;
  ctx.beginPath();
  ctx.arc(0, -28, 52, 0, Math.PI * 2);
  ctx.fill();

  // 3. Chibi Mother Character ("Mẫu Thân Bạch Y") facing left toward Kage
  ctx.save();
  ctx.scale(-1, 1);

  // Flowing White & Jade Immortal Silk Robe
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-13, -34, 26, 34, 8);
  ctx.fill();
  ctx.stroke();

  // Golden & Emerald Silk Sash
  ctx.fillStyle = '#10b981';
  ctx.fillRect(-12, -18, 24, 5);
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(0, -15.5, 3.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Gentle Chibi Head & Hair with Golden Phoenix Hairpin (Trâm Phượng Hoàng)
  const headY = -48;
  const headR = 15.5;
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Rosy Cheeks & Expressive Eyes
  ctx.fillStyle = 'rgba(244, 63, 94, 0.42)';
  ctx.beginPath();
  ctx.ellipse(2, headY + 3.5, 3.5, 2, 0, 0, Math.PI * 2);
  ctx.ellipse(11, headY + 3.2, 2.6, 1.7, 0, 0, Math.PI * 2);
  ctx.fill();

  drawChibiEye(ctx, 3, headY - 1, 3.4, 4.2, '#10b981', 0.12);
  drawChibiEye(ctx, 10.5, headY - 1.2, 2.5, 3.8, '#10b981', -0.1);

  // Noble Dark-Indigo Chibi Hair Bun & Golden Hairpin
  ctx.fillStyle = '#1e293b';
  ctx.beginPath();
  ctx.arc(-2, headY - 5, headR * 0.96, Math.PI * 0.85, Math.PI * 2.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(-8, headY - 19, 8.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Golden Phoenix Hairpin
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.roundRect(-14, headY - 21, 14, 4, 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();

  // 4. Crimson Seal Prison Bars (when Boss is alive) OR Joyful Reunion Hearts & Petals (when Boss is dead!)
  if (bossAlive) {
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.roundRect(-34, -74, 68, 78, 12);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(244, 63, 94, 0.55)';
    ctx.lineWidth = 2.2;
    for (let bx = -20; bx <= 20; bx += 13.3) {
      ctx.beginPath();
      ctx.moveTo(bx, -74);
      ctx.lineTo(bx, 4);
      ctx.stroke();
    }

    // Overhead Label
    ctx.font = 'bold 11px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.4;
    ctx.strokeText('MẪU THÂN (BỊ PHONG ẤN — HẠ BOSS ĐỂ CỨU MẸ!)', 0, -86);
    ctx.fillStyle = '#fda4af';
    ctx.fillText('MẪU THÂN (BỊ PHONG ẤN — HẠ BOSS ĐỂ CỨU MẸ!)', 0, -86);
  } else {
    // Freed Golden Aura Rings & Floating Reunion Sparkles
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(0, -32, 42 + Math.sin(stageTimeSec * 8) * 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = 'bold 13px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.8;
    ctx.strokeText('ĐÃ GIẢI CỨU MẸ THÀNH CÔNG! ĐOÀN TỤ MẪU TỬ!', 0, -88);
    ctx.fillStyle = '#fde047';
    ctx.fillText('ĐÃ GIẢI CỨU MẸ THÀNH CÔNG! ĐOÀN TỤ MẪU TỬ!', 0, -88);
  }

  ctx.restore();
}
