import * as THREE from 'three';
import { computeSubterraneanSlopeY } from '../../rules/index.ts';
import type { World } from '../../engine/world.ts';
import type { PlatformBranch, StageHazardZone } from '../../engine/entities.ts';
import { getChibiStagePalette, type ChibiStagePalette } from '../../render/map/stagePalette.ts';
import { LANE_Z, S, laneSpan, toX, toY } from '../coords.ts';
import { InstancedBatch } from '../instanced.ts';
import { TextSprite } from '../label.ts';
import type { RenderFrame3D, RenderModule, RenderModuleContext, RenderModuleDef } from '../module.ts';
import { cssColor, visualRng } from '../resources.ts';

// T02 placeholder environment: platforms = boxes, trunks / hazards / gates / checkpoints = coloured
// boxes, water/magma = translucent slab, backdrop = gradient sky + two silhouette layers in real depth.
// T03 replaces this slot (`env`) with the real kit.

const GROUND_BODY_H = 240;
const PLATFORM_H = 24;
const CAP_H = 10;
/** Trunks stand behind both lanes. */
const TRUNK_Z = -4.6;
const BACK_TRUNK_Z = -9;

const PLATFORM_TYPE_COLOR: Partial<Record<PlatformBranch['type'], string>> = {
  springboard: '#4ade80',
  ice: '#bae6fd',
  collapsing: '#f59e0b',
  moving: '#a78bfa',
  bagua_pad: '#fde047',
};

const HAZARD_COLOR: Record<StageHazardZone['kind'], string> = {
  updraft: '#a7f3d0',
  geyser: '#38bdf8',
  icicle: '#e0f2fe',
  lightning: '#facc15',
  spike_trap: '#94a3b8',
};

function create(ctx: RenderModuleContext): RenderModule {
  const { scene, track } = ctx;
  const root = new THREE.Group();
  root.name = 'env-placeholder';
  scene.add(root);
  const rng = visualRng(0x5eed);
  const tmp = new THREE.Color();

  const box = track.geometry(new THREE.BoxGeometry(1, 1, 1));
  const sphere = track.geometry(new THREE.IcosahedronGeometry(1, 1));
  const solid = track.material(new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 }));
  const glow = track.material(new THREE.MeshBasicMaterial({ toneMapped: false }));
  const glass = track.material(
    new THREE.MeshStandardMaterial({ roughness: 0.4, transparent: true, opacity: 0.28, depthWrite: false })
  );
  const barrier = track.material(
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.38, depthWrite: false, toneMapped: false })
  );
  const silhouette = track.material(new THREE.MeshBasicMaterial({ fog: true }));

  const platforms = new InstancedBatch(root, box, solid, 512, { castShadow: true, receiveShadow: true });
  const caps = new InstancedBatch(root, box, solid, 512, { receiveShadow: true });
  const trunks = new InstancedBatch(root, box, solid, 64, { receiveShadow: true });
  const props = new InstancedBatch(root, box, solid, 64, { castShadow: true, receiveShadow: true });
  const glows = new InstancedBatch(root, sphere, glow, 64);
  const hazards = new InstancedBatch(root, box, glass, 64, { renderOrder: 2 });
  const barriers = new InstancedBatch(root, box, barrier, 16, { renderOrder: 3 });
  const farHills = new InstancedBatch(root, box, silhouette, 256);
  const nearHills = new InstancedBatch(root, box, silhouette, 256);

  // Water / magma slab (one mesh, rescaled to the view every frame).
  const waterMat = track.material(
    new THREE.MeshStandardMaterial({
      color: '#22d3ee',
      transparent: true,
      opacity: 0.42,
      roughness: 0.2,
      depthWrite: false,
    })
  );
  const water = new THREE.Mesh(box, waterMat);
  water.renderOrder = 4;
  water.visible = false;
  root.add(water);

  // Earth core slope: one extruded strip per level (bedrock + ceiling).
  let slopeMesh: THREE.Mesh | null = null;
  let slopeGeom: THREE.BufferGeometry | null = null;
  const slopeMat = solid.clone();
  track.material(slopeMat);

  // Sky gradient as scene background (redrawn per stage/loop).
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 4;
  skyCanvas.height = 256;
  const skyTex = track.texture(new THREE.CanvasTexture(skyCanvas));
  skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  const fog = new THREE.Fog(0x000000, 30, 120);
  scene.fog = fog;

  const gateLabels: TextSprite[] = [];
  let builtVersion = -1;
  let pal: ChibiStagePalette = getChibiStagePalette('spring', false);

  function rebuildLevel(world: World, f: RenderFrame3D) {
    pal = getChibiStagePalette(f.st.seasonId, f.isLoop2);
    const g = skyCanvas.getContext('2d')!;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, pal.skyTop);
    grad.addColorStop(0.55, pal.skyMid);
    grad.addColorStop(1, pal.skyBottom);
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 256);
    skyTex.needsUpdate = true;
    fog.color.copy(cssColor(pal.skyMid));

    // Backdrop silhouettes (static per level): far layer z = -40, near layer z = -20. Their group y
    // follows the camera so vertical stages keep them in view; x is fixed, so lateral parallax is real.
    const horizontal = f.cfg.scrollMode === 'horizontal';
    const spanMax = horizontal ? f.cfg.stageLength * S + 40 : 52;
    farHills.begin();
    for (let x = -40; x < spanMax; x += 2.6 + rng() * 1.6) {
      const h = 7 + rng() * 12;
      const w = 2.2 + rng() * 3;
      farHills.add(x, -17 + h / 2, -40, w, h, 2, cssColor(pal.farHillFill));
    }
    farHills.end();
    nearHills.begin();
    for (let x = -24; x < spanMax; x += 1.6 + rng() * 1.4) {
      const h = 3 + rng() * 6;
      const w = 1.2 + rng() * 1.8;
      nearHills.add(x, -11 + h / 2, -20, w, h, 1, cssColor(pal.nearHillFill));
    }
    nearHills.end();

    // Earth core 45°/90° bedrock and ceiling.
    if (slopeMesh) {
      root.remove(slopeMesh);
      slopeMesh = null;
    }
    if (slopeGeom) {
      track.release(slopeGeom);
      slopeGeom = null;
    }
    if (f.st.seasonId === 'earth_core') {
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
  }

  function platformColors(p: PlatformBranch, sameLane: boolean, body: THREE.Color, cap: THREE.Color) {
    const typeColor = PLATFORM_TYPE_COLOR[p.type];
    if (p.type === 'ground') {
      body.copy(cssColor(pal.groundBodyFill));
      cap.copy(cssColor(pal.groundCapFill));
    } else {
      body.copy(cssColor(pal.platformBodyFill));
      cap.copy(cssColor(typeColor ?? pal.platformCapFill));
    }
    if (!sameLane) {
      body.multiplyScalar(0.55);
      cap.multiplyScalar(0.55);
    }
  }

  const bodyC = new THREE.Color();
  const capC = new THREE.Color();

  return {
    update(world, f) {
      if (f.levelVersion !== builtVersion) {
        builtVersion = f.levelVersion;
        rebuildLevel(world, f);
      }
      const camCenterY = toY(world.camY + world.viewH / 2);
      farHills.mesh.position.y = camCenterY;
      nearHills.mesh.position.y = camCenterY;
      const isEarthCore = f.st.seasonId === 'earth_core';
      const zLane = world.combat.zLane;

      // Platforms (box per platform: body + coloured cap).
      platforms.begin();
      caps.begin();
      for (const p of world.platforms) {
        if (p.respawnTimer && p.respawnTimer > 0) continue;
        if (p.x + p.w < f.viewMinX || p.x > f.viewMaxX) continue;
        if (p.y > f.viewMaxY + 300 || p.y < f.viewMinY - 300) continue;
        if (isEarthCore && p.type === 'ground' && p.x >= 150 && p.x < f.cfg.stageLength - 980) continue;
        const sameLane = p.zLane === 'both' || p.zLane === zLane;
        platformColors(p, sameLane, bodyC, capC);
        const { z, depth } = laneSpan(p.zLane);
        const tremble =
          p.collapseTimer && p.collapseTimer > 0 ? Math.sin(f.t * 90 + p.baseX) * 3 : 0;
        const h = p.type === 'ground' ? GROUND_BODY_H : PLATFORM_H;
        const cx = toX(p.x + p.w / 2 + tremble);
        platforms.add(cx, toY(p.y + h / 2), z, p.w * S, h * S, depth, bodyC);
        caps.add(cx, toY(p.y + CAP_H / 2 - 2), z, (p.w + 6) * S, CAP_H * S, depth + 0.08, capC);
      }
      platforms.end();
      caps.end();

      // Trunks behind both lanes (summer: short mooring posts).
      trunks.begin();
      const trunkTop = world.camY - 300;
      const trunkBottom = world.camY + world.viewH + 300;
      for (const tr of world.trunks) {
        if (tr.x + tr.w < f.viewMinX || tr.x - tr.w > f.viewMaxX) continue;
        if (tr.zDepth === 0) {
          if (f.st.seasonId === 'summer') {
            trunks.add(toX(tr.x), toY(250 + 190), TRUNK_Z, 0.44, 3.8, 0.44, cssColor('#be123c'));
          } else {
            const h = trunkBottom - trunkTop;
            trunks.add(toX(tr.x), toY(trunkTop + h / 2), TRUNK_Z, tr.w * S, h * S, tr.w * S, cssColor(pal.trunkFill));
          }
        } else {
          const h = trunkBottom - trunkTop + 400;
          trunks.add(toX(tr.x), toY(trunkTop + h / 2 - 200), BACK_TRUNK_Z, tr.w * S, h * S, tr.w * S, cssColor(pal.trunkShade));
        }
      }
      trunks.end();

      // Hazards: translucent volume across both lanes, bright when active.
      hazards.begin();
      for (const hz of world.hazards) {
        if (hz.x + hz.w < f.viewMinX || hz.x > f.viewMaxX) continue;
        tmp.copy(cssColor(HAZARD_COLOR[hz.kind]));
        if (!hz.active) tmp.multiplyScalar(0.35);
        const { z, depth } = laneSpan('both');
        hazards.add(toX(hz.x + hz.w / 2), toY(hz.y + hz.h / 2), z, hz.w * S, hz.h * S, depth, tmp);
      }
      hazards.end();

      // Props (checkpoint torii, mother shrine) + glows (checkpoint orbs, grapple lanterns).
      props.begin();
      glows.begin();
      for (const cp of world.checkpoints) {
        if (cp.x < f.viewMinX - 200 || cp.x > f.viewMaxX + 200) continue;
        const main = cssColor(cp.activated ? '#10b981' : '#f43f5e');
        const z = -1.5;
        for (const side of [-1, 1]) {
          props.add(toX(cp.x + side * 38), toY(cp.y - 57), z, 0.16, 1.14, 0.16, main);
        }
        props.add(toX(cp.x), toY(cp.y - 90), z, 1.08, 0.12, 0.2, cssColor(cp.activated ? '#047857' : '#be123c'));
        props.add(toX(cp.x), toY(cp.y - 113), z, 1.36, 0.14, 0.24, main);
        const bob = Math.sin(f.t * 4 + cp.id) * 4;
        glows.add(toX(cp.x), toY(cp.y - 62 + bob), z, 0.15, 0.15, 0.15, cssColor(cp.activated ? '#fef08a' : '#fda4af'));
      }
      for (const gp of world.grapples) {
        if (gp.x < f.viewMinX || gp.x > f.viewMaxX) continue;
        const bob = Math.sin(f.t * 3 + gp.x * 0.01) * 3;
        glows.add(toX(gp.x), toY(gp.y + bob), LANE_Z[0], 0.13, 0.13, 0.13, cssColor(f.cfg.accentColor));
        props.add(toX(gp.x), toY(gp.y - 40), LANE_Z[0], 0.03, 0.6, 0.03, cssColor('#475569'));
      }
      if (f.st.seasonId === 'sky_sanctuary') {
        const boss = world.enemies.find((e) => e.archetype === 'boss');
        const bossAlive = !boss || boss.hp > 0;
        const sx = f.cfg.stageLength - 185;
        props.add(toX(sx), toY(320 - 60), -1.5, 1.4, 1.2, 1.2, cssColor(bossAlive ? '#7c3aed' : '#fde047'));
        glows.add(toX(sx), toY(320 - 150), -1.5, 0.22, 0.22, 0.22, cssColor('#fef08a'));
      }
      props.end();
      glows.end();

      // Seal gates: glowing barrier spanning both lanes + label with the guard count.
      barriers.begin();
      let labelIdx = 0;
      for (const gate of world.sealGates) {
        if (gate.unlocked) continue;
        const { z, depth } = laneSpan('both');
        let guards = 0;
        for (const e of world.enemies) if (e.gateId === gate.id && e.hp > 0) guards++;
        let lx: number;
        let ly: number;
        if (f.cfg.scrollMode === 'horizontal') {
          if (gate.coord < f.viewMinX - 200 || gate.coord > f.viewMaxX + 200) continue;
          barriers.add(toX(gate.coord), toY(300), z, 0.52, 5.2, depth, cssColor('#fb7185'));
          barriers.add(toX(gate.coord), toY(300), z, 0.1, 5.2, depth + 0.1, cssColor('#fef08a'));
          lx = gate.coord;
          ly = 300;
        } else {
          barriers.add(toX(570), toY(gate.coord), z, 7.8, 0.24, depth, cssColor('#f43f5e'));
          lx = 570;
          ly = gate.coord - 30;
        }
        if (labelIdx >= gateLabels.length) gateLabels.push(new TextSprite(track, root));
        const label = gateLabels[labelIdx++];
        label.set(`${gate.title.toUpperCase()} — CÒN ${guards} HỘ PHÁP`, '#fde047', 'rgba(15,23,42,0.85)');
        label.place(toX(lx), toY(ly), LANE_Z[0] + 0.7, 1);
      }
      for (let i = labelIdx; i < gateLabels.length; i++) gateLabels[i].hide();
      barriers.end();

      // Water / magma surface.
      const wl = f.cfg.waterLevelY;
      if (wl !== null) {
        const wy = f.st.seasonId === 'summer' ? wl + Math.sin(f.t * 1.35) * 38 : wl;
        const isMagma = f.st.seasonId === 'blood_abyss';
        const bottom = Math.max(wy + 400, world.camY + world.viewH + 400);
        const w = (f.viewMaxX - f.viewMinX) * 2;
        water.visible = true;
        water.position.set(toX((f.viewMinX + f.viewMaxX) / 2), toY((wy + bottom) / 2), -2);
        water.scale.set(w * S, (bottom - wy) * S, 9);
        waterMat.color.copy(cssColor(isMagma ? '#f97316' : f.st.seasonId === 'ocean_palace' ? '#0e7490' : '#22d3ee'));
        waterMat.opacity = f.st.seasonId === 'ocean_palace' ? 0.18 : isMagma ? 0.75 : 0.42;
        waterMat.emissive.copy(cssColor(isMagma ? '#c2410c' : '#000000'));
      } else {
        water.visible = false;
      }
    },
    dispose() {
      platforms.dispose();
      caps.dispose();
      trunks.dispose();
      props.dispose();
      glows.dispose();
      hazards.dispose();
      barriers.dispose();
      farHills.dispose();
      nearHills.dispose();
      if (scene.background === skyTex) scene.background = null;
      if (scene.fog === fog) scene.fog = null;
      scene.remove(root);
    },
  };
}

export const placeholderEnv: RenderModuleDef = { slot: 'env', name: 'env-placeholder', create };
