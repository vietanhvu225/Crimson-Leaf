import * as THREE from 'three';
import { computeSubterraneanSlopeY, type SeasonId } from '../../rules/index.ts';
import type { World } from '../../engine/world.ts';
import type { PlatformBranch, StageHazardZone } from '../../engine/entities.ts';
import { getChibiStagePalette, type ChibiStagePalette } from '../../render/map/stagePalette.ts';
import { LANE_Z, S, laneSpan, toX, toY } from '../coords.ts';
import { TextSprite } from '../label.ts';
import type { RenderFrame3D, RenderModule, RenderModuleContext, RenderModuleDef } from '../module.ts';
import { cssColor } from '../resources.ts';
import { Backdrop, viewAtDepth, type DepthView } from './backdrop.ts';
import { HitboxOverlay } from './hitboxes.ts';
import { Batch, caustics, createGeometries, createMaterials, setSwayTime } from './kit.ts';
import { SkyDome } from './sky.ts';
import { Trunks } from './trunks.ts';
import { WaterSurface, waterLook } from './water.ts';

// T03 environment kit (slot `env`): sky dome + fog, multi-layer backdrop in real depth, world trunks,
// platforms per PlatformSubType, water/magma shader, hazards, seal gates, grapple lanterns,
// checkpoint shrines, earth-core slope, and the `?debug=1` hitbox overlay. Stages 1–4 by T03;
// T06 adds 5–11: reef/jellyfish platforms + caustics + dense fog underwater, iron bridges over
// the magma, sky-rock islands, bagua pads, amethyst clusters, earth-core crust cap + 45°/90° callouts,
// and each stage's grapple item.

const GROUND_BODY_H = 240;
/** Fog [near, far] offsets from the camera-to-target distance (T06: closer, denser in caves / underwater). */
const FOG_DEFAULT: [number, number] = [2, 95];
const FOG_SHAPE: Partial<Record<SeasonId, [number, number]>> = {
  cavern: [0, 70],
  ocean_palace: [-3, 48],
  earth_core: [0, 70],
  blood_abyss: [1, 80],
};
/** Enclosed stages fade into darkness, not into a bright horizon colour. */
const FOG_COLOR: Partial<Record<SeasonId, string>> = {
  cavern: '#2a0d52',
  ocean_palace: '#0b5e6e',
  earth_core: '#2e190b',
  blood_abyss: '#4a0a0a',
  thunder_peak: '#1e1b4b',
  celestial_altar: '#1f0d45',
};
/** Checkpoint shrines stand behind lane 1 so they never cover the player. */
const SHRINE_Z = -3.9;
/** Player-in-lane-1 occlusion cut: lane-0 slabs within this sim box around the player are cut away. */
const CUT_HALF_W = 260;
const CUT_ABOVE = 420;
const CUT_BELOW = 140;

interface PlatformLook {
  body: string;
  cap: string;
  hi: string;
}

const SUBTYPE_LOOK: Partial<Record<PlatformBranch['type'], PlatformLook>> = {
  springboard: { body: '#15803d', cap: '#4ade80', hi: '#bbf7d0' },
  bagua_pad: { body: '#b45309', cap: '#fde047', hi: '#fef9c3' },
  ice: { body: '#0284c7', cap: '#bae6fd', hi: '#ffffff' },
  collapsing: { body: '#9a3412', cap: '#fb923c', hi: '#fed7aa' },
  moving: { body: '#0369a1', cap: '#38bdf8', hi: '#e0f2fe' },
  roof: { body: '#881337', cap: '#f43f5e', hi: '#fda4af' },
};

function geyserColors(seasonId: SeasonId): [string, string] {
  if (seasonId === 'summer') return ['#38bdf8', '#bae6fd'];
  if (seasonId === 'cavern') return ['#c084fc', '#f5d0fe'];
  return ['#fb923c', '#fef08a'];
}

function haloColor(seasonId: SeasonId): string {
  switch (seasonId) {
    case 'ocean_palace':
      return '#67e8f9';
    case 'winter':
      return '#bae6fd';
    case 'cavern':
      return '#e879f9';
    case 'thunder_peak':
      return '#fef08a';
    case 'summer':
      return '#6ee7b7';
    case 'blood_abyss':
      return '#ef4444';
    case 'earth_core':
      return '#fbbf24';
    case 'celestial_altar':
    case 'sky_sanctuary':
      return '#fde68a';
    default:
      return '#fda4af';
  }
}

function create(ctx: RenderModuleContext): RenderModule {
  const { scene, track, camera } = ctx;
  const root = new THREE.Group();
  root.name = 'env-kit';
  scene.add(root);
  const g = createGeometries(track);
  const m = createMaterials(track);
  const tmp = new THREE.Color();
  const target = new THREE.Vector3();
  const dv: DepthView = { cx: 0, cy: 0, halfW: 1, halfH: 1 };

  const sky = new SkyDome(track, root);
  const fog = new THREE.Fog(0x000000, 22, 110);
  scene.fog = fog;
  const backdrop = new Backdrop(root, g, m);
  const trunks = new Trunks(root, g, m);
  const water = new WaterSurface(track, root);
  const debugParams = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
  const hitboxes = debugParams?.get('debug') === '1' ? new HitboxOverlay(track, root) : null;

  // Platforms.
  const pBody = new Batch(root, g.box, m.solid, 512, { castShadow: true, receiveShadow: true });
  const pDetail = new Batch(root, g.box, m.solid, 1024, { receiveShadow: true });
  const pRound = new Batch(root, g.sphere, m.solid, 512, { receiveShadow: true });
  const pCone = new Batch(root, g.cone, m.solid, 128);
  const pGhost = new Batch(root, g.box, m.ghost, 256, { renderOrder: 1 });
  const pCut = new Batch(root, g.box, m.cut, 64, { renderOrder: 2 });
  const pCutEdge = new Batch(root, g.box, m.cutEdge, 64, { renderOrder: 3 });
  // Hazards.
  const hCone = new Batch(root, g.cone, m.solid, 256, { castShadow: true });
  const hBox = new Batch(root, g.box, m.solid, 64, { castShadow: true });
  const hRound = new Batch(root, g.sphere, m.solid, 128);
  const hGlass = new Batch(root, g.box, m.glass, 64, { renderOrder: 2 });
  const hGlow = new Batch(root, g.box, m.glow, 64);
  const hFade = new Batch(root, g.quad, m.fade, 32, { renderOrder: 2 });
  // Props: shrines, gates, lanterns.
  const propBox = new Batch(root, g.box, m.solid, 128, { castShadow: true });
  const propCyl = new Batch(root, g.cyl, m.solid, 64, { castShadow: true });
  const propRound = new Batch(root, g.sphere, m.solid, 64);
  const propCone = new Batch(root, g.cone, m.solid, 32);
  const propDisc = new Batch(root, g.disc, m.solid, 32);
  const glows = new Batch(root, g.sphere, m.glow, 64);
  const glowOcta = new Batch(root, g.octa, m.glow, 32);
  const halos = new Batch(root, g.quad, m.halo, 64, { renderOrder: 6 });
  const barriers = new Batch(root, g.box, m.barrier, 16, { renderOrder: 3 });
  const batches = [
    pBody, pDetail, pRound, pCone, pGhost, pCut, pCutEdge,
    hCone, hBox, hRound, hGlass, hGlow, hFade,
    propBox, propCyl, propRound, propCone, propDisc, glows, glowOcta, halos, barriers,
  ];

  // Earth core slope: one extruded strip per level (bedrock + ceiling).
  let slopeMesh: THREE.Mesh | null = null;
  let slopeGeom: THREE.BufferGeometry | null = null;
  const slopeMat = track.material(new THREE.MeshStandardMaterial({ roughness: 0.9 }));

  const gateLabels: TextSprite[] = [];
  const shrineLabels: TextSprite[] = [];
  let builtVersion = -1;
  let pal: ChibiStagePalette = getChibiStagePalette('spring', false);
  let seasonId: SeasonId = 'spring';
  let baguaSpin = 0;

  function rebuildLevel(f: RenderFrame3D) {
    seasonId = f.st.seasonId;
    pal = getChibiStagePalette(seasonId, f.isLoop2);
    const glowDir = new THREE.Vector3(0, 0.12, -1);
    // Sunset glow only on autumn (the sun sits in the middle of its sky).
    const glow = seasonId === 'autumn' ? 0.35 : 0;
    const glowColor = '#fb923c';
    sky.setPalette(pal, cssColor, glowColor, glow, glowDir);
    // Aerial perspective: far layers fade toward the lower sky colour (underwater: dense cyan tint).
    fog.color.copy(cssColor(pal.skyBottom)).lerp(cssColor(pal.skyMid), 0.35);
    const fogColor = FOG_COLOR[seasonId];
    if (fogColor) fog.color.copy(cssColor(f.isLoop2 ? '#4c0d28' : fogColor));
    backdrop.setStage(seasonId, f.isLoop2, pal);
    water.setLook(waterLook(seasonId, f.isLoop2), cssColor);
    rebuildSlope(f);
  }

  function rebuildSlope(f: RenderFrame3D) {
    if (slopeMesh) {
      root.remove(slopeMesh);
      slopeMesh = null;
    }
    if (slopeGeom) {
      track.release(slopeGeom);
      slopeGeom = null;
    }
    if (f.st.seasonId !== 'earth_core') return;
    const x0 = 160;
    const x1 = f.cfg.stageLength - 980;
    const floor = new THREE.Shape();
    const ceil = new THREE.Shape();
    const pts: THREE.Vector2[] = [];
    for (let sx = x0; sx <= x1; sx += 15) {
      const modX = (((sx - 180) % 900) + 900) % 900;
      if (modX >= 530 && modX < 545) {
        const cliffX = sx - modX + 540;
        pts.push(new THREE.Vector2(cliffX, computeSubterraneanSlopeY(cliffX - 1)));
        pts.push(new THREE.Vector2(cliffX, computeSubterraneanSlopeY(cliffX + 1)));
      } else {
        pts.push(new THREE.Vector2(sx, computeSubterraneanSlopeY(sx)));
      }
    }
    floor.moveTo(toX(pts[0].x), toY(pts[0].y));
    for (const p of pts) floor.lineTo(toX(p.x), toY(p.y));
    const last = pts[pts.length - 1];
    floor.lineTo(toX(last.x), toY(last.y + 520));
    floor.lineTo(toX(pts[0].x), toY(pts[0].y + 520));
    ceil.moveTo(toX(pts[0].x), toY(pts[0].y - 430));
    for (const p of pts) ceil.lineTo(toX(p.x), toY(p.y - 430));
    ceil.lineTo(toX(last.x), toY(last.y - 690));
    ceil.lineTo(toX(pts[0].x), toY(pts[0].y - 690));
    const { z, depth } = laneSpan('both');
    const geo = new THREE.ExtrudeGeometry([floor, ceil], { depth, bevelEnabled: false, steps: 1 });
    geo.translate(0, 0, z - depth / 2);
    slopeGeom = track.geometry(geo);
    slopeMat.color.copy(cssColor(pal.groundBodyFill));
    slopeMesh = new THREE.Mesh(slopeGeom, slopeMat);
    slopeMesh.receiveShadow = true;
    root.add(slopeMesh);
  }

  // ---------- earth core: slope crust cap, 45°/90° callouts (T06) ----------

  const slopeLabels: TextSprite[] = [];
  const segA = new THREE.Vector2();

  function slopeDetails(f: RenderFrame3D) {
    let li = 0;
    if (seasonId === 'earth_core') {
      const { z, depth } = laneSpan('both');
      const front = z + depth / 2;
      const x0 = Math.max(160, Math.floor(f.viewMinX / 30) * 30);
      const x1 = Math.min(f.cfg.stageLength - 980, f.viewMaxX);
      const cap = cssColor(pal.groundCapFill);
      const gold = cssColor('#fde047');
      // Crust cap along the floor: one rotated slab per 30 px chord (cliffs give a vertical chord).
      let px = x0;
      let py = computeSubterraneanSlopeY(x0);
      for (let sx = x0 + 30; sx <= x1 + 30; sx += 30) {
        const sy = computeSubterraneanSlopeY(sx);
        const modX = (((sx - 180) % 900) + 900) % 900;
        let nx = sx;
        let ny = sy;
        if (modX >= 540 && modX < 570) {
          // Pass the 90° drop: go to the ledge corner, then straight down.
          const cliffX = sx - modX + 540;
          const top = computeSubterraneanSlopeY(cliffX - 1);
          capChord(px, py, cliffX, top, front, depth, cap, gold);
          capChord(cliffX, top, cliffX, computeSubterraneanSlopeY(cliffX + 1), front, depth, cap, gold);
          px = cliffX;
          py = computeSubterraneanSlopeY(cliffX + 1);
        }
        capChord(px, py, nx, ny, front, depth, cap, gold);
        px = nx;
        py = ny;
      }
      // Callouts (canvas: ramp depth plate + 90° shaft plate and dashed guide).
      const c0 = Math.max(0, Math.floor((x0 - 180) / 900));
      const c1 = Math.floor((x1 - 180) / 900) + 1;
      for (let c = c0; c <= c1; c++) {
        const rampX = 180 + c * 900 + 210;
        if (rampX >= x0 && rampX <= x1) {
          const ry = computeSubterraneanSlopeY(rampX);
          li = slopeLabel(li, `↘ DỐC CHÉO 45° (-${Math.round(120 + c * 180)}m)`, '#fde047', rampX, ry + 52, front);
        }
        const cliffX = 180 + c * 900 + 540;
        if (cliffX >= x0 && cliffX <= x1) {
          const top = computeSubterraneanSlopeY(cliffX - 2);
          const bot = computeSubterraneanSlopeY(cliffX + 2);
          for (let gy = top + 10; gy < bot - 14; gy += 18) {
            hGlow.rect(cliffX + 42, gy, cliffX + 46, gy + 10, front - 0.4, 0.04, cssColor('#fbbf24'));
          }
          li = slopeLabel(li, '⬇ HỐ THẲNG ĐỨNG 90°', '#fef08a', cliffX + 75, top - 33, front);
        }
      }
    }
    for (let i = li; i < slopeLabels.length; i++) slopeLabels[i].hide();
  }

  function capChord(ax: number, ay: number, bx: number, by: number, front: number, depth: number, cap: THREE.Color, gold: THREE.Color) {
    segA.set(bx - ax, by - ay);
    const len = segA.length();
    if (len < 0.5) return;
    const rot = -Math.atan2(by - ay, bx - ax);
    const cx = (ax + bx) / 2;
    const cy = (ay + by) / 2;
    pBody.at(cx, cy + 4, laneSpan('both').z, len + 8, 14, depth + 0.12, cap, rot);
    pDetail.at(cx, cy - 2, front + 0.07, len + 2, 4, 0.04, gold, rot);
  }

  function slopeLabel(li: number, text: string, color: string, x: number, y: number, front: number) {
    if (li >= slopeLabels.length) slopeLabels.push(new TextSprite(track, root));
    const label = slopeLabels[li];
    label.set(text, color, 'rgba(15,23,42,0.85)');
    label.place(toX(x), toY(y), front + 0.3, 1);
    return li + 1;
  }

  // ---------- platforms ----------

  function groundPlatform(p: PlatformBranch, px: number, z: number, depth: number, f: RenderFrame3D) {
    const py = p.y;
    const pw = p.w;
    const front = z + depth / 2;
    pBody.rect(px, py, px + pw, py + GROUND_BODY_H, z, depth, cssColor(pal.groundBodyFill));
    // Rounded cobblestone bricks on the front wall (only the visible stretch).
    const brick = cssColor(pal.groundBrickFill);
    const bx0 = Math.max(px + 14, Math.floor((f.viewMinX - px) / 76) * 76 + px + 14);
    const bx1 = Math.min(px + pw - 50, f.viewMaxX);
    for (let bx = bx0; bx < bx1; bx += 76) {
      const row = Math.floor((bx - px) / 76) % 2 === 0 ? 24 : 44;
      pDetail.rect(bx, py + row, bx + 44, py + row + 20, front + 0.02, 0.06, brick);
      pDetail.rect(bx + 38, py + row + 52, bx + 82, py + row + 72, front + 0.02, 0.06, brick);
    }
    // Overhanging turf / snow cap with scalloped lumps and a glossy top stripe.
    const cap = cssColor(pal.groundCapFill);
    pBody.rect(px - 4, py - 4, px + pw + 4, py + 16, z, depth + 0.14, cap);
    const sx0 = Math.max(px + 18, Math.floor((f.viewMinX - px) / 44) * 44 + px + 18);
    const sx1 = Math.min(px + pw - 18, f.viewMaxX);
    for (let sx = sx0; sx < sx1; sx += 44) pRound.at(sx, py + 15, front + 0.04, 22, 20, 0.16, cap);
    pDetail.rect(px + 6, py - 6, px + pw - 6, py - 3, front - 0.12, 0.22, cssColor(pal.groundCapHighlight));
  }

  function lotusPad(p: PlatformBranch, px: number, z: number, depth: number) {
    const cx = px + p.w / 2;
    const d = Math.min(depth, 1.5);
    pRound.at(cx, p.y + 10, z, p.w * 1.04, 26, d, cssColor('#047857'));
    pRound.at(cx, p.y + 5, z, p.w, 20, d - 0.08, cssColor('#10b981'));
    const pink = cssColor('#fb7185');
    for (const a of [-0.6, 0, 0.6]) pRound.at(px + 24 + a * 8, p.y - 6, z + d * 0.3, 10, 18, 0.1, pink, -a);
  }

  function cloudCushion(p: PlatformBranch, px: number, z: number, depth: number) {
    pBody.rect(px + 2, p.y + 6, px + p.w - 2, p.y + 24, z, depth * 0.8, cssColor('#bae6fd'));
    const n = Math.max(3, Math.floor(p.w / 42));
    const step = p.w / n;
    const white = cssColor('#ffffff');
    for (let i = 0; i <= n; i++) {
      const r = i === 0 || i === n ? 24 : 32;
      pRound.at(px + i * step, p.y + 6, z, r, r, depth * 0.75, white);
    }
  }

  function slabPlatform(p: PlatformBranch, px: number, z: number, depth: number) {
    const py = p.y;
    const pw = p.w;
    const look = SUBTYPE_LOOK[p.type];
    const body = cssColor(look?.body ?? pal.platformBodyFill);
    const cap = cssColor(look?.cap ?? pal.platformCapFill);
    const hi = cssColor(look?.hi ?? '#ffffff');
    const front = z + depth / 2;
    pBody.rect(px, py + 4, px + pw, py + 24, z, depth, body);
    if (p.type === 'roof') {
      // Curved temple roof: wide eave, raised ridge, gold tips.
      pBody.rect(px - 8, py - 2, px + pw + 8, py + 12, z, depth + 0.24, cap);
      pDetail.rect(px + pw * 0.2, py - 7, px + pw * 0.8, py - 1, z, depth * 0.6, cap);
      for (const ex of [px - 8, px + pw + 8]) pRound.at(ex, py, front + 0.1, 12, 12, 0.12, cssColor('#fde047'));
    } else {
      pBody.rect(px - 3, py - 2, px + pw + 3, py + 11, z, depth + 0.1, cap);
    }
    tmp.copy(hi).lerp(cap, 0.25);
    pDetail.rect(px + 8, py - 3, px + pw - 8, py, front - 0.1, 0.16, tmp);
    const cx = px + pw / 2;
    switch (p.type) {
      case 'springboard':
        pRound.at(cx, py - 4, z, 16, 16, 0.18, cssColor('#fef08a'));
        pDetail.rect(cx - 3, py + 2, cx + 3, py + 8, z, 0.06, cssColor('#166534'));
        break;
      case 'collapsing': {
        const ink = cssColor('#1a0f0a');
        pDetail.at(cx - 4, py + 6, front + 0.02, 14, 3, 0.04, ink, -0.9);
        pDetail.at(cx + 3, py + 15, front + 0.02, 10, 3, 0.04, ink, -0.6);
        break;
      }
      case 'moving':
        for (const ex of [px + 6, px + pw - 6]) pRound.at(ex, py + 14, front + 0.04, 14, 14, 0.14, cssColor('#e0f2fe'));
        break;
      case 'ice': {
        const ice = cssColor('#bae6fd');
        const n = Math.max(2, Math.floor(pw / 50));
        for (let i = 0; i < n; i++) {
          const ix = px + ((i + 0.5) * pw) / n;
          pCone.at(ix, py + 34, z, 14, 22, 0.14, ice, Math.PI);
        }
        break;
      }
      case 'bagua_pad': {
        // Bagua launch pad: glowing trigram ring spinning above the slab + yin-yang core.
        pRound.at(cx, py + 13, front + 0.03, 22, 22, 0.08, cssColor('#1e293b'));
        pRound.at(cx - 4, py + 13, front + 0.07, 9, 9, 0.04, cssColor('#f8fafc'));
        const a0 = baguaSpin;
        for (let k = 0; k < 8; k++) {
          const a = a0 + (k * Math.PI) / 4;
          const r = Math.min(pw * 0.42, 60);
          glows.at(cx + Math.cos(a) * r, py - 8, z + Math.sin(a) * Math.min(depth * 0.45, 1), 14, 3, 0.08, cssColor('#fde047'), 0, -a);
        }
        break;
      }
      default:
        break;
    }
  }

  function ghostPlatform(p: PlatformBranch, px: number, z: number, depth: number, batch: Batch) {
    const look = SUBTYPE_LOOK[p.type];
    const isGround = p.type === 'ground';
    const body = cssColor(isGround ? pal.groundBodyFill : look?.body ?? pal.platformBodyFill);
    const cap = cssColor(isGround ? pal.groundCapFill : look?.cap ?? '#64748b');
    const h = isGround ? GROUND_BODY_H : 24;
    batch.rect(px, p.y + 4, px + p.w, p.y + h, z, depth, body);
    batch.rect(px - 3, p.y - 2, px + p.w + 3, p.y + 11, z, depth + 0.1, cap);
  }

  // ---------- T06: stage-specific platform looks (5–11) ----------

  /** Underwater ground: no dirt, a reef of open pearl clams, staghorn coral and swaying kelp. */
  function reefGround(p: PlatformBranch, px: number, z: number, depth: number, f: RenderFrame3D) {
    const py = p.y;
    pRound.at(px + p.w / 2, py + 14, z, p.w + 10, 26, depth, cssColor(pal.groundBodyFill));
    const n = Math.max(3, Math.floor(p.w / 88));
    const step = p.w / n;
    const rows = depth > 2 ? [z + depth / 2 - 0.5, z - depth / 2 + 0.6] : [z];
    for (let m = 0; m < n; m++) {
      const mx = px + (m + 0.5) * step;
      if (mx < f.viewMinX - 100 || mx > f.viewMaxX + 100) continue;
      const rx = step * 0.48;
      const even = m % 2 === 0;
      for (const rz of rows) {
        // Kelp fronds (two segments, swaying).
        for (const k of [-0.55, 0.55]) {
          const kx = mx + k * rx;
          const a = Math.sin(f.t * 1.6 + kx * 0.02) * 0.25;
          const kelp = cssColor(even ? '#10b981' : '#22d3ee');
          pDetail.at(kx, py - 12, rz - 0.15, 6, 32, 0.06, kelp, a * 0.5);
          pDetail.at(kx - Math.sin(a) * 30, py - 40, rz - 0.15, 6, 30, 0.06, kelp, a);
        }
        // Staghorn coral.
        const coral = cssColor(even ? '#fb7185' : '#fde047');
        pDetail.at(mx, py - 12, rz - 0.3, 8, 40, 0.08, coral);
        pDetail.at(mx - 10, py - 18, rz - 0.3, 6, 26, 0.07, coral, 0.8);
        pDetail.at(mx + 10, py - 24, rz - 0.3, 6, 26, 0.07, coral, -0.8);
        // Open clam: lower cradle, tilted upper valve, glowing pearl.
        pRound.at(mx, py + 8, rz, rx * 1.76, 26, 0.5, cssColor(even ? '#f472b6' : '#0284c7'));
        pRound.at(mx - 4, py - 4, rz - 0.12, rx * 1.56, 22, 0.4, cssColor(even ? '#c084fc' : '#38bdf8'), -0.35);
        glows.at(mx + 2, py + 1, rz + 0.18, 17, 17, 0.17, cssColor('#fef08a'));
      }
      halos.at(mx, py, z + depth / 2 + 0.1, 70, 50, 1, cssColor('#67e8f9'));
    }
  }

  /** Mid-water floating platform: glowing jellyfish bell with tentacles and a pearl crown. */
  function jellyCushion(p: PlatformBranch, px: number, z: number, depth: number, f: RenderFrame3D) {
    const cx = px + p.w / 2;
    const py = p.y;
    const d = Math.min(depth, 1.4);
    pRound.at(cx, py + 12, z, p.w * 0.96, 30, d, cssColor('#0891b2'));
    pRound.at(cx, py + 8, z + 0.05, p.w * 0.84, 22, d * 0.9, cssColor('#22d3ee'));
    for (let t = -3; t <= 3; t++) {
      const tx = cx + t * p.w * 0.12;
      const a = Math.sin(f.t * 3 + t) * 0.25;
      pDetail.at(tx, py + 34, z, 4, 34, 0.05, cssColor(Math.abs(t) % 2 === 0 ? '#67e8f9' : '#f472b6'), a);
    }
    pRound.at(cx - 18, py + 2, z + 0.1, 12, 12, 0.12, cssColor('#f472b6'));
    pRound.at(cx + 18, py + 2, z + 0.1, 12, 12, 0.12, cssColor('#f472b6'));
    glows.at(cx, py - 1, z + 0.12, 15, 15, 0.15, cssColor('#fef08a'));
  }

  /** Blood abyss: every bridge is a red-hot iron girder (canvas: "toàn bộ cầu sắt đều sập"). */
  function ironBridge(p: PlatformBranch, px: number, z: number, depth: number, f: RenderFrame3D) {
    const py = p.y;
    const pw = p.w;
    const front = z + depth / 2;
    const shaking = !!p.collapseTimer && p.collapseTimer > 0;
    pBody.rect(px, py + 2, px + pw, py + 22, z, depth, cssColor('#27272a'));
    pBody.rect(px - 3, py - 2, px + pw + 3, py + 6, z, depth + 0.08, cssColor('#52525b'));
    // Truss Xs under the deck.
    const n = Math.max(1, Math.floor(pw / 40));
    for (let i = 0; i < n; i++) {
      const bx = px + ((i + 0.5) * pw) / n;
      pDetail.at(bx, py + 13, front + 0.02, 32, 3, 0.04, cssColor('#18181b'), 0.5);
      pDetail.at(bx, py + 13, front + 0.02, 32, 3, 0.04, cssColor('#18181b'), -0.5);
      pRound.at(bx, py + 2, front + 0.03, 6, 6, 0.06, cssColor('#a1a1aa'));
    }
    // Glowing hot seam: orange, flashing yellow while it is about to collapse.
    const hot = shaking ? (Math.sin(f.t * 40) > 0 ? '#fef08a' : '#f97316') : '#ea580c';
    hGlow.rect(px, py + 20, px + pw, py + 24, front - 0.05, 0.1, cssColor(hot));
  }

  /** Thunder peak: slabs are floating sky-rock islands (inverted rock cone under the slab). */
  function skyRock(p: PlatformBranch, px: number, z: number, depth: number) {
    pCone.at(px + p.w / 2, p.y + 24 + p.w * 0.22, z, p.w * 0.9, p.w * 0.44, Math.min(depth, 1.2), cssColor('#312e81'), Math.PI);
  }

  function drawPlatform(p: PlatformBranch, px: number, z: number, depth: number, f: RenderFrame3D) {
    // Same rule as the canvas: the ocean palace, and anything sunk below a stage's water line, is reef.
    const wl = f.cfg.waterLevelY;
    // (Summer keeps T03's lotus pads.)
    if (seasonId === 'ocean_palace' || (wl !== null && seasonId !== 'summer' && p.y >= wl + 12)) {
      if (p.type === 'ground') reefGround(p, px, z, depth, f);
      else jellyCushion(p, px, z, depth, f);
    } else if (seasonId === 'sky_sanctuary') cloudCushion(p, px, z, depth);
    else if (seasonId === 'summer' && p.type !== 'roof') lotusPad(p, px, z, depth);
    else if (seasonId === 'blood_abyss' && (p.type === 'collapsing' || p.type === 'moving')) ironBridge(p, px, z, depth, f);
    else if (p.type === 'ground') {
      groundPlatform(p, px, z, depth, f);
      if (seasonId === 'cavern') crystalCluster(p, z, depth, f);
    } else {
      slabPlatform(p, px, z, depth);
      if (seasonId === 'thunder_peak' && p.type !== 'moving') skyRock(p, px, z, depth);
    }
  }

  /** Cavern ground: amethyst clusters growing out of the crystal cap every ~260 px. */
  function crystalCluster(p: PlatformBranch, z: number, depth: number, f: RenderFrame3D) {
    const x0 = Math.max(p.x + 60, Math.floor((f.viewMinX - p.x) / 260) * 260 + p.x + 60);
    const x1 = Math.min(p.x + p.w - 40, f.viewMaxX);
    const back = z - depth / 2 + 0.4;
    for (let x = x0; x < x1; x += 260) {
      glowOcta.at(x, p.y - 14, back, 16, 34, 0.16, cssColor('#c084fc'), -0.35);
      glowOcta.at(x + 12, p.y - 20, back, 20, 46, 0.2, cssColor('#e879f9'));
      glowOcta.at(x + 26, p.y - 12, back, 14, 28, 0.14, cssColor('#a855f7'), 0.4);
    }
  }

  function platforms(world: World, f: RenderFrame3D) {
    const isEarthCore = seasonId === 'earth_core';
    const zLane = world.combat.zLane;
    const pl = world.player;
    const nearPlayer = (p: PlatformBranch) =>
      p.x - CUT_HALF_W < pl.x && p.x + p.w + CUT_HALF_W > pl.x && p.y > pl.y - CUT_ABOVE && p.y < pl.y + CUT_BELOW;
    const edge = cssColor(pal.platformCapFill);
    for (const p of world.platforms) {
      if (p.respawnTimer && p.respawnTimer > 0) continue;
      if (p.x + p.w < f.viewMinX || p.x > f.viewMaxX) continue;
      if (p.y > f.viewMaxY + 300 || p.y < f.viewMinY - 300) continue;
      if (isEarthCore && p.type === 'ground' && p.x >= 150 && p.x < f.cfg.stageLength - 980) continue;
      const { z, depth } = laneSpan(p.zLane);
      const tremble = p.collapseTimer && p.collapseTimer > 0 ? Math.sin(f.t * 90 + p.baseX) * 3 : 0;
      const px = p.x + tremble;
      const sameLane = p.zLane === 'both' || p.zLane === zLane;
      if (!sameLane) {
        // Lane-0 slab between the camera and a lane-1 player: cut away, keep only a thin top edge.
        if (zLane === 1 && p.zLane === 0 && nearPlayer(p)) {
          ghostPlatform(p, px, z, depth, pCut);
          pCutEdge.rect(px - 3, p.y - 2, px + p.w + 3, p.y + 1, z + depth / 2, 0.02, edge);
        } else {
          ghostPlatform(p, px, z, depth, pGhost);
        }
        continue;
      }
      if (zLane === 1 && p.zLane === 'both' && p.y < pl.y - 20 && nearPlayer(p)) {
        // A two-lane slab above a lane-1 player: its top reaches toward the camera and would hide the
        // player. Keep the lane-1 strip solid (still standable-looking), cut the front part away.
        const back = laneSpan(1);
        drawPlatform(p, px, back.z, back.depth, f);
        const front = z + depth / 2;
        const cutBack = back.z + back.depth / 2;
        ghostPlatform(p, px, (front + cutBack) / 2, front - cutBack, pCut);
        pCutEdge.rect(px - 3, p.y - 2, px + p.w + 3, p.y + 1, front, 0.02, edge);
        continue;
      }
      drawPlatform(p, px, z, depth, f);
    }
  }

  // ---------- hazards ----------

  function hazards(world: World, f: RenderFrame3D) {
    const lanes = [LANE_Z[0], LANE_Z[1]];
    for (const hz of world.hazards) {
      if (hz.x + hz.w < f.viewMinX || hz.x > f.viewMaxX) continue;
      const hy = hz.fallY ?? hz.y;
      if (Math.max(hz.y, hy) + hz.h < f.viewMinY - 200 || Math.min(hz.y, hy) > f.viewMaxY + 200) continue;
      switch (hz.kind) {
        case 'spike_trap':
          spikes(hz, lanes);
          break;
        case 'icicle': {
          const iy = hz.fallY ?? hz.y;
          for (const z of lanes) {
            hCone.at(hz.x + hz.w / 2, iy + 24, z, hz.w - 8, 48, 0.32, cssColor('#7dd3fc'), Math.PI);
            hCone.at(hz.x + hz.w * 0.42, iy + 14, z + 0.1, (hz.w - 8) * 0.35, 24, 0.12, cssColor('#ffffff'), Math.PI);
          }
          break;
        }
        case 'updraft': {
          const purple = seasonId === 'cavern';
          const swirl = cssColor(purple ? '#e879f9' : '#4ade80');
          for (const lz of lanes) {
            hFade.rect(hz.x, hz.y, hz.x + hz.w, hz.y + hz.h, lz, 1, cssColor(purple ? '#c084fc' : '#86efac'));
            for (let s = 0; s < 3; s++) {
              const sy = hz.y + (hz.h - ((f.t * 195 + s * 130) % hz.h));
              hRound.at(hz.x + 16 + s * 22 + Math.sin(f.t * 5 + s) * 6, sy, lz, 12, 18, 0.12, swirl);
            }
          }
          break;
        }
        case 'geyser':
          geyser(hz, f, lanes);
          break;
        case 'lightning':
          lightning(hz, f, lanes);
          break;
      }
    }
  }

  function spikes(hz: StageHazardZone, lanes: number[]) {
    const n = Math.max(4, Math.floor(hz.w / 20));
    const sw = hz.w / n;
    const dim = hz.active ? 1 : 0.55;
    for (const z of lanes) {
      for (let i = 0; i < n; i++) {
        const sx = hz.x + i * sw + sw / 2;
        tmp.copy(cssColor(i % 2 === 0 ? '#f1f5f9' : '#cbd5e1')).multiplyScalar(dim);
        hCone.at(sx, hz.y + hz.h / 2, z, sw, hz.h, 0.34, tmp);
        tmp.copy(cssColor('#f43f5e')).multiplyScalar(dim);
        hCone.at(sx, hz.y + 6, z, sw * 0.42, 12, 0.15, tmp);
      }
      hBox.rect(hz.x - 2, hz.y + hz.h - 8, hz.x + hz.w + 2, hz.y + hz.h + 2, z, 0.5, cssColor('#dc2626'));
    }
  }

  function geyser(hz: StageHazardZone, f: RenderFrame3D, lanes: number[]) {
    const [col, hi] = geyserColors(seasonId);
    const { z, depth } = laneSpan('both');
    if (hz.active) {
      hGlass.rect(hz.x + 6, hz.y, hz.x + hz.w - 6, hz.y + hz.h, z, depth, cssColor(col));
      for (const lz of lanes) {
        hGlow.rect(hz.x + hz.w * 0.36, hz.y + 8, hz.x + hz.w * 0.64, hz.y + hz.h - 8, lz, 0.2, cssColor(hi));
        for (let b = 0; b < 4; b++) {
          const bx = hz.x + 12 + (b * (hz.w - 24)) / 3;
          hRound.at(bx, hz.y + Math.sin(f.t * 12 + b) * 6, lz, 20, 20, 0.2, cssColor('#ffffff'));
        }
      }
    } else {
      hBox.rect(hz.x + 4, hz.y + hz.h - 14, hz.x + hz.w - 4, hz.y + hz.h, z, depth * 0.9, cssColor(col));
    }
  }

  function lightning(hz: StageHazardZone, f: RenderFrame3D, lanes: number[]) {
    const cx = hz.x + hz.w / 2;
    const { z } = laneSpan('both');
    const storm = cssColor('#475569');
    const dark = cssColor('#1e293b');
    hRound.at(cx - 26, hz.y + 22, z, 50, 36, 2.4, dark);
    hRound.at(cx + 26, hz.y + 22, z, 50, 36, 2.4, dark);
    hRound.at(cx, hz.y + 12, z, 64, 46, 2.8, storm);
    if (hz.active) {
      for (const lz of lanes) {
        hGlow.rect(hz.x + 12, hz.y + 24, hz.x + hz.w - 12, hz.y + hz.h, lz, 0.3, cssColor('#fef08a'));
        hGlow.rect(hz.x + hz.w * 0.35, hz.y + 28, hz.x + hz.w * 0.65, hz.y + hz.h - 4, lz + 0.18, 0.05, cssColor('#ffffff'));
      }
    } else if (hz.timer > hz.period - 1.2) {
      const flick = 0.5 + 0.5 * Math.sin(f.t * 30);
      const { depth } = laneSpan('both');
      tmp.copy(cssColor('#facc15')).multiplyScalar(0.4 + 0.6 * flick);
      hGlass.rect(hz.x + 16, hz.y + 28, hz.x + hz.w - 16, hz.y + hz.h, z, depth, tmp);
    }
  }

  // ---------- shrines, gates, lanterns ----------

  function shrines(world: World, f: RenderFrame3D) {
    let li = 0;
    for (const cp of world.checkpoints) {
      if (cp.x < f.viewMinX - 200 || cp.x > f.viewMaxX + 200) continue;
      if (cp.y < f.viewMinY - 200 || cp.y > f.viewMaxY + 300) continue;
      const main = cssColor(cp.activated ? '#10b981' : '#f43f5e');
      const dark = cssColor(cp.activated ? '#047857' : '#be123c');
      const z = SHRINE_Z;
      for (const side of [-1, 1]) {
        const px = cp.x + side * 38;
        propBox.at(px, cp.y - 8, z, 24, 16, 0.3, cssColor('#475569'));
        propCyl.at(px, cp.y - 64, z, 16, 100, 0.16, main);
      }
      propBox.at(cp.x, cp.y - 90, z, 108, 12, 0.14, dark);
      propBox.at(cp.x, cp.y - 111, z, 100, 13, 0.22, main);
      propBox.at(cp.x - 58, cp.y - 115, z, 40, 12, 0.22, main, -0.16);
      propBox.at(cp.x + 58, cp.y - 115, z, 40, 12, 0.22, main, 0.16);
      propBox.at(cp.x, cp.y - 101, z, 12, 12, 0.12, dark);
      const bob = Math.sin(f.t * 4 + cp.id) * 4;
      const orb = cssColor(cp.activated ? '#fef08a' : '#fda4af');
      glows.at(cp.x, cp.y - 62 + bob, z, 30, 30, 0.3, orb);
      halos.at(cp.x, cp.y - 62 + bob, z + 0.2, 110, 110, 1, orb);
      if (li >= shrineLabels.length) shrineLabels.push(new TextSprite(track, root));
      const label = shrineLabels[li++];
      label.set(
        cp.activated ? `ĐÃ MỞ: ${cp.label}` : `TRẠM PHONG ẤN ${cp.id} (+30 HP)`,
        cp.activated ? '#6ee7b7' : '#fef08a',
        'rgba(15,23,42,0.85)'
      );
      label.place(toX(cp.x), toY(cp.y - 142), z + 0.3, 1);
    }
    for (let i = li; i < shrineLabels.length; i++) shrineLabels[i].hide();
  }

  function sealGates(world: World, f: RenderFrame3D) {
    let li = 0;
    const { z, depth } = laneSpan('both');
    const front = z + depth / 2;
    for (const gate of world.sealGates) {
      if (gate.unlocked) continue;
      let guards = 0;
      for (const e of world.enemies) if (e.gateId === gate.id && e.hp > 0) guards++;
      let lx: number;
      let ly: number;
      if (f.cfg.scrollMode === 'horizontal') {
        const gx = gate.coord;
        if (gx < f.viewMinX - 200 || gx > f.viewMaxX + 200) continue;
        const pulse = 0.85 + 0.15 * Math.sin(f.t * 5);
        tmp.copy(cssColor('#fb7185')).multiplyScalar(pulse);
        barriers.rect(gx - 26, 40, gx + 26, 560, z, depth, tmp);
        hGlow.rect(gx - 5, 40, gx + 5, 560, z, depth + 0.05, cssColor('#fef08a'));
        // Rotating bagua medallion on the near face.
        const a = f.t * 1.8;
        propDisc.at(gx, 360, front + 0.1, 68, 68, 0.12, cssColor('#facc15'), a);
        propDisc.at(gx, 360, front + 0.18, 32, 32, 0.08, cssColor('#e11d48'), a);
        for (let k = 0; k < 8; k++) {
          const ang = a + (k * Math.PI) / 4;
          propBox.at(gx + Math.cos(ang) * 25, 360 + Math.sin(ang) * 25, front + 0.18, 12, 4, 0.04, cssColor('#1a0f0a'), ang + Math.PI / 2);
        }
        lx = gx;
        ly = 296;
      } else {
        const gy = gate.coord;
        if (gy < f.viewMinY - 200 || gy > f.viewMaxY + 200) continue;
        barriers.rect(180, gy - 12, 960, gy + 12, z, depth, cssColor('#f43f5e'));
        hGlow.rect(180, gy - 2, 960, gy + 2, z, depth + 0.05, cssColor('#fef08a'));
        lx = 570;
        ly = gy - 30;
      }
      if (li >= gateLabels.length) gateLabels.push(new TextSprite(track, root));
      const label = gateLabels[li++];
      label.set(`${gate.title.toUpperCase()} — CÒN ${guards} HỘ PHÁP`, '#fde047', 'rgba(15,23,42,0.85)');
      label.place(toX(lx), toY(ly), front + 0.3, 1);
    }
    for (let i = li; i < gateLabels.length; i++) gateLabels[i].hide();
  }

  function lanterns(world: World, f: RenderFrame3D) {
    const z = LANE_Z[0];
    const haloC = cssColor(haloColor(seasonId));
    for (const gp of world.grapples) {
      if (gp.x < f.viewMinX || gp.x > f.viewMaxX) continue;
      if (gp.y < f.viewMinY - 100 || gp.y > f.viewMaxY + 100) continue; // vertical stages
      const sway = Math.sin(f.t * 3.5 + gp.x * 0.02) * 2.5;
      const x = gp.x + sway;
      const y = gp.y;
      if (seasonId !== 'celestial_altar') {
        // Tether: kelp underwater, iron chain at the forge / castle, cord elsewhere (celestial levitates).
        const tether = seasonId === 'ocean_palace' ? '#10b981' : seasonId === 'autumn' || seasonId === 'blood_abyss' ? '#94a3b8' : '#1a0f0a';
        propBox.at(gp.x + sway * 0.3, y - 25, z, 3, 26, 0.03, cssColor(tether), -sway * 0.02);
      }
      halos.at(x, y, z - 0.05, 80, 80, 1, haloC);
      switch (seasonId) {
        case 'spring':
          // Sakura wind chime: pink bell, gold clapper, paper strip.
          propRound.at(x, y - 2, z, 28, 24, 0.28, cssColor('#f9a8d4'));
          propBox.at(x, y + 6, z, 22, 4, 0.22, cssColor('#be123c'));
          glows.at(x, y + 9, z + 0.05, 7, 7, 0.07, cssColor('#fde047'));
          propBox.at(x, y + 18, z, 9, 14, 0.02, cssColor('#fef3c7'));
          break;
        case 'summer':
          // Lotus gourd buoy.
          propRound.at(x, y - 7, z, 15, 15, 0.15, cssColor('#fde047'));
          propRound.at(x, y + 4, z, 23, 23, 0.23, cssColor('#10b981'));
          glows.at(x, y + 15, z, 10, 10, 0.1, cssColor('#6ee7b7'));
          break;
        case 'autumn':
          // Bronze war bell.
          propCone.at(x, y, z, 30, 28, 0.3, cssColor('#b45309'));
          propBox.at(x, y + 13, z, 32, 5, 0.32, cssColor('#78350f'));
          propBox.at(x, y - 15, z, 10, 5, 0.1, cssColor('#78350f'));
          glows.at(x, y + 16, z, 8, 8, 0.08, cssColor('#fef08a'));
          break;
        case 'winter':
          // Frost crystal prism.
          glowOcta.at(x, y, z, 24, 34, 0.24, cssColor('#bae6fd'), f.t * 1.2);
          break;
        case 'cavern':
          // Amethyst geode cluster: three glowing shards.
          glowOcta.at(x - 7, y + 2, z, 12, 26, 0.12, cssColor('#9333ea'), -0.35);
          glowOcta.at(x + 7, y + 2, z, 12, 26, 0.12, cssColor('#c084fc'), 0.35);
          glowOcta.at(x, y - 3, z + 0.05, 16, 34, 0.16, cssColor('#e879f9'));
          break;
        case 'thunder_peak':
          // Raijin thunder-drum orb: indigo sphere, golden ring, bolt core.
          propRound.at(x, y, z, 26, 26, 0.26, cssColor('#312e81'));
          propDisc.at(x, y, z + 0.1, 19, 19, 0.04, cssColor('#fde047'));
          glows.at(x, y, z + 0.14, 10, 10, 0.06, cssColor('#fef08a'));
          glowOcta.at(x, y, z + 0.16, 6, 14, 0.04, cssColor('#ffffff'), 0.4);
          break;
        case 'blood_abyss':
          // Hellfire chain cage with a molten core.
          propRound.at(x, y, z, 27, 27, 0.27, cssColor('#1f2937'));
          glows.at(x, y, z + 0.06, 19, 19, 0.2, cssColor('#ef4444'));
          glows.at(x, y, z + 0.1, 10, 10, 0.12, cssColor('#fef08a'));
          propBox.at(x, y, z + 0.16, 26, 4, 0.04, cssColor('#374151'));
          propBox.at(x, y, z + 0.16, 4, 26, 0.04, cssColor('#374151'));
          break;
        case 'celestial_altar':
          // White-jade bi-disc with jade ring, golden core and silk ribbons; astral ring above.
          propDisc.at(x, y, z, 27, 27, 0.08, cssColor('#ecfdf5'));
          propDisc.at(x, y, z + 0.03, 20, 20, 0.08, cssColor('#34d399'));
          propDisc.at(x, y, z + 0.06, 14, 14, 0.08, cssColor('#ecfdf5'));
          glows.at(x, y, z + 0.08, 9, 9, 0.06, cssColor('#fde047'));
          propBox.at(x - 12, y + 15, z, 3, 14, 0.02, cssColor('#fbbf24'), 0.3);
          propBox.at(x + 12, y + 15, z, 3, 14, 0.02, cssColor('#fbbf24'), -0.3);
          glows.at(x, y - 18, z, 24, 4, 0.24, cssColor('#fde047'));
          break;
        case 'ocean_palace':
          // Giant clam shell cradling a glowing moon-pearl, coral starfish clasp.
          propRound.at(x, y + 5, z, 30, 15, 0.3, cssColor('#22d3ee'));
          propRound.at(x, y - 4, z - 0.05, 28, 16, 0.26, cssColor('#0e7490'));
          propRound.at(x, y + 2, z + 0.08, 22, 10, 0.2, cssColor('#fda4af'));
          glows.at(x, y, z + 0.16, 15, 15, 0.15, cssColor('#fef08a'));
          propRound.at(x - 9, y - 9, z + 0.1, 9, 9, 0.09, cssColor('#fb7185'));
          break;
        case 'earth_core': {
          // Spinning brass mine-pulley wheel with an amber hub.
          const a = f.t * 2.6;
          propDisc.at(x, y, z, 25, 25, 0.12, cssColor('#b45309'), a);
          for (let k = 0; k < 6; k++) {
            const ka = a + (k * Math.PI) / 3;
            propBox.at(x + Math.cos(ka) * 14, y + Math.sin(ka) * 14, z, 5, 7, 0.1, cssColor('#b45309'), ka + Math.PI / 2);
          }
          glows.at(x, y, z + 0.08, 12, 12, 0.08, cssColor('#fde047'));
          break;
        }
        case 'sky_sanctuary': {
          // Celestial wind-wheel: four cyan/gold pinwheel blades inside a golden ring.
          const a = f.t * 3.4;
          for (let k = 0; k < 4; k++) {
            const ka = a + (k * Math.PI) / 2;
            propBox.at(x + Math.cos(ka) * 8, y + Math.sin(ka) * 8, z, 16, 6, 0.06, cssColor(k % 2 === 0 ? '#38bdf8' : '#fde047'), ka);
          }
          propDisc.at(x, y, z - 0.04, 28, 28, 0.02, cssColor('#fde047'));
          propDisc.at(x, y, z - 0.03, 23, 23, 0.02, cssColor('#0284c7'));
          glows.at(x, y, z + 0.06, 11, 11, 0.1, cssColor('#ffffff'));
          break;
        }
        default:
          glows.at(x, y, z, 24, 24, 0.24, cssColor(f.cfg.accentColor));
      }
    }
  }

  // ---------- water ----------

  function updateWater(world: World, f: RenderFrame3D) {
    const wl = f.cfg.waterLevelY;
    if (wl === null) {
      water.hide();
      return;
    }
    let surfaceY: number;
    if (seasonId === 'ocean_palace') surfaceY = 14;
    else if (seasonId === 'summer') surfaceY = wl + Math.sin(f.t * 1.35) * 38 + 12;
    else surfaceY = Math.max(558, wl + 18);
    const back = seasonId === 'summer' ? -95 : -16;
    const far = viewAtDepth(camera, target, back, dv);
    const halfSim = far.halfW / S + 200;
    const cxSim = far.cx / S;
    const bottom = Math.max(surfaceY + 400, world.camY + world.viewH + 400);
    water.place(cxSim - halfSim, cxSim + halfSim, surfaceY, 1.6, back, bottom - surfaceY, f.t);
  }

  return {
    update(world, f) {
      if (f.levelVersion !== builtVersion) {
        builtVersion = f.levelVersion;
        rebuildLevel(f);
      }
      target.set((world.camX + world.viewW / 2) * S, -(world.camY + world.viewH / 2) * S, 0);
      sky.follow(camera);
      const dist = camera.position.distanceTo(target);
      const fogShape = FOG_SHAPE[seasonId] ?? FOG_DEFAULT;
      fog.near = dist + fogShape[0];
      fog.far = dist + fogShape[1];
      setSwayTime(m.sway, f.t);
      caustics.uCaustic.value = seasonId === 'ocean_palace' ? 0.55 : 0;
      caustics.uCausticTime.value = f.t;
      baguaSpin = f.t * 1.2;

      for (const b of batches) b.begin();
      slopeDetails(f);
      platforms(world, f);
      hazards(world, f);
      shrines(world, f);
      sealGates(world, f);
      lanterns(world, f);
      for (const b of batches) b.end();

      backdrop.update(camera, target, f.t, world.combat.awakenedTimer > 0);
      trunks.update(world, f, pal, camera, target);
      updateWater(world, f);
      hitboxes?.update(world, f);
    },
    dispose() {
      for (const b of batches) b.dispose();
      backdrop.dispose();
      trunks.dispose();
      if (scene.fog === fog) scene.fog = null;
      scene.remove(root);
    },
  };
}

export const envKit: RenderModuleDef = { slot: 'env', name: 'env-kit', create };
