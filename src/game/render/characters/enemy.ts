import type { EnemyArchetype, PlayerCombatState, SeasonId } from '../../rules';
import { INK } from '../palette';
import { type EnemyCapePose, drawBossHaloAndCape, drawBossOrEliteGear } from './bossGear';
import {
  drawBlueKiterGear,
  drawBombAlchemistGear,
  drawChainKusarigamaGear,
  drawClawAssassinGear,
  drawFireMonkGear,
  drawRedAmbusherGear,
  drawTessenGaleGear,
  drawThunderPuppeteerGear,
} from './enemyGear';
import type { EnemyPose } from './enemyPose';
import { drawChibiArm, drawChibiEye, drawChibiLeg } from './parts';
import type { RenderableEnemy } from './types';

// Enemies, elite sub-bosses and stage bosses.

/**
 * Renders an Enemy Bot in 2D Anime Cel-Shaded Chibi Style (2.2-head ratio, big expressive head & anime eyes, bold ink outlines, oversized Chibi weapons)
 */
export function renderEnemyBot(
  ctx: CanvasRenderingContext2D,
  en: RenderableEnemy,
  combat: PlayerCombatState,
  stageTimeSec: number,
  accentColor: string,
  seasonId: SeasonId = 'spring'
) {
  ctx.save();
  const isDifferentLane = en.zLane !== combat.zLane;
  const ambushScale = en.ambushEntryTimer > 0 ? 0.75 : isDifferentLane ? 0.78 : 1;

  const isBoss = en.archetype === 'boss';
  const isElite = en.archetype === 'elite_guard';

  const totalH = isBoss ? 82 : isElite ? 70 : 58;
  const torsoW = isBoss ? 34 : isElite ? 28 : 22;
  const torsoH = isBoss ? 25 : isElite ? 21 : 17;
  const headR = isBoss ? 21 : isElite ? 17.5 : 15;

  // 1. Ground Shadow OR Underwater Swim-Vortex Ring
  if (en.koTimer <= 0) {
    if (seasonId === 'ocean_palace') {
      // Underwater Hydro-Ring & Rising Bubble Wake around swimming enemies!
      ctx.save();
      ctx.strokeStyle = '#67e8f9';
      ctx.lineWidth = 2.0;
      ctx.globalAlpha = 0.55;
      ctx.beginPath();
      ctx.ellipse(
        en.x - en.facing * 12,
        en.y - 18,
        18 * ambushScale,
        8 * ambushScale,
        -en.facing * 0.35,
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.fillStyle = '#cffafe';
      ctx.beginPath();
      ctx.arc(
        en.x - en.facing * 24,
        en.y - 12 + Math.sin(stageTimeSec * 8 + en.id) * 5,
        3.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
    } else if (en.onGround ?? true) {
      const shadowW = (isBoss ? 36 : isElite ? 28 : 21) * ambushScale;
      ctx.fillStyle = 'rgba(9, 13, 22, 0.55)';
      ctx.beginPath();
      ctx.ellipse(en.x, en.y + 1, shadowW, 6 * ambushScale, 0, 0, Math.PI * 2);
      ctx.fill();

      if (isBoss || isElite) {
        ctx.save();
        ctx.strokeStyle = isElite ? '#fde047' : accentColor;
        ctx.lineWidth = 2.0;
        ctx.globalAlpha = 0.65 + Math.sin(stageTimeSec * 5 + en.id) * 0.2;
        ctx.beginPath();
        ctx.ellipse(en.x, en.y + 1, shadowW * 1.15, 7 * ambushScale, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  ctx.translate(en.x, en.y);
  if (en.koTimer > 0) {
    ctx.rotate((1 - en.koTimer / 0.4) * en.facing * 1.45);
    ctx.globalAlpha = Math.max(0, en.koTimer / 0.4);
  } else if (isDifferentLane || en.ambushEntryTimer > 0) {
    ctx.globalAlpha = 0.55;
  }
  ctx.scale(en.facing * ambushScale, ambushScale);

  // UNDERWATER SWIMMING POSTURE for Stage 9 (Màn 9) & AERIAL LEVITATION WINGS for Stage 11 (Màn 11)!
  if (seasonId === 'ocean_palace' && en.koTimer <= 0) {
    const swimPitch = isBoss
      ? 0.22 + Math.sin(stageTimeSec * 3.8 + en.id) * 0.06
      : 0.52 +
        Math.sin(stageTimeSec * 5.8 + en.id) * 0.1 +
        Math.max(-0.28, Math.min(0.28, en.vy / 500));
    ctx.translate(0, -totalH * 0.45);
    ctx.rotate(swimPitch);
    ctx.translate(0, totalH * 0.45);
  } else if (seasonId === 'sky_sanctuary' && en.koTimer <= 0) {
    // Flapping Celestial Wind-Wings behind every aerial enemy in Stage 11!
    const wingFlap = Math.sin(stageTimeSec * 14 + en.id * 1.3) * 10;
    ctx.save();
    ctx.translate(0, -totalH * 0.52);
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.fillStyle = isBoss ? '#fde047' : '#bae6fd';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(4, 0);
      ctx.quadraticCurveTo(22, -18 + wingFlap, 34, -8 + wingFlap);
      ctx.quadraticCurveTo(20, 8, 4, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  // Legend of Kage Somersault Spin & Wind-Slash Ring when leaping / dropping from canopy
  const kageSpin = en.kageSpinTimer ?? 0;
  const isAirborneKage =
    seasonId !== 'ocean_palace' &&
    seasonId !== 'sky_sanctuary' &&
    !isBoss &&
    !isElite &&
    (kageSpin > 0 || (!(en.onGround ?? true) && Math.abs(en.vy) > 95));
  if (isAirborneKage) {
    const spinColor =
      en.archetype === 'blue_kiter'
        ? '#38bdf8'
        : en.archetype === 'fire_monk'
          ? '#fbbf24'
          : '#fb7185';
    ctx.save();
    ctx.translate(0, -totalH * 0.5);
    ctx.rotate(stageTimeSec * 16 + en.id);

    // Cel-shaded wind-slash somersault ring
    for (let w = 0; w < 3; w++) {
      ctx.rotate((Math.PI * 2) / 3);
      ctx.strokeStyle = INK;
      ctx.lineWidth = 5.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(0, 0, 29, -0.45, 0.75);
      ctx.stroke();

      ctx.strokeStyle = spinColor;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(0, 0, 29, -0.45, 0.75);
      ctx.stroke();
    }
    ctx.restore();

    // Rotate the Chibi ninja body in a true Legend of Kage somersault flip during active spin!
    if (kageSpin > 0) {
      ctx.translate(0, -totalH * 0.5);
      ctx.rotate(stageTimeSec * 15 + en.id);
      ctx.translate(0, totalH * 0.5);
    }
  }

  // Chibi Ninja Smoke Bomb Puff & Ambush Ring
  if (en.ambushEntryTimer > 0) {
    ctx.save();
    ctx.strokeStyle = '#fb7185';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -totalH * 0.5, 24 + en.ambushEntryTimer * 28, 0, Math.PI * 2);
    ctx.stroke();

    for (let p = 0; p < 4; p++) {
      const ang = stageTimeSec * 5 + (p * Math.PI) / 2;
      const puffDist = (1 - en.ambushEntryTimer) * 22 + 8;
      const px = Math.cos(ang) * puffDist;
      const py = -totalH * 0.5 + Math.sin(ang) * puffDist * 0.7;
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(px, py, 9.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Windup Attack Telegraph Exclamation & Halo
  if (en.windupTimer > 0) {
    ctx.save();
    const pulseR = 24 + en.windupTimer * 24;
    const warnGrad = ctx.createRadialGradient(0, -totalH * 0.5, 4, 0, -totalH * 0.5, pulseR);
    warnGrad.addColorStop(0, 'rgba(251, 191, 36, 0.45)');
    warnGrad.addColorStop(0.7, 'rgba(244, 63, 94, 0.25)');
    warnGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = warnGrad;
    ctx.beginPath();
    ctx.arc(0, -totalH * 0.5, pulseR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const isFlashing = en.hitFlashTimer > 0;
  const isMoving = seasonId === 'ocean_palace' || Math.abs(en.vx) > 8;
  const walkCycle = isMoving
    ? stageTimeSec * (isBoss ? 8 : 12) + en.id * 1.9
    : stageTimeSec * 3.2 + en.id;
  const stride =
    seasonId === 'ocean_palace'
      ? Math.sin(walkCycle) * 9.0
      : isMoving
        ? Math.sin(walkCycle) * 7.5
        : Math.sin(walkCycle) * 0.8;
  const legLift = isMoving ? Math.max(0, Math.cos(walkCycle)) * -5.0 : 0;
  const oppLift = isMoving ? Math.max(0, -Math.cos(walkCycle)) * -5.0 : 0;
  const bodyBob = isMoving ? Math.abs(Math.cos(walkCycle)) * -3.2 : Math.sin(walkCycle) * 1.5;
  const windupCrouch = en.windupTimer > 0 ? 3.5 : 0;
  const torsoOffsetY = bodyBob + windupCrouch;

  const primaryTrim = isBoss
    ? accentColor
    : isElite
      ? '#fde047'
      : en.archetype === 'blue_kiter'
        ? '#38bdf8'
        : en.archetype === 'fire_monk'
          ? '#fbbf24'
          : en.archetype === 'bomb_alchemist'
            ? '#fb923c'
            : en.archetype === 'chain_kusarigama'
              ? '#c084fc'
              : en.archetype === 'claw_assassin'
                ? '#22d3ee'
                : en.archetype === 'tessen_gale'
                  ? '#34d399'
                  : en.archetype === 'thunder_puppeteer'
                    ? '#facc15'
                    : '#fb7185';

  // 2. Back Layer: Chibi Boss/Elite Dharma Halo & Cape, or Chibi Scarf / Bomb Gourd
  const capePose: EnemyCapePose = { isBoss, torsoW, torsoH, torsoOffsetY, primaryTrim };
  if (isBoss || isElite) {
    drawBossHaloAndCape(ctx, en, stageTimeSec, seasonId, capePose);
  } else if (en.archetype === 'bomb_alchemist') {
    // Giant Chibi Black-Iron Gunpowder Gourd strapped on back
    ctx.save();
    ctx.fillStyle = '#334155';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(-torsoW * 0.55, -14 - torsoH * 0.4 + torsoOffsetY, 10, 0, Math.PI * 2);
    ctx.arc(-torsoW * 0.65, -24 - torsoH * 0.4 + torsoOffsetY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  } else if (en.archetype !== 'fire_monk') {
    // Chunky Chibi Scarf fluttering behind neck
    ctx.save();
    const scarfWave = Math.sin(stageTimeSec * 11 + en.id) * 4.5;
    ctx.fillStyle = primaryTrim;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -12 - torsoH + torsoOffsetY);
    ctx.quadraticCurveTo(-22, -16 - torsoH + scarfWave * 0.5, -30, -8 - torsoH + scarfWave);
    ctx.lineTo(-24, -2 - torsoH + scarfWave);
    ctx.quadraticCurveTo(-15, -7 - torsoH, -5, -8 - torsoH + torsoOffsetY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 3. Stubby Bouncy Chibi Legs
  const hipY = -12 + torsoOffsetY;
  const legR = isBoss ? 4.8 : isElite ? 4.2 : 3.6;

  // Back Chibi Leg
  drawChibiLeg(
    ctx,
    -torsoW * 0.22,
    hipY,
    -torsoW * 0.25 - stride,
    -1 + oppLift,
    '#1e293b',
    '#0f172a',
    primaryTrim,
    legR
  );

  // Front Chibi Leg
  drawChibiLeg(
    ctx,
    torsoW * 0.22,
    hipY,
    torsoW * 0.25 + stride,
    -1 + legLift,
    '#334155',
    '#1e293b',
    primaryTrim,
    legR
  );

  const torsoTop = -11 - torsoH + torsoOffsetY;

  // 4. Back Chibi Arm
  drawChibiArm(
    ctx,
    -torsoW * 0.38,
    torsoTop + 4,
    -torsoW * 0.55 - stride * 0.35,
    torsoTop + torsoH * 0.72,
    '#1e293b',
    '#334155',
    primaryTrim,
    legR * 0.88
  );

  // 5. Rounded Cel-Shaded Chibi Torso & Cute Obi Belt
  const tunicColor = isFlashing
    ? '#ffffff'
    : en.chillTimer > 0
      ? '#38bdf8'
      : isBoss
        ? seasonId === 'summer'
          ? '#0369a1'
          : seasonId === 'autumn'
            ? '#431407'
            : seasonId === 'winter'
              ? '#0284c7'
              : seasonId === 'cavern'
                ? '#581c87'
                : seasonId === 'thunder_peak'
                  ? '#1e1b4b'
                  : seasonId === 'blood_abyss'
                    ? '#7f1d1d'
                    : seasonId === 'ocean_palace'
                      ? '#0e7490'
                      : seasonId === 'earth_core'
                        ? '#78350f'
                        : seasonId === 'sky_sanctuary'
                          ? '#0284c7'
                          : '#881337'
        : en.archetype === 'blue_kiter'
          ? '#1d4ed8'
          : en.archetype === 'red_ambusher'
            ? '#be123c'
            : en.archetype === 'fire_monk'
              ? '#d97706'
              : en.archetype === 'bomb_alchemist'
                ? '#9a3412'
                : en.archetype === 'chain_kusarigama'
                  ? '#581c87'
                  : en.archetype === 'claw_assassin'
                    ? '#0f766e'
                    : en.archetype === 'tessen_gale'
                      ? '#065f46'
                      : en.archetype === 'thunder_puppeteer'
                        ? '#312e81'
                        : isElite
                          ? '#6b21a8'
                          : '#881337';

  ctx.fillStyle = tunicColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.roundRect(-torsoW * 0.5, torsoTop, torsoW, torsoH, 6);
  ctx.fill();
  ctx.stroke();

  if (!isFlashing) {
    // Cel-shaded kimono cross-lapel
    ctx.strokeStyle = primaryTrim;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-torsoW * 0.28, torsoTop + 2);
    ctx.lineTo(torsoW * 0.15, torsoTop + torsoH - 4);
    ctx.stroke();

    // Cute Chibi Obi Sash & Round Buckle
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-torsoW * 0.48, torsoTop + torsoH - 6, torsoW * 0.96, 4.5);
    ctx.fillStyle = primaryTrim;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, torsoTop + torsoH - 3.8, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Rounded Chibi Shoulder Pauldrons on Elite & Boss
    if (isElite || isBoss) {
      ctx.fillStyle = primaryTrim;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(-torsoW * 0.52, torsoTop + 4, 6, 4, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(torsoW * 0.52, torsoTop + 4, 6, 4, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // 6. Big Expressive Chibi Head, Cute Blush, Anime Eyes & Archetype Headgear
  const headCenterY = torsoTop - headR * 0.72;

  // Chibi Rounded Head Base (Warm skin for humanoids, lavender/crimson tint for demon boss)
  const skinColor = isFlashing
    ? '#ffffff'
    : isBoss
      ? '#fecdd3'
      : en.archetype === 'red_ambusher'
        ? '#ffe4e6'
        : '#fde68a';

  ctx.fillStyle = skinColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(0, headCenterY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (!isFlashing) {
    // Cute Chibi Pink Cheek Blush
    ctx.fillStyle = 'rgba(244, 63, 94, 0.38)';
    ctx.beginPath();
    ctx.ellipse(headR * 0.25, headCenterY + 3.5, 3.8, 2.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Large Expressive Chibi Anime Eye (Front-facing side profile)
    drawChibiEye(
      ctx,
      headR * 0.34,
      headCenterY - 0.5,
      headR * 0.26,
      headR * 0.32,
      primaryTrim,
      0.28
    );

    // Chibi Mouth / Half-Mask / Cute Oni Fang
    if (en.archetype === 'blue_kiter') {
      // Cute Chibi Ninja Lower Mask
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.arc(0, headCenterY, headR * 0.98, 0.18, Math.PI - 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (en.archetype === 'red_ambusher' || isBoss) {
      // Fierce Chibi Grin + Cute White Oni Fang
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(headR * 0.12, headCenterY + 5.5);
      ctx.quadraticCurveTo(headR * 0.35, headCenterY + 4, headR * 0.58, headCenterY + 5.5);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(headR * 0.28, headCenterY + 5);
      ctx.lineTo(headR * 0.38, headCenterY + 9);
      ctx.lineTo(headR * 0.48, headCenterY + 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // Determined Chibi mouth line
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(headR * 0.2, headCenterY + 5.5);
      ctx.lineTo(headR * 0.48, headCenterY + 5.0);
      ctx.stroke();
    }
  }

  // 7. Archetype Chibi Hair / Hats & Oversized Chibi Weapons
  const swingOffset = en.windupTimer > 0 ? -0.55 : Math.sin(walkCycle) * 0.16;
  const frontHandX = torsoW * 0.46;
  const frontHandY = torsoTop + torsoH * 0.55 + swingOffset * 8;

  const pose: EnemyPose = {
    headCenterY,
    headR,
    torsoW,
    torsoTop,
    frontHandX,
    frontHandY,
    legR,
    swingOffset,
    totalH,
    isBoss,
    primaryTrim,
  };
  if (en.archetype === 'blue_kiter') {
    drawBlueKiterGear(ctx, en, stageTimeSec, pose);
  } else if (en.archetype === 'red_ambusher') {
    drawRedAmbusherGear(ctx, pose);
  } else if (en.archetype === 'fire_monk') {
    drawFireMonkGear(ctx, stageTimeSec, pose);
  } else if (en.archetype === 'bomb_alchemist') {
    drawBombAlchemistGear(ctx, stageTimeSec, pose);
  } else if (en.archetype === 'chain_kusarigama') {
    drawChainKusarigamaGear(ctx, en, stageTimeSec, pose);
  } else if (en.archetype === 'claw_assassin') {
    drawClawAssassinGear(ctx, pose);
  } else if (en.archetype === 'tessen_gale') {
    drawTessenGaleGear(ctx, pose);
  } else if (en.archetype === 'thunder_puppeteer') {
    drawThunderPuppeteerGear(ctx, en, stageTimeSec, pose);
  } else {
    drawBossOrEliteGear(ctx, en, stageTimeSec, accentColor, seasonId, pose);
  }

  // 8. Elemental Debuff Overlays (Hỏa Viêm Flames / Hàn Băng Ice Prison / Lôi Điện Stun Lightning)
  if (en.burnTimer > 0) {
    ctx.save();
    for (let f = 0; f < 3; f++) {
      const fx = (f - 1) * 9 + Math.sin(stageTimeSec * 14 + f) * 3;
      const fy = -totalH * 0.4 - f * 7;
      ctx.fillStyle = f % 2 === 0 ? '#f97316' : '#fde047';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(fx, fy, 4.5, 0, Math.PI);
      ctx.lineTo(fx, fy - 9);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  if ((en.freezeTimer ?? 0) > 0) {
    // HÀN BĂNG ĐÓNG BĂNG: Translucent Faceted Chibi Ice Block encasing the frozen enemy!
    ctx.save();
    ctx.fillStyle = 'rgba(56, 189, 248, 0.46)';
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(-torsoW * 0.85, 2);
    ctx.lineTo(-torsoW * 0.95, -totalH * 0.72);
    ctx.lineTo(0, -totalH - 14);
    ctx.lineTo(torsoW * 0.95, -totalH * 0.72);
    ctx.lineTo(torsoW * 0.85, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Specular Ice Facet Shine
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.moveTo(-torsoW * 0.55, -10);
    ctx.lineTo(-4, -totalH + 2);
    ctx.lineTo(4, -totalH + 8);
    ctx.lineTo(-torsoW * 0.25, -8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  if ((en.stunTimer ?? 0) > 0) {
    // LÔI ĐIỆN CHOÁNG TÊ LIỆT: Orbiting Golden Lightning Stars & Crackling Electric Arcs!
    ctx.save();
    for (let s = 0; s < 3; s++) {
      const ang = stageTimeSec * 9 + (s * Math.PI * 2) / 3;
      const sx = Math.cos(ang) * (headR * 1.15);
      const sy = -totalH - 6 + Math.sin(ang) * 4.5;
      ctx.fillStyle = s % 2 === 0 ? '#fde047' : '#38bdf8';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(sx, sy, 4.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-12, -totalH * 0.65);
    ctx.lineTo(6, -totalH * 0.5);
    ctx.lineTo(-4, -totalH * 0.35);
    ctx.lineTo(12, -totalH * 0.2);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();

  // 9. Overhead Chibi Health Bar & Archetype Role Tag
  if (en.hp > 0) {
    ctx.save();
    const barW = isBoss ? 88 : isElite ? 64 : 46;
    const barH = isBoss || isElite ? 7 : 5.5;
    const barX = en.x - barW * 0.5;
    const barY = en.y - totalH - 22;

    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.roundRect(barX - 2, barY - 2, barW + 4, barH + 4, 4);
    ctx.fill();

    const hpRatio = Math.max(0, Math.min(1, en.hp / en.maxHp));
    ctx.fillStyle = isElite ? '#fde047' : en.zLane === combat.zLane ? primaryTrim : '#94a3b8';
    if (hpRatio > 0) {
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * hpRatio, barH, 2.5);
      ctx.fill();
    }

    const archetypeLabel: Record<EnemyArchetype, string> = {
      blue_kiter: 'LAM ẢNH TIÊU',
      red_ambusher: 'HUYẾT ĐAO QUỶ',
      fire_monk: 'HỎA THIỀN SƯ',
      bomb_alchemist: 'BỘC PHÁ SƯ',
      chain_kusarigama: 'XÍCH LIÊM NHẪN',
      claw_assassin: 'THIẾT TRẢO HỒ',
      tessen_gale: 'THIẾT PHIẾN CƠ',
      thunder_puppeteer: 'LÔI KHÔI LỖI',
      elite_guard: 'HỘ PHÁP TINH ANH',
      boss: 'BÁ CHỦ TRẤN ẢI',
    };

    ctx.font = 'bold 9px "Be Vietnam Pro", "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    const isFrozen = (en.freezeTimer ?? 0) > 0;
    const isStunned = (en.stunTimer ?? 0) > 0;
    const statusSuffix = isFrozen
      ? ' · [ĐÓNG BĂNG]'
      : isStunned
        ? ' · [CHOÁNG SÉT]'
        : en.burnTimer > 0
          ? ' · [BỐC CHÁY]'
          : !isBoss && (en.gatesCleared ?? 0) > 0
            ? ` ★Ải ${en.gatesCleared}`
            : '';
    ctx.fillStyle = isFrozen
      ? '#7dd3fc'
      : isStunned
        ? '#fde047'
        : isBoss
          ? '#fda4af'
          : isElite
            ? '#fde047'
            : '#e2e8f0';
    ctx.fillText(`${archetypeLabel[en.archetype]}${statusSuffix}`, en.x, barY - 5);
    ctx.restore();
  }
}
