import type { World } from '../engine/world';
import { ELEMENTAL_STANCES } from '../rules';
import { INK } from './palette';

// Kunai, shuriken, sword beams and elemental projectiles.

export function drawProjectiles(world: World) {
  // 10. Chibi Cel-Shaded Projectiles (Kunai, Shuriken, Sword Beams & Elemental Ice/Lightning/Fire Projectiles)
  for (const proj of world.projectiles) {
    if (!proj.active) continue;
    world.ctx.save();
    world.ctx.translate(proj.x, proj.y);
    world.ctx.rotate(Math.atan2(proj.vy, proj.vx));

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

        world.ctx.save();
        world.ctx.translate(-Math.abs(offsetIdx) * 4, spreadY);
        world.ctx.rotate(spreadAng);

        // 1. Outer Crimson-Red Flame Tongue with S-curved dancing tip (#dc2626)
        world.ctx.fillStyle = Math.abs(offsetIdx) >= 1.5 ? '#b91c1c' : '#dc2626';
        world.ctx.strokeStyle = INK;
        world.ctx.lineWidth = 2.4;
        world.ctx.lineJoin = 'round';
        world.ctx.beginPath();
        world.ctx.moveTo(-flameLen * 0.55, 0);
        world.ctx.bezierCurveTo(
          -flameLen * 0.2,
          -flameW * 1.45,
          flameLen * 0.35,
          -flameW * 0.9 + flicker * 0.4,
          flameLen * 0.75,
          flicker * 0.45
        );
        world.ctx.bezierCurveTo(
          flameLen * 0.35,
          flameW * 0.9 + flicker * 0.4,
          -flameLen * 0.2,
          flameW * 1.45,
          -flameLen * 0.55,
          0
        );
        world.ctx.closePath();
        world.ctx.fill();
        world.ctx.stroke();

        // 2. Side Flame Licks (Ngọn lửa phụ uốn lượn hai bên)
        world.ctx.fillStyle = '#ea580c';
        world.ctx.beginPath();
        world.ctx.moveTo(-flameLen * 0.25, -flameW * 0.55);
        world.ctx.quadraticCurveTo(
          flameLen * 0.05,
          -flameW * 1.65,
          flameLen * 0.32,
          -flameW * 0.95
        );
        world.ctx.quadraticCurveTo(
          flameLen * 0.05,
          -flameW * 0.4,
          -flameLen * 0.25,
          -flameW * 0.55
        );
        world.ctx.fill();

        // 3. Middle Blazing Orange Flame Tongue (#f97316)
        world.ctx.fillStyle = '#f97316';
        world.ctx.beginPath();
        world.ctx.moveTo(-flameLen * 0.42, 0);
        world.ctx.quadraticCurveTo(0, -flameW * 0.9, flameLen * 0.52, flicker * 0.25);
        world.ctx.quadraticCurveTo(0, flameW * 0.9, -flameLen * 0.42, 0);
        world.ctx.closePath();
        world.ctx.fill();

        // 4. Inner Golden-Yellow Flame Heart (#fde047)
        world.ctx.fillStyle = '#fde047';
        world.ctx.beginPath();
        world.ctx.moveTo(-flameLen * 0.28, 0);
        world.ctx.quadraticCurveTo(
          -flameLen * 0.02,
          -flameW * 0.48,
          flameLen * 0.28,
          flicker * 0.12
        );
        world.ctx.quadraticCurveTo(-flameLen * 0.02, flameW * 0.48, -flameLen * 0.28, 0);
        world.ctx.closePath();
        world.ctx.fill();

        // 5. White-Hot Flame Spark Tip (#ffffff)
        world.ctx.fillStyle = '#ffffff';
        world.ctx.beginPath();
        world.ctx.ellipse(-flameLen * 0.08, 0, 4.5, 2.2, 0, 0, Math.PI * 2);
        world.ctx.fill();

        world.ctx.restore();
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

        world.ctx.save();
        world.ctx.translate(0, yOff);
        world.ctx.rotate(bAng);

        const boltPts = [
          { x: -30, y: 0 },
          { x: -17, y: -9 + jitter },
          { x: -5, y: 8 - jitter },
          { x: 8, y: -10 - jitter * 0.8 },
          { x: 19, y: 6 + jitter },
          { x: 34, y: 0 },
        ];

        // 1. Dark Ink Outline + Cyan Electric Plasma Aura
        world.ctx.strokeStyle = INK;
        world.ctx.lineWidth = 9.5;
        world.ctx.lineCap = 'round';
        world.ctx.lineJoin = 'miter';
        world.ctx.beginPath();
        world.ctx.moveTo(boltPts[0].x, boltPts[0].y);
        for (let i = 1; i < boltPts.length; i++) {
          world.ctx.lineTo(boltPts[i].x, boltPts[i].y);
        }
        world.ctx.stroke();

        world.ctx.strokeStyle = '#38bdf8';
        world.ctx.lineWidth = 6.5;
        world.ctx.stroke();

        // 2. Bright Golden-Yellow Jagged Lightning Bolt
        world.ctx.strokeStyle = '#fde047';
        world.ctx.lineWidth = 3.8;
        world.ctx.stroke();

        // 3. White-Hot Electric Core
        world.ctx.strokeStyle = '#ffffff';
        world.ctx.lineWidth = 1.6;
        world.ctx.stroke();

        // 4. Forked Side-Branches Crackling Off the Main Lightning Bolt
        world.ctx.strokeStyle = '#fde047';
        world.ctx.lineWidth = 2.2;
        world.ctx.beginPath();
        world.ctx.moveTo(boltPts[2].x, boltPts[2].y);
        world.ctx.lineTo(boltPts[2].x + 11, boltPts[2].y + 13);
        world.ctx.moveTo(boltPts[3].x, boltPts[3].y);
        world.ctx.lineTo(boltPts[3].x + 12, boltPts[3].y - 13);
        world.ctx.stroke();

        world.ctx.restore();
      }
    } else if (proj.fromPlayer && pStyle === 'ice_shard') {
      // HÀN BĂNG HỆ (BẮN RA MŨI BĂNG TINH NHỌN ❄️ — KHÔNG VẼ HÌNH CHỮ C!):
      const shardCount = proj.isSwordBeam ? 3 : 1;
      const halfShards = (shardCount - 1) * 0.5;
      for (let s = 0; s < shardCount; s++) {
        const sIdx = s - halfShards;
        world.ctx.save();
        world.ctx.translate(-Math.abs(sIdx) * 5, sIdx * 10);
        world.ctx.rotate(sIdx * 0.1);

        world.ctx.fillStyle = '#38bdf8';
        world.ctx.strokeStyle = INK;
        world.ctx.lineWidth = 2.4;
        world.ctx.lineJoin = 'round';
        world.ctx.beginPath();
        world.ctx.moveTo(26, 0);
        world.ctx.lineTo(4, -9);
        world.ctx.lineTo(-18, 0);
        world.ctx.lineTo(4, 9);
        world.ctx.closePath();
        world.ctx.fill();
        world.ctx.stroke();

        // Lateral Ice Crystal Fins
        world.ctx.fillStyle = '#bae6fd';
        world.ctx.beginPath();
        world.ctx.moveTo(2, -8.5);
        world.ctx.lineTo(-8, -14.5);
        world.ctx.lineTo(-6, -4);
        world.ctx.closePath();
        world.ctx.fill();
        world.ctx.stroke();
        world.ctx.beginPath();
        world.ctx.moveTo(2, 8.5);
        world.ctx.lineTo(-8, 14.5);
        world.ctx.lineTo(-6, 4);
        world.ctx.closePath();
        world.ctx.fill();
        world.ctx.stroke();

        world.ctx.fillStyle = '#ffffff';
        world.ctx.beginPath();
        world.ctx.moveTo(19, 0);
        world.ctx.lineTo(4, -4);
        world.ctx.lineTo(-10, 0);
        world.ctx.lineTo(4, 4);
        world.ctx.closePath();
        world.ctx.fill();

        world.ctx.restore();
      }
    } else if (proj.isSwordBeam) {
      // Enemy Claw / Wind-Blade Projectile (3 Sharp Forward Dagger Blades — NO C-shaped arc!)
      const beamColor = proj.customColor ?? '#f43f5e';
      for (const cOff of [-7, 0, 7]) {
        world.ctx.fillStyle = beamColor;
        world.ctx.strokeStyle = INK;
        world.ctx.lineWidth = 2.2;
        world.ctx.lineJoin = 'round';
        world.ctx.beginPath();
        world.ctx.moveTo(20, cOff);
        world.ctx.lineTo(-6, cOff - 3.5);
        world.ctx.lineTo(-14, cOff);
        world.ctx.lineTo(-6, cOff + 3.5);
        world.ctx.closePath();
        world.ctx.fill();
        world.ctx.stroke();
      }
    } else if (proj.isFireball) {
      world.ctx.fillStyle = proj.parried ? '#fde047' : (proj.customColor ?? '#fb923c');
      world.ctx.strokeStyle = INK;
      world.ctx.lineWidth = 2.4;
      world.ctx.beginPath();
      world.ctx.arc(0, 0, 11, 0, Math.PI * 2);
      world.ctx.fill();
      world.ctx.stroke();
      world.ctx.fillStyle = '#ffffff';
      world.ctx.beginPath();
      world.ctx.arc(-3, -3, 3.2, 0, Math.PI * 2);
      world.ctx.fill();
    } else if (proj.fromPlayer) {
      const kunaiColor = proj.parried
        ? '#fde047'
        : proj.homing
          ? '#c084fc'
          : proj.explosive
            ? '#fb923c'
            : '#38bdf8';
      world.ctx.strokeStyle = INK;
      world.ctx.lineWidth = 2.2;
      world.ctx.fillStyle = '#fde047';
      world.ctx.beginPath();
      world.ctx.arc(-11, 0, 3.2, 0, Math.PI * 2);
      world.ctx.fill();
      world.ctx.stroke();

      world.ctx.fillStyle = kunaiColor;
      world.ctx.lineJoin = 'round';
      world.ctx.beginPath();
      world.ctx.moveTo(16, 0);
      world.ctx.lineTo(-4, -6.5);
      world.ctx.lineTo(-2, 0);
      world.ctx.lineTo(-4, 6.5);
      world.ctx.closePath();
      world.ctx.fill();
      world.ctx.stroke();

      world.ctx.fillStyle = '#ffffff';
      world.ctx.beginPath();
      world.ctx.moveTo(12, 0);
      world.ctx.lineTo(-2, -2.5);
      world.ctx.lineTo(-1, 0);
      world.ctx.closePath();
      world.ctx.fill();
    } else {
      // Chibi 4-Point Steel Shuriken with bold ink outline
      world.ctx.rotate(world.stageTimeSec * 20);
      for (let b = 0; b < 4; b++) {
        world.ctx.rotate(Math.PI * 0.5);
        world.ctx.fillStyle = '#e2e8f0';
        world.ctx.strokeStyle = INK;
        world.ctx.lineWidth = 2.0;
        world.ctx.beginPath();
        world.ctx.moveTo(0, -3.5);
        world.ctx.lineTo(12, 0);
        world.ctx.lineTo(0, 3.5);
        world.ctx.closePath();
        world.ctx.fill();
        world.ctx.stroke();
      }
      world.ctx.fillStyle = '#f43f5e';
      world.ctx.beginPath();
      world.ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      world.ctx.fill();
    }
    world.ctx.restore();
  }
}
