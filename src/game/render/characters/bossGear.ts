import type { SeasonId } from '../../rules';
import { INK } from '../palette';
import type { EnemyPose } from './enemyPose';
import { drawChibiArm } from './parts';
import type { RenderableEnemy } from './types';

// Elite guard and stage boss headgear and signature weapons.

/** Elite guards and the 11 stage bosses. */
export function drawBossOrEliteGear(
  ctx: CanvasRenderingContext2D,
  en: RenderableEnemy,
  stageTimeSec: number,
  accentColor: string,
  seasonId: SeasonId = 'spring',
  pose: EnemyPose
) {
  // Elite Guard & 8 Stage-Specific Boss Headgear & Signature Weapons!
  const plumeWave = Math.sin(stageTimeSec * 8 + en.id) * 5;
  ctx.fillStyle = pose.isBoss ? accentColor : '#f43f5e';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, pose.headCenterY - pose.headR * 0.95);
  ctx.quadraticCurveTo(
    -pose.headR * 0.8,
    pose.headCenterY - pose.headR * 1.9,
    -pose.headR * 1.45 + plumeWave,
    pose.headCenterY - pose.headR * 1.25
  );
  ctx.quadraticCurveTo(
    -pose.headR * 0.6,
    pose.headCenterY - pose.headR * 1.2,
    0,
    pose.headCenterY - pose.headR * 0.85
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Crown / Helmet
  ctx.fillStyle = pose.isBoss && seasonId === 'winter' ? '#bae6fd' : '#fde047';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-pose.headR * 0.95, pose.headCenterY - pose.headR * 0.45);
  ctx.lineTo(-pose.headR * 1.25, pose.headCenterY - pose.headR * 1.35);
  ctx.lineTo(-pose.headR * 0.38, pose.headCenterY - pose.headR * 0.78);
  ctx.lineTo(0, pose.headCenterY - pose.headR * 1.55);
  ctx.lineTo(pose.headR * 0.38, pose.headCenterY - pose.headR * 0.78);
  ctx.lineTo(pose.headR * 1.25, pose.headCenterY - pose.headR * 1.35);
  ctx.lineTo(pose.headR * 0.95, pose.headCenterY - pose.headR * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  drawChibiArm(
    ctx,
    pose.torsoW * 0.28,
    pose.torsoTop + 5,
    pose.frontHandX,
    pose.frontHandY,
    '#3b0764',
    '#fde047',
    pose.primaryTrim,
    pose.legR * 0.95
  );

  // Stage-Specific Boss Weapons!
  ctx.save();
  ctx.translate(pose.frontHandX - 2, pose.frontHandY);
  ctx.rotate(pose.swingOffset);

  if (pose.isBoss && (seasonId === 'autumn' || seasonId === 'blood_abyss')) {
    // Boss 3 & Boss 7: Colossal Spiked Kanabo / Molten Anvil War-Hammer!
    ctx.fillStyle = seasonId === 'blood_abyss' ? '#ea580c' : '#374151';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.roundRect(6, -46, 22, 42, 7);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fde047';
    for (const sy of [-38, -26, -14]) {
      ctx.beginPath();
      ctx.arc(28, sy, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (pose.isBoss && seasonId === 'winter') {
    // Boss 4: Giant Translucent Frost-Crystal Scythe!
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(-10, 14);
    ctx.lineTo(16, -38);
    ctx.stroke();
    ctx.strokeStyle = '#bae6fd';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(14, -36);
    ctx.quadraticCurveTo(44, -42, 48, -14);
    ctx.quadraticCurveTo(28, -24, 12, -28);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (pose.isBoss && seasonId === 'ocean_palace') {
    // Boss 9 (Đông Hải Long Vương): Oversized Golden Three-Pronged Sea King Trident (Hải Vương Tam Xoa Kích)!
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-14, 14);
    ctx.lineTo(20, -24);
    ctx.stroke();

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-14, 14);
    ctx.lineTo(20, -24);
    ctx.stroke();

    // Three Golden-Cyan Trident Prongs
    ctx.fillStyle = '#22d3ee';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    // Center prong
    ctx.beginPath();
    ctx.moveTo(18, -24);
    ctx.lineTo(38, -48);
    ctx.lineTo(24, -20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Left & Right prongs
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(12, -22);
    ctx.lineTo(24, -46);
    ctx.lineTo(18, -26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(22, -16);
    ctx.lineTo(44, -34);
    ctx.lineTo(26, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (pose.isBoss && seasonId === 'earth_core') {
    // Boss 10 (Địa Tâm Cổ Long Vương): Colossal Spinning Golden-Amber Tectonic Drill Spear!
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(4, -8);
    ctx.lineTo(44, -42);
    ctx.lineTo(22, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(12, -12);
    ctx.lineTo(28, -22);
    ctx.moveTo(20, -20);
    ctx.lineTo(36, -32);
    ctx.stroke();
  } else if (pose.isBoss && seasonId === 'sky_sanctuary') {
    // Boss 11 (Thiên Bằng Kim Dực Vương): Twin Golden-Azure Garuda Wind-Glaive!
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(6, -12);
    ctx.quadraticCurveTo(34, -46, 48, -32);
    ctx.quadraticCurveTo(28, -18, 12, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.moveTo(2, 6);
    ctx.quadraticCurveTo(-18, 28, -28, 18);
    ctx.quadraticCurveTo(-12, 8, -2, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    // Giant Chibi Crescent Guan Dao / Dual Dragon Blade / Vajra Spear
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-14, 14);
    ctx.lineTo(18, -20);
    ctx.stroke();

    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-14, 14);
    ctx.lineTo(18, -20);
    ctx.stroke();

    ctx.fillStyle = pose.isBoss ? accentColor : '#fef08a';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(15, -18);
    ctx.quadraticCurveTo(36, -24, 40, -48);
    ctx.quadraticCurveTo(20, -40, 12, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

/** Values computed by the parent renderer and shared with its branch helpers. */
export interface EnemyCapePose {
  isBoss: boolean;
  torsoW: number;
  torsoH: number;
  torsoOffsetY: number;
  primaryTrim: string;
}

/** Back layer for bosses and elites: dharma halo and cape. */
export function drawBossHaloAndCape(
  ctx: CanvasRenderingContext2D,
  en: RenderableEnemy,
  stageTimeSec: number,
  seasonId: SeasonId = 'spring',
  capePose: EnemyCapePose
) {
  const wheelR = capePose.isBoss ? 44 : 31;
  ctx.save();
  const capeWave = Math.sin(stageTimeSec * 7 + en.id) * 5;
  ctx.fillStyle = capePose.isBoss ? '#9f1239' : '#6b21a8';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-capePose.torsoW * 0.35, -12 - capePose.torsoH + capePose.torsoOffsetY);
  ctx.quadraticCurveTo(
    -capePose.torsoW * 1.15 + capeWave * 0.5,
    -10 - capePose.torsoH * 0.5,
    -capePose.torsoW * 0.95 + capeWave,
    -3
  );
  ctx.lineTo(-capePose.torsoW * 0.15, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.translate(0, -14 - capePose.torsoH * 0.75 + capePose.torsoOffsetY);

  if (capePose.isBoss && seasonId === 'thunder_peak') {
    // Boss 6 (Lôi Điện Pháp Vương): Ring of 8 Raijin Taiko Thunder Drums behind back!
    ctx.rotate(stageTimeSec * 1.8);
    for (let d = 0; d < 8; d++) {
      const ang = (Math.PI * 2 * d) / 8;
      const dx = Math.cos(ang) * wheelR;
      const dy = Math.sin(ang) * wheelR;
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(dx, dy, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#dc2626';
      ctx.beginPath();
      ctx.arc(dx, dy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (capePose.isBoss && seasonId === 'cavern') {
    // Boss 5 (Vạn Độc Minh Vương): 4 Giant Scorpion/Centipede Bone Legs sprouting from back!
    for (const side of [-1, 1]) {
      for (const tier of [0, 1]) {
        const wag = Math.sin(stageTimeSec * 8 + tier) * 6;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, tier * 8);
        ctx.lineTo(side * 34, -18 + tier * 18 + wag);
        ctx.lineTo(side * 52, -4 + tier * 22 + wag);
        ctx.stroke();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
  } else if (capePose.isBoss && seasonId === 'celestial_altar') {
    // Boss 8 (Huyết Y Thái Thượng Giáo Chủ): 6 Floating Celestial Swords (Lục Kiếm Quy Tông) fanning behind back!
    for (let k = 0; k < 6; k++) {
      const ang = -Math.PI * 0.85 + (k * Math.PI * 0.7) / 5 + Math.sin(stageTimeSec * 4 + k) * 0.08;
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = k % 2 === 0 ? '#f43f5e' : '#fde047';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(22, -3);
      ctx.lineTo(56, 0);
      ctx.lineTo(22, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else if (capePose.isBoss && seasonId === 'ocean_palace') {
    // Boss 9 (Đông Hải Long Vương): Rotating Abyssal Whirlpool & 6 Glowing Sea-Dragon Pearls (Định Hải Thần Châu)!
    ctx.rotate(stageTimeSec * 2.1);
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
    ctx.stroke();
    for (let p = 0; p < 6; p++) {
      const ang = (Math.PI * 2 * p) / 6;
      const px = Math.cos(ang) * wheelR;
      const py = Math.sin(ang) * wheelR;
      ctx.fillStyle = p % 2 === 0 ? '#67e8f9' : '#fde047';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(px, py, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  } else if (capePose.isBoss && seasonId === 'earth_core') {
    // Boss 10 (Địa Tâm Cổ Long Vương): Rotating Tectonic Golden-Amber Geode Gear Halo!
    ctx.rotate(stageTimeSec * 1.9);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
    ctx.stroke();
    for (let g = 0; g < 8; g++) {
      const ang = (Math.PI * 2 * g) / 8;
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = g % 2 === 0 ? '#fde047' : '#d97706';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-6, -wheelR + 4);
      ctx.lineTo(0, -wheelR - 14);
      ctx.lineTo(6, -wheelR + 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else if (capePose.isBoss && seasonId === 'sky_sanctuary') {
    // Boss 11 (Thiên Bằng Kim Dực Vương): 8 Radiant Golden Garuda Feather-Blades & Wind Ring!
    ctx.rotate(stageTimeSec * 2.4);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
    ctx.stroke();
    for (let f = 0; f < 8; f++) {
      const ang = (Math.PI * 2 * f) / 8;
      ctx.save();
      ctx.rotate(ang);
      ctx.fillStyle = f % 2 === 0 ? '#fde047' : '#38bdf8';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-4, -wheelR + 2);
      ctx.lineTo(0, -wheelR - 16);
      ctx.lineTo(4, -wheelR + 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  } else {
    // Rotating Cel-Shaded Dharma / Elemental Wheel
    ctx.rotate(stageTimeSec * 1.6);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5.2;
    ctx.beginPath();
    ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = capePose.primaryTrim;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, 0, wheelR, 0, Math.PI * 2);
    ctx.stroke();

    for (let s = 0; s < 8; s++) {
      const ang = (Math.PI * 2 * s) / 8;
      ctx.fillStyle = capePose.primaryTrim;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(Math.cos(ang) * wheelR, Math.sin(ang) * wheelR, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }
  ctx.restore();
}
