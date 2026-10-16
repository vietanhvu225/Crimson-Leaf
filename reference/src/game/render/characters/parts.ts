import { INK } from '../palette';

// Reusable chibi body parts: legs, arms, eyes, cloak.

/**
 * Draws a cute, bouncy Chibi leg & rounded boot with cel-shaded fill and bold ink outline
 */
export function drawChibiLeg(
  ctx: CanvasRenderingContext2D,
  hipX: number,
  hipY: number,
  footX: number,
  footY: number,
  pantsColor: string,
  bootColor: string,
  trimColor: string,
  legRadius: number
) {
  ctx.save();
  // Chibi stubby leg capsule
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Outer black ink stroke
  ctx.strokeStyle = INK;
  ctx.lineWidth = legRadius * 2 + 3.2;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(footX, footY - 2);
  ctx.stroke();

  // Inner cel-shaded pants fill
  ctx.strokeStyle = pantsColor;
  ctx.lineWidth = legRadius * 2 - 0.6;
  ctx.beginPath();
  ctx.moveTo(hipX, hipY);
  ctx.lineTo(footX, footY - 2);
  ctx.stroke();

  // Cute Chibi rounded boot
  const bootW = legRadius * 1.65;
  const bootH = legRadius * 1.15;
  ctx.fillStyle = bootColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.ellipse(footX + 2.2, footY - 1, bootW, bootH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Boot ankle trim band
  ctx.strokeStyle = trimColor;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(footX - legRadius * 0.7, footY - bootH * 0.75);
  ctx.lineTo(footX + legRadius * 0.9, footY - bootH * 0.75);
  ctx.stroke();

  // Glossy toe highlight dot
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.75;
  ctx.beginPath();
  ctx.arc(footX + bootW * 0.45, footY - bootH * 0.25, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Draws a cute Chibi arm with a chunky gauntlet and round Chibi fist
 */
export function drawChibiArm(
  ctx: CanvasRenderingContext2D,
  shoulderX: number,
  shoulderY: number,
  handX: number,
  handY: number,
  sleeveColor: string,
  gauntletColor: string,
  trimColor: string,
  armRadius: number,
  skinColor = '#fde68a'
) {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Ink outline for arm
  ctx.strokeStyle = INK;
  ctx.lineWidth = armRadius * 2 + 3.2;
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  // Sleeve base
  ctx.strokeStyle = sleeveColor;
  ctx.lineWidth = armRadius * 2 - 0.6;
  ctx.beginPath();
  ctx.moveTo(shoulderX, shoulderY);
  ctx.lineTo((shoulderX + handX) * 0.5, (shoulderY + handY) * 0.5);
  ctx.stroke();

  // Forearm Chibi Gauntlet
  ctx.strokeStyle = gauntletColor;
  ctx.lineWidth = armRadius * 2 - 0.4;
  ctx.beginPath();
  ctx.moveTo((shoulderX + handX) * 0.5, (shoulderY + handY) * 0.5);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  // Gauntlet cuff trim
  ctx.strokeStyle = trimColor;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo((shoulderX + handX) * 0.5 - 1, (shoulderY + handY) * 0.5 - 2);
  ctx.lineTo((shoulderX + handX) * 0.5 + 1, (shoulderY + handY) * 0.5 + 2);
  ctx.stroke();

  // Round Chibi Hand / Fist with bold ink outline
  ctx.fillStyle = skinColor;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(handX, handY, armRadius * 0.95, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Draws a large, expressive Anime/Chibi eye with thick eyelashes, iris gradient, and dual specular catchlights
 */
export function drawChibiEye(
  ctx: CanvasRenderingContext2D,
  eyeX: number,
  eyeY: number,
  eyeW: number,
  eyeH: number,
  irisColor: string,
  browTilt = 0.22
) {
  ctx.save();

  // White sclera base
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(eyeX, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Vibrant Chibi Iris
  ctx.fillStyle = irisColor;
  ctx.beginPath();
  ctx.ellipse(eyeX + 0.6, eyeY + 0.3, eyeW * 0.78, eyeH * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();

  // Deep upper pupil shade
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(eyeX + 0.7, eyeY - eyeH * 0.1, eyeW * 0.52, eyeH * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();

  // Large top-left Anime Catchlight (Sparkle 1)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(eyeX - eyeW * 0.25, eyeY - eyeH * 0.32, eyeW * 0.38, 0, Math.PI * 2);
  ctx.fill();

  // Small bottom-right Catchlight (Sparkle 2)
  ctx.beginPath();
  ctx.arc(eyeX + eyeW * 0.32, eyeY + eyeH * 0.35, eyeW * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Bold Upper Eyelash Line
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(eyeX - eyeW * 1.15, eyeY - eyeH * 0.45);
  ctx.quadraticCurveTo(eyeX, eyeY - eyeH * 1.15, eyeX + eyeW * 1.15, eyeY - eyeH * 0.55);
  ctx.stroke();

  // Expressive Heroic/Fierce Eyebrow
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(eyeX - eyeW * 1.2, eyeY - eyeH * 1.35 - browTilt * 4);
  ctx.lineTo(eyeX + eyeW * 1.1, eyeY - eyeH * 1.1 + browTilt * 3);
  ctx.stroke();

  ctx.restore();
}

/**
 * Draws a plump, billowing cel-shaded Chibi cape with a bold ink outline
 */
export function drawChibiCloak(
  ctx: CanvasRenderingContext2D,
  nodes: { x: number; y: number }[],
  facing: 1 | -1,
  isAwakened: boolean,
  elemColor: string,
  stageTimeSec: number
) {
  if (nodes.length < 2) return;
  ctx.save();

  const topPoints: { x: number; y: number }[] = [];
  const bottomPoints: { x: number; y: number }[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const t = i / (nodes.length - 1);
    const cur = nodes[i];
    const next = nodes[Math.min(nodes.length - 1, i + 1)];
    const prev = nodes[Math.max(0, i - 1)];
    const dx = next.x - prev.x || -facing;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    // Rounded chibi cape profile
    const halfWidth = (isAwakened ? 1.25 : 1.0) * (5 + Math.sin(t * Math.PI) * 11 * (1 - t * 0.15));
    const wave = Math.sin(stageTimeSec * 13 - i * 1.1) * (t * 2.8);

    topPoints.push({
      x: cur.x + nx * halfWidth,
      y: cur.y - 4 + ny * halfWidth + wave,
    });
    bottomPoints.push({
      x: cur.x - nx * halfWidth,
      y: cur.y - 4 - ny * halfWidth + wave + t * 6,
    });
  }

  const midEndX =
    (topPoints[topPoints.length - 1].x + bottomPoints[bottomPoints.length - 1].x) * 0.5 +
    facing * 5;
  const midEndY =
    (topPoints[topPoints.length - 1].y + bottomPoints[bottomPoints.length - 1].y) * 0.5 + 1;

  // Cel-shaded Chibi Cloak Fill + Bold Ink Outline
  ctx.fillStyle = isAwakened ? '#f43f5e' : '#e11d48';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(topPoints[0].x, topPoints[0].y);
  for (let i = 1; i < topPoints.length; i++) {
    ctx.lineTo(topPoints[i].x, topPoints[i].y);
  }
  ctx.lineTo(midEndX, midEndY);
  for (let i = bottomPoints.length - 1; i >= 0; i--) {
    ctx.lineTo(bottomPoints[i].x, bottomPoints[i].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cel-shaded highlight band along upper edge of cape
  ctx.strokeStyle = isAwakened ? '#fef08a' : elemColor;
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.moveTo(topPoints[0].x, topPoints[0].y + 2);
  for (let i = 1; i < topPoints.length; i++) {
    ctx.lineTo(topPoints[i].x, topPoints[i].y + 2);
  }
  ctx.stroke();

  ctx.restore();
}
