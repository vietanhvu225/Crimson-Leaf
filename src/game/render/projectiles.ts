import type { World } from '../engine/world';
import { ELEMENTAL_STANCES } from '../rules';
import { INK } from './palette';

// Kunai, shuriken, sword beams and elemental projectiles.

export function drawProjectiles(ctx: CanvasRenderingContext2D, world: World) {
  // 10. Chibi Cel-Shaded Projectiles (Kunai, Shuriken, Sword Beams & Elemental Ice/Lightning/Fire Projectiles)
  for (const proj of world.projectiles) {
    if (!proj.active) continue;
    ctx.save();
    ctx.translate(proj.x, proj.y);
    ctx.rotate(Math.atan2(proj.vy, proj.vx));

    const pStyle =
      proj.elementalStyle ??
      (proj.fromPlayer
        ? ELEMENTAL_STANCES[world.combat.skills.activeElement].projectileStyle
        : undefined);

    if (proj.fromPlayer && pStyle === 'fire_burst') {
      // HỎA VIÊM HỆ (BẮN RA CÁC NGỌN LỬA RỰC CHÁY 🔥 — TUYỆT ĐỐI KHÔNG VẼ HÌNH CHỮ C!):
      // Cluster of Roaring, Multi-Layered S-Curved Flickering Flame Tongues surging forward!
      const flameCount = proj.isSwordBeam ? 5 : 3;
      const halfCount = (flameCount - 1) * 0.5;
      for (let f = 0; f < flameCount; f++) {
        const offsetIdx = f - halfCount;
        const spreadY = offsetIdx * 8.5;
        const spreadAng = offsetIdx * 0.11;
        const flicker = Math.sin(world.stageTimeSec * 44 + f * 2.1 + proj.x * 0.06) * 4.5;
        const flameLen = (proj.isSwordBeam ? 36 : 28) - Math.abs(offsetIdx) * 4 + flicker * 0.5;
        const flameW = (proj.isSwordBeam ? 11.5 : 9.5) - Math.abs(offsetIdx) * 1.2;

        ctx.save();
        ctx.translate(-Math.abs(offsetIdx) * 4, spreadY);
        ctx.rotate(spreadAng);

        // 1. Outer Crimson-Red Flame Tongue with S-curved dancing tip (#dc2626)
        ctx.fillStyle = Math.abs(offsetIdx) >= 1.5 ? '#b91c1c' : '#dc2626';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.4;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(-flameLen * 0.55, 0);
        ctx.bezierCurveTo(
          -flameLen * 0.2,
          -flameW * 1.45,
          flameLen * 0.35,
          -flameW * 0.9 + flicker * 0.4,
          flameLen * 0.75,
          flicker * 0.45
        );
        ctx.bezierCurveTo(
          flameLen * 0.35,
          flameW * 0.9 + flicker * 0.4,
          -flameLen * 0.2,
          flameW * 1.45,
          -flameLen * 0.55,
          0
        );
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 2. Side Flame Licks (Ngọn lửa phụ uốn lượn hai bên)
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(-flameLen * 0.25, -flameW * 0.55);
        ctx.quadraticCurveTo(
          flameLen * 0.05,
          -flameW * 1.65,
          flameLen * 0.32,
          -flameW * 0.95
        );
        ctx.quadraticCurveTo(
          flameLen * 0.05,
          -flameW * 0.4,
          -flameLen * 0.25,
          -flameW * 0.55
        );
        ctx.fill();

        // 3. Middle Blazing Orange Flame Tongue (#f97316)
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.moveTo(-flameLen * 0.42, 0);
        ctx.quadraticCurveTo(0, -flameW * 0.9, flameLen * 0.52, flicker * 0.25);
        ctx.quadraticCurveTo(0, flameW * 0.9, -flameLen * 0.42, 0);
        ctx.closePath();
        ctx.fill();

        // 4. Inner Golden-Yellow Flame Heart (#fde047)
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.moveTo(-flameLen * 0.28, 0);
        ctx.quadraticCurveTo(
          -flameLen * 0.02,
          -flameW * 0.48,
          flameLen * 0.28,
          flicker * 0.12
        );
        ctx.quadraticCurveTo(-flameLen * 0.02, flameW * 0.48, -flameLen * 0.28, 0);
        ctx.closePath();
        ctx.fill();

        // 5. White-Hot Flame Spark Tip (#ffffff)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-flameLen * 0.08, 0, 4.5, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    } else if (proj.fromPlayer && pStyle === 'lightning_bolt') {
      // LÔI ĐIỆN HỆ (BẮN RA NHỮNG TIA SÉT PHÓNG ĐIỆN ⚡ — TUYỆT ĐỐI KHÔNG VẼ HÌNH CHỮ C!):
      // Multi-Strand Forked High-Voltage Jagged Lightning Bolts shooting straight forward!
      const boltCount = proj.isSwordBeam ? 3 : 2;
      const halfBolts = (boltCount - 1) * 0.5;
      for (let b = 0; b < boltCount; b++) {
        const bIdx = b - halfBolts;
        const yOff = bIdx * 12;
        const bAng = bIdx * 0.09;
        const jitter = Math.sin(world.stageTimeSec * 58 + b * 2.5 + proj.x * 0.09) * 4.2;

        ctx.save();
        ctx.translate(0, yOff);
        ctx.rotate(bAng);

        const boltPts = [
          { x: -30, y: 0 },
          { x: -17, y: -9 + jitter },
          { x: -5, y: 8 - jitter },
          { x: 8, y: -10 - jitter * 0.8 },
          { x: 19, y: 6 + jitter },
          { x: 34, y: 0 },
        ];

        // 1. Dark Ink Outline + Cyan Electric Plasma Aura
        ctx.strokeStyle = INK;
        ctx.lineWidth = 9.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        ctx.moveTo(boltPts[0].x, boltPts[0].y);
        for (let i = 1; i < boltPts.length; i++) {
          ctx.lineTo(boltPts[i].x, boltPts[i].y);
        }
        ctx.stroke();

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 6.5;
        ctx.stroke();

        // 2. Bright Golden-Yellow Jagged Lightning Bolt
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 3.8;
        ctx.stroke();

        // 3. White-Hot Electric Core
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // 4. Forked Side-Branches Crackling Off the Main Lightning Bolt
        ctx.strokeStyle = '#fde047';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(boltPts[2].x, boltPts[2].y);
        ctx.lineTo(boltPts[2].x + 11, boltPts[2].y + 13);
        ctx.moveTo(boltPts[3].x, boltPts[3].y);
        ctx.lineTo(boltPts[3].x + 12, boltPts[3].y - 13);
        ctx.stroke();

        ctx.restore();
      }
    } else if (proj.fromPlayer && pStyle === 'ice_shard') {
      // HÀN BĂNG HỆ (BẮN RA MŨI BĂNG TINH NHỌN ❄️ — KHÔNG VẼ HÌNH CHỮ C!):
      const shardCount = proj.isSwordBeam ? 3 : 1;
      const halfShards = (shardCount - 1) * 0.5;
      for (let s = 0; s < shardCount; s++) {
        const sIdx = s - halfShards;
        ctx.save();
        ctx.translate(-Math.abs(sIdx) * 5, sIdx * 10);
        ctx.rotate(sIdx * 0.1);

        ctx.fillStyle = '#38bdf8';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.4;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(26, 0);
        ctx.lineTo(4, -9);
        ctx.lineTo(-18, 0);
        ctx.lineTo(4, 9);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Lateral Ice Crystal Fins
        ctx.fillStyle = '#bae6fd';
        ctx.beginPath();
        ctx.moveTo(2, -8.5);
        ctx.lineTo(-8, -14.5);
        ctx.lineTo(-6, -4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(2, 8.5);
        ctx.lineTo(-8, 14.5);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(19, 0);
        ctx.lineTo(4, -4);
        ctx.lineTo(-10, 0);
        ctx.lineTo(4, 4);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      }
    } else if (proj.isSwordBeam) {
      // Enemy Claw / Wind-Blade Projectile (3 Sharp Forward Dagger Blades — NO C-shaped arc!)
      const beamColor = proj.customColor ?? '#f43f5e';
      for (const cOff of [-7, 0, 7]) {
        ctx.fillStyle = beamColor;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(20, cOff);
        ctx.lineTo(-6, cOff - 3.5);
        ctx.lineTo(-14, cOff);
        ctx.lineTo(-6, cOff + 3.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (proj.isFireball) {
      ctx.fillStyle = proj.parried ? '#fde047' : (proj.customColor ?? '#fb923c');
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-3, -3, 3.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.fromPlayer) {
      const kunaiColor = proj.parried
        ? '#fde047'
        : proj.homing
          ? '#c084fc'
          : proj.explosive
            ? '#fb923c'
            : '#38bdf8';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(-11, 0, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = kunaiColor;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-4, -6.5);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-4, 6.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-2, -2.5);
      ctx.lineTo(-1, 0);
      ctx.closePath();
      ctx.fill();
    } else {
      // Chibi 4-Point Steel Shuriken with bold ink outline
      ctx.rotate(world.stageTimeSec * 20);
      for (let b = 0; b < 4; b++) {
        ctx.rotate(Math.PI * 0.5);
        ctx.fillStyle = '#e2e8f0';
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(0, -3.5);
        ctx.lineTo(12, 0);
        ctx.lineTo(0, 3.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
