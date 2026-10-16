import type { World } from '../engine/world';
import { INK } from './palette';

// World item pedestals and dropped blood orbs.

export function drawWorldItems(world: World) {
  // 6B. Ornate Martial World Items on Floating Stone/Lotus Pedestals
  for (const item of world.worldItems) {
    if (item.collected) continue;
    if (item.x < world.camX - 90 || item.x > world.camX + world.viewW + 90) continue;

    world.ctx.save();
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

    world.ctx.strokeStyle = glowColor;
    world.ctx.lineWidth = 1.5;
    world.ctx.globalAlpha = 0.65;
    world.ctx.beginPath();
    world.ctx.ellipse(item.x, item.baseY + 20, 20, 6, 0, 0, Math.PI * 2);
    world.ctx.stroke();
    world.ctx.globalAlpha = 1;

    world.ctx.translate(item.x, item.y);

    const halo = world.ctx.createRadialGradient(0, 0, 4, 0, 0, 32);
    halo.addColorStop(0, glowColor);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    world.ctx.fillStyle = halo;
    world.ctx.globalAlpha = 0.45 + Math.sin(world.stageTimeSec * 6 + item.id) * 0.15;
    world.ctx.beginPath();
    world.ctx.arc(0, 0, 32, 0, Math.PI * 2);
    world.ctx.fill();
    world.ctx.globalAlpha = 1;

    if (isScroll) {
      world.ctx.strokeStyle = INK;
      world.ctx.lineWidth = 2.4;

      // Left & right scroll rollers
      world.ctx.fillStyle = '#fde047';
      world.ctx.beginPath();
      world.ctx.roundRect(-20, -13, 6, 26, 3);
      world.ctx.roundRect(14, -13, 6, 26, 3);
      world.ctx.fill();
      world.ctx.stroke();

      // Parchment body
      world.ctx.fillStyle = '#fef3c7';
      world.ctx.beginPath();
      world.ctx.roundRect(-15, -10, 30, 20, 4);
      world.ctx.fill();
      world.ctx.stroke();

      // Colored martial ribbon band
      world.ctx.fillStyle = glowColor;
      world.ctx.beginPath();
      world.ctx.roundRect(-5, -10, 10, 20, 2);
      world.ctx.fill();
      world.ctx.stroke();

      // Center star seal dot
      world.ctx.fillStyle = '#ffffff';
      world.ctx.beginPath();
      world.ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      world.ctx.fill();
    } else if (item.kind === 'relic_chest') {
      world.ctx.strokeStyle = INK;
      world.ctx.lineWidth = 2.6;
      world.ctx.lineJoin = 'round';

      // Plump Chibi Treasure Chest Lid
      world.ctx.fillStyle = '#b91c1c';
      world.ctx.beginPath();
      world.ctx.roundRect(-17, -15, 34, 10, 5);
      world.ctx.fill();
      world.ctx.stroke();

      // Main Chest Box
      world.ctx.fillStyle = '#ef4444';
      world.ctx.beginPath();
      world.ctx.roundRect(-16, -7, 32, 18, 5);
      world.ctx.fill();
      world.ctx.stroke();

      // Gold Trim & Lock Clasp
      world.ctx.fillStyle = '#fde047';
      world.ctx.beginPath();
      world.ctx.roundRect(-5, -8, 10, 9, 3);
      world.ctx.fill();
      world.ctx.stroke();

      // Glossy highlight dot
      world.ctx.fillStyle = '#ffffff';
      world.ctx.beginPath();
      world.ctx.arc(-10, -11, 2.5, 0, Math.PI * 2);
      world.ctx.fill();
    } else if (item.kind === 'jade_elixir') {
      world.ctx.fillStyle = '#10b981';
      world.ctx.strokeStyle = INK;
      world.ctx.lineWidth = 2.4;
      world.ctx.beginPath();
      world.ctx.arc(0, 5, 10.5, 0, Math.PI * 2);
      world.ctx.fill();
      world.ctx.stroke();
      world.ctx.beginPath();
      world.ctx.arc(0, -6, 7, 0, Math.PI * 2);
      world.ctx.fill();
      world.ctx.stroke();
      // Glossy chibi shine dot on gourd
      world.ctx.fillStyle = '#ffffff';
      world.ctx.beginPath();
      world.ctx.arc(-3.5, 2.5, 2.5, 0, Math.PI * 2);
      world.ctx.fill();
      world.ctx.fillStyle = '#fde047';
      world.ctx.fillRect(-3, -15, 6, 4.5);
      world.ctx.fillStyle = '#f43f5e';
      world.ctx.fillRect(-6.5, -2, 13, 3.2);
    } else if (item.kind === 'elemental_shrine') {
      world.ctx.fillStyle = glowColor;
      world.ctx.strokeStyle = INK;
      world.ctx.lineWidth = 2.4;
      world.ctx.lineJoin = 'round';
      world.ctx.beginPath();
      world.ctx.moveTo(0, -16);
      world.ctx.lineTo(12, 0);
      world.ctx.lineTo(0, 16);
      world.ctx.lineTo(-12, 0);
      world.ctx.closePath();
      world.ctx.fill();
      world.ctx.stroke();
      world.ctx.fillStyle = '#ffffff';
      world.ctx.beginPath();
      world.ctx.moveTo(0, -12);
      world.ctx.lineTo(5, 0);
      world.ctx.lineTo(0, 5);
      world.ctx.lineTo(-5, 0);
      world.ctx.closePath();
      world.ctx.fill();
    } else {
      world.ctx.fillStyle = glowColor;
      world.ctx.strokeStyle = INK;
      world.ctx.lineWidth = 2.4;
      world.ctx.beginPath();
      world.ctx.arc(0, 0, 11.5, 0, Math.PI * 2);
      world.ctx.fill();
      world.ctx.stroke();
      world.ctx.fillStyle = '#ffffff';
      world.ctx.beginPath();
      world.ctx.arc(-3.5, -3.5, 3.2, 0, Math.PI * 2);
      world.ctx.fill();
    }

    world.ctx.font = 'bold 10px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
    world.ctx.textAlign = 'center';
    world.ctx.fillStyle = 'rgba(9, 13, 22, 0.88)';
    world.ctx.beginPath();
    world.ctx.roundRect(-46, -34, 92, 14, 4);
    world.ctx.fill();
    world.ctx.fillStyle = '#f8fafc';
    world.ctx.fillText(item.label, 0, -24);
    world.ctx.restore();
  }
}

export function drawBloodOrbs(world: World) {
  // 7. Chibi Cel-Shaded Dropped Blood Orbs
  for (const orb of world.bloodOrbs) {
    if (!orb.active) continue;
    world.ctx.save();
    world.ctx.fillStyle = '#f43f5e';
    world.ctx.strokeStyle = INK;
    world.ctx.lineWidth = 2.2;
    world.ctx.beginPath();
    world.ctx.arc(orb.x, orb.y, 9.5, 0, Math.PI * 2);
    world.ctx.fill();
    world.ctx.stroke();
    world.ctx.fillStyle = '#ffffff';
    world.ctx.beginPath();
    world.ctx.arc(orb.x - 3, orb.y - 3, 2.6, 0, Math.PI * 2);
    world.ctx.fill();
    world.ctx.restore();
  }
}
