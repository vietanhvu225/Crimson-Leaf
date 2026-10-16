import { ELEMENTAL_STANCES, type PlayerCombatState, type SeasonId, getGuardianBladeCount } from '../../rules';
import { INK } from '../palette';
import { drawChibiArm, drawChibiCloak, drawChibiEye, drawChibiLeg } from './parts';
import { type ProtagonistArmPose, drawAttackingSwordArm, drawIdleSwordArm } from './protagonistArm';
import {
  drawCrystalLevitation,
  drawEarthDrillAura,
  drawFlyingSwordMount,
  drawIceSkiTrail,
  drawSkyWings,
} from './protagonistMounts';
import type { RenderablePlayer } from './types';

// The player character.

/**
 * Renders the Protagonist ("Võ Hiệp Huyết Ảnh") in 2D Anime Cel-Shaded Chibi Style:
 * 2.2-head Chibi proportions, big expressive anime eyes, spiky cel-shaded hair with glossy band,
 * bouncy Chibi limbs, bold ink outlines, and an oversized Chibi Kodachi blade!
 */
export function renderProtagonist(
  ctx: CanvasRenderingContext2D,
  player: RenderablePlayer,
  combat: PlayerCombatState,
  stageTimeSec: number,
  seasonId: SeasonId = 'spring'
) {
  const elemColor = ELEMENTAL_STANCES[combat.skills.activeElement].color;
  const isAwakened = combat.awakenedTimer > 0;
  const isDashing = combat.dashTimer > 0;
  const isSwimmingStage = seasonId === 'ocean_palace';

  ctx.save();

  // 1. Ground Shadow OR Stage-Specific Mount / Underwater Swim Aura!
  if (isSwimmingStage) {
    // MÀN 9 (THỦY CUNG): Cyan Hydro-Swim Vortex Ring & Trailing Bubbles behind swimming Kage!
    ctx.save();
    ctx.strokeStyle = '#67e8f9';
    ctx.lineWidth = 2.6;
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.ellipse(
      player.x - player.facing * 14,
      player.y - 16,
      24,
      9,
      -player.facing * 0.38,
      0,
      Math.PI * 2
    );
    ctx.stroke();

    for (let b = 0; b < 3; b++) {
      const bx = player.x - player.facing * (20 + b * 12);
      const by = player.y - 10 + Math.sin(stageTimeSec * 9 + b * 1.8) * 6;
      ctx.fillStyle = 'rgba(207, 250, 254, 0.55)';
      ctx.strokeStyle = '#a5f3fc';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(bx, by, 4.5 - b * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  } else if (seasonId === 'sky_sanctuary') {
    // MÀN 11 (CỬU THIÊN KHÔNG CHIẾN): Golden-Azure Wind-Levitation Ring beneath hovering Kage!
    ctx.save();
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 4, 28, 7, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 8, 18, 4.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.fillStyle = 'rgba(9, 13, 22, 0.55)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 1, 22, 6, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // MÀN 8 (THIÊN ĐÀN NGUYỆT THỰC): NGỰ KIẾM PHI TIÊN — Giant Celestial Jade Flying Sword beneath Kage's feet!
  if (seasonId === 'celestial_altar') {
    drawFlyingSwordMount(ctx, player);
  } else if (seasonId === 'winter' && Math.abs(player.vx) > 220) {
    drawIceSkiTrail(ctx, player);
  } else if (seasonId === 'cavern' && !player.onGround) {
    drawCrystalLevitation(ctx, player);
  } else if (seasonId === 'earth_core' && (player.vy > 180 || isDashing)) {
    drawEarthDrillAura(ctx, player);
  } else if (seasonId === 'sky_sanctuary') {
    drawSkyWings(ctx, player, stageTimeSec);
  }

  if (isAwakened || combat.isImmortal) {
    ctx.save();
    ctx.strokeStyle = combat.isImmortal ? '#fde047' : '#fb7185';
    ctx.lineWidth = combat.isImmortal ? 3.0 : 2.4;
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 1, combat.isImmortal ? 32 : 28, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 1B. Chibi Cel-Shaded Golden Immortality Barrier ("Kim Thân Bất Tử")
  if (combat.isImmortal) {
    ctx.save();
    const shieldCenterY = player.y - 30;
    const shieldPulse = 42 + Math.sin(stageTimeSec * 6) * 2.5;

    // Translucent golden sphere fill
    const goldGrad = ctx.createRadialGradient(
      player.x,
      shieldCenterY,
      10,
      player.x,
      shieldCenterY,
      shieldPulse
    );
    goldGrad.addColorStop(0, 'rgba(254, 240, 138, 0.08)');
    goldGrad.addColorStop(0.75, 'rgba(250, 204, 21, 0.24)');
    goldGrad.addColorStop(1, 'rgba(245, 158, 11, 0.48)');
    ctx.fillStyle = goldGrad;
    ctx.beginPath();
    ctx.arc(player.x, shieldCenterY, shieldPulse, 0, Math.PI * 2);
    ctx.fill();

    // Bold ink outer outline + golden cel-shaded ring
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4.6;
    ctx.beginPath();
    ctx.arc(player.x, shieldCenterY, shieldPulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(player.x, shieldCenterY, shieldPulse, 0, Math.PI * 2);
    ctx.stroke();

    // Glossy cartoon highlight arc on top-left of barrier sphere
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(player.x, shieldCenterY, shieldPulse - 5, Math.PI * 1.12, Math.PI * 1.46);
    ctx.stroke();

    // 4 Orbiting Chibi 4-Point Golden Star Sparkles
    for (let s = 0; s < 4; s++) {
      const ang = stageTimeSec * 2.8 + Math.PI * 0.5 * s;
      const sx = player.x + Math.cos(ang) * (shieldPulse + 2);
      const sy = shieldCenterY + Math.sin(ang) * (shieldPulse * 0.72);
      ctx.fillStyle = '#fef08a';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 6);
      ctx.lineTo(sx + 2.2, sy - 2.2);
      ctx.lineTo(sx + 6, sy);
      ctx.lineTo(sx + 2.2, sy + 2.2);
      ctx.lineTo(sx, sy + 6);
      ctx.lineTo(sx - 2.2, sy + 2.2);
      ctx.lineTo(sx - 6, sy);
      ctx.lineTo(sx - 2.2, sy - 2.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // 2. Chibi Dash Afterimage Silhouettes
  if (isDashing || isAwakened) {
    const ghostCount = isDashing ? 3 : 2;
    for (let g = ghostCount; g >= 1; g--) {
      const nodeIdx = Math.min(player.cloakNodes.length - 1, g * 2 - 1);
      const node = player.cloakNodes[nodeIdx];
      if (!node) continue;
      const dist = Math.hypot(node.x - player.x, node.y - player.y);
      if (dist < 8) continue;
      ctx.save();
      ctx.translate(node.x, player.y);
      ctx.scale(player.facing, 1);
      ctx.globalAlpha = (isDashing ? 0.34 : 0.18) / g;
      ctx.fillStyle = isAwakened ? '#f43f5e' : elemColor;
      ctx.beginPath();
      ctx.roundRect(-11, -31, 22, 20, 6);
      ctx.arc(0, -43, 15.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // 3. Plump Cel-Shaded Chibi Cloak
  drawChibiCloak(ctx, player.cloakNodes, player.facing, isAwakened, elemColor, stageTimeSec);

  // 4. Orbiting Chibi Celestial Spirit Blades
  const gCount = getGuardianBladeCount(combat.skills.guardianLevel);
  for (let g = 0; g < gCount; g++) {
    const ang = player.guardianAngle + (Math.PI * 2 * g) / gCount;
    const gx = player.x + Math.cos(ang) * 64;
    const gy = player.y - 28 + Math.sin(ang) * 42;
    ctx.save();
    ctx.translate(gx, gy);
    ctx.rotate(ang + Math.PI * 0.5);

    ctx.fillStyle = '#d8b4fe';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(5, 4);
    ctx.lineTo(0, 9);
    ctx.lineTo(-5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.fillRect(-5, 3, 10, 2.5);
    ctx.restore();
  }

  // 5. Transform into Protagonist Local Space
  ctx.translate(player.x, player.y);
  ctx.scale(player.facing * player.scaleX, player.scaleY);

  // If in Stage 9 (Màn 9: Thủy Cung Đại Chiến), pivot the ENTIRE Chibi character into a sleek 360° Underwater Swimming Posture!
  // If in Stage 11 (Màn 11: Cửu Thiên Không Chiến), bank dynamically in mid-air as Kage flies 360° across the sky!
  const isAerialStage = seasonId === 'sky_sanctuary';
  const swimCycle = stageTimeSec * 11 + player.gaitPhase;
  if (isSwimmingStage) {
    const swimPitch =
      0.56 + Math.max(-0.42, Math.min(0.42, player.vy / 520)) + Math.sin(stageTimeSec * 6.2) * 0.08;
    ctx.translate(0, -24);
    ctx.rotate(swimPitch);
    ctx.translate(0, 24);
  } else if (isAerialStage) {
    const aerialBank =
      0.22 + Math.max(-0.28, Math.min(0.28, player.vy / 680)) + Math.sin(stageTimeSec * 5.4) * 0.06;
    ctx.translate(0, -24);
    ctx.rotate(aerialBank);
    ctx.translate(0, 24);
  }

  const speedRatio = Math.max(-1, Math.min(1, (player.vx * player.facing) / 360));
  const torsoTilt =
    isSwimmingStage || isAerialStage
      ? 0.14
      : player.isAttacking
        ? 0.2
        : player.onGround
          ? speedRatio * 0.14
          : Math.max(-0.14, Math.min(0.18, player.vy / 1200));

  const isRunning = !isSwimmingStage && player.onGround && Math.abs(player.vx) > 18;
  const strideX = isSwimmingStage
    ? Math.sin(swimCycle) * 9.5
    : isRunning
      ? Math.sin(player.gaitPhase) * 8.5
      : 0;
  const legLiftY = isSwimmingStage
    ? Math.cos(swimCycle) * 4.5
    : isRunning
      ? Math.max(0, Math.cos(player.gaitPhase)) * -5.5
      : 0;
  const oppLiftY = isSwimmingStage
    ? -Math.cos(swimCycle) * 4.5
    : isRunning
      ? Math.max(0, -Math.cos(player.gaitPhase)) * -5.5
      : 0;
  const breathBob = isSwimmingStage
    ? Math.sin(stageTimeSec * 5.2) * 2.2
    : player.onGround
      ? isRunning
        ? Math.abs(Math.sin(player.gaitPhase)) * -3.2
        : Math.sin(stageTimeSec * 4.8) * 1.5
      : 0;

  // 6. Stubby Bouncy Chibi Legs (Flutter-Kick Swimming in Ocean Palace vs Running/Jumping on Land)
  const hipY = -12 + breathBob;
  const backFootX = isSwimmingStage ? -7 - strideX : player.onGround ? -5.5 - strideX : -9;
  const backFootY = isSwimmingStage ? 2 + oppLiftY : player.onGround ? -1 + oppLiftY : -5;
  const frontFootX = isSwimmingStage ? 4 + strideX : player.onGround ? 5.5 + strideX : 8;
  const frontFootY = isSwimmingStage ? 2 + legLiftY : player.onGround ? -1 + legLiftY : -7;

  // Back Leg
  drawChibiLeg(ctx, -5, hipY, backFootX, backFootY, '#1e293b', '#0f172a', elemColor, 3.8);

  // Front Leg
  drawChibiLeg(ctx, 5, hipY, frontFootX, frontFootY, '#334155', '#1e293b', elemColor, 4.0);

  // Dynamic Chibi Torso & Big Head Pivot
  ctx.save();
  ctx.translate(0, -14 + breathBob);
  ctx.rotate(torsoTilt);
  ctx.translate(0, 14 - breathBob);

  const tunicTop = -31 + breathBob;
  const tunicW = 23;
  const tunicH = 19;

  // 7. Oversized Chibi Scabbard Across Back & Back Chibi Arm
  ctx.save();
  ctx.rotate(-0.36);
  ctx.fillStyle = '#be123c';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.roundRect(-26, -24, 34, 6, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fde047';
  ctx.fillRect(-25, -23, 4.5, 4);
  ctx.restore();

  drawChibiArm(
    ctx,
    -9,
    tunicTop + 4,
    -13 - strideX * 0.3,
    tunicTop + 14,
    '#1e293b',
    '#334155',
    elemColor,
    3.6
  );

  // 8. Compact Rounded Chibi Martial Tunic, Scarf Collar & Obi Belt
  const isInvulnPulse = player.invulnTimer > 0 && Math.floor(stageTimeSec * 18) % 2 === 0;
  if (isInvulnPulse) {
    ctx.save();
    const invGrad = ctx.createRadialGradient(0, -28 + breathBob, 4, 0, -28 + breathBob, 28);
    invGrad.addColorStop(0, 'rgba(254, 240, 138, 0.55)');
    invGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    ctx.fillStyle = invGrad;
    ctx.beginPath();
    ctx.arc(0, -28 + breathBob, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = '#1e3a8a';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.roundRect(-tunicW * 0.5, tunicTop, tunicW, tunicH, 6);
  ctx.fill();
  ctx.stroke();

  // Crimson V-Neck & Cel-Shaded Lapel Trim
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  ctx.moveTo(-5.5, tunicTop + 1);
  ctx.lineTo(5.5, tunicTop + 1);
  ctx.lineTo(0, tunicTop + 10.5);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = elemColor;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-6, tunicTop + 2);
  ctx.lineTo(4, tunicTop + 13);
  ctx.stroke();

  // Cute Chibi Crimson Obi Sash & Golden Buckle
  ctx.fillStyle = '#e11d48';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.roundRect(-tunicW * 0.52, tunicTop + tunicH - 6.5, tunicW * 1.04, 5.5, 2.5);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(2, tunicTop + tunicH - 3.8, 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // 9. Big Expressive Chibi Head (headR = 16.5px), Anime Eyes, Cute Blush & Spiky Cel-Shaded Hair
  const headY = -45 + breathBob;
  const headR = 16.5;

  // Flowing Dual Chibi Headband Ribbons Behind Head
  const ribbonWave1 = Math.sin(stageTimeSec * 14) * 3.8;
  const ribbonWave2 = Math.cos(stageTimeSec * 12) * 4.2;
  ctx.fillStyle = isAwakened ? '#fb7185' : elemColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-headR * 0.7, headY - 6);
  ctx.quadraticCurveTo(-26, headY - 12 + ribbonWave1 * 0.5, -36, headY - 7 + ribbonWave1);
  ctx.lineTo(-31, headY - 1 + ribbonWave1);
  ctx.quadraticCurveTo(-22, headY - 5, -headR * 0.7, headY - 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#e11d48';
  ctx.beginPath();
  ctx.moveTo(-headR * 0.7, headY - 2);
  ctx.quadraticCurveTo(-22, headY + ribbonWave2 * 0.5, -30, headY + 5 + ribbonWave2);
  ctx.lineTo(-25, headY + 9 + ribbonWave2);
  ctx.quadraticCurveTo(-18, headY + 3, -headR * 0.65, headY + 1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rounded Chibi Face Skin with Bold Ink Outline
  ctx.fillStyle = '#fef3c7';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Soft Rosy Chibi Cheek Blush
  ctx.fillStyle = 'rgba(244, 63, 94, 0.45)';
  ctx.beginPath();
  ctx.ellipse(-1.5, headY + 3.8, 3.8, 2.2, 0, 0, Math.PI * 2);
  ctx.ellipse(12.2, headY + 3.2, 2.8, 1.8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Large Expressive Anime Chibi Eyes (Cleanly framed in bright face area)
  drawChibiEye(ctx, 2.5, headY - 1.2, 3.9, 4.9, isAwakened ? '#f43f5e' : elemColor, 0.22);
  drawChibiEye(ctx, 10.8, headY - 1.4, 2.8, 4.3, isAwakened ? '#f43f5e' : elemColor, -0.18);

  // Cute Chibi Lower Chin Crimson Scarf Collar (Leaves upper face bright & open)
  ctx.fillStyle = '#be123c';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(0, headY, headR * 0.99, 0.38, Math.PI - 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Chunky Cel-Shaded Spiky Anime Hair + High Ponytail
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-headR * 0.98, headY - 4);
  ctx.lineTo(-headR * 1.48, headY - 13 + ribbonWave1 * 0.25);
  ctx.lineTo(-headR * 0.88, headY - 12);
  ctx.lineTo(-headR * 1.28, headY - 22 + ribbonWave1 * 0.2);
  ctx.lineTo(-headR * 0.38, headY - 17);
  ctx.lineTo(0, headY - 25);
  ctx.lineTo(headR * 0.45, headY - 17);
  ctx.lineTo(headR * 1.18, headY - 19);
  ctx.lineTo(headR * 0.98, headY - 9);
  ctx.lineTo(-headR * 0.98, headY - 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glossy Anime Hair Highlight Arc
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, headY - 5, headR * 0.76, Math.PI * 1.2, Math.PI * 1.8);
  ctx.stroke();

  // Chibi Forehead Headband & Oversized Golden Metal Crest
  ctx.fillStyle = elemColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.roundRect(-headR * 0.98, headY - 11.5, headR * 1.96, 4.6, 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.roundRect(2.5, headY - 12.5, 8.8, 6.4, 2);
  ctx.fill();
  ctx.stroke();

  // 10. Front Chibi Sword Arm & Elemental Kodachi Slash (Hỏa Viêm = Roaring Flames, Lôi Điện = Jagged Lightning Bolts, Hàn Băng = Crystalline Ice Spikes!)
  const activeElem = combat.skills.activeElement;
  const armPose: ProtagonistArmPose = { breathBob, activeElem, tunicTop, elemColor };
  if (player.isAttacking) {
    drawAttackingSwordArm(ctx, player, combat, stageTimeSec, armPose);
  } else {
    drawIdleSwordArm(ctx, combat, stageTimeSec, armPose);
  }

  ctx.restore(); // Restore torso tilt
  ctx.restore(); // Restore world transform
}
