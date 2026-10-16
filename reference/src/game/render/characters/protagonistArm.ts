import { ElementalStanceId, PlayerCombatState } from '../../rules';
import { INK } from '../palette';
import { drawChibiArm } from './parts';
import { RenderablePlayer } from './types';

/** Values computed by the parent renderer and shared with its branch helpers. */
export interface ProtagonistArmPose {
  breathBob: number;
  activeElem: ElementalStanceId;
  tunicTop: number;
  elemColor: string;
}

// Front sword arm: elemental Kodachi slash or idle guard.

/** Kodachi slash with elemental trail. */
export function drawAttackingSwordArm(
  ctx: CanvasRenderingContext2D,
  player: RenderablePlayer,
  combat: PlayerCombatState,
  stageTimeSec: number,
  armPose: ProtagonistArmPose
) {
  const arcRadius = 46 + combat.skills.kodachiLevel * 6.5;
  ctx.save();
  const localAimAngle = player.facing === 1 ? player.attackAngle : Math.PI - player.attackAngle;
  ctx.translate(6, -24 + armPose.breathBob);
  ctx.rotate(localAimAngle);

  if (armPose.activeElem === 'crimson_fire') {
    // HỎA VIÊM (ĐÁNH RA NGỌN LỬA 🔥 - KHÔNG PHẢI HÌNH CHỮ C!): 5 Roaring Multi-Layered Flame Tongues Erupting Forward!
    for (let f = -2; f <= 2; f++) {
      const ang = f * 0.19;
      const flicker = Math.sin(stageTimeSec * 42 + f * 2.1) * 6;
      const len = arcRadius + 22 - Math.abs(f) * 6 + flicker;
      const halfW = 13 - Math.abs(f) * 1.5;

      ctx.save();
      ctx.rotate(ang);

      // Outer Deep Crimson-Orange Flame Tongue
      ctx.fillStyle = Math.abs(f) % 2 === 0 ? '#dc2626' : '#ea580c';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.quadraticCurveTo(len * 0.38, -halfW * 1.35, len, flicker * 0.35);
      ctx.quadraticCurveTo(len * 0.38, halfW * 1.35, 8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Middle Bright Orange Flame Tongue
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.quadraticCurveTo(len * 0.35, -halfW * 0.85, len * 0.78, flicker * 0.2);
      ctx.quadraticCurveTo(len * 0.35, halfW * 0.85, 10, 0);
      ctx.closePath();
      ctx.fill();

      // Inner Golden-Yellow Flame Core
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.quadraticCurveTo(len * 0.28, -halfW * 0.45, len * 0.52, 0);
      ctx.quadraticCurveTo(len * 0.28, halfW * 0.45, 12, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  } else if (armPose.activeElem === 'thunder_lightning') {
    // LÔI ĐIỆN (ĐÁNH RA NHỮNG TIA SÉT ⚡ - KHÔNG PHẢI HÌNH CHỮ C!): 4 Forked High-Voltage Jagged Lightning Bolts Shooting Forward!
    for (let b = -1.5; b <= 1.5; b += 1) {
      const ang = b * 0.22;
      const boltLen = arcRadius + 28 - Math.abs(b) * 5;
      ctx.save();
      ctx.rotate(ang);

      const j1 = Math.sin(stageTimeSec * 55 + b * 3.1) * 7;
      const j2 = Math.cos(stageTimeSec * 48 + b * 2.4) * 8;
      const pts = [
        { x: 6, y: 0 },
        { x: boltLen * 0.26, y: -9 + j1 },
        { x: boltLen * 0.52, y: 8 - j2 },
        { x: boltLen * 0.78, y: -10 + j2 },
        { x: boltLen, y: j1 * 0.4 },
      ];

      // Dark Outline + Cyan Electric Plasma Glow
      ctx.strokeStyle = INK;
      ctx.lineWidth = 9.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 6.5;
      ctx.stroke();

      // Bright Golden-Yellow Jagged Lightning Bolt
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3.8;
      ctx.stroke();

      // White-Hot Electric Core
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Forked Side Branch
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(pts[2].x, pts[2].y);
      ctx.lineTo(pts[2].x + 14, pts[2].y + (b >= 0 ? 14 : -14));
      ctx.stroke();

      ctx.restore();
    }
  } else {
    // HÀN BĂNG (ĐÁNH RA MŨI BĂNG TINH ❄️ - KHÔNG PHẢI HÌNH CHỮ C!): 5 Sharp Crystalline Ice Spears Shooting Forward!
    for (let c = -2; c <= 2; c++) {
      const ang = c * 0.19;
      const spearLen = arcRadius + 20 - Math.abs(c) * 5;
      ctx.save();
      ctx.rotate(ang);

      ctx.fillStyle = c % 2 === 0 ? '#38bdf8' : '#7dd3fc';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(8, 0);
      ctx.lineTo(spearLen * 0.45, -7.5);
      ctx.lineTo(spearLen, 0);
      ctx.lineTo(spearLen * 0.45, 7.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(spearLen * 0.45, -3);
      ctx.lineTo(spearLen * 0.85, 0);
      ctx.lineTo(spearLen * 0.45, 3);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }
  ctx.restore();
}

/** Sword held at rest. */
export function drawIdleSwordArm(
  ctx: CanvasRenderingContext2D,
  combat: PlayerCombatState,
  stageTimeSec: number,
  armPose: ProtagonistArmPose
) {
  const handX = 10.5;
  const handY = armPose.tunicTop + 13.5;

  drawChibiArm(
    ctx,
    4.5,
    armPose.tunicTop + 5,
    handX,
    handY,
    '#1e3a8a',
    '#334155',
    armPose.elemColor,
    3.8
  );

  // Oversized Chibi Kodachi Sword angled forward so face stays 100% clear
  const bladeLen = 28 + combat.skills.kodachiLevel * 2.2;
  const bladeTipX = handX + bladeLen;
  const bladeTipY = handY - bladeLen * 0.28;

  // Blade Fill + Ink Outline
  ctx.fillStyle =
    armPose.activeElem === 'crimson_fire'
      ? '#fed7aa'
      : armPose.activeElem === 'thunder_lightning'
        ? '#fef08a'
        : '#e0f2fe';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(handX + 3, handY - 3.5);
  ctx.quadraticCurveTo(handX + bladeLen * 0.55, handY - bladeLen * 0.04, bladeTipX, bladeTipY);
  ctx.quadraticCurveTo(handX + bladeLen * 0.45, handY - bladeLen * 0.34, handX + 3, handY + 2.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Elemental Aura along Chibi Blade (Flames for Fire, Zig-Zag Sparks for Lightning, Frost Crystals for Ice)
  if (armPose.activeElem === 'crimson_fire') {
    ctx.fillStyle = '#f97316';
    for (let f = 0; f < 3; f++) {
      const t = 0.28 + f * 0.28;
      const fx = handX + bladeLen * t;
      const fy = handY - bladeLen * 0.2 * t - 3 + Math.sin(stageTimeSec * 22 + f * 2) * 2;
      ctx.beginPath();
      ctx.arc(fx, fy, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (armPose.activeElem === 'thunder_lightning') {
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(handX + 5, handY - 2);
    ctx.lineTo(handX + bladeLen * 0.4, handY - 7);
    ctx.lineTo(handX + bladeLen * 0.65, handY - 2);
    ctx.lineTo(bladeTipX, bladeTipY - 3);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(handX + 6, handY - 1);
    ctx.quadraticCurveTo(
      handX + bladeLen * 0.5,
      handY - bladeLen * 0.14,
      bladeTipX - 3,
      bladeTipY + 1
    );
    ctx.stroke();
  }

  // Chunky Golden Chibi Hilt Guard (Tsuba)
  ctx.fillStyle = '#fde047';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.roundRect(handX + 0.5, handY - 5.5, 4.5, 10.5, 2);
  ctx.fill();
  ctx.stroke();
}
