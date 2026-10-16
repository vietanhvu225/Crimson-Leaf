import type { EnemyArchetype, SeasonId } from '../../rules/index.ts';
import type { EnemyActor } from '../../engine/entities.ts';
import { INK, type Rig } from './parts.ts';

// 3D chibi enemies, elite guards and the 11 stage bosses. Shapes and colours follow
// render/characters/enemy.ts + enemyGear.ts + bossGear.ts; numbers are the canvas ones with y
// flipped (local y up, feet at 0, +x = facing, +z = camera side).

export interface EnemyBody {
  totalH: number;
  torsoW: number;
  torsoH: number;
  headR: number;
}

export function enemyBody(archetype: EnemyArchetype): EnemyBody {
  if (archetype === 'boss') return { totalH: 82, torsoW: 34, torsoH: 25, headR: 21 };
  if (archetype === 'elite_guard') return { totalH: 70, torsoW: 28, torsoH: 21, headR: 17.5 };
  return { totalH: 58, torsoW: 22, torsoH: 17, headR: 15 };
}

export function enemyTrim(archetype: EnemyArchetype, accent: string): string {
  switch (archetype) {
    case 'boss':
      return accent;
    case 'elite_guard':
      return '#fde047';
    case 'blue_kiter':
      return '#38bdf8';
    case 'fire_monk':
      return '#fbbf24';
    case 'bomb_alchemist':
      return '#fb923c';
    case 'chain_kusarigama':
      return '#c084fc';
    case 'claw_assassin':
      return '#22d3ee';
    case 'tessen_gale':
      return '#34d399';
    case 'thunder_puppeteer':
      return '#facc15';
    default:
      return '#fb7185';
  }
}

const BOSS_TUNIC: Record<SeasonId, string> = {
  spring: '#881337',
  summer: '#0369a1',
  autumn: '#431407',
  winter: '#0284c7',
  cavern: '#581c87',
  thunder_peak: '#1e1b4b',
  blood_abyss: '#7f1d1d',
  celestial_altar: '#881337',
  ocean_palace: '#0e7490',
  earth_core: '#78350f',
  sky_sanctuary: '#0284c7',
};

function tunicColor(archetype: EnemyArchetype, seasonId: SeasonId): string {
  switch (archetype) {
    case 'boss':
      return BOSS_TUNIC[seasonId];
    case 'blue_kiter':
      return '#1d4ed8';
    case 'red_ambusher':
      return '#be123c';
    case 'fire_monk':
      return '#d97706';
    case 'bomb_alchemist':
      return '#9a3412';
    case 'chain_kusarigama':
      return '#581c87';
    case 'claw_assassin':
      return '#0f766e';
    case 'tessen_gale':
      return '#065f46';
    case 'thunder_puppeteer':
      return '#312e81';
    case 'elite_guard':
      return '#6b21a8';
  }
}

export interface EnemyDrawOpts {
  t: number;
  seasonId: SeasonId;
  accent: string;
}

/** Shared pose values (canvas EnemyPose, y up). */
interface Pose {
  b: EnemyBody;
  isBoss: boolean;
  isElite: boolean;
  trim: string;
  headY: number;
  torsoTop: number; // y of the torso top edge
  torsoMidY: number;
  handX: number;
  handY: number;
  shoulderY: number;
  swing: number;
  legR: number;
}

/**
 * Emits one enemy in its local frame (the caller has begun the rig with the actor root).
 * KO tip-over, dissolve, flash and lane dim are set on the rig by the caller.
 */
export function drawEnemy(rig: Rig, en: EnemyActor, o: EnemyDrawOpts) {
  const { t, seasonId } = o;
  const isBoss = en.archetype === 'boss';
  const isElite = en.archetype === 'elite_guard';
  const b = enemyBody(en.archetype);
  const trim = enemyTrim(en.archetype, o.accent);
  const ko = en.koTimer > 0;

  // Stage postures: ocean swim pitch, sky wings, Kage somersault.
  let pitch = 0;
  if (!ko && seasonId === 'ocean_palace') {
    pitch = isBoss
      ? 0.22 + Math.sin(t * 3.8 + en.id) * 0.06
      : 0.52 + Math.sin(t * 5.8 + en.id) * 0.1 + Math.max(-0.28, Math.min(0.28, en.vy / 500));
  }
  const kageSpin = en.kageSpinTimer ?? 0;
  const airborneKage =
    !ko &&
    seasonId !== 'ocean_palace' &&
    seasonId !== 'sky_sanctuary' &&
    !isBoss &&
    !isElite &&
    (kageSpin > 0 || (!(en.onGround ?? true) && Math.abs(en.vy) > 95));
  const midY = b.totalH * 0.5;
  let spin = 0;
  if (airborneKage && kageSpin > 0) spin = -(t * 15 + en.id);
  // Body pivot at mid-height (canvas: translate(0,-H/2) rotate translate back).
  rig.push(0, midY, 0, -pitch + spin);
  rig.push(0, -midY, 0);

  if (airborneKage) {
    const spinColor = en.archetype === 'blue_kiter' ? '#38bdf8' : en.archetype === 'fire_monk' ? '#fbbf24' : '#fb7185';
    for (let w = 0; w < 3; w++) {
      const a = t * 16 + en.id + (w * Math.PI * 2) / 3;
      rig.part('arc', 'glow', spinColor, 0, midY, 0, 29, 29, 18, -a);
    }
  }

  if (!ko && seasonId === 'sky_sanctuary') {
    const flap = Math.sin(t * 14 + en.id * 1.3) * 0.35;
    const wing = isBoss ? '#fde047' : '#bae6fd';
    for (const side of [-1, 1]) {
      rig.part('blade', 'toon', wing, -4, b.totalH * 0.55, side * 6, 34, 16, 3, 2.4 + flap, side * 0.9);
    }
  }

  // Walk cycle (canvas numbers).
  const moving = seasonId === 'ocean_palace' || Math.abs(en.vx) > 8;
  const walk = moving ? t * (isBoss ? 8 : 12) + en.id * 1.9 : t * 3.2 + en.id;
  const stride = seasonId === 'ocean_palace' ? Math.sin(walk) * 9 : moving ? Math.sin(walk) * 7.5 : Math.sin(walk) * 0.8;
  const legLift = moving ? Math.max(0, Math.cos(walk)) * 5 : 0;
  const oppLift = moving ? Math.max(0, -Math.cos(walk)) * 5 : 0;
  const bob = moving ? Math.abs(Math.cos(walk)) * 3.2 : -Math.sin(walk) * 1.5;
  const crouch = en.windupTimer > 0 ? -3.5 : 0;
  const tOff = bob + crouch; // y up

  const torsoTop = 11 + b.torsoH + tOff;
  const torsoMidY = torsoTop - b.torsoH / 2;
  const headY = torsoTop + b.headR * 0.72;
  const legR = isBoss ? 4.8 : isElite ? 4.2 : 3.6;
  const swing = en.windupTimer > 0 ? -0.55 : Math.sin(walk) * 0.16;
  const p: Pose = {
    b,
    isBoss,
    isElite,
    trim,
    headY,
    torsoTop,
    torsoMidY,
    handX: b.torsoW * 0.46,
    handY: torsoTop - b.torsoH * 0.55 - swing * 8,
    shoulderY: torsoTop - 5,
    swing,
    legR,
  };

  // Back layer: boss/elite halo + cape, gourd, scarf.
  if (isBoss || isElite) drawHaloAndCape(rig, en, o, p);
  else if (en.archetype === 'bomb_alchemist') {
    rig.part('sphere', 'toon', '#334155', -b.torsoW * 0.6, torsoMidY + 2, -4, 10, 10, 9);
    rig.part('sphere', 'toon', '#334155', -b.torsoW * 0.7, torsoMidY + 13, -4, 7, 7, 6);
  } else if (en.archetype !== 'fire_monk') {
    const wave = Math.sin(t * 11 + en.id) * 0.25;
    rig.part('blade', 'toon', trim, -5, torsoTop + 1, -2, 26, 8, 3, Math.PI - 0.15 + wave);
  }

  // Legs (z = left/right of the hips, stride along x).
  const hipY = 12 + tOff;
  rig.leg(0, hipY, -b.torsoW * 0.1 - stride, 1 + oppLift, -b.torsoW * 0.22, legR, '#1e293b', '#0f172a');
  rig.leg(0, hipY, b.torsoW * 0.1 + stride, 1 + legLift, b.torsoW * 0.22, legR, '#334155', '#1e293b');

  // Back arm.
  rig.arm(
    -b.torsoW * 0.1,
    p.shoulderY,
    -b.torsoW * 0.35 - stride * 0.35,
    torsoTop - b.torsoH * 0.72,
    -b.torsoW * 0.5,
    legR * 0.88,
    '#1e293b',
    '#334155'
  );

  // Torso + obi + buckle + lapel.
  const chilled = en.chillTimer > 0;
  const tunic = chilled ? '#38bdf8' : tunicColor(en.archetype, seasonId);
  const depth = b.torsoW * 0.85;
  rig.part('rbox', 'toon', tunic, 0, torsoMidY, 0, b.torsoW, b.torsoH, depth);
  rig.part('box', 'toon', '#0f172a', 0, torsoTop - b.torsoH + 3.8, 0, b.torsoW * 1.02, 4.5, depth * 1.02);
  rig.part('sphere', 'toon', trim, b.torsoW * 0.5, torsoTop - b.torsoH + 3.8, 0, 2.2, 3.6, 3.6);
  rig.part('box', 'flat', trim, b.torsoW * 0.51, torsoMidY + 1, 0, 0.8, b.torsoH * 0.9, 2.2, 0, 0, 0.5);
  if (isBoss || isElite) {
    rig.part('sphere', 'toon', trim, 0, torsoTop - 2, depth * 0.5, 7, 4.5, 6, 0.3);
    rig.part('sphere', 'toon', trim, 0, torsoTop - 2, -depth * 0.5, 7, 4.5, 6, 0.3);
  }

  // Head + face.
  const skin = isBoss ? '#fecdd3' : en.archetype === 'red_ambusher' ? '#ffe4e6' : '#fde68a';
  const r = b.headR;
  rig.part('sphere', 'toon', skin, 0, headY, 0, r, r, r);
  drawFace(rig, en.archetype, isBoss, r, headY, trim);

  // Archetype gear (hair/hat + front arm + weapon).
  switch (en.archetype) {
    case 'blue_kiter':
      blueKiter(rig, en, t, p);
      break;
    case 'red_ambusher':
      redAmbusher(rig, p);
      break;
    case 'fire_monk':
      fireMonk(rig, t, p);
      break;
    case 'bomb_alchemist':
      bombAlchemist(rig, t, p);
      break;
    case 'chain_kusarigama':
      chainKusarigama(rig, en, t, p);
      break;
    case 'claw_assassin':
      clawAssassin(rig, p);
      break;
    case 'tessen_gale':
      tessenGale(rig, p);
      break;
    case 'thunder_puppeteer':
      thunderPuppeteer(rig, en, t, p);
      break;
    default:
      bossOrElite(rig, en, o, p);
  }

  // Windup telegraph: pulsing ring + "!" over the head.
  if (en.windupTimer > 0) {
    const pr = 24 + en.windupTimer * 24;
    rig.part('torus', 'glow', '#fbbf24', 0, midY, 0, pr, pr, 10);
    rig.part('box', 'glow', '#fbbf24', 0, b.totalH + 16, 4, 3.5, 9, 3.5);
    rig.part('sphere', 'glow', '#fbbf24', 0, b.totalH + 8, 4, 2.2, 2.2, 2.2);
  }

  // Elemental debuffs.
  if (en.burnTimer > 0) {
    for (let k = 0; k < 3; k++) {
      const fx = (k - 1) * 9 + Math.sin(t * 14 + k) * 3;
      const fy = b.totalH * 0.4 + k * 7;
      const h = 9 + Math.sin(t * 20 + k * 2) * 2;
      rig.part('cone', 'glow', k % 2 === 0 ? '#f97316' : '#fde047', fx, fy, 8, 4.5, h, 4.5);
    }
  }
  if ((en.freezeTimer ?? 0) > 0) {
    rig.part('octa', 'clear', '#38bdf8', 0, b.totalH * 0.5, 0, b.torsoW * 1.0, b.totalH * 0.62, b.torsoW * 0.9);
  }
  if ((en.stunTimer ?? 0) > 0) {
    for (let s = 0; s < 3; s++) {
      const a = t * 9 + (s * Math.PI * 2) / 3;
      rig.part('octa', 'glow', s % 2 === 0 ? '#fde047' : '#38bdf8', Math.cos(a) * r * 1.15, b.totalH + 6, Math.sin(a) * r * 1.15, 4.2, 4.2, 4.2);
    }
  }

  // Ambush smoke puffs.
  if (en.ambushEntryTimer > 0) {
    const ring = 24 + en.ambushEntryTimer * 28;
    rig.part('torus', 'glow', '#fb7185', 0, midY, 0, ring, ring, 10);
    for (let k = 0; k < 4; k++) {
      const a = t * 5 + (k * Math.PI) / 2;
      const d = (1 - en.ambushEntryTimer) * 22 + 8;
      rig.part('sphere', 'toon', '#e2e8f0', Math.cos(a) * d, midY + Math.sin(a) * d * 0.7, 10, 9.5, 9.5, 9.5);
    }
  }

  rig.pop();
  rig.pop();
}

function drawFace(rig: Rig, archetype: EnemyArchetype, isBoss: boolean, r: number, headY: number, trim: string) {
  // Two anime eyes on a 3/4 face: the far one smaller.
  for (const [ang, scale] of [
    [0.55, 1],
    [-0.25, 0.75],
  ] as const) {
    const nx = Math.cos(ang);
    const nz = Math.sin(ang);
    rig.push(nx * r * 0.93, headY - 0.5, nz * r * 0.93, 0, Math.atan2(nx, nz));
    rig.eye(0, 0, 0, r * 0.22 * scale, r * 0.3, trim);
    rig.pop();
  }
  // Blush.
  rig.part('sphere', 'flat', '#fb7185', Math.cos(0.75) * r * 0.9, headY - 4, Math.sin(0.75) * r * 0.9, 3, 1.8, 1.5);
  if (archetype === 'blue_kiter') {
    rig.part('sphere', 'toon', '#1e293b', 0, headY - r * 0.42, 0, r * 1.04, r * 0.62, r * 1.04);
  } else if (archetype === 'red_ambusher' || isBoss) {
    rig.part('box', 'flat', INK, r * 0.9, headY - 5.5, r * 0.3, 1.2, 1.6, r * 0.6);
    rig.part('cone4', 'flat', '#ffffff', r * 0.88, headY - 7, r * 0.38, 1.6, 4, 1.6, Math.PI);
  } else {
    rig.part('box', 'flat', INK, r * 0.92, headY - 5.2, r * 0.3, 1.2, 1.5, r * 0.45);
  }
}

// ---------- regular archetypes ----------

function frontArm(rig: Rig, p: Pose, sleeve: string, gauntlet: string) {
  rig.arm(p.b.torsoW * 0.15, p.shoulderY, p.handX, p.handY, p.b.torsoW * 0.5, p.legR * 0.9, sleeve, gauntlet);
}

function blueKiter(rig: Rig, en: EnemyActor, t: number, p: Pose) {
  const r = p.b.headR;
  // Hood over back/top of the head, ear tufts, forehead plate.
  rig.part('sphere', 'toon', '#1e3a8a', -r * 0.18, p.headY + r * 0.22, 0, r * 1.02, r * 0.95, r * 1.04);
  rig.part('cone4', 'toon', '#1e3a8a', -r * 0.55, p.headY + r * 1.05, -r * 0.35, 4, 9, 4, 0.5);
  rig.part('cone4', 'toon', '#1e3a8a', -r * 0.55, p.headY + r * 1.05, r * 0.35, 4, 9, 4, 0.5);
  rig.part('rbox', 'toon', '#e2e8f0', r * 0.55, p.headY + r * 0.62, 0, r * 0.5, 5.5, r * 1.2, -0.5);
  frontArm(rig, p, '#1e3a8a', '#334155');
  // Spinning 4-point shuriken.
  rig.push(p.handX + 5, p.handY, p.b.torsoW * 0.62, -(t * (en.windupTimer > 0 ? 22 : 9) + en.id));
  for (let k = 0; k < 4; k++) {
    rig.part('blade', 'toon', '#38bdf8', 0, 0, 0, 16, 8, 2, (k * Math.PI) / 2);
  }
  rig.part('cyl', 'toon', '#fef08a', 0, 0, 0, 4.5, 3, 4.5, 0, 0, Math.PI / 2);
  rig.pop();
}

function redAmbusher(rig: Rig, p: Pose) {
  const r = p.b.headR;
  // White oni mane swept back + golden horn.
  rig.part('sphere', 'toon', '#f8fafc', -r * 0.3, p.headY + r * 0.3, 0, r * 0.95, r * 0.85, r * 1.02);
  for (let k = 0; k < 3; k++) {
    rig.part('cone4', 'toon', '#f8fafc', -r * 1.0, p.headY + r * (0.5 - k * 0.4), 0, 5, 11, 5, Math.PI / 2 + 0.3 - k * 0.3);
  }
  rig.part('cone', 'toon', '#fde047', r * 0.45, p.headY + r * 1.0, r * 0.2, 3.5, 13, 3.5, -0.5);
  frontArm(rig, p, '#881337', '#334155');
  // Blood broadsword.
  rig.push(p.handX, p.handY, p.b.torsoW * 0.62, 0.7 - p.swing);
  rig.part('blade', 'toon', '#fb7185', 2, 0, 0, 32, 11, 2.5);
  rig.part('box', 'flat', '#ffffff', 14, 1.5, 1.4, 16, 1.4, 0.4);
  rig.part('rbox', 'toon', '#fde047', 0, 0, 0, 6, 8, 5);
  rig.pop();
}

function fireMonk(rig: Rig, t: number, p: Pose) {
  const r = p.b.headR;
  // Orbiting prayer beads (a real orbit around the torso).
  for (let k = 0; k < 6; k++) {
    const a = t * 2.5 + (k * Math.PI) / 3;
    rig.part(
      'sphere',
      'toon',
      k % 2 === 0 ? '#fde047' : '#f97316',
      Math.cos(a) * p.b.torsoW * 0.75,
      p.torsoTop - 3 + Math.sin(a) * 2,
      Math.sin(a) * p.b.torsoW * 0.75,
      3.8,
      3.8,
      3.8
    );
  }
  // Wide conical bamboo hat + finial.
  rig.part('cone', 'toon', '#fbbf24', 0, p.headY + r * 0.75, 0, r * 1.6, r * 0.95, r * 1.6);
  rig.part('sphere', 'glow', '#f97316', 0, p.headY + r * 1.3, 0, 3.5, 3.5, 3.5);
  frontArm(rig, p, '#b45309', '#78350f');
  // Fire staff with flame orb.
  rig.push(p.handX, 0, p.b.torsoW * 0.62, -p.swing * 0.45);
  rig.part('cyl', 'toon', '#b45309', 0, p.b.totalH * 0.5, 0, 1.8, p.b.totalH + 4, 1.8, -0.06);
  rig.part('sphere', 'glow', '#f97316', 2, p.b.totalH + 7, 0, 9, 9, 9);
  rig.part('sphere', 'glow', '#fef08a', 2, p.b.totalH + 7, 4, 5, 5, 5);
  rig.pop();
}

function bombAlchemist(rig: Rig, t: number, p: Pose) {
  const r = p.b.headR;
  rig.part('cyl', 'toon', '#9a3412', 0, p.headY + r * 0.5, 0, r * 1.02, 7, r * 1.02);
  rig.part('sphere', 'toon', '#fde047', r * 0.85, p.headY + r * 0.55, r * 0.35, 4, 4, 2.5);
  rig.part('sphere', 'toon', '#fde047', r * 0.75, p.headY + r * 0.55, -r * 0.45, 4, 4, 2.5);
  frontArm(rig, p, '#9a3412', '#334155');
  rig.part('sphere', 'toon', '#1e293b', p.handX + 7, p.handY + 4, p.b.torsoW * 0.62, 10.5, 10.5, 10.5);
  const s = 4.5 + Math.sin(t * 20) * 1.5;
  rig.part('sphere', 'glow', '#fde047', p.handX + 11, p.handY + 16, p.b.torsoW * 0.62, s, s, s);
}

function chainKusarigama(rig: Rig, en: EnemyActor, t: number, p: Pose) {
  const r = p.b.headR;
  rig.part('sphere', 'toon', '#581c87', -r * 0.2, p.headY + r * 0.2, 0, r * 1.02, r * 0.95, r * 1.04);
  frontArm(rig, p, '#581c87', '#334155');
  // Chain whirling in 3D around the hand, sickle at the tip.
  const a = t * 14 + en.id;
  const hz = p.b.torsoW * 0.62;
  const tx = Math.cos(a) * 20;
  const ty = Math.sin(a) * 14 + 8;
  const tz = Math.sin(a) * 10;
  for (let k = 1; k <= 5; k++) {
    const f = k / 6;
    rig.part('sphere', 'toon', '#cbd5e1', p.handX + 4 + tx * f, p.handY + ty * f, hz + tz * f, 1.6, 1.6, 1.6);
  }
  rig.part('arc', 'toon', '#e879f9', p.handX + 4 + tx, p.handY + ty, hz + tz, 11, 11, 14, -a);
}

function clawAssassin(rig: Rig, p: Pose) {
  const r = p.b.headR;
  for (const ez of [-0.4, 0.4]) {
    rig.part('cone4', 'toon', '#e2e8f0', -r * 0.1, p.headY + r * 1.05, ez * r, 4.5, 12, 3);
  }
  frontArm(rig, p, '#0f766e', '#334155');
  rig.push(p.handX + 2, p.handY, p.b.torsoW * 0.62, 0.1 - p.swing);
  for (const cy of [-4, 0, 4]) rig.part('box', 'glow', '#22d3ee', 11, cy + 1.5, cy * 0.4, 22, 2, 1.6, 0.12);
  rig.pop();
}

function tessenGale(rig: Rig, p: Pose) {
  const r = p.b.headR;
  rig.part('sphere', 'toon', '#065f46', -r * 0.55, p.headY + r * 0.85, 0, 8, 8, 8);
  rig.part('sphere', 'toon', '#065f46', -r * 0.1, p.headY + r * 0.35, 0, r * 0.98, r * 0.8, r * 1.03);
  frontArm(rig, p, '#065f46', '#fde047');
  rig.push(p.handX + 4, p.handY, p.b.torsoW * 0.66, 0.3 - p.swing);
  rig.part('fan', 'toon', '#34d399', 0, 0, 0, 22, 2, 22, 0, 0, Math.PI / 2);
  rig.part('arc', 'flat', '#fde047', 0, 0, 1.4, 16, 16, 4, 0.2);
  rig.pop();
}

function thunderPuppeteer(rig: Rig, en: EnemyActor, t: number, p: Pose) {
  const r = p.b.headR;
  rig.part('cone4', 'toon', '#facc15', 0, p.headY + r * 1.1, 0, r * 0.5, r * 0.8, r * 0.5);
  frontArm(rig, p, '#312e81', '#fde047');
  rig.push(p.handX + 12, p.handY + 4, p.b.torsoW * 0.66, t * 15 + en.id, 0.5);
  rig.part('torus', 'glow', '#fde047', 0, 0, 0, 12, 12, 16);
  rig.part('torus', 'toon', INK, 0, 0, 0, 13.5, 13.5, 8);
  rig.pop();
}

// ---------- elites and bosses ----------

function bossOrElite(rig: Rig, en: EnemyActor, o: EnemyDrawOpts, p: Pose) {
  const { t, seasonId } = o;
  const r = p.b.headR;
  const boss = p.isBoss;
  // Plume sweeping back from the crown.
  const plume = Math.sin(t * 8 + en.id) * 0.2;
  rig.part('blade', 'toon', boss ? o.accent : '#f43f5e', -2, p.headY + r * 0.95, 0, r * 1.5, r * 0.55, 4, Math.PI - 0.6 + plume);
  // Crown / helmet (seasonal variants).
  const crown = boss && seasonId === 'winter' ? '#bae6fd' : '#fde047';
  rig.part('cyl', 'toon', crown, 0, p.headY + r * 0.6, 0, r * 0.98, r * 0.32, r * 0.98);
  if (boss && (seasonId === 'autumn' || seasonId === 'blood_abyss')) {
    // Kuwagata horns / demon horns.
    for (const z of [-1, 1]) {
      rig.part('cone', 'toon', seasonId === 'autumn' ? '#fde047' : '#e5e7eb', r * 0.2, p.headY + r * 1.25, z * r * 0.55, 3.5, r * 1.3, 3.5, 0.35, 0, -z * 0.45);
    }
  } else {
    for (let k = -1; k <= 1; k++) {
      rig.part('cone4', 'toon', crown, k * r * 0.1, p.headY + r * (k === 0 ? 1.2 : 1.0), k * r * 0.6, 4, k === 0 ? r * 0.9 : r * 0.65, 4);
    }
  }

  // Front arm + weapon (holds it at the fist, rotated by the swing).
  rig.arm(p.b.torsoW * 0.15, p.shoulderY, p.handX, p.handY, p.b.torsoW * 0.5, p.legR * 0.95, '#3b0764', '#fde047');
  const hz = p.b.torsoW * 0.66;
  rig.push(p.handX - 2, p.handY, hz, -p.swing);
  if (boss && (seasonId === 'autumn' || seasonId === 'blood_abyss')) {
    // Kanabo / molten anvil hammer.
    rig.part('cyl', 'toon', '#78350f', 0, 8, 0, 2.2, 22, 2.2);
    rig.part('rbox', 'toon', seasonId === 'blood_abyss' ? '#ea580c' : '#374151', 4, 32, 0, 22, 34, 22);
    for (const sy of [22, 32, 42]) {
      rig.part('cone4', 'toon', '#fde047', 16, sy, 0, 3.5, 7, 3.5, -Math.PI / 2);
      rig.part('cone4', 'toon', '#fde047', 4, sy, 12, 3.5, 7, 3.5, 0, 0, Math.PI / 2);
    }
    if (seasonId === 'blood_abyss') rig.part('rbox', 'glow', '#fb923c', 4, 32, 0, 23, 6, 23);
  } else if (boss && seasonId === 'winter') {
    // Frost-crystal scythe.
    rig.part('cyl', 'toon', '#bae6fd', 3, 12, 0, 2.2, 64, 2.2, -0.46);
    rig.push(16, 38, 0, 0.1);
    rig.part('blade', 'toon', '#38bdf8', 0, 0, 0, 34, 14, 3, -0.25);
    rig.part('blade', 'glow', '#e0f2fe', 6, 1, 1.8, 18, 4, 0.5, -0.25);
    rig.pop();
  } else if (boss && seasonId === 'ocean_palace') {
    // Sea-king trident.
    rig.part('cyl', 'toon', '#fde047', 3, 5, 0, 2.2, 56, 2.2, -0.73);
    rig.push(20, 24, 0, -0.73);
    rig.part('cone', 'toon', '#22d3ee', 0, 14, 0, 3.5, 22, 3.5);
    rig.part('cone', 'toon', '#fde047', -7, 10, 0, 2.6, 16, 2.6, 0.25);
    rig.part('cone', 'toon', '#fde047', 7, 10, 0, 2.6, 16, 2.6, -0.25);
    rig.part('cyl', 'toon', '#fde047', 0, 2, 0, 9, 2.5, 3, Math.PI / 2);
    rig.pop();
  } else if (boss && seasonId === 'earth_core') {
    // Tectonic drill spear: big amber cone with glowing spiral bands.
    rig.push(22, 22, 0, -0.85);
    rig.part('cone', 'toon', '#f59e0b', 0, 18, 0, 10, 46, 10);
    for (let k = 0; k < 3; k++) {
      const yy = 6 + k * 11;
      const rr = 10 * (1 - (yy + 5) / 46) + 0.8;
      rig.part('torus', 'glow', '#fef08a', 0, yy, 0, rr, rr, 6, 0, t * 6 + k, Math.PI / 2 + 0.25);
    }
    rig.pop();
    rig.part('cyl', 'toon', '#78350f', 0, 0, 0, 2.2, 22, 2.2, -0.85);
  } else if (boss && seasonId === 'sky_sanctuary') {
    // Twin garuda wind-glaive: golden blade up-front, azure blade down-back.
    rig.part('cyl', 'toon', '#e2e8f0', 0, 0, 0, 2, 42, 2, -0.6);
    rig.part('blade', 'toon', '#fde047', 10, 14, 0, 40, 14, 3, 0.75);
    rig.part('blade', 'toon', '#38bdf8', -8, -12, 0, 32, 12, 3, Math.PI + 0.75);
  } else if (boss && seasonId === 'summer') {
    // Twin water swords (Giao Long Song Kiếm): one in each hand.
    rig.part('blade', 'toon', '#7dd3fc', 2, 2, 0, 40, 8, 2.5, 0.9);
    rig.part('rbox', 'toon', '#fde047', 0, 0, 0, 5, 8, 5);
  } else {
    // Crescent guan dao / vajra spear.
    rig.part('cyl', 'toon', '#b45309', 2, 3, 0, 2.2, 52, 2.2, -0.76);
    rig.push(17, 20, 0, 0.3);
    rig.part('blade', 'toon', boss ? o.accent : '#fef08a', 0, 0, 0, 30, 16, 3, 0.85);
    rig.pop();
  }
  rig.pop();
  if (boss && seasonId === 'summer') {
    // Second sword in the back hand.
    rig.push(-p.b.torsoW * 0.35, p.torsoTop - p.b.torsoH * 0.72, -p.b.torsoW * 0.6, 0.6 + p.swing);
    rig.part('blade', 'toon', '#38bdf8', 2, 2, 0, 36, 8, 2.5, 0.6);
    rig.part('rbox', 'toon', '#fde047', 0, 0, 0, 5, 8, 5);
    rig.pop();
  }
}

/** Back layer for bosses and elites: cape + seasonal halo (bossGear.drawBossHaloAndCape). */
function drawHaloAndCape(rig: Rig, en: EnemyActor, o: EnemyDrawOpts, p: Pose) {
  const { t, seasonId } = o;
  const boss = p.isBoss;
  const wheelR = boss ? 44 : 31;
  // Cape: a hanging slab behind the shoulders that sways.
  const wave = Math.sin(t * 7 + en.id) * 0.12;
  rig.push(-p.b.torsoW * 0.35, p.torsoTop + 1, -2, -0.25 + wave);
  rig.part('rbox', 'toon', boss ? '#9f1239' : '#6b21a8', 0, -(p.torsoTop - 3) / 2, 0, 6, p.torsoTop + 2, p.b.torsoW * 1.1);
  rig.pop();

  // Halo wheel in the picture plane, behind the back (local -z mirrors with facing).
  const cy = p.torsoTop - 3 + p.b.torsoH * 0.75;
  const z = -p.b.torsoW * 0.8;
  rig.push(-4, cy, z);
  if (boss && seasonId === 'thunder_peak') {
    // Ring of 8 Raijin taiko drums.
    for (let d = 0; d < 8; d++) {
      const a = t * 1.8 + (Math.PI * 2 * d) / 8;
      const dx = Math.cos(a) * wheelR;
      const dy = Math.sin(a) * wheelR;
      rig.part('cyl', 'toon', '#fef08a', dx, dy, 0, 8.5, 6, 8.5, 0, 0, Math.PI / 2);
      rig.part('cyl', 'flat', '#dc2626', dx, dy, 3.2, 3.5, 0.6, 3.5, 0, 0, Math.PI / 2);
    }
    rig.part('torus', 'glow', '#fde047', 0, 0, 0, wheelR, wheelR, 8);
  } else if (boss && seasonId === 'cavern') {
    // 4 scorpion/centipede bone legs sprouting from the back.
    for (const side of [-1, 1]) {
      for (const tier of [0, 1]) {
        const wag = Math.sin(t * 8 + tier) * 6;
        const x1 = side * 34;
        const y1 = 18 - tier * 18 - wag;
        rig.limb(0, -tier * 8, x1, y1, 0, 3, '#a855f7');
        rig.limb(x1, y1, side * 52, 4 - tier * 22 - wag, 0, 2.6, '#a855f7');
        rig.part('cone', 'toon', '#f5f3ff', side * 54, -2 - tier * 22 - wag, 0, 2.5, 9, 2.5, Math.PI);
      }
    }
  } else if (boss && seasonId === 'celestial_altar') {
    // Six floating celestial swords fanning out.
    for (let k = 0; k < 6; k++) {
      const a = Math.PI * 0.85 - (k * Math.PI * 0.7) / 5 - Math.sin(t * 4 + k) * 0.08;
      rig.part('blade', 'toon', k % 2 === 0 ? '#f43f5e' : '#fde047', Math.cos(a) * 22, Math.sin(a) * 22, 0, 36, 7, 2.5, a);
    }
  } else if (boss && seasonId === 'ocean_palace') {
    // Whirlpool ring + 6 sea-dragon pearls.
    rig.part('torus', 'glow', '#22d3ee', 0, 0, 0, wheelR, wheelR, 14, 0, 0, 0);
    for (let k = 0; k < 6; k++) {
      const a = t * 2.1 + (Math.PI * 2 * k) / 6;
      rig.part('sphere', 'toon', k % 2 === 0 ? '#67e8f9' : '#fde047', Math.cos(a) * wheelR, Math.sin(a) * wheelR, 0, 7.5, 7.5, 7.5);
    }
  } else if (boss && seasonId === 'earth_core') {
    // Rotating geode gear.
    rig.part('torus', 'toon', '#f59e0b', 0, 0, 0, wheelR, wheelR, 18);
    for (let g = 0; g < 8; g++) {
      const a = t * 1.9 + (Math.PI * 2 * g) / 8;
      rig.part('cone4', 'toon', g % 2 === 0 ? '#fde047' : '#d97706', Math.cos(a) * (wheelR + 6), Math.sin(a) * (wheelR + 6), 0, 6, 16, 4, a - Math.PI / 2);
    }
  } else if (boss && seasonId === 'sky_sanctuary') {
    // Wind ring + 8 golden garuda feather blades.
    rig.part('torus', 'glow', '#38bdf8', 0, 0, 0, wheelR, wheelR, 10);
    for (let f = 0; f < 8; f++) {
      const a = t * 2.4 + (Math.PI * 2 * f) / 8;
      rig.part('blade', 'toon', f % 2 === 0 ? '#fde047' : '#38bdf8', Math.cos(a) * wheelR, Math.sin(a) * wheelR, 0, 18, 6, 2, a);
    }
  } else if (boss && seasonId === 'winter') {
    // Frost halo: ring of ice crystals.
    rig.part('torus', 'glow', '#bae6fd', 0, 0, 0, wheelR, wheelR, 8);
    for (let k = 0; k < 8; k++) {
      const a = t * 1.2 + (Math.PI * 2 * k) / 8;
      rig.part('octa', 'toon', '#e0f2fe', Math.cos(a) * wheelR, Math.sin(a) * wheelR, 0, 5, 9, 5, a - Math.PI / 2);
    }
  } else if (boss && seasonId === 'summer') {
    // Tide ring: two counter-rotating water arcs.
    for (let k = 0; k < 2; k++) {
      rig.part('arc', 'glow', '#38bdf8', 0, 0, 0, wheelR, wheelR, 12, t * (k ? -2.2 : 2.2) + k * Math.PI);
    }
    rig.part('torus', 'toon', '#0369a1', 0, 0, 0, wheelR * 0.75, wheelR * 0.75, 10);
  } else {
    // Dharma / elemental wheel (spring, autumn, blood abyss, elites).
    const trim = p.trim;
    rig.part('torus', 'toon', trim, 0, 0, 0, wheelR, wheelR, 14);
    for (let s = 0; s < 8; s++) {
      const a = t * 1.6 + (Math.PI * 2 * s) / 8;
      rig.part('sphere', 'toon', trim, Math.cos(a) * wheelR, Math.sin(a) * wheelR, 0, 4, 4, 4);
      if (boss && seasonId === 'spring' && s % 2 === 0) {
        rig.part('cone', 'glow', '#f97316', Math.cos(a) * wheelR, Math.sin(a) * wheelR + 6, 0, 3.5, 9, 3.5);
      }
    }
    if (boss && seasonId === 'blood_abyss') rig.part('torus', 'glow', '#ef4444', 0, 0, 0, wheelR * 0.7, wheelR * 0.7, 6);
  }
  rig.pop();
}
