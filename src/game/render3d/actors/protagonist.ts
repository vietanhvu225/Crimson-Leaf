import { ELEMENTAL_STANCES, getGuardianBladeCount, type PlayerCombatState, type SeasonId } from '../../rules/index.ts';
import type { World } from '../../engine/world.ts';
import type { Rig } from './parts.ts';

// 3D chibi protagonist ("Võ Hiệp Huyết Ảnh"), after render/characters/protagonist.ts,
// protagonistArm.ts and protagonistMounts.ts. Local frame: feet at 0, y up, +x = facing,
// +z = camera side. The red cloak is a separate ribbon mesh (cape.ts) driven by cloakNodes.

export type PlayerAnim = 'idle' | 'run' | 'jump' | 'fall' | 'wall' | 'dash' | 'attack' | 'parry' | 'hurt' | 'dead';

/** Everything the rig needs; built from the World each frame, or faked by the gallery. */
export interface PlayerPose {
  anim: PlayerAnim;
  t: number;
  vx: number;
  vy: number;
  onGround: boolean;
  gaitPhase: number;
  /** Sim attack angle (radians, y down) and progress 0..1 of the 0.22 s slash. */
  attackAngle: number;
  attackK: number;
  facing: 1 | -1;
  /** -1/1 = wall on the left/right (world), 0 = none. */
  wallCling: -1 | 0 | 1;
  /** 0..1 progress of the parry / hurt / death beat. */
  beatK: number;
  combat: Pick<PlayerCombatState, 'awakenedTimer' | 'isImmortal' | 'dashTimer' | 'skills'>;
  guardianAngle: number;
  seasonId: SeasonId;
}

export const ATTACK_SEC = 0.22;

export function elemColor(combat: PlayerPose['combat']): string {
  return ELEMENTAL_STANCES[combat.skills.activeElement].color;
}

/** Picks the animation state from the sim (priority: dead > hurt > parry > attack > dash > wall > air > run > idle). */
export function classifyPlayer(
  world: World,
  beats: { hurt: number; parry: number; dead: boolean }
): PlayerAnim {
  const p = world.player;
  if (beats.dead) return 'dead';
  if (beats.hurt > 0) return 'hurt';
  if (beats.parry > 0) return 'parry';
  if (p.isAttacking) return 'attack';
  if (world.combat.dashTimer > 0) return 'dash';
  if (p.wallCling !== 0 && !p.onGround) return 'wall';
  if (!p.onGround) return p.vy < 0 ? 'jump' : 'fall';
  if (Math.abs(p.vx) > 18) return 'run';
  return 'idle';
}

const SKIN = '#fef3c7';

/** Emits the body (no cloak). Caller begins the rig with root + zSign. */
export function drawProtagonist(rig: Rig, pp: PlayerPose) {
  const { t, anim } = pp;
  const elem = elemColor(pp.combat);
  const awakened = pp.combat.awakenedTimer > 0;
  const swim = pp.seasonId === 'ocean_palace';
  const aerial = pp.seasonId === 'sky_sanctuary';

  // Whole-body pivots (canvas: translate(0,-24) rotate translate back), death collapse, hurt recoil.
  let bodyRot = 0;
  if (swim) bodyRot = -(0.56 + Math.max(-0.42, Math.min(0.42, pp.vy / 520)) + Math.sin(t * 6.2) * 0.08);
  else if (aerial) bodyRot = -(0.22 + Math.max(-0.28, Math.min(0.28, pp.vy / 680)) + Math.sin(t * 5.4) * 0.06);
  if (anim === 'dead') bodyRot = (Math.PI / 2) * Math.min(1, pp.beatK * 1.6);
  if (anim === 'hurt') bodyRot = 0.45 * Math.sin(Math.min(1, pp.beatK) * Math.PI);
  if (anim === 'dash') bodyRot = -0.35;
  const pivotY = anim === 'dead' ? 4 : 24;
  rig.push(0, pivotY, 0, bodyRot);
  rig.push(0, -pivotY, 0);

  const speed = Math.max(-1, Math.min(1, (pp.vx * pp.facing) / 360));
  let tilt =
    swim || aerial
      ? 0.14
      : anim === 'attack'
        ? 0.2
        : pp.onGround
          ? speed * 0.14
          : Math.max(-0.14, Math.min(0.18, pp.vy / 1200));
  if (anim === 'wall') tilt = -0.12;
  const running = !swim && anim === 'run';
  const swimCycle = t * 11 + pp.gaitPhase;
  const stride = swim ? Math.sin(swimCycle) * 9.5 : running ? Math.sin(pp.gaitPhase) * 8.5 : 0;
  const lift = swim ? -Math.cos(swimCycle) * 4.5 : running ? Math.max(0, Math.cos(pp.gaitPhase)) * 5.5 : 0;
  const oppLift = swim ? Math.cos(swimCycle) * 4.5 : running ? Math.max(0, -Math.cos(pp.gaitPhase)) * 5.5 : 0;
  const bob = swim
    ? -Math.sin(t * 5.2) * 2.2
    : pp.onGround
      ? running
        ? Math.abs(Math.sin(pp.gaitPhase)) * 3.2
        : anim === 'idle'
          ? -Math.sin(t * 4.8) * 1.5
          : 0
      : 0;

  // Legs.
  const hipY = 12 + bob;
  let back = { x: -5.5 - stride, y: 1 + oppLift };
  let front = { x: 5.5 + stride, y: 1 + lift };
  if (swim) {
    back = { x: -7 - stride, y: -2 + oppLift };
    front = { x: 4 + stride, y: -2 + lift };
  } else if (anim === 'wall') {
    // Feet planted on the wall (local +x is toward the wall in this pose, see caller).
    back = { x: 8, y: 2 };
    front = { x: 10, y: 9 };
  } else if (anim === 'dash') {
    back = { x: -14, y: 6 };
    front = { x: 9, y: 3 };
  } else if (anim === 'dead') {
    back = { x: -4, y: 1 };
    front = { x: 6, y: 1 };
  } else if (!pp.onGround) {
    back = anim === 'jump' ? { x: -9, y: 5 } : { x: -7, y: 2 };
    front = anim === 'jump' ? { x: 8, y: 9 } : { x: 9, y: 3 };
  }
  rig.leg(0, hipY, back.x, back.y, -5, 3.8, '#1e293b', '#0f172a');
  rig.leg(0, hipY, front.x, front.y, 5, 4.0, '#334155', '#1e293b');

  // Torso pivot (tilt).
  rig.push(0, 14 - bob, 0, -tilt);
  rig.push(0, -(14 - bob), 0);

  const tunicTop = 31 + bob;
  const tunicW = 23;
  const tunicH = 19;
  const midY = tunicTop - tunicH / 2;

  // Scabbard across the back.
  rig.part('rbox', 'toon', '#be123c', -6, 22 + bob, -9, 34, 6, 6, 0.36);
  rig.part('box', 'toon', '#fde047', -19, 17.5 + bob, -9, 4.5, 4.5, 6.5, 0.36);

  // Back arm.
  let backHand = { x: -13 - stride * 0.3, y: tunicTop - 14 };
  if (anim === 'jump') backHand = { x: -12, y: tunicTop + 4 };
  else if (anim === 'wall') backHand = { x: 13, y: tunicTop + 14 };
  else if (anim === 'dash') backHand = { x: -18, y: tunicTop - 6 };
  else if (anim === 'hurt') backHand = { x: -14, y: tunicTop + 6 };
  rig.arm(-2, tunicTop - 4, backHand.x, backHand.y, -10, 3.6, '#1e293b', '#334155', SKIN);

  // Tunic, v-neck, obi, buckle.
  rig.part('rbox', 'toon', '#1e3a8a', 0, midY, 0, tunicW * 0.9, tunicH, tunicW * 0.85);
  rig.part('cone4', 'flat', '#f43f5e', tunicW * 0.45, tunicTop - 4, 0, 5.5, 9, 5.5, Math.PI, 0, Math.PI / 4);
  rig.part('box', 'flat', elem, tunicW * 0.455, midY + 1.5, 2, 0.8, 13, 2.2, 0, 0, -0.6);
  rig.part('rbox', 'toon', '#e11d48', 0, tunicTop - tunicH + 3.8, 0, tunicW * 0.95, 5.5, tunicW * 0.9);
  rig.part('sphere', 'toon', '#fde047', tunicW * 0.47, tunicTop - tunicH + 3.8, 2, 2.3, 3.4, 3.4);

  // Head.
  const headY = 45 + bob;
  const r = 16.5;
  // Headband ribbons streaming behind.
  const w1 = Math.sin(t * 14) * 0.18;
  const w2 = Math.cos(t * 12) * 0.2;
  rig.part('blade', 'toon', awakened ? '#fb7185' : elem, -r * 0.7, headY + 4, -3, 22, 6, 2.5, Math.PI - 0.15 + w1);
  rig.part('blade', 'toon', '#e11d48', -r * 0.7, headY + 1, -5, 18, 6, 2.5, Math.PI + 0.25 + w2);
  rig.part('sphere', 'toon', SKIN, 0, headY, 0, r, r, r);
  // 3/4 face: two eyes, blush.
  const iris = awakened ? '#f43f5e' : elem;
  for (const [ang, sc] of [
    [0.5, 1],
    [-0.3, 0.75],
  ] as const) {
    const nx = Math.cos(ang);
    const nz = Math.sin(ang);
    rig.push(nx * r * 0.93, headY + 1.2, nz * r * 0.93, 0, Math.atan2(nx, nz));
    rig.eye(0, 0, 0, 3.9 * sc, 4.9, iris);
    rig.pop();
  }
  rig.part('sphere', 'flat', '#fb7185', Math.cos(0.8) * r * 0.9, headY - 3.6, Math.sin(0.8) * r * 0.9, 3.4, 2, 1.5);
  // Crimson scarf collar over the chin.
  rig.part('sphere', 'toon', '#be123c', 0.5, headY - r * 0.55, 0, r * 1.02, r * 0.5, r * 1.02);
  // Spiky hair + ponytail + headband + crest.
  rig.part('sphere', 'toon', '#1e293b', -r * 0.22, headY + r * 0.3, 0, r * 0.98, r * 0.86, r * 1.04);
  const spikes: [number, number, number, number][] = [
    [-0.95, 0.45, 0, Math.PI / 2 + 0.55],
    [-0.75, 0.9, -0.4, 0.95],
    [-0.75, 0.9, 0.4, 0.95],
    [-0.15, 1.1, 0, 0.35],
    [0.45, 0.95, 0.15, -0.35],
  ];
  for (const [sx, sy, sz, rot] of spikes) {
    rig.part('cone4', 'toon', '#1e293b', sx * r, headY + sy * r, sz * r, 5, 13, 5, rot + w1 * 0.3);
  }
  rig.part('sphere', 'toon', '#1e293b', -r * 1.0, headY + r * 0.75, 0, 5.5, 5.5, 5.5);
  rig.part('cone', 'toon', '#1e293b', -r * 1.35, headY + r * 0.35, 0, 4.5, 14, 4.5, Math.PI * 0.62 + w2 * 0.6);
  rig.part('cyl', 'toon', elem, 0, headY + 6, 0, r * 1.01, 4.6, r * 1.01, 0.12);
  rig.part('rbox', 'toon', '#fde047', r * 0.9, headY + 8.5, r * 0.18, 4, 6.4, 8.8, 0.12);

  // Front sword arm + kodachi.
  drawSwordArm(rig, pp, tunicTop, elem);

  rig.pop(); // torso tilt
  rig.pop();
  rig.pop(); // body pivot
  rig.pop();
}

const KODACHI_STEEL = '#e2e8f0';

function kodachi(rig: Rig, len: number) {
  // Grip, golden tsuba, curved blade along +x.
  rig.part('cyl', 'toon', '#7f1d1d', -4, 0, 0, 1.8, 9, 1.8, Math.PI / 2);
  rig.part('cyl', 'toon', '#fde047', 1, 0, 0, 4, 1.6, 4, Math.PI / 2);
  rig.part('blade', 'toon', KODACHI_STEEL, 2, 0.6, 0, len, 5, 1.6, 0.04);
}

function slashColor(pp: PlayerPose, elem: string): string {
  switch (pp.combat.skills.activeElement) {
    case 'crimson_fire':
      return '#f97316';
    case 'thunder_lightning':
      return '#fde047';
    case 'frost_venom':
      return '#7dd3fc';
    default:
      return elem;
  }
}

function drawSwordArm(rig: Rig, pp: PlayerPose, tunicTop: number, elem: string) {
  const shoulderX = 3;
  const shoulderY = tunicTop - 4;
  const z = 10;
  const lvl = pp.combat.skills.kodachiLevel;
  const bladeLen = 26 + lvl * 2;
  if (pp.anim === 'attack') {
    // Aim in local space (sim angle has y down; local frame is facing-relative, y up).
    const local = pp.facing === 1 ? pp.attackAngle : Math.PI - pp.attackAngle;
    const aim = -local;
    // Sweep from above the aim line to below it over the 0.22 s slash.
    const k = Math.min(1, pp.attackK);
    const sweep = aim + 1.25 - k * 2.5;
    const hx = shoulderX + Math.cos(sweep) * 15;
    const hy = shoulderY + Math.sin(sweep) * 15;
    rig.arm(shoulderX, shoulderY, hx, hy, z, 3.9, '#1e293b', '#334155', SKIN);
    rig.push(hx, hy, z + 2, sweep);
    kodachi(rig, bladeLen + 6);
    rig.pop();
    // Slash crescent (elemental colour), radius grows with kodachi level.
    const arcR = 46 + lvl * 6.5;
    const c = slashColor(pp, elem);
    rig.part('arc', 'glow', c, shoulderX, shoulderY, z + 4, arcR, arcR, 10, sweep - 0.3, 0, 0);
    rig.part('arc', 'glow', '#ffffff', shoulderX, shoulderY, z + 5, arcR * 0.86, arcR * 0.86, 5, sweep - 0.1);
    return;
  }
  if (pp.anim === 'parry') {
    // Guard: blade held vertical in front, sparks ring expanding.
    const hx = shoulderX + 12;
    const hy = shoulderY - 2;
    rig.arm(shoulderX, shoulderY, hx, hy, z, 3.9, '#1e293b', '#334155', SKIN);
    rig.push(hx, hy, z + 2, Math.PI / 2 - 0.15);
    kodachi(rig, bladeLen);
    rig.pop();
    const rr = 14 + pp.beatK * 26;
    rig.part('torus', 'glow', '#fde047', hx + 6, hy + 12, z + 4, rr, rr, 10);
    for (let s = 0; s < 6; s++) {
      const a = (s * Math.PI) / 3 + pp.beatK * 2;
      rig.part('octa', 'glow', '#fef08a', hx + 6 + Math.cos(a) * rr, hy + 12 + Math.sin(a) * rr, z + 4, 2.6, 2.6, 2.6);
    }
    return;
  }
  let hx = 12;
  let hy = shoulderY - 12;
  let bladeRot = 0.75; // blade raised forward (idle guard)
  if (pp.anim === 'run') {
    hx = 11 + Math.sin(pp.gaitPhase + Math.PI) * 3;
    bladeRot = -2.6; // trailing back, ninja run
    hy = shoulderY - 10;
  } else if (pp.anim === 'jump' || pp.anim === 'fall') {
    hx = 14;
    hy = shoulderY + (pp.anim === 'jump' ? 8 : 2);
    bladeRot = pp.anim === 'jump' ? 1.2 : 0.2;
  } else if (pp.anim === 'dash') {
    hx = 16;
    hy = shoulderY - 6;
    bladeRot = -2.9;
  } else if (pp.anim === 'wall') {
    hx = 4;
    hy = shoulderY + 12;
    bladeRot = 2.3;
  } else if (pp.anim === 'hurt' || pp.anim === 'dead') {
    hx = 10;
    hy = shoulderY - 14;
    bladeRot = -1.2;
  } else {
    hy += Math.sin(pp.t * 4.8) * 1.2;
  }
  rig.arm(shoulderX, shoulderY, hx, hy, z, 3.9, '#1e293b', '#334155', SKIN);
  rig.push(hx, hy, z + 2, bladeRot);
  kodachi(rig, bladeLen);
  rig.pop();
}

/**
 * World-space extras around the player that do not turn with facing: guardian blades, barrier,
 * awakened ring, stage mounts. Caller begins the rig with a root that has no yaw (zSign 1).
 */
export function drawPlayerAura(rig: Rig, pp: PlayerPose) {
  const { t } = pp;
  const awakened = pp.combat.awakenedTimer > 0;
  // Guardian spirit blades orbit in 3D (around x and through z).
  const n = getGuardianBladeCount(pp.combat.skills.guardianLevel);
  for (let g = 0; g < n; g++) {
    const a = pp.guardianAngle + (Math.PI * 2 * g) / n;
    const x = Math.cos(a) * 64;
    const y = 28 - Math.sin(a) * 42;
    const z = Math.sin(a) * 30;
    rig.part('blade', 'toon', '#d8b4fe', x, y, z, 18, 8, 2, -(a + Math.PI * 0.5) + Math.PI / 2);
    rig.part('box', 'flat', '#fde047', x, y, z, 2.5, 10, 2.6, -(a + Math.PI * 0.5));
  }
  if (awakened || pp.combat.isImmortal) {
    const rr = pp.combat.isImmortal ? 32 : 28;
    rig.part('torus', 'glow', pp.combat.isImmortal ? '#fde047' : '#fb7185', 0, 1, 0, rr, rr, 14, 0, 0, Math.PI / 2);
  }
  if (awakened) {
    for (let k = 0; k < 3; k++) {
      const h = ((t * 1.4 + k / 3) % 1) * 70;
      const rr = 26 - h * 0.15;
      rig.part('torus', 'glow', '#f43f5e', 0, h, 0, rr, rr, 8, 0, 0, Math.PI / 2);
    }
  }
  if (pp.combat.isImmortal) {
    const rr = 42 + Math.sin(t * 6) * 2.5;
    rig.part('sphere', 'clear', '#facc15', 0, 30, 0, rr, rr, rr);
    for (let s = 0; s < 4; s++) {
      const a = t * 2.8 + (Math.PI / 2) * s;
      rig.part('octa', 'glow', '#fef08a', Math.cos(a) * (rr + 2), 30 + Math.sin(a) * rr * 0.72, Math.sin(a) * 12, 5, 7, 3);
    }
  }
  // Stage mounts.
  switch (pp.seasonId) {
    case 'celestial_altar':
      // Jade flying sword under the feet.
      rig.part('blade', 'toon', '#34d399', -34, -6, 0, 78, 12, 4);
      rig.part('cyl', 'toon', '#fde047', -36, -6, 0, 6, 2, 6, Math.PI / 2);
      rig.part('blade', 'glow', '#a7f3d0', -30, -6, 2.5, 60, 3, 1);
      break;
    case 'cavern':
      if (!pp.onGround) {
        for (let k = 0; k < 3; k++) {
          const a = t * 3 + (k * Math.PI * 2) / 3;
          rig.part('octa', 'glow', '#c084fc', Math.cos(a) * 16, -6, Math.sin(a) * 10, 4, 7, 4);
        }
      }
      break;
    case 'earth_core':
      if (pp.vy > 180 || pp.combat.dashTimer > 0) {
        rig.part('cone', 'glow', '#f59e0b', 0, -10, 0, 16, 26, 16, Math.PI);
      }
      break;
    case 'sky_sanctuary': {
      const flap = Math.sin(t * 9) * 0.35;
      for (const side of [-1, 1]) {
        rig.part('blade', 'toon', '#f8fafc', -6 * pp.facing, 40, side * 10, 40, 18, 3, (pp.facing === 1 ? Math.PI : 0) - 0.5 * pp.facing - flap * pp.facing, side * 0.7);
      }
      rig.part('torus', 'glow', '#fde047', 0, -4, 0, 28, 28, 6, 0, 0, Math.PI / 2);
      rig.part('torus', 'glow', '#38bdf8', 0, -8, 0, 18, 18, 6, 0, 0, Math.PI / 2);
      break;
    }
    case 'ocean_palace':
      for (let b = 0; b < 3; b++) {
        const bx = -pp.facing * (20 + b * 12);
        const by = 10 + Math.sin(t * 9 + b * 1.8) * 6;
        const rr = 4.5 - b * 0.8;
        rig.part('sphere', 'clear', '#a5f3fc', bx, by, 0, rr, rr, rr);
      }
      break;
    case 'winter':
      if (Math.abs(pp.vx) > 220) {
        rig.part('box', 'glow', '#e0f2fe', -pp.facing * 24, 1, 0, 40, 2, 6);
      }
      break;
    default:
      break;
  }
}
