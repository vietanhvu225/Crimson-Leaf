import { INK } from '../../palette';

/** Sky and celestial phenomena for winter. */
export function paintWinterSky(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  camX: number,
  stageTimeSec: number
) {
  // MÀN 4 (ĐÔNG): Tuyết Sơn Cực Quang — Shimmering Northern Lights (Aurora) + Jagged Diamond Icebergs + Chibi Snowmen
  ctx.save();
  // Aurora Borealis Ribbons in upper sky
  for (let band = 0; band < 3; band++) {
    ctx.strokeStyle =
      band === 0
        ? 'rgba(52, 211, 153, 0.38)'
        : band === 1
          ? 'rgba(56, 189, 248, 0.35)'
          : 'rgba(167, 139, 250, 0.28)';
    ctx.lineWidth = 26;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let ax = 0; ax <= viewW; ax += 60) {
      const ay = 95 + band * 36 + Math.sin(ax * 0.008 + stageTimeSec * 1.6 + band) * 28;
      if (ax === 0) ctx.moveTo(ax, ay);
      else ctx.lineTo(ax, ay);
    }
    ctx.stroke();
  }

  // Sharp Faceted Crystal Iceberg Peaks & Chibi Snowmen
  const peakSpan = 280;
  const startPeak = Math.floor((camX * 0.16 - 280) / peakSpan);
  const endPeak = startPeak + Math.ceil((viewW + 560) / peakSpan);
  for (let p = startPeak; p <= endPeak; p++) {
    const px = p * peakSpan - camX * 0.16;
    const peakH = 190 + (Math.abs(p * 37) % 110);
    const peakY = viewH - peakH;

    // Left light facet + right shade facet of Iceberg
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.2;
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath();
    ctx.moveTo(px - 40, viewH + 10);
    ctx.lineTo(px + peakSpan * 0.5, peakY);
    ctx.lineTo(px + peakSpan * 0.5, viewH + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(px + peakSpan * 0.5, peakY);
    ctx.lineTo(px + peakSpan + 40, viewH + 10);
    ctx.lineTo(px + peakSpan * 0.5, viewH + 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cute Chibi Snowman on even peaks
    if (Math.abs(p) % 2 === 0) {
      const smX = px + peakSpan * 0.5;
      const smY = viewH - 95;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(smX, smY, 20, 0, Math.PI * 2);
      ctx.arc(smX, smY - 26, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Red scarf
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(smX - 12, smY - 15, 24, 6);
      ctx.strokeRect(smX - 12, smY - 15, 24, 6);
    }
  }
  ctx.restore();
}
