import type { World } from '../engine/world';
import type { RenderFrame } from './frame';
import { INK } from './palette';

// Grapple rope, lightning arcs, pooled particles, combat banners and aim reticle.

export function drawGrappleRope(world: World, r: RenderFrame) {
  if (world.player.grappleTarget) {
    world.ctx.save();
    world.ctx.strokeStyle = INK;
    world.ctx.lineWidth = 6;
    world.ctx.beginPath();
    world.ctx.moveTo(world.player.x, world.player.y - 24);
    world.ctx.lineTo(world.player.grappleTarget.x, world.player.grappleTarget.y);
    world.ctx.stroke();

    world.ctx.strokeStyle = r.st.seasonId === 'ocean_palace' ? '#22d3ee' : r.cfg.accentColor;
    world.ctx.lineWidth = 3;
    world.ctx.beginPath();
    world.ctx.moveTo(world.player.x, world.player.y - 24);
    world.ctx.lineTo(world.player.grappleTarget.x, world.player.grappleTarget.y);
    world.ctx.stroke();
    world.ctx.restore();
  }
}

export function drawLightningArcs(world: World) {
  // 10B. Active Jagged Lightning Strike & Chain-Lightning Arcs (Lôi Điện Hệ ⚡)
  for (let i = 0; i < world.lightningBolts.length; i++) {
    const lb = world.lightningBolts[i];
    if (!lb.active) continue;
    world.ctx.save();
    world.ctx.globalAlpha = Math.min(1, (lb.life / lb.maxLife) * 1.3);
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

    world.ctx.strokeStyle = '#38bdf8';
    world.ctx.lineWidth = 7.5;
    world.ctx.lineCap = 'round';
    world.ctx.lineJoin = 'miter';
    world.ctx.beginPath();
    world.ctx.moveTo(pts[0].x, pts[0].y);
    for (let s = 1; s < pts.length; s++) {
      world.ctx.lineTo(pts[s].x, pts[s].y);
    }
    world.ctx.stroke();

    world.ctx.strokeStyle = lb.color;
    world.ctx.lineWidth = 4.2;
    world.ctx.stroke();

    world.ctx.strokeStyle = '#ffffff';
    world.ctx.lineWidth = 1.8;
    world.ctx.stroke();
    world.ctx.restore();
  }
}

export function drawParticles(world: World) {
  // 12. Chibi Cel-Shaded Pooled Particles (Roaring Flame Tongues, Jagged Lightning Bolts, Ice Diamonds, Sakura Petals)
  for (let i = 0; i < world.particles.length; i++) {
    const p = world.particles[i];
    if (!p.active) continue;
    world.ctx.save();
    world.ctx.globalAlpha = p.alpha;
    if (p.kind === 'ember') {
      // HỎA VIÊM FLAME TONGUE PARTICLE (Ngọn Lửa Rực Cháy 🔥)
      world.ctx.fillStyle = p.color;
      world.ctx.strokeStyle = INK;
      world.ctx.lineWidth = 1.5;
      world.ctx.beginPath();
      world.ctx.arc(p.x, p.y, p.size + 0.6, 0, Math.PI);
      world.ctx.lineTo(p.x, p.y - (p.size * 2.4 + 2));
      world.ctx.closePath();
      world.ctx.fill();
      world.ctx.stroke();
      world.ctx.fillStyle = '#fde047';
      world.ctx.beginPath();
      world.ctx.arc(p.x, p.y - 1, p.size * 0.55, 0, Math.PI * 2);
      world.ctx.fill();
    } else if (p.kind === 'lightning') {
      // LÔI ĐIỆN JAGGED ELECTRIC BOLT PARTICLE (Tia Sét Phóng Điện ⚡)
      world.ctx.strokeStyle = '#38bdf8';
      world.ctx.lineWidth = 4.0;
      world.ctx.lineCap = 'round';
      world.ctx.lineJoin = 'miter';
      world.ctx.beginPath();
      world.ctx.moveTo(p.x - p.size * 1.6, p.y - p.size * 1.4);
      world.ctx.lineTo(p.x + p.size * 0.5, p.y - p.size * 0.2);
      world.ctx.lineTo(p.x - p.size * 0.5, p.y + p.size * 0.4);
      world.ctx.lineTo(p.x + p.size * 1.6, p.y + p.size * 1.6);
      world.ctx.stroke();
      world.ctx.strokeStyle = p.color;
      world.ctx.lineWidth = 2.2;
      world.ctx.stroke();
    } else if (p.kind === 'snow') {
      // HÀN BĂNG ICE CRYSTAL DIAMOND PARTICLE (Băng Tinh ❄️)
      const r = p.size + 1.5;
      world.ctx.fillStyle = p.color;
      world.ctx.strokeStyle = INK;
      world.ctx.lineWidth = 1.4;
      world.ctx.beginPath();
      world.ctx.moveTo(p.x, p.y - r);
      world.ctx.lineTo(p.x + r * 0.75, p.y);
      world.ctx.lineTo(p.x, p.y + r);
      world.ctx.lineTo(p.x - r * 0.75, p.y);
      world.ctx.closePath();
      world.ctx.fill();
      world.ctx.stroke();
    } else {
      world.ctx.fillStyle = p.color;
      world.ctx.strokeStyle = INK;
      world.ctx.lineWidth = 1.4;
      world.ctx.beginPath();
      world.ctx.arc(p.x, p.y, p.size + 0.8, 0, Math.PI * 2);
      world.ctx.fill();
      if (p.size >= 3) {
        world.ctx.stroke();
      }
    }
    world.ctx.restore();
  }
}

export function drawBanners(world: World) {
  // 13. Floating Combat Banners with Bold Chibi Ink Outline
  for (let i = 0; i < world.banners.length; i++) {
    const b = world.banners[i];
    if (!b.active) continue;
    world.ctx.save();
    world.ctx.globalAlpha = Math.min(1, b.life * 1.5);
    world.ctx.font = 'bold 13px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
    world.ctx.textAlign = 'center';
    world.ctx.strokeStyle = INK;
    world.ctx.lineWidth = 3.5;
    world.ctx.lineJoin = 'round';
    world.ctx.strokeText(b.text, b.x, b.y);
    world.ctx.fillStyle = b.color;
    world.ctx.fillText(b.text, b.x, b.y);
    world.ctx.restore();
  }
}

export function drawAimReticle(world: World, r: RenderFrame) {
  // 14. 360° Chibi Aim Reticle
  if (r.st.gameState === 'playing') {
    world.ctx.save();
    world.ctx.translate(world.mouseWorldX, world.mouseWorldY);
    world.ctx.strokeStyle = INK;
    world.ctx.lineWidth = 3.5;
    world.ctx.beginPath();
    world.ctx.arc(0, 0, 10, 0, Math.PI * 2);
    world.ctx.stroke();

    world.ctx.strokeStyle = world.combat.awakenedTimer > 0 ? '#f43f5e' : '#38bdf8';
    world.ctx.lineWidth = 2;
    world.ctx.beginPath();
    world.ctx.arc(0, 0, 10, 0, Math.PI * 2);
    world.ctx.moveTo(-15, 0);
    world.ctx.lineTo(-6, 0);
    world.ctx.moveTo(6, 0);
    world.ctx.lineTo(15, 0);
    world.ctx.moveTo(0, -15);
    world.ctx.lineTo(0, -6);
    world.ctx.moveTo(0, 6);
    world.ctx.lineTo(0, 15);
    world.ctx.stroke();
    world.ctx.restore();
  }
}
