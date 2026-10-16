import { INK } from '../../palette';

/** Sky and celestial phenomena for earth_core. */
export function paintEarthCoreSky(
  ctx: CanvasRenderingContext2D,
  viewW: number,
  viewH: number,
  camX: number,
  stageTimeSec: number
) {
  // MÀN 10 (ĐỊA TÂM HOANG CỔ): Downward-Sloping Subterranean Geological Strata + Molten Gold Veins + Mine Timber Arches + Glowing Earth Core!
  ctx.save();

  // 1. Diagonal Downward-Sloping Geological Rock Strata Bands (visibly tilted downward left-to-right!)
  const slopeShift = (camX * 0.12) % 180;
  for (let layer = -2; layer < 6; layer++) {
    const yLeft = layer * 135 - slopeShift;
    const yRight = yLeft + viewW * 0.22; // Clear downward diagonal slope across the screen!
    ctx.fillStyle = layer % 2 === 0 ? 'rgba(69, 26, 3, 0.52)' : 'rgba(120, 53, 15, 0.38)';
    ctx.beginPath();
    ctx.moveTo(0, yLeft);
    ctx.lineTo(viewW, yRight);
    ctx.lineTo(viewW, yRight + 68);
    ctx.lineTo(0, yLeft + 68);
    ctx.closePath();
    ctx.fill();

    // Glowing Molten Gold Vein Seam along the diagonal rock stratum
    ctx.strokeStyle = layer % 2 === 0 ? '#fbbf24' : '#f59e0b';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(0, yLeft + 34);
    ctx.quadraticCurveTo(
      viewW * 0.5,
      (yLeft + yRight) * 0.5 + 18 + Math.sin(stageTimeSec * 2 + layer) * 8,
      viewW,
      yRight + 34
    );
    ctx.stroke();
  }

  // 2. Pulsing Radiant Primordial Earth Core (Lõi Địa Tâm Hoàng Kim) in the lower-right depths
  const coreX = viewW * 0.78;
  const coreY = viewH * 0.72;
  const coreGrad = ctx.createRadialGradient(coreX, coreY, 15, coreX, coreY, 210);
  coreGrad.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
  coreGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.25)');
  coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(coreX, coreY, 210, 0, Math.PI * 2);
  ctx.fill();

  // 3. Subterranean Mine-Timber Support Arches & Ancient Dragon Rib-Fossils descending left-to-right
  const archSpan = 380;
  const startArch = Math.floor((camX * 0.2 - 380) / archSpan);
  const endArch = startArch + Math.ceil((viewW + 760) / archSpan);
  for (let a = startArch; a <= endArch; a++) {
    const ax = a * archSpan - camX * 0.2;
    const ay = 110 + (ax / viewW) * 140; // Slopes downward from left to right!

    // Heavy Mine Timber Cross-Beam & Side Posts
    ctx.fillStyle = '#451a03';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.fillRect(ax - 12, ay, 24, viewH);
    ctx.strokeRect(ax - 12, ay, 24, viewH);

    // Sloped Upper Timber Roof Bracing
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(0.18);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-10, -14, archSpan + 20, 22);
    ctx.strokeRect(-10, -14, archSpan + 20, 22);
    ctx.restore();

    // Embedded Glowing Amber Geode Crystal on the Mine Arch
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(ax, ay + 48, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}
