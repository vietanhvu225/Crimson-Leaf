import * as THREE from 'three';
import { SEASONS, SEASON_ORDER } from '../../rules/index.ts';
import type { World } from '../../engine/world.ts';
import { LANE_Z, S, toX, toY } from '../coords.ts';
import type { RenderModule, RenderModuleContext, RenderModuleDef, ViewOverride } from '../module.ts';
import { BossPlaque } from './bossPlaque.ts';
import { Floaters } from './floaters.ts';
import { StageGates } from './gates.ts';
import { readUiMode, ui3dHost } from './host.ts';
import { OutcomeSign } from './outcomeSign.ts';

// T07 `?ui=3d` (slot `extra`): UI drawn in the 3D scene, on top of the DOM HUD that stays the
// default and keeps every function.
//   title    camera flies slowly through the selected stage (viewOverride + orbit) behind the DOM
//            panel; 11 clickable torii gates (raycast) select the stage, clicking the selected
//            gate again starts the run
//   playing  world-space damage numbers, combo counter, boss plaque (replaces the DOM boss bar)
//   gameover victory/defeat sign + slow orbit around the player, beside the DOM result modal
// Without ?ui=3d the module is inert. Never touches world.rng or sim state.

const tmpTarget = new THREE.Vector3();
const tmpOffset = new THREE.Vector3();
const tmpPos = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function levelBounds(world: World): Bounds {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of world.platforms) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x + p.w);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX)) return { minX: 0, maxX: 2000, minY: 0, maxY: 600 };
  return { minX, maxX, minY, maxY };
}

function inertModule(): RenderModule {
  return { update() {}, dispose() {} };
}

function create(ctx: RenderModuleContext): RenderModule {
  if (readUiMode() !== '3d') return inertModule();
  const { scene, camera, renderer, track } = ctx;

  // Camera-space UI (gates, outcome sign) hangs off the camera, so the camera joins the scene.
  const addedCamera = !camera.parent;
  if (addedCamera) scene.add(camera);
  const root = new THREE.Group();
  root.name = 'ui3d';
  scene.add(root);

  const gates = new StageGates(track);
  const sign = new OutcomeSign(track);
  camera.add(gates.group, sign.group);
  const floaters = new Floaters(root, track);
  const plaque = new BossPlaque(root, track);

  // UI animation clock: wall time (title/game over do not advance sim time for everything).
  let clock = 0;
  let lastNow = performance.now();
  let gameState = '';
  let selected: string = SEASON_ORDER[0];
  let gameoverAt = -1;
  let bounds: Bounds | null = null;
  let boundsFor: unknown = null;
  let lastViewW = 1;
  let lastViewH = 1;

  // ---------- pointer: hover + click on gates ----------
  const canvas = renderer.domElement;
  const local = (e: PointerEvent | MouseEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: Math.max(1, r.width), h: Math.max(1, r.height) };
  };
  const onMove = (e: PointerEvent) => {
    if (gameState !== 'title') return;
    const p = local(e);
    gates.hover = gates.pick(camera, p.x, p.y, p.w, p.h);
    canvas.style.cursor = gates.hover >= 0 ? 'pointer' : '';
  };
  const onLeave = () => {
    gates.hover = -1;
    canvas.style.cursor = '';
  };
  const onClick = (e: MouseEvent) => {
    if (gameState !== 'title') return;
    const p = local(e);
    const i = gates.pick(camera, p.x, p.y, p.w, p.h);
    if (i < 0) return;
    const id = SEASON_ORDER[i];
    if (id === selected) ui3dHost.startGame();
    else ui3dHost.selectStage(id);
  };
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointercancel', onLeave);
  canvas.addEventListener('click', onClick);

  // Test hook: screen positions of the gates (shot.mjs clicks them like a player would).
  const w = window as unknown as Record<string, unknown>;
  const hook = {
    gates: () => (gates.group.visible ? gates.screenPositions(camera, lastViewW, lastViewH) : []),
  };
  w.__ui3d = hook;

  return {
    viewOverride(world): ViewOverride | null {
      const st = world.stateRef.current;
      if (st.gameState !== 'title') return null;
      if (boundsFor !== world.platforms) {
        boundsFor = world.platforms;
        bounds = levelBounds(world);
      }
      const b = bounds!;
      const cfg = SEASONS[st.seasonId];
      const t = world.titlePanTime;
      if (cfg.scrollMode === 'vertical') {
        const span = Math.max(0, b.maxY - b.minY - world.viewH * 0.6);
        const u = 0.5 - 0.5 * Math.cos((t * Math.PI * 70) / Math.max(1, span));
        return {
          camX: Math.max(0, (b.minX + b.maxX) / 2 - world.viewW / 2),
          camY: b.maxY - world.viewH * 0.85 - u * span,
        };
      }
      // Ping-pong across the level at ~70 px/s, as the sim's own title pan would but further.
      const span = Math.max(0, Math.min(cfg.stageLength, b.maxX) - world.viewW - Math.max(0, b.minX));
      const u = 0.5 - 0.5 * Math.cos((t * Math.PI * 70) / Math.max(1, span));
      return { camX: Math.max(0, b.minX) + u * span, camY: 0 };
    },

    adjustCamera(cam, world, f) {
      const gs = f.st.gameState;
      if (gs === 'title') {
        // Slow orbit around the view centre (between the two lanes) + slight dolly.
        tmpTarget.set((world.camX + world.viewW / 2) * S, -(world.camY + world.viewH / 2) * S, (LANE_Z[0] + LANE_Z[1]) / 2);
        tmpOffset.copy(cam.position).sub(tmpTarget).multiplyScalar(0.92);
        tmpOffset.applyAxisAngle(UP, Math.sin(world.titlePanTime * 0.13) * 0.24);
        tmpOffset.y += Math.sin(world.titlePanTime * 0.09) * 0.6 + 0.4;
        cam.position.copy(tmpTarget).add(tmpOffset);
        cam.lookAt(tmpTarget);
        cam.updateMatrixWorld();
      } else if (gs === 'gameover' && gameoverAt >= 0) {
        // Ease into an orbit around the player.
        const k = Math.min(1, (clock - gameoverAt) / 1.2);
        const e = k * k * (3 - 2 * k);
        const p = world.player;
        tmpPos.set((world.camX + world.viewW / 2) * S, -(world.camY + world.viewH / 2) * S, 0);
        tmpTarget.set(toX(p.x), toY(p.y - 40), LANE_Z[world.combat.zLane]);
        tmpTarget.lerpVectors(tmpPos, tmpTarget, e);
        tmpOffset.copy(cam.position).sub(tmpPos).multiplyScalar(1 - 0.3 * e);
        tmpOffset.applyAxisAngle(UP, Math.sin((clock - gameoverAt) * 0.25) * 0.35 * e);
        cam.position.copy(tmpTarget).add(tmpOffset);
        cam.lookAt(tmpTarget);
        cam.updateMatrixWorld();
      }
    },

    update(world, f) {
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
      lastNow = now;
      clock += dt;
      lastViewW = world.viewW;
      lastViewH = world.viewH;
      const gs = f.st.gameState;
      if (gs !== gameState) {
        if (gs === 'gameover') gameoverAt = clock;
        if (gs !== 'title') onLeave();
        gameState = gs;
      }
      selected = f.st.seasonId;

      if (gs === 'title') {
        gates.group.visible = true;
        gates.update(camera, f.st.seasonId, clock, dt);
      } else {
        gates.group.visible = false;
      }

      if (gs === 'playing' || gs === 'paused') {
        floaters.update(world, f, gs === 'playing');
        plaque.update(world, f);
      } else {
        floaters.hide();
        plaque.hide();
      }

      if (gs === 'gameover') {
        sign.update(camera, world.combat.hp <= 0 ? 'defeat' : 'victory', f.st.seasonId, f.isLoop2, clock);
      } else {
        sign.hide();
        gameoverAt = -1;
      }
    },

    dispose() {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointercancel', onLeave);
      canvas.removeEventListener('click', onClick);
      canvas.style.cursor = '';
      if (w.__ui3d === hook) delete w.__ui3d;
      camera.remove(gates.group, sign.group);
      scene.remove(root);
      if (addedCamera) scene.remove(camera);
    },
  };
}

export const ui3dModule: RenderModuleDef = { slot: 'extra', name: 'ui3d', create };
