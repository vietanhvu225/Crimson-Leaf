import { INK } from '../../palette';
import { drawChibiMiniPagoda } from '../shapes';

/** Sky and celestial phenomena for summer. */
export function paintSummerSky(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  camX: number
) {
  // MÀN 2 (HẠ): Thủy Thành Đầm Sen — Giant Cyan Water Moon + Arched Red Bridges + Water Pavilions + Giant Chibi Lotus Flowers
  const moonX = viewW * 0.24 - ((camX * 0.02) % 200);
  const moonY = viewH * 0.19;
  ctx.save();
  ctx.fillStyle = 'rgba(34, 211, 238, 0.25)';
  ctx.beginPath();
  ctx.arc(moonX, moonY, 84, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cffafe';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(moonX, moonY, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Distant Misty Lake Horizon Line
  const lakeY = viewH * 0.62;
  ctx.fillStyle = '#083344';
  ctx.fillRect(0, lakeY, viewW, viewH - lakeY);
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, lakeY);
  ctx.lineTo(viewW, lakeY);
  ctx.stroke();

  // Distant Arched Red Bridges & Floating Water Pavilions (Thủy Đình) + Giant Pink Lotus Blooms
  const span = 420;
  const startIdx = Math.floor((camX * 0.18 - 420) / span);
  const endIdx = startIdx + Math.ceil((viewW + 840) / span);
  for (let i = startIdx; i <= endIdx; i++) {
    const bx = i * span - camX * 0.18;
    // Arched Red Lacquer Bridge
    ctx.fillStyle = '#e11d48';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bx + 20, lakeY + 12);
    ctx.quadraticCurveTo(bx + 140, lakeY - 58, bx + 260, lakeY + 12);
    ctx.lineTo(bx + 250, lakeY + 26);
    ctx.quadraticCurveTo(bx + 140, lakeY - 36, bx + 30, lakeY + 26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Floating Water Pavilion on Stilts
    drawChibiMiniPagoda(ctx, bx + 330, lakeY - 4, '#22d3ee');

    // Giant Chibi Pink Lotus Flower & Pad on the background lake
    const lx = bx + 95;
    const ly = lakeY + 42 + (Math.abs(i) % 2) * 22;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.ellipse(lx, ly + 8, 36, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    for (const pAng of [-0.5, -0.25, 0, 0.25, 0.5]) {
      ctx.save();
      ctx.translate(lx, ly + 4);
      ctx.rotate(pAng);
      ctx.fillStyle = '#fb7185';
      ctx.beginPath();
      ctx.ellipse(0, -14, 9, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}
