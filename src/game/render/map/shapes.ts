import { INK } from '../palette';

// Reusable cartoon shapes: puffs, clouds, mini pagodas.

/**
 * Helper: Draws a clean, unified Chibi foliage/blossom puff WITHOUT ugly internal intersecting circle chords.
 */
export function drawCleanChibiPuff(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  primaryColor: string,
  highlightColor: string
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // 1. Draw outer dark ink silhouette first (larger radius)
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0, -4, 21, 0, Math.PI * 2);
  ctx.arc(-14, 4, 16, 0, Math.PI * 2);
  ctx.arc(14, 4, 16, 0, Math.PI * 2);
  ctx.fill();

  // 2. Draw inner vibrant fill (3px smaller radius) so outer outline is seamless with ZERO internal lines!
  ctx.fillStyle = primaryColor;
  ctx.beginPath();
  ctx.arc(0, -4, 18, 0, Math.PI * 2);
  ctx.arc(-14, 4, 13, 0, Math.PI * 2);
  ctx.arc(14, 4, 13, 0, Math.PI * 2);
  ctx.fill();

  // 3. Cute glossy cel-shaded highlight beans on top-left
  ctx.fillStyle = highlightColor;
  ctx.beginPath();
  ctx.ellipse(-5, -11, 7, 4, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-16, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Helper: Draws a puffy cel-shaded Chibi cloud with curled Wuxia/anime puffs and bold ink outline.
 */
export function drawChibiCloud(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  fill: string,
  shade: string
): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // 1. Solid INK silhouette behind cloud puffs (no internal chord lines)
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(-28, 5, 19, 0, Math.PI * 2);
  ctx.arc(-4, -5, 25, 0, Math.PI * 2);
  ctx.arc(22, 1, 20, 0, Math.PI * 2);
  ctx.roundRect(-42, 4, 82, 20, 10);
  ctx.fill();

  // 2. Main cloud fill
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(-28, 5, 15.5, 0, Math.PI * 2);
  ctx.arc(-4, -5, 21.5, 0, Math.PI * 2);
  ctx.arc(22, 1, 16.5, 0, Math.PI * 2);
  ctx.roundRect(-39, 6, 76, 15, 8);
  ctx.fill();

  // 3. Bottom cel-shaded shadow band
  ctx.fillStyle = shade;
  ctx.beginPath();
  ctx.roundRect(-36, 11, 70, 9, 5);
  ctx.fill();

  // 4. Glossy white highlight dot
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-10, -14, 8, 4, -0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Helper: Draws a cute miniature Chibi Pagoda / Temple silhouette on top of distant hills.
 */
export function drawChibiMiniPagoda(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  accentColor: string
): void {
  ctx.save();
  ctx.translate(x, y);

  // Spire tip
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -56);
  ctx.lineTo(0, -40);
  ctx.stroke();

  // Two cute curved chibi roofs
  for (let tier = 0; tier < 2; tier++) {
    const ty = -18 - tier * 18;
    const rw = 28 - tier * 6;
    // Wall
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.roundRect(-rw * 0.55, ty, rw * 1.1, 16, 3);
    ctx.fill();
    ctx.stroke();

    // Glowing chibi window
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(0, ty + 8, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Upturned chibi roof
    ctx.fillStyle = accentColor;
    ctx.beginPath();
    ctx.moveTo(-rw - 8, ty + 2);
    ctx.quadraticCurveTo(0, ty - 12, rw + 8, ty + 2);
    ctx.lineTo(rw, ty + 6);
    ctx.lineTo(-rw, ty + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}
