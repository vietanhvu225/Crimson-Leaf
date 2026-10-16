import { INK } from '../palette';
import type { EnemyPose } from './enemyPose';
import { drawChibiArm } from './parts';
import type { RenderableEnemy } from './types';

// Archetype-specific hair, hats and oversized weapons for regular enemies.

/** Lam Ảnh Nhẫn Giả: four-blade shuriken ninja. */
export function drawBlueKiterGear(
  ctx: CanvasRenderingContext2D,
  en: RenderableEnemy,
  stageTimeSec: number,
  pose: EnemyPose
) {
  // Cute Rounded Chibi Ninja Hood with Fox-Ear Corners & Silver Headband
  ctx.fillStyle = '#1e3a8a';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, pose.headCenterY - 1, pose.headR * 1.04, Math.PI * 0.78, Math.PI * 2.05);
  ctx.lineTo(pose.headR * 0.95, pose.headCenterY - pose.headR * 0.45);
  ctx.lineTo(-pose.headR * 0.85, pose.headCenterY - pose.headR * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cute ear-like hood tufts on top
  ctx.beginPath();
  ctx.moveTo(-pose.headR * 0.65, pose.headCenterY - pose.headR * 0.75);
  ctx.lineTo(-pose.headR * 0.95, pose.headCenterY - pose.headR * 1.35);
  ctx.lineTo(-pose.headR * 0.2, pose.headCenterY - pose.headR * 0.95);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Oversized Chibi Metal Forehead Plate
  ctx.fillStyle = '#e2e8f0';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(-pose.headR * 0.35, pose.headCenterY - pose.headR * 0.78, pose.headR * 1.2, 5.5, 2);
  ctx.fill();
  ctx.stroke();

  // Front Chibi Arm
  drawChibiArm(
    ctx,
    pose.torsoW * 0.25,
    pose.torsoTop + 5,
    pose.frontHandX,
    pose.frontHandY,
    '#1e3a8a',
    '#334155',
    '#38bdf8',
    pose.legR * 0.9
  );

  // Oversized Chibi 4-Point Windmill Shuriken
  ctx.save();
  ctx.translate(pose.frontHandX + 5, pose.frontHandY);
  ctx.rotate(stageTimeSec * (en.windupTimer > 0 ? 22 : 9) + en.id);
  const shurikenR = 16;
  for (let b = 0; b < 4; b++) {
    ctx.rotate(Math.PI * 0.5);
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(shurikenR, 0);
    ctx.lineTo(0, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = '#fef08a';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Huyết Quỷ Ám Sát: close-range blade ambusher. */
export function drawRedAmbusherGear(ctx: CanvasRenderingContext2D, pose: EnemyPose) {
  // Fluffy White-Silver Chibi Oni Mane & Chunky Golden Horns
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(
    -pose.headR * 0.2,
    pose.headCenterY - pose.headR * 0.35,
    pose.headR * 0.92,
    Math.PI * 0.65,
    Math.PI * 1.95
  );
  ctx.lineTo(pose.headR * 0.95, pose.headCenterY - pose.headR * 0.75);
  ctx.lineTo(pose.headR * 0.35, pose.headCenterY - pose.headR * 0.45);
  ctx.lineTo(-pose.headR * 1.35, pose.headCenterY - pose.headR * 0.55);
  ctx.lineTo(-pose.headR * 0.95, pose.headCenterY - pose.headR * 0.1);
  ctx.lineTo(-pose.headR * 1.3, pose.headCenterY + pose.headR * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cute Chunky Curved Golden Demon Horn
  ctx.fillStyle = '#fde047';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(pose.headR * 0.05, pose.headCenterY - pose.headR * 0.78);
  ctx.quadraticCurveTo(
    pose.headR * 0.6,
    pose.headCenterY - pose.headR * 1.65,
    pose.headR * 0.95,
    pose.headCenterY - pose.headR * 1.4
  );
  ctx.quadraticCurveTo(
    pose.headR * 0.65,
    pose.headCenterY - pose.headR * 0.85,
    pose.headR * 0.38,
    pose.headCenterY - pose.headR * 0.65
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Front Chibi Arm
  drawChibiArm(
    ctx,
    pose.torsoW * 0.25,
    pose.torsoTop + 5,
    pose.frontHandX,
    pose.frontHandY,
    '#881337',
    '#334155',
    '#fb7185',
    pose.legR * 0.9
  );

  // Chunky Chibi Blood Broadsword (Huyết Đao Chibi)
  ctx.save();
  ctx.translate(pose.frontHandX, pose.frontHandY);
  ctx.rotate(pose.swingOffset);
  ctx.fillStyle = '#fb7185';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.quadraticCurveTo(14, -14, 28, -24);
  ctx.quadraticCurveTo(26, -6, 4, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // White cel-shaded highlight stripe on blade
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(5, -3);
  ctx.quadraticCurveTo(14, -11, 24, -19);
  ctx.stroke();

  // Golden Chibi Hilt Guard
  ctx.fillStyle = '#fde047';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(-3.5, -4, 6, 8, 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Hỏa Thiền Sư: fire-staff monk. */
export function drawFireMonkGear(
  ctx: CanvasRenderingContext2D,
  stageTimeSec: number,
  pose: EnemyPose
) {
  // Giant Cute Orbiting Chibi Prayer Beads (Tràng Hạt Chibi)
  for (let b = 0; b < 6; b++) {
    const bAng = stageTimeSec * 2.5 + (b * Math.PI) / 3;
    const bx = Math.cos(bAng) * (pose.torsoW * 0.68);
    const by = pose.torsoTop + 3 + Math.sin(bAng) * 4.5;
    ctx.fillStyle = b % 2 === 0 ? '#fde047' : '#f97316';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(bx, by, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Wide Rounded Chibi Conical Bamboo Hat (Nón Lá Chibi)
  ctx.fillStyle = '#fbbf24';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-pose.headR * 1.55, pose.headCenterY - pose.headR * 0.25);
  ctx.quadraticCurveTo(
    0,
    pose.headCenterY - pose.headR * 1.65,
    pose.headR * 1.55,
    pose.headCenterY - pose.headR * 0.25
  );
  ctx.quadraticCurveTo(
    0,
    pose.headCenterY - pose.headR * 0.05,
    -pose.headR * 1.55,
    pose.headCenterY - pose.headR * 0.25
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cute glowing gourd/finial on top of hat
  ctx.fillStyle = '#f97316';
  ctx.beginPath();
  ctx.arc(0, pose.headCenterY - pose.headR * 1.05, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Front Chibi Arm
  drawChibiArm(
    ctx,
    pose.torsoW * 0.25,
    pose.torsoTop + 5,
    pose.frontHandX,
    pose.frontHandY,
    '#b45309',
    '#78350f',
    '#fde047',
    pose.legR * 0.9
  );

  // Chibi Fire Staff with Cute Blazing Spirit Orb
  ctx.save();
  ctx.translate(pose.frontHandX, 0);
  ctx.rotate(pose.swingOffset * 0.45);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 6.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-2, -2);
  ctx.lineTo(2, -pose.totalH - 2);
  ctx.stroke();

  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-2, -2);
  ctx.lineTo(2, -pose.totalH - 2);
  ctx.stroke();

  // Golden ring finial + Cute Flame Orb
  const topY = -pose.totalH - 7;
  ctx.fillStyle = '#f97316';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(2, topY, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(2, topY + 1, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** Bomb alchemist. */
export function drawBombAlchemistGear(
  ctx: CanvasRenderingContext2D,
  stageTimeSec: number,
  pose: EnemyPose
) {
  // Bộc Phá Nhẫn Giả: Brass Alchemist Goggles + Holding a Round Sizzling Black-Powder Bomb!
  ctx.fillStyle = '#9a3412';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.roundRect(-pose.headR * 0.9, pose.headCenterY - pose.headR * 0.82, pose.headR * 1.8, 7, 3);
  ctx.fill();
  ctx.stroke();

  // Cute Brass Goggle Lenses on forehead
  for (const gx of [-pose.headR * 0.25, pose.headR * 0.35]) {
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(gx, pose.headCenterY - pose.headR * 0.55, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  drawChibiArm(
    ctx,
    pose.torsoW * 0.25,
    pose.torsoTop + 5,
    pose.frontHandX,
    pose.frontHandY,
    '#9a3412',
    '#334155',
    '#fb923c',
    pose.legR * 0.9
  );

  // Oversized Chibi Round Bomb with Sparking Fuse in Hand
  ctx.save();
  ctx.translate(pose.frontHandX + 7, pose.frontHandY - 4);
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Sparking fuse on top of bomb
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(4, -12, 4.5 + Math.sin(stageTimeSec * 20) * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Kusarigama chain fighter. */
export function drawChainKusarigamaGear(
  ctx: CanvasRenderingContext2D,
  en: RenderableEnemy,
  stageTimeSec: number,
  pose: EnemyPose
) {
  // Xích Liêm Nhẫn Giả: Purple Hood + Spinning Kusarigama Chain & Crescent Sickle!
  ctx.fillStyle = '#581c87';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(0, pose.headCenterY - 1, pose.headR * 1.04, Math.PI * 0.8, Math.PI * 2.05);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  drawChibiArm(
    ctx,
    pose.torsoW * 0.25,
    pose.torsoTop + 5,
    pose.frontHandX,
    pose.frontHandY,
    '#581c87',
    '#334155',
    '#c084fc',
    pose.legR * 0.9
  );

  // Spinning Chain & Crescent Sickle Blade
  ctx.save();
  ctx.translate(pose.frontHandX + 4, pose.frontHandY);
  const chainAng = stageTimeSec * 14 + en.id;
  const tipX = Math.cos(chainAng) * 20;
  const tipY = Math.sin(chainAng) * 14 - 8;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.translate(tipX, tipY);
  ctx.rotate(chainAng);
  ctx.fillStyle = '#e879f9';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, 0, 11, -0.4, 2.2);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** Claw assassin. */
export function drawClawAssassinGear(ctx: CanvasRenderingContext2D, pose: EnemyPose) {
  // Thiết Trảo Phi Hồ: Silver Fox-Ears + Twin Glowing Cyan Wolverine Claws!
  ctx.fillStyle = '#e2e8f0';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  for (const earX of [-pose.headR * 0.45, pose.headR * 0.25]) {
    ctx.beginPath();
    ctx.moveTo(earX - 5, pose.headCenterY - pose.headR * 0.75);
    ctx.lineTo(earX, pose.headCenterY - pose.headR * 1.55);
    ctx.lineTo(earX + 6, pose.headCenterY - pose.headR * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  drawChibiArm(
    ctx,
    pose.torsoW * 0.25,
    pose.torsoTop + 5,
    pose.frontHandX,
    pose.frontHandY,
    '#0f766e',
    '#334155',
    '#22d3ee',
    pose.legR * 0.9
  );

  // 3 Razor Cyan Steel Claws Extending from Fist
  ctx.save();
  ctx.translate(pose.frontHandX + 2, pose.frontHandY);
  ctx.rotate(pose.swingOffset);
  ctx.strokeStyle = '#22d3ee';
  ctx.lineWidth = 2.8;
  ctx.lineCap = 'round';
  for (const cy of [-5, 0, 5]) {
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(22, cy - 3);
    ctx.stroke();
  }
  ctx.restore();
}

/** Tessen war-fan gale caster. */
export function drawTessenGaleGear(ctx: CanvasRenderingContext2D, pose: EnemyPose) {
  // Thiết Phiến Phong Cơ: Kunoichi Hair Bun + Giant Folding War Fan (Thiết Phiến)!
  ctx.fillStyle = '#065f46';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(-pose.headR * 0.55, pose.headCenterY - pose.headR * 0.85, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  drawChibiArm(
    ctx,
    pose.torsoW * 0.25,
    pose.torsoTop + 5,
    pose.frontHandX,
    pose.frontHandY,
    '#065f46',
    '#fde047',
    '#34d399',
    pose.legR * 0.9
  );

  // Giant Chibi Folding War Fan
  ctx.save();
  ctx.translate(pose.frontHandX + 4, pose.frontHandY);
  ctx.rotate(pose.swingOffset - 0.3);
  ctx.fillStyle = '#34d399';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, 22, -Math.PI * 0.72, -Math.PI * 0.08);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 16, -Math.PI * 0.68, -Math.PI * 0.12);
  ctx.stroke();
  ctx.restore();
}

/** Thunder puppeteer. */
export function drawThunderPuppeteerGear(
  ctx: CanvasRenderingContext2D,
  en: RenderableEnemy,
  stageTimeSec: number,
  pose: EnemyPose
) {
  // Lôi Tuyến Khôi Lỗi: Mystic Crown + Floating Spinning Golden Lightning Chakram!
  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-pose.headR * 0.5, pose.headCenterY - pose.headR * 0.8);
  ctx.lineTo(0, pose.headCenterY - pose.headR * 1.5);
  ctx.lineTo(pose.headR * 0.5, pose.headCenterY - pose.headR * 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  drawChibiArm(
    ctx,
    pose.torsoW * 0.25,
    pose.torsoTop + 5,
    pose.frontHandX,
    pose.frontHandY,
    '#312e81',
    '#fde047',
    '#facc15',
    pose.legR * 0.9
  );

  // Floating Spinning Golden Lightning Chakram Ring in front of hand
  ctx.save();
  ctx.translate(pose.frontHandX + 12, pose.frontHandY - 4);
  ctx.rotate(stageTimeSec * 15 + en.id);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#fde047';
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.restore();
}
