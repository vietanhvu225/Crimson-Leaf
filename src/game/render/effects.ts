import type { World } from '../engine/world';
import type { RenderFrame } from './frame';
import { INK } from './palette';

// Grapple rope, lightning arcs, pooled particles, combat banners and aim reticle.

export function drawGrappleRope(ctx: CanvasRenderingContext2D, world: World, r: RenderFrame) {
  if (world.player.grappleTarget) {
    ctx.save();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(world.player.x, world.player.y - 24);
    ctx.lineTo(world.player.grappleTarget.x, world.player.grappleTarget.y);
    ctx.stroke();

    ctx.strokeStyle = r.st.seasonId === 'ocean_palace' ? '#22d3ee' : r.cfg.accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(world.player.x, world.player.y - 24);
    ctx.lineTo(world.player.grappleTarget.x, world.player.grappleTarget.y);
    ctx.stroke();
    ctx.restore();
  }
}

export function drawLightningArcs(ctx: CanvasRenderingContext2D, world: World) {
  // 10B. Active Jagged Lightning Strike & Chain-Lightning Arcs (Lôi Điện Hệ ⚡)
  for (let i = 0; i < world.lightningBolts.length; i++) {
    const lb = world.lightningBolts[i];
    if (!lb.active) continue;
    ctx.save();
    ctx.globalAlpha = Math.min(1, (lb.life / lb.maxLife) * 1.3);
    const dx = lb.x2 - lb.x1;
    const dy = lb.y2 - lb.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const steps = 6;
    const pts: { x: number; y: number }[] = [{ x: lb.x1, y: lb.y1 }];
    for (let s = 1; s < steps; s++) {
      const t = s / steps;
      const offset =
        (s % 2 === 0 ? 1 : -1) * (10 + Math.sin(world.stageTimeSec * 60 + s * 2.1 + i) * 6);
      pts.push({
        x: lb.x1 + dx * t + nx * offset,
        y: lb.y1 + dy * t + ny * offset,
      });
    }
    pts.push({ x: lb.x2, y: lb.y2 });

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 7.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'miter';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let s = 1; s < pts.length; s++) {
      ctx.lineTo(pts[s].x, pts[s].y);
    }
    ctx.stroke();

    ctx.strokeStyle = lb.color;
    ctx.lineWidth = 4.2;
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.restore();
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, world: World) {
  // 12. Chibi Cel-Shaded Pooled Particles (Roaring Flame Tongues, Jagged Lightning Bolts, Ice Diamonds, Sakura Petals)
  for (let i = 0; i < world.particles.length; i++) {
    const p = world.particles[i];
    if (!p.active) continue;
    ctx.save();
    ctx.globalAlpha = p.alpha;
    if (p.kind === 'ember') {
      // HỎA VIÊM FLAME TONGUE PARTICLE (Ngọn Lửa Rực Cháy 🔥)
      ctx.fillStyle = p.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size + 0.6, 0, Math.PI);
      ctx.lineTo(p.x, p.y - (p.size * 2.4 + 2));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 1, p.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.kind === 'lightning') {
      // LÔI ĐIỆN JAGGED ELECTRIC BOLT PARTICLE (Tia Sét Phóng Điện ⚡)
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 4.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      ctx.moveTo(p.x - p.size * 1.6, p.y - p.size * 1.4);
      ctx.lineTo(p.x + p.size * 0.5, p.y - p.size * 0.2);
      ctx.lineTo(p.x - p.size * 0.5, p.y + p.size * 0.4);
      ctx.lineTo(p.x + p.size * 1.6, p.y + p.size * 1.6);
      ctx.stroke();
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2.2;
      ctx.stroke();
    } else if (p.kind === 'snow') {
      // HÀN BĂNG ICE CRYSTAL DIAMOND PARTICLE (Băng Tinh ❄️)
      const r = p.size + 1.5;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - r);
      ctx.lineTo(p.x + r * 0.75, p.y);
      ctx.lineTo(p.x, p.y + r);
      ctx.lineTo(p.x - r * 0.75, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size + 0.8, 0, Math.PI * 2);
      ctx.fill();
      if (p.size >= 3) {
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

export function drawBanners(ctx: CanvasRenderingContext2D, world: World) {
  // 13. Floating Combat Banners with Bold Chibi Ink Outline
  for (let i = 0; i < world.banners.length; i++) {
    const b = world.banners[i];
    if (!b.active) continue;
    ctx.save();
    ctx.globalAlpha = Math.min(1, b.life * 1.5);
    ctx.font = 'bold 13px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    ctx.strokeText(b.text, b.x, b.y);
    ctx.fillStyle = b.color;
    ctx.fillText(b.text, b.x, b.y);
    ctx.restore();
  }
}

export function drawAimReticle(ctx: CanvasRenderingContext2D, world: World, r: RenderFrame) {
  // 14. 360° Chibi Aim Reticle
  if (r.st.gameState === 'playing') {
    ctx.save();
    ctx.translate(world.mouseWorldX, world.mouseWorldY);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = world.combat.awakenedTimer > 0 ? '#f43f5e' : '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.moveTo(-15, 0);
    ctx.lineTo(-6, 0);
    ctx.moveTo(6, 0);
    ctx.lineTo(15, 0);
    ctx.moveTo(0, -15);
    ctx.lineTo(0, -6);
    ctx.moveTo(0, 6);
    ctx.lineTo(0, 15);
    ctx.stroke();
    ctx.restore();
  }
}
