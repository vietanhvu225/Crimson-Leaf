import * as THREE from 'three';
import { SEASONS } from '../rules/index.ts';
import type { World } from '../engine/world.ts';
import type { GameRenderer } from '../view.ts';
import { poseCamera, viewToWorld, type CameraOptions } from './camera.ts';
import { S } from './coords.ts';
import type { RenderFrame3D, RenderModule, RenderModuleDef } from './module.ts';
import { envKit } from './env/index.ts';
import { placeholderActors } from './placeholder/actors.ts';
import { placeholderEnv } from './placeholder/env.ts';
import { placeholderVfx } from './placeholder/vfx.ts';
import { Tracker } from './resources.ts';

// Three.js renderer: one WebGLRenderer + scene + camera bound to a <canvas>. The picture is built by
// render modules (module.ts); each one syncs its part from the World every frame.

/**
 * Registered render modules (T03 env, T04 actors, T05 vfx: add exactly one line each).
 * A module registered for a slot replaces the T02 placeholder of that slot.
 */
const MODULES: RenderModuleDef[] = [envKit];

const PLACEHOLDERS: RenderModuleDef[] = [placeholderEnv, placeholderActors, placeholderVfx];

export interface ThreeRendererOptions extends CameraOptions {}

export function createThreeRenderer(
  canvas: HTMLCanvasElement,
  opts: ThreeRendererOptions
): GameRenderer | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    console.warn('WebGL unavailable, three renderer disabled:', err);
    return null;
  }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap; // r186: PCFSoftShadowMap is gone

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.5, 400);
  const track = new Tracker();

  const hemi = new THREE.HemisphereLight('#e0f2fe', '#3f2a1d', 1.5);
  const sun = new THREE.DirectionalLight('#fff7ed', 2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 40;
  scene.add(hemi, sun, sun.target);

  const registered = new Set(MODULES.map((m) => m.slot));
  const defs = [...PLACEHOLDERS.filter((p) => !registered.has(p.slot)), ...MODULES];
  const modules: RenderModule[] = defs.map((d) => d.create({ scene, renderer, camera, track }));

  // Level-change detection: the level builder assigns fresh arrays on rebuild.
  let levelVersion = 0;
  let lastPlatforms: unknown = null;
  let lastKey = '';
  let shadowHalfW = 0;

  const frame: RenderFrame3D = {
    st: null as unknown as RenderFrame3D['st'],
    cfg: SEASONS.spring,
    isLoop2: false,
    t: 0,
    viewMinX: 0,
    viewMaxX: 0,
    viewMinY: 0,
    viewMaxY: 0,
    levelVersion: 0,
  };

  function updateFrame(world: World) {
    const st = world.stateRef.current;
    frame.st = st;
    frame.cfg = SEASONS[st.seasonId];
    frame.isLoop2 = st.loopRoute === 2;
    frame.t = world.stageTimeSec;
    frame.viewMinX = world.camX - world.viewW * 0.5;
    frame.viewMaxX = world.camX + world.viewW * 1.5;
    frame.viewMinY = world.camY - world.viewH * 0.5;
    frame.viewMaxY = world.camY + world.viewH * 1.5;
    const key = `${st.seasonId}|${st.loopRoute}`;
    if (world.platforms !== lastPlatforms || key !== lastKey) {
      lastPlatforms = world.platforms;
      lastKey = key;
      levelVersion++;
    }
    frame.levelVersion = levelVersion;
  }

  return {
    kind: 'three',
    render(world) {
      updateFrame(world);
      // Same damped sinusoidal shake as the canvas renderer, driven by sim state.
      const mag = Math.min(4.5, world.cameraTrauma * world.cameraTrauma * 6);
      poseCamera(
        camera,
        world,
        opts,
        Math.sin(world.stageTimeSec * 42) * mag,
        Math.cos(world.stageTimeSec * 36) * mag
      );

      // Sun follows the view so its shadow frustum covers what is on screen.
      const cx = (world.camX + world.viewW / 2) * S;
      const cy = -(world.camY + world.viewH / 2) * S;
      sun.position.set(cx - 5, cy + 9, 10);
      sun.target.position.set(cx, cy, -1.5);
      sun.target.updateMatrixWorld();
      const halfW = Math.ceil(world.viewW * S * 0.75) + 1;
      if (halfW !== shadowHalfW) {
        shadowHalfW = halfW;
        const sc = sun.shadow.camera;
        sc.left = -halfW;
        sc.right = halfW;
        sc.top = halfW;
        sc.bottom = -halfW;
        sc.updateProjectionMatrix();
      }

      for (const m of modules) m.update(world, frame);
      renderer.render(scene, camera);
    },
    resize(viewW, viewH) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(Math.max(1, viewW), Math.max(1, viewH), false);
    },
    stats() {
      return {
        drawCalls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      };
    },
    viewToWorld(world, viewX, viewY, out) {
      viewToWorld(world, opts, viewX, viewY, out);
    },
    dispose() {
      for (const m of modules) m.dispose();
      modules.length = 0;
      track.disposeAll();
      sun.dispose();
      hemi.dispose();
      scene.clear();
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
