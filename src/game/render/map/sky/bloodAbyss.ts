import { INK } from '../../palette';

/** Sky and celestial phenomena for blood_abyss. */
export function paintBloodAbyssSky(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  camX: number
) {
  // MÀN 7 (HUYẾT HẢI LUYỆN NGỤC): Giant Demon Smelting Furnaces pouring rivers of glowing Magma + Hanging Iron Chains & Anvils
  ctx.save();
  const furnSpan = 440;
  const startFurn = Math.floor((camX * 0.16 - 440) / furnSpan);
  const endFurn = startFurn + Math.ceil((viewW + 880) / furnSpan);

  for (let f = startFurn; f <= endFurn; f++) {
    const fx = f * furnSpan - camX * 0.16 + 180;
    const fy = viewH * 0.36;

    // Hanging Heavy Iron Chains from ceiling
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 6;
    ctx.setLineDash([12, 8]);
    ctx.beginPath();
    ctx.moveTo(fx - 70, 0);
    ctx.lineTo(fx - 45, fy);
    ctx.moveTo(fx + 70, 0);
    ctx.lineTo(fx + 45, fy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Giant Chibi Demon Smelting Cauldron / Furnace Head
    ctx.fillStyle = '#27272a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.roundRect(fx - 64, fy - 45, 128, 92, 18);
    ctx.fill();
    ctx.stroke();

    // Glowing Horns & Fierce Furnace Eyes
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.arc(fx - 26, fy - 12, 11, 0, Math.PI * 2);
    ctx.arc(fx + 26, fy - 12, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Pouring Waterfall of Glowing Molten Lava from Furnace Mouth!
    const lavaGrad = ctx.createLinearGradient(0, fy + 20, 0, viewH);
    lavaGrad.addColorStop(0, '#fef08a');
    lavaGrad.addColorStop(0.35, '#f97316');
    lavaGrad.addColorStop(1, '#dc2626');
    ctx.fillStyle = lavaGrad;
    ctx.beginPath();
    ctx.roundRect(fx - 28, fy + 18, 56, viewH - fy, 12);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}
