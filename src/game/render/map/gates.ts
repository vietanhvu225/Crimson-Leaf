import { INK } from '../palette';
import type { MapCheckpoint, MapSealGate } from './types';

// Checkpoint torii gates and seal gates.

/**
 * 4. Renders Chibi Sacred Torii Gate Checkpoints with Plump Pillars, Paper Lanterns & Spirit Orb.
 */
export function renderChibiCheckpoints(
  ctx: CanvasRenderingContext2D,
  checkpoints: MapCheckpoint[],
  camX: number,
  viewW: number,
  stageTimeSec: number
): void {
  for (const cp of checkpoints) {
    if (cp.x < camX - 180 || cp.x > camX + viewW + 180) continue;
    ctx.save();

    const mainFill = cp.activated ? '#10b981' : '#f43f5e';
    const highlightFill = cp.activated ? '#6ee7b7' : '#fda4af';
    const darkFill = cp.activated ? '#047857' : '#be123c';

    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';

    for (const side of [-1, 1]) {
      const px = cp.x + side * 38;
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.roundRect(px - 11, cp.y - 16, 22, 16, 5);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = mainFill;
      ctx.beginPath();
      ctx.roundRect(px - 8, cp.y - 114, 16, 100, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = highlightFill;
      ctx.fillRect(px - 4, cp.y - 108, 4, 88);
    }

    ctx.fillStyle = darkFill;
    ctx.beginPath();
    ctx.roundRect(cp.x - 54, cp.y - 96, 108, 12, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = mainFill;
    ctx.beginPath();
    ctx.moveTo(cp.x - 68, cp.y - 118);
    ctx.quadraticCurveTo(cp.x, cp.y - 108, cp.x + 68, cp.y - 118);
    ctx.lineTo(cp.x + 62, cp.y - 104);
    ctx.quadraticCurveTo(cp.x, cp.y - 98, cp.x - 62, cp.y - 104);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const bobY = Math.sin(stageTimeSec * 4 + cp.id) * 4;
    const orbY = cp.y - 62 + bobY;

    ctx.fillStyle = cp.activated ? '#fef08a' : '#fda4af';
    ctx.beginPath();
    ctx.arc(cp.x, orbY, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cp.x - 5, orbY - 5, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(cp.x - 92, cp.y - 152, 184, 24, 12);
    ctx.fill();
    ctx.strokeStyle = cp.activated ? '#34d399' : '#fde047';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    ctx.font = 'bold 11px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = cp.activated ? '#6ee7b7' : '#fef08a';
    ctx.fillText(
      cp.activated ? `ĐÃ MỞ: ${cp.label}` : `TRẠM PHONG ẤN ${cp.id} (+30 HP)`,
      cp.x,
      cp.y - 136
    );

    ctx.restore();
  }
}

/**
 * 5. Renders Chibi Seal Gates (Kết Giới Phong Ấn) with Cute Rotating Bagua Medallions & Paper Talismans.
 */
export function renderChibiSealGates(
  ctx: CanvasRenderingContext2D,
  sealGates: MapSealGate[],
  getAliveGuardsCount: (gateId: number) => number,
  scrollMode: 'horizontal' | 'vertical',
  camX: number,
  viewW: number,
  stageTimeSec: number
): void {
  for (const gate of sealGates) {
    if (gate.unlocked) continue;
    const aliveGuards = getAliveGuardsCount(gate.id);

    if (scrollMode === 'horizontal') {
      if (gate.coord < camX - 180 || gate.coord > camX + viewW + 180) continue;
      ctx.save();
      const gx = gate.coord;
      // If gate is in a deep downward-sloping subterranean tunnel (coord > 5000 & camY > 300), anchor barrier around gateY
      const gateSlopeY = gate.yOffset ?? 0;

      const barrierGrad = ctx.createLinearGradient(gx - 26, 0, gx + 26, 0);
      barrierGrad.addColorStop(0, 'rgba(244, 63, 94, 0)');
      barrierGrad.addColorStop(0.5, 'rgba(251, 113, 133, 0.65)');
      barrierGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = barrierGrad;
      ctx.fillRect(gx - 26, 40 + gateSlopeY, 52, 520);

      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(gx - 5, 40 + gateSlopeY, 10, 520, 5);
      ctx.fill();
      ctx.stroke();

      ctx.save();
      ctx.translate(gx, 360 + gateSlopeY);
      ctx.rotate(stageTimeSec * 1.8);
      ctx.fillStyle = '#facc15';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#e11d48';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = '#0f172a';
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.roundRect(gx - 130, 280 + gateSlopeY, 260, 42, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 11px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fde047';
      ctx.fillText(gate.title.toUpperCase(), gx, 298 + gateSlopeY);
      ctx.fillStyle = '#fda4af';
      ctx.fillText(`DIỆT HỘ PHÁP ĐỂ MỞ: CÒN ${aliveGuards} ĐỊCH`, gx, 314 + gateSlopeY);
      ctx.restore();
    } else {
      const gy = gate.coord;
      ctx.save();
      ctx.fillStyle = 'rgba(244, 63, 94, 0.55)';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.roundRect(180, gy - 12, 780, 24, 12);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 12px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fde047';
      ctx.fillText(`${gate.title.toUpperCase()} — CÒN ${aliveGuards} HỘ PHÁP`, 570, gy - 18);
      ctx.restore();
    }
  }
}
