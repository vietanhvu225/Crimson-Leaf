import type { Rig } from './parts.ts';

// Captive mother shrine on the final stage (render/characters/motherShrine.ts): lotus cloud altar,
// chibi mother in white robes facing the player, crimson seal cage while the boss lives, golden
// rings once she is freed. Local frame: altar top at 0, y up; the caller hovers it.

export function drawMother(rig: Rig, bossAlive: boolean, t: number) {
  // Lotus altar.
  rig.part('cyl', 'toon', '#fde047', 0, -8, 0, 46, 10, 30);
  rig.part('cyl', 'toon', '#f8fafc', 0, -2, 0, 36, 6, 24);
  for (let k = 0; k < 8; k++) {
    const a = (k * Math.PI * 2) / 8 + 0.2;
    rig.part('cone4', 'toon', k % 2 ? '#fda4af' : '#fef9c3', Math.cos(a) * 42, -6, Math.sin(a) * 26, 7, 14, 4, -Math.cos(a) * 0.7, -a, Math.sin(a) * 0.7);
  }
  // Halo.
  rig.part('torus', 'glow', bossAlive ? '#f43f5e' : '#fde047', 0, 30, -16, 38, 38, 8);

  // Mother (facing -x: toward the arriving player).
  rig.push(0, 0, 0, 0, Math.PI - 0.45);
  rig.part('cone', 'toon', '#f8fafc', 0, 16, 0, 15, 34, 13);
  rig.part('rbox', 'toon', '#f8fafc', 0, 24, 0, 22, 18, 18);
  rig.part('box', 'toon', '#10b981', 0, 16, 0, 23, 5, 19);
  rig.part('sphere', 'toon', '#fde047', 11, 16, 0, 2.4, 3.8, 3.8);
  // Sleeves (hands clasped in prayer).
  rig.limb(-2, 31, 9, 22, 8, 4, '#f8fafc');
  rig.limb(-2, 31, 9, 22, -8, 4, '#f8fafc');
  rig.part('sphere', 'toon', '#fef3c7', 11, 23, 0, 4, 4, 4);
  // Head.
  const hy = 48;
  const r = 15.5;
  rig.part('sphere', 'toon', '#fef3c7', 0, hy, 0, r, r, r);
  for (const [ang, sc] of [
    [0.5, 1],
    [-0.3, 0.75],
  ] as const) {
    const nx = Math.cos(ang);
    const nz = Math.sin(ang);
    rig.push(nx * r * 0.93, hy + 1, nz * r * 0.93, 0, Math.atan2(nx, nz));
    rig.eye(0, 0, 0, 3.4 * sc, 4.2, '#10b981');
    rig.pop();
  }
  rig.part('sphere', 'flat', '#fb7185', Math.cos(0.8) * r * 0.9, hy - 3.5, Math.sin(0.8) * r * 0.9, 3.2, 1.8, 1.4);
  // Hair, bun and golden phoenix hairpin.
  rig.part('sphere', 'toon', '#1e293b', -r * 0.2, hy + r * 0.3, 0, r * 0.98, r * 0.85, r * 1.03);
  rig.part('sphere', 'toon', '#1e293b', -8, hy + 19, 0, 8.5, 8.5, 8.5);
  rig.part('rbox', 'toon', '#fde047', -6, hy + 20, 0, 16, 4, 4, 0.2);
  rig.part('sphere', 'glow', '#fde047', 3, hy + 22, 0, 2.4, 2.4, 2.4);
  rig.pop();

  if (bossAlive) {
    // Crimson seal cage: bars around her + top and bottom rings.
    for (let k = 0; k < 10; k++) {
      const a = (k * Math.PI * 2) / 10 + t * 0.4;
      rig.part('cyl', 'glow', '#f43f5e', Math.cos(a) * 32, 36, Math.sin(a) * 26, 1.4, 78, 1.4);
    }
    rig.part('torus', 'glow', '#f43f5e', 0, 75, 0, 32, 26, 20, 0, 0, Math.PI / 2);
    rig.part('torus', 'glow', '#f43f5e', 0, -2, 0, 32, 26, 20, 0, 0, Math.PI / 2);
  } else {
    // Freed: golden rings rising.
    for (let k = 0; k < 2; k++) {
      const rr = 42 + Math.sin(t * 8 + k) * 4;
      rig.part('torus', 'glow', '#fde047', 0, 20 + k * 30, 0, rr, rr * 0.7, 10, 0, 0, Math.PI / 2);
    }
  }
}
