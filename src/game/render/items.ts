import type { World } from '../engine/world';
import { INK } from './palette';

// World item pedestals and dropped blood orbs.

export function drawWorldItems(ctx: CanvasRenderingContext2D, world: World) {
  // 6B. Ornate Martial World Items on Floating Stone/Lotus Pedestals
  for (const item of world.worldItems) {
    if (item.collected) continue;
    if (item.x < world.camX - 90 || item.x > world.camX + world.viewW + 90) continue;

    ctx.save();
    const isScroll = item.kind.startsWith('scroll_');
    const glowColor =
      item.kind === 'scroll_kodachi'
        ? '#fb7185'
        : item.kind === 'scroll_kunai'
          ? '#38bdf8'
          : item.kind === 'scroll_mobility'
            ? '#fbbf24'
            : item.kind === 'scroll_deflect'
              ? '#34d399'
              : item.kind === 'scroll_guardian'
                ? '#c084fc'
                : item.kind === 'relic_chest'
                  ? '#f59e0b'
                  : item.kind === 'elemental_shrine'
                    ? '#22d3ee'
                    : item.kind === 'jade_elixir'
                      ? '#10b981'
                      : '#a78bfa';

    ctx.strokeStyle = glowColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.65;
    ctx.beginPath();
    ctx.ellipse(item.x, item.baseY + 20, 20, 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.translate(item.x, item.y);

    const halo = ctx.createRadialGradient(0, 0, 4, 0, 0, 32);
    halo.addColorStop(0, glowColor);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.globalAlpha = 0.45 + Math.sin(world.stageTimeSec * 6 + item.id) * 0.15;
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (isScroll) {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;

      // Left & right scroll rollers
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.roundRect(-20, -13, 6, 26, 3);
      ctx.roundRect(14, -13, 6, 26, 3);
      ctx.fill();
      ctx.stroke();

      // Parchment body
      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.roundRect(-15, -10, 30, 20, 4);
      ctx.fill();
      ctx.stroke();

      // Colored martial ribbon band
      ctx.fillStyle = glowColor;
      ctx.beginPath();
      ctx.roundRect(-5, -10, 10, 20, 2);
      ctx.fill();
      ctx.stroke();

      // Center star seal dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === 'relic_chest') {
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.6;
      ctx.lineJoin = 'round';

      // Plump Chibi Treasure Chest Lid
      ctx.fillStyle = '#b91c1c';
      ctx.beginPath();
      ctx.roundRect(-17, -15, 34, 10, 5);
      ctx.fill();
      ctx.stroke();

      // Main Chest Box
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.roundRect(-16, -7, 32, 18, 5);
      ctx.fill();
      ctx.stroke();

      // Gold Trim & Lock Clasp
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.roundRect(-5, -8, 10, 9, 3);
      ctx.fill();
      ctx.stroke();

      // Glossy highlight dot
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-10, -11, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.kind === 'jade_elixir') {
      ctx.fillStyle = '#10b981';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 5, 10.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -6, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Glossy chibi shine dot on gourd
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-3.5, 2.5, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.fillRect(-3, -15, 6, 4.5);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-6.5, -2, 13, 3.2);
    } else if (item.kind === 'elemental_shrine') {
      ctx.fillStyle = glowColor;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(12, 0);
      ctx.lineTo(0, 16);
      ctx.lineTo(-12, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -12);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 5);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = glowColor;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, 11.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-3.5, -3.5, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = 'bold 10px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
    ctx.beginPath();
    ctx.roundRect(-46, -34, 92, 14, 4);
    ctx.fill();
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(item.label, 0, -24);
    ctx.restore();
  }
}

export function drawBloodOrbs(ctx: CanvasRenderingContext2D, world: World) {
  // 7. Chibi Cel-Shaded Dropped Blood Orbs
  for (const orb of world.bloodOrbs) {
    if (!orb.active) continue;
    ctx.save();
    ctx.fillStyle = '#f43f5e';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(orb.x - 3, orb.y - 3, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
