import * as THREE from 'three';
import type { World } from '../engine/world.ts';
import type { SimPoint } from '../view.ts';
import { S } from './coords.ts';

// Camera that frames the sim view rect [camX, camX + viewW] × [camY, camY + viewH] on the z = 0
// plane (lane 0), so gameplay reads at the same scale as the canvas renderer.

export const CAMERA_FOV = 30;

export interface CameraOptions {
  /** `?cam=flat`: look straight down -z, z = 0 maps 1:1 to the canvas view. */
  flat: boolean;
}

/** Raised camera looking slightly down so the inner lane (z = -3) reads as real depth. */
const TILT_LIFT = 0.12; // camera height above the view centre, in view heights

/**
 * Poses `camera` for the world's current camera (+ optional shake, in sim px). Pure function of
 * the world, so aim raycasts inside a sim step see exactly the camera of that step.
 */
export function poseCamera(
  camera: THREE.PerspectiveCamera,
  world: World,
  opts: CameraOptions,
  shakeX = 0,
  shakeY = 0
) {
  const viewW = Math.max(1, world.viewW);
  const viewH = Math.max(1, world.viewH);
  const aspect = viewW / viewH;
  if (camera.aspect !== aspect || camera.fov !== CAMERA_FOV) {
    camera.aspect = aspect;
    camera.fov = CAMERA_FOV;
    camera.updateProjectionMatrix();
  }
  const cx = (world.camX + shakeX + viewW / 2) * S;
  const cy = -(world.camY + shakeY + viewH / 2) * S;
  const halfH = (viewH * S) / 2;
  const dist = halfH / Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2));
  if (opts.flat) {
    camera.position.set(cx, cy, dist);
    camera.lookAt(cx, cy, 0);
  } else {
    // Keep the same distance to the z = 0 view centre, so the framed width barely changes.
    const lift = viewH * S * TILT_LIFT;
    const back = Math.sqrt(Math.max(0, dist * dist - lift * lift));
    camera.position.set(cx, cy + lift, back);
    camera.lookAt(cx, cy, 0);
  }
  camera.updateMatrixWorld();
}

const scratchCam = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.5, 400);
const ndc = new THREE.Vector2();
const ray = new THREE.Raycaster();

/** View px → sim point on the z = 0 plane, for the camera the world is at (no shake). */
export function viewToWorld(
  world: World,
  opts: CameraOptions,
  viewX: number,
  viewY: number,
  out: SimPoint
) {
  poseCamera(scratchCam, world, opts);
  ndc.set((viewX / Math.max(1, world.viewW)) * 2 - 1, -(viewY / Math.max(1, world.viewH)) * 2 + 1);
  ray.setFromCamera(ndc, scratchCam);
  const o = ray.ray.origin;
  const d = ray.ray.direction;
  if (Math.abs(d.z) < 1e-6) {
    out.x = viewX + world.camX;
    out.y = viewY + world.camY;
    return;
  }
  const t = -o.z / d.z;
  out.x = (o.x + d.x * t) / S;
  out.y = -(o.y + d.y * t) / S;
}
