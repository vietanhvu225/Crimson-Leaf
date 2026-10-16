import { INK } from '../palette';
import type { RenderablePlayer } from './types';

// Stage-specific mounts and movement auras under the player.

/** Màn 8: riding the flying sword. */
export function drawFlyingSwordMount(ctx: CanvasRenderingContext2D, player: RenderablePlayer) {
  ctx.save();
  ctx.translate(player.x, player.y + 4);
  ctx.scale(player.facing, 1);

  // Astral Starlight Wake under Flying Sword
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 2.2;
  ctx.globalAlpha = 0.65;
  ctx.beginPath();
  ctx.ellipse(-6, 2, 38, 7, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Giant White-Jade & Emerald Flying Sword Blade
  ctx.fillStyle = '#ecfdf5';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-32, -2);
  ctx.lineTo(28, -3.5);
  ctx.lineTo(38, 0);
  ctx.lineTo(28, 3.5);
  ctx.lineTo(-32, 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Emerald Immortal Core Stripe & Golden Lotus Guard
  ctx.fillStyle = '#34d399';
  ctx.fillRect(-26, -1.5, 52, 3);
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.roundRect(-34, -6, 7, 12, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Màn 4: ice ski charge. */
export function drawIceSkiTrail(ctx: CanvasRenderingContext2D, player: RenderablePlayer) {
  // MÀN 4 (TUYẾT SƠN): HÀN BĂNG XUNG KÍCH — Front Crystalline Frost-Ram Shield when ski-charging!
  ctx.save();
  ctx.translate(player.x + player.facing * 24, player.y - 24);
  ctx.scale(player.facing, 1);
  ctx.fillStyle = 'rgba(125, 211, 252, 0.45)';
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.moveTo(-4, -24);
  ctx.quadraticCurveTo(18, 0, -4, 24);
  ctx.stroke();
  ctx.fill();
  ctx.restore();
}

/** Màn 5: crystal levitation. */
export function drawCrystalLevitation(ctx: CanvasRenderingContext2D, player: RenderablePlayer) {
  // MÀN 5 (U MINH ĐỘNG): TỪ TRƯỜNG PHẢN TRỌNG LỰC — Orbiting Amethyst Anti-Gravity Rings under feet!
  ctx.save();
  ctx.strokeStyle = '#e879f9';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.ellipse(player.x, player.y + 3, 24, 6, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Màn 10: earth drill charge. */
export function drawEarthDrillAura(ctx: CanvasRenderingContext2D, player: RenderablePlayer) {
  // MÀN 10 (ĐỊA TÂM HOANG CỔ): MŨI KHOAN ĐỊA TÂM — Spinning Golden-Amber Spiral Drill Cone!
  ctx.save();
  ctx.translate(player.x + player.facing * 18, player.y - 12);
  ctx.rotate(Math.atan2(player.vy, player.vx || player.facing * 300));
  ctx.fillStyle = '#f59e0b';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.lineTo(-10, -16);
  ctx.lineTo(-10, 16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Spiral Gold Drill Threads
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-6, -12);
  ctx.lineTo(8, 10);
  ctx.moveTo(4, -8);
  ctx.lineTo(18, 5);
  ctx.stroke();
  ctx.restore();
}

/** Màn 11: wind wings flight. */
export function drawSkyWings(
  ctx: CanvasRenderingContext2D,
  player: RenderablePlayer,
  stageTimeSec: number
) {
  // MÀN 11 (CỬU THIÊN KHÔNG CHIẾN): Majestic Flapping Celestial Golden-Azure Wind-Wings (Thiên Bằng Phong Dực) on Kage's back!
  const flap = Math.sin(stageTimeSec * 15) * 11;
  ctx.save();
  ctx.translate(player.x, player.y - 28);
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.scale(side, 1);
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(4, 0);
    ctx.quadraticCurveTo(26, -22 + flap, 42, -10 + flap);
    ctx.quadraticCurveTo(28, 6, 6, 8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(6, 3);
    ctx.quadraticCurveTo(22, -8 + flap * 0.7, 32, -2 + flap * 0.7);
    ctx.quadraticCurveTo(18, 8, 6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
