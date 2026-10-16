import type { SeasonId } from '../../rules';
import { INK } from '../palette';

// Water, crystal streams and magma surfaces.

/**
 * 8. Renders Scalloped Chibi Cartoon Water / Crystal Stream / Bubbling Magma Sea.
 */
export function renderChibiWaterOrMagma(
  ctx: CanvasRenderingContext2D,
  renderWaterY: number | null,
  camX: number,
  viewW: number,
  stageTimeSec: number,
  seasonId: SeasonId,
  isLoop2: boolean
): void {
  if (renderWaterY === null) return;

  if (seasonId === 'ocean_palace') {
    // MÀN 9 (THỦY CUNG ĐẠI CHIẾN): Entire arena is SUBMERGED underwater!
    // Render the shimmering upper ocean surface wave ceiling at Y=14 + rising Chibi air bubbles across the viewport!
    ctx.save();
    const topWaveY = 14;
    const waveSpan = 56;
    const startX = Math.floor((camX - 80) / waveSpan) * waveSpan;
    const endX = camX + viewW + 120;

    // Shimmering upper water surface ribbon
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let wx = startX; wx <= endX; wx += waveSpan) {
      const waveBob = Math.sin(stageTimeSec * 2.8 + wx * 0.03) * 5;
      if (wx === startX) ctx.moveTo(wx, topWaveY + waveBob);
      else
        ctx.quadraticCurveTo(wx - waveSpan * 0.5, topWaveY - 7 + waveBob, wx, topWaveY + waveBob);
    }
    ctx.stroke();

    // Rising Chibi Underwater Air Bubbles across the stage
    const bubbleSpan = 160;
    const firstB = Math.floor(camX / bubbleSpan);
    const lastB = firstB + Math.ceil(viewW / bubbleSpan) + 1;
    for (let b = firstB; b <= lastB; b++) {
      const bx = b * bubbleSpan + Math.sin(stageTimeSec * 2.4 + b * 1.7) * 22;
      const by = 560 - ((stageTimeSec * (68 + (Math.abs(b) % 3) * 22) + Math.abs(b) * 95) % 500);
      const r = 5 + (Math.abs(b) % 3) * 3;
      ctx.fillStyle = 'rgba(207, 250, 254, 0.28)';
      ctx.strokeStyle = '#a5f3fc';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(bx - r * 0.35, by - r * 0.35, r * 0.28, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    return;
  }

  ctx.save();
  const isMagma = seasonId === 'blood_abyss';
  const isCrystal = seasonId === 'cavern';

  // Position surface slightly below ground top (550) when not at high tide so ground turf & player feet stay crisp
  const surfaceY = seasonId === 'summer' ? renderWaterY + 12 : Math.max(558, renderWaterY + 18);

  const bodyTop = isMagma
    ? 'rgba(239, 68, 68, 0.82)'
    : isCrystal
      ? 'rgba(168, 85, 247, 0.78)'
      : isLoop2
        ? 'rgba(56, 189, 248, 0.78)'
        : 'rgba(6, 182, 212, 0.78)';
  const bodyBottom = isMagma
    ? 'rgba(127, 29, 29, 0.95)'
    : isCrystal
      ? 'rgba(59, 7, 100, 0.95)'
      : 'rgba(8, 51, 68, 0.95)';
  const crestColor = isMagma ? '#fef08a' : isCrystal ? '#f5d0fe' : '#cffafe';

  const waterGrad = ctx.createLinearGradient(0, surfaceY, 0, surfaceY + 240);
  waterGrad.addColorStop(0, bodyTop);
  waterGrad.addColorStop(1, bodyBottom);

  const waveSpan = 48;
  const startX = Math.floor((camX - 80) / waveSpan) * waveSpan;
  const endX = camX + viewW + 120;

  ctx.fillStyle = waterGrad;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(startX, surfaceY + 320);
  ctx.lineTo(startX, surfaceY);

  for (let wx = startX; wx <= endX; wx += waveSpan) {
    const waveBob = Math.sin(stageTimeSec * 3.2 + wx * 0.04) * 5;
    ctx.quadraticCurveTo(
      wx + waveSpan * 0.5,
      surfaceY - 11 + waveBob,
      wx + waveSpan,
      surfaceY + waveBob * 0.4
    );
  }

  ctx.lineTo(endX, surfaceY + 320);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Bright Chibi Foam / Lava Crest Ribbon just under the outline
  ctx.strokeStyle = crestColor;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let wx = startX; wx <= endX; wx += waveSpan) {
    const waveBob = Math.sin(stageTimeSec * 3.2 + wx * 0.04) * 5;
    if (wx === startX) {
      ctx.moveTo(wx, surfaceY + 5);
    }
    ctx.quadraticCurveTo(
      wx + waveSpan * 0.5,
      surfaceY - 5 + waveBob,
      wx + waveSpan,
      surfaceY + 5 + waveBob * 0.4
    );
  }
  ctx.stroke();

  ctx.restore();
}
