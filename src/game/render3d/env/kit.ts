import * as THREE from 'three';
import { S } from '../coords.ts';
import { InstancedBatch, type InstancedBatchOptions } from '../instanced.ts';
import type { Tracker } from '../resources.ts';

// Shared geometry + material kit of the environment. Every repeated piece is an InstancedBatch
// refilled per frame (one draw call per batch); materials are shared roles, not one-off colours.

export interface EnvGeometries {
  box: THREE.BoxGeometry;
  sphere: THREE.IcosahedronGeometry;
  /** Low-poly ball for puffs/canopies (flat facets read as toon). */
  puff: THREE.IcosahedronGeometry;
  cyl: THREE.CylinderGeometry;
  hex: THREE.CylinderGeometry;
  /** Cylinder whose axis is z: a disc facing the camera (rotZ spins it). */
  disc: THREE.CylinderGeometry;
  cone: THREE.ConeGeometry;
  pyramid: THREE.ConeGeometry;
  octa: THREE.OctahedronGeometry;
  /** Half torus (arch), axis z, opening downward. */
  arch: THREE.TorusGeometry;
  /** Unit quad facing +z (camera looks down -z, so it is a near-billboard). */
  quad: THREE.PlaneGeometry;
  /** Thin full torus, axis z (rings, halos, bagua circles). Radius 0.5 so scale = diameter. */
  ring: THREE.TorusGeometry;
  /** Upper half sphere, flat side down (mushroom caps, jellyfish bells, bubble domes). */
  dome: THREE.SphereGeometry;
}

export interface EnvMaterials {
  solid: THREE.MeshStandardMaterial;
  facet: THREE.MeshStandardMaterial;
  sway: THREE.MeshStandardMaterial;
  ghost: THREE.MeshStandardMaterial;
  cut: THREE.MeshStandardMaterial;
  cutEdge: THREE.MeshBasicMaterial;
  glass: THREE.MeshStandardMaterial;
  ice: THREE.MeshStandardMaterial;
  glow: THREE.MeshBasicMaterial;
  halo: THREE.MeshBasicMaterial;
  barrier: THREE.MeshBasicMaterial;
  /** Sky objects (moon, sun, aurora): no fog, no depth write. */
  skyGlow: THREE.MeshBasicMaterial;
  skyHalo: THREE.MeshBasicMaterial;
  /** Vertical fade (opaque at the bottom → clear at the top): wind updrafts, light shafts. */
  fade: THREE.MeshBasicMaterial;
  /** Additive, bright top → clear bottom: god rays, lava falls, wind streaks. */
  ray: THREE.MeshBasicMaterial;
  /** Soft translucent cloud puffs that live in the play depth (sky sanctuary). */
  cloud: THREE.MeshStandardMaterial;
}

function fadeTexture(track: Tracker) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 64, 0, 0);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(1, 'rgba(255,255,255,0.05)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 64);
  const tex = track.texture(new THREE.CanvasTexture(c));
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGeometries(track: Tracker): EnvGeometries {
  const disc = new THREE.CylinderGeometry(0.5, 0.5, 1, 20);
  disc.rotateX(Math.PI / 2);
  const arch = new THREE.TorusGeometry(1, 0.12, 6, 16, Math.PI);
  return {
    box: track.geometry(new THREE.BoxGeometry(1, 1, 1)),
    sphere: track.geometry(new THREE.IcosahedronGeometry(0.5, 2)),
    puff: track.geometry(new THREE.IcosahedronGeometry(0.5, 1)),
    cyl: track.geometry(new THREE.CylinderGeometry(0.5, 0.5, 1, 12)),
    hex: track.geometry(new THREE.CylinderGeometry(0.5, 0.5, 1, 6)),
    disc: track.geometry(disc),
    cone: track.geometry(new THREE.ConeGeometry(0.5, 1, 10)),
    pyramid: track.geometry(new THREE.ConeGeometry(0.5, 1, 4)),
    octa: track.geometry(new THREE.OctahedronGeometry(0.5, 0)),
    arch: track.geometry(arch),
    quad: track.geometry(new THREE.PlaneGeometry(1, 1)),
    ring: track.geometry(new THREE.TorusGeometry(0.5, 0.035, 6, 40)),
    dome: track.geometry(new THREE.SphereGeometry(0.5, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2)),
  };
}

/**
 * Underwater caustics (T06, ocean palace): patched into the opaque env materials, driven by one
 * shared uniform pair so a single write per frame toggles them for every material (0 = off).
 */
export const caustics = {
  uCaustic: { value: 0 },
  uCausticTime: { value: 0 },
};

function addCaustics(mat: THREE.MeshStandardMaterial, key: string) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uCaustic = caustics.uCaustic;
    shader.uniforms.uCausticTime = caustics.uCausticTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCausticW;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        #ifdef USE_INSTANCING
          vCausticW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
        #else
          vCausticW = (modelMatrix * vec4(transformed, 1.0)).xyz;
        #endif`
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vCausticW;
        uniform float uCaustic;
        uniform float uCausticTime;
        float causticAt(vec3 p) {
          vec2 q = vec2(p.x + p.z * 0.45, p.y * 0.7 + p.z * 0.35) * 2.2;
          float t = uCausticTime * 0.9;
          float a = sin(q.x * 2.1 + t) + sin(q.y * 2.7 - t * 1.3) + sin((q.x + q.y) * 1.7 + t * 0.7)
                  + sin((q.x - q.y) * 2.3 - t * 0.9);
          return pow(1.0 - abs(a) * 0.25, 8.0);
        }`
      )
      .replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
        if (uCaustic > 0.0) gl_FragColor.rgb += vec3(0.55, 0.95, 1.0) * causticAt(vCausticW) * uCaustic;`
      );
  };
  mat.customProgramCacheKey = () => key;
}

/** Bright at the top, clear at the bottom: god rays / light shafts. */
function rayTexture(track: Tracker) {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 64);
  grad.addColorStop(0, 'rgba(255,255,255,0.9)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 16, 64);
  // Soft side edges.
  const side = g.createLinearGradient(0, 0, 16, 0);
  side.addColorStop(0, 'rgba(0,0,0,1)');
  side.addColorStop(0.3, 'rgba(0,0,0,0)');
  side.addColorStop(0.7, 'rgba(0,0,0,0)');
  side.addColorStop(1, 'rgba(0,0,0,1)');
  g.globalCompositeOperation = 'destination-out';
  g.fillStyle = side;
  g.fillRect(0, 0, 16, 64);
  const tex = track.texture(new THREE.CanvasTexture(c));
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Radial white → transparent gradient, tinted per instance (halos, glow cards, aurora). */
function haloTexture(track: Tracker) {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = track.texture(new THREE.CanvasTexture(c));
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Wind sway (shader-cookbook § wind sway): tips move, the base stays; phase from instance x/z. */
function addWindSway(mat: THREE.MeshStandardMaterial) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    mat.userData.shader = shader;
    shader.vertexShader =
      'uniform float uTime;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float swPhase = instanceMatrix[3].x * 1.7 + instanceMatrix[3].y * 0.9;
        #else
          float swPhase = 0.0;
        #endif
        float swH = max(position.y + 0.5, 0.0);
        transformed.x += sin(uTime * 1.6 + swPhase) * 0.09 * swH;
        transformed.y += cos(uTime * 1.2 + swPhase) * 0.03 * swH;`
      );
  };
  mat.customProgramCacheKey = () => 'env-wind-sway';
}

export function setSwayTime(mat: THREE.MeshStandardMaterial, t: number) {
  const sh = mat.userData.shader as { uniforms: { uTime: { value: number } } } | undefined;
  if (sh) sh.uniforms.uTime.value = t;
}

export function createMaterials(track: Tracker): EnvMaterials {
  const halo = haloTexture(track);
  const sway = new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0, flatShading: true });
  addWindSway(sway);
  const solid = new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0 });
  addCaustics(solid, 'env-caustic-solid');
  const facet = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0, flatShading: true });
  addCaustics(facet, 'env-caustic-facet');
  return {
    solid: track.material(solid),
    facet: track.material(facet),
    ray: track.material(
      new THREE.MeshBasicMaterial({
        map: rayTexture(track),
        fog: false, // additive: fogging would add the fog colour over the whole card
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
    ),
    cloud: track.material(
      new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, transparent: true, opacity: 0.82, depthWrite: false })
    ),
    sway: track.material(sway),
    // Other-lane platforms (canvas: globalAlpha 0.45).
    ghost: track.material(
      new THREE.MeshStandardMaterial({ roughness: 0.85, transparent: true, opacity: 0.3, depthWrite: false })
    ),
    // Other-lane platforms standing between the camera and the player: nearly cut away.
    cut: track.material(
      new THREE.MeshStandardMaterial({ roughness: 0.85, transparent: true, opacity: 0.07, depthWrite: false })
    ),
    cutEdge: track.material(
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false })
    ),
    glass: track.material(
      new THREE.MeshStandardMaterial({ roughness: 0.3, transparent: true, opacity: 0.3, depthWrite: false })
    ),
    ice: track.material(
      new THREE.MeshStandardMaterial({
        roughness: 0.15,
        metalness: 0.1,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        flatShading: true,
      })
    ),
    glow: track.material(new THREE.MeshBasicMaterial({ toneMapped: false })),
    halo: track.material(
      new THREE.MeshBasicMaterial({
        map: halo,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      })
    ),
    barrier: track.material(
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false })
    ),
    skyGlow: track.material(new THREE.MeshBasicMaterial({ fog: false, depthWrite: false, toneMapped: false })),
    skyHalo: track.material(
      new THREE.MeshBasicMaterial({
        map: halo,
        fog: false,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      })
    ),
    fade: track.material(
      new THREE.MeshBasicMaterial({
        map: fadeTexture(track),
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        side: THREE.DoubleSide,
        toneMapped: false,
      })
    ),
  };
}

/**
 * InstancedBatch with sim-px helpers: rect(x0, y0, x1, y1) in sim px (y down) at a three z/depth.
 */
export class Batch extends InstancedBatch {
  constructor(
    parent: THREE.Object3D,
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    capacity: number,
    opts: InstancedBatchOptions = {}
  ) {
    super(parent, geometry, material, capacity, opts);
  }

  /** Axis-aligned piece covering sim rect [x0,x1]×[y0,y1], centred on z with the given depth (units). */
  rect(x0: number, y0: number, x1: number, y1: number, z: number, depth: number, color: THREE.Color, rotZ = 0) {
    this.add(((x0 + x1) / 2) * S, -((y0 + y1) / 2) * S, z, (x1 - x0) * S, (y1 - y0) * S, depth, color, rotZ);
  }

  /** Piece centred at sim (x, y) with sim-px size (w, h) and depth in units. */
  at(x: number, y: number, z: number, w: number, h: number, depth: number, color: THREE.Color, rotZ = 0, rotY = 0) {
    this.add(x * S, -y * S, z, w * S, h * S, depth, color, rotZ, rotY);
  }
}

/** Deterministic hash → [0,1) for world-fixed procedural tiles (no RNG state, no world.rng()). */
export function hash01(i: number, salt = 0) {
  let h = Math.imul((i | 0) ^ Math.imul(salt + 0x9e37, 0x85ebca6b), 0xc2b2ae35);
  h ^= h >>> 15;
  h = Math.imul(h, 0x27d4eb2f);
  h ^= h >>> 13;
  return (h >>> 0) / 4294967296;
}
