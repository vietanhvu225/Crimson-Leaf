import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { cssColor, type Tracker } from '../resources.ts';

// Every actor (player, enemies, bosses, mother) is built each frame from primitive "parts" that go
// into a handful of shared InstancedMeshes: one per (primitive, style). 30 enemies therefore cost the
// same number of draw calls as one. Parts are placed with a small matrix stack (Rig) in sim px with
// y up; the actor root matrix carries the px → three-unit scale.
//
// Styles:
//   toon  – MeshToonMaterial (3-band ramp) + inverted-hull ink outline, casts shadows
//   flat  – unlit, tone-mapped (eyes, blush, small decals); no outline
//   glow  – unlit, not tone-mapped (orbs, halos, telegraphs) so bloom can pick it up later
// Every instance carries a dissolve value (aFade 0..1, dithered discard) used for KO dissolve,
// ambush smoke-in and the lane ghost.

export const INK = '#090d16';

export type Prim =
  | 'sphere'
  | 'box'
  | 'rbox'
  | 'cyl'
  | 'cone'
  | 'capsule'
  | 'torus'
  | 'arc'
  | 'octa'
  | 'blade'
  | 'fan'
  | 'cone4';

export type Style = 'toon' | 'flat' | 'glow' | 'clear';

const PRIMS: Prim[] = ['sphere', 'box', 'rbox', 'cyl', 'cone', 'capsule', 'torus', 'arc', 'octa', 'blade', 'fan', 'cone4'];

function makeGeometry(p: Prim): THREE.BufferGeometry {
  switch (p) {
    // Tessellation is kept low: ~30 actors × ~60 parts, each drawn up to 3× (colour, outline, shadow).
    case 'sphere':
      return new THREE.SphereGeometry(1, 12, 8);
    case 'box':
      return new THREE.BoxGeometry(1, 1, 1);
    case 'rbox':
      return new RoundedBoxGeometry(1, 1, 1, 1, 0.28);
    case 'cyl':
      return new THREE.CylinderGeometry(1, 1, 1, 10);
    case 'cone':
      return new THREE.ConeGeometry(1, 1, 10);
    case 'cone4':
      return new THREE.ConeGeometry(1, 1, 4);
    case 'capsule':
      // radius 1, total height 4, centred.
      return new THREE.CapsuleGeometry(1, 2, 3, 8);
    case 'torus':
      return new THREE.TorusGeometry(1, 0.12, 4, 24);
    case 'arc':
      // Open crescent, 2.4 rad, starting at +x going counter-clockwise.
      return new THREE.TorusGeometry(1, 0.16, 4, 12, 2.4);
    case 'octa':
      return new THREE.OctahedronGeometry(1, 0);
    case 'blade': {
      // Flat leaf blade along +x from 0 to 1, width 1 (y), thickness 1 (z).
      const shape = new THREE.Shape();
      shape.moveTo(0, -0.5);
      shape.quadraticCurveTo(0.55, -0.55, 1, 0);
      shape.quadraticCurveTo(0.55, 0.45, 0, 0.5);
      shape.closePath();
      const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false, curveSegments: 6 });
      g.translate(0, 0, -0.5);
      return g;
    }
    case 'fan': {
      // Wedge (war fan / hat brim slice): 0.7π sector of a unit disc, height 1, centred.
      return new THREE.CylinderGeometry(1, 1, 1, 12, 1, false, 0, Math.PI * 0.7);
    }
  }
}

const RAMP_DATA = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);

const FADE_VERT_PARS = /* glsl */ `
attribute float aFade;
varying float vFade;
`;
const FADE_FRAG_PARS = /* glsl */ `
varying float vFade;
float actorDither(vec2 p) {
  return fract(sin(dot(floor(p * 0.5), vec2(12.9898, 78.233))) * 43758.5453);
}
`;
const FADE_DISCARD = /* glsl */ `
if (vFade > 0.0 && actorDither(gl_FragCoord.xy) < vFade) discard;
`;

function addFade(m: THREE.Material, key: string) {
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${FADE_VERT_PARS}`)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FADE_FRAG_PARS}`)
      .replace('void main() {', `void main() {\n${FADE_DISCARD}`);
  };
  m.customProgramCacheKey = () => key;
}

function outlineMaterial(width: number) {
  return new THREE.ShaderMaterial({
    uniforms: { uWidth: { value: width }, uColor: { value: cssColor(INK).clone() } },
    vertexShader: /* glsl */ `
      uniform float uWidth;
      ${FADE_VERT_PARS}
      void main() {
        vFade = aFade;
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = m * instanceMatrix;
        #endif
        vec4 wp = m * vec4(position, 1.0);
        vec3 n = normalize(mat3(m) * normal);
        wp.xyz += n * uWidth;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      ${FADE_FRAG_PARS}
      void main() {
        ${FADE_DISCARD}
        gl_FragColor = vec4(uColor, 1.0);
      }`,
    side: THREE.BackSide,
  });
}

interface Batch {
  mesh: THREE.InstancedMesh;
  outline: THREE.InstancedMesh | null;
  geo: THREE.BufferGeometry;
  outlineGeo: THREE.BufferGeometry | null;
  fade: THREE.InstancedBufferAttribute;
  count: number;
  capacity: number;
}

const tmpColor = new THREE.Color();
const WHITE = new THREE.Color('#ffffff');

/** Shared instanced batches for every actor part. */
export class PartBatches {
  private batches = new Map<string, Batch>();
  private base = new Map<Prim, THREE.BufferGeometry>();
  private mats: Record<Style, THREE.Material>;
  private outlineMat: THREE.ShaderMaterial;
  private parent: THREE.Object3D;
  private track: Tracker;

  constructor(parent: THREE.Object3D, track: Tracker) {
    this.parent = parent;
    this.track = track;
    const ramp = track.texture(new THREE.DataTexture(RAMP_DATA, 3, 1, THREE.RGBAFormat));
    ramp.minFilter = THREE.NearestFilter;
    ramp.magFilter = THREE.NearestFilter;
    ramp.needsUpdate = true;
    const toon = track.material(new THREE.MeshToonMaterial({ color: '#ffffff', gradientMap: ramp }));
    const flat = track.material(new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    const glow = track.material(new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }));
    // Translucent shells (ice prison, barrier, blob shadow): one shared opacity.
    const clear = track.material(
      new THREE.MeshToonMaterial({
        color: '#ffffff',
        gradientMap: ramp,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
      })
    );
    addFade(toon, 'actor-toon');
    addFade(flat, 'actor-flat');
    addFade(glow, 'actor-glow');
    addFade(clear, 'actor-clear');
    this.mats = { toon, flat, glow, clear };
    this.outlineMat = track.material(outlineMaterial(0.011));
    for (const p of PRIMS) this.base.set(p, track.geometry(makeGeometry(p)));
  }

  /** Ink outline width in three units (applied after the instance transform). */
  setOutlineWidth(units: number) {
    this.outlineMat.uniforms.uWidth.value = units;
  }

  private build(prim: Prim, style: Style, capacity: number): Batch {
    const geo = this.track.geometry(this.base.get(prim)!.clone());
    const fade = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1);
    fade.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aFade', fade);
    const mesh = new THREE.InstancedMesh(geo, this.mats[style], capacity);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    mesh.castShadow = style === 'toon';
    mesh.count = 0;
    mesh.renderOrder = style === 'glow' ? 3 : style === 'clear' ? 4 : 2;
    this.parent.add(mesh);
    let outline: THREE.InstancedMesh | null = null;
    let outlineGeo: THREE.BufferGeometry | null = null;
    if (style === 'toon') {
      outlineGeo = this.track.geometry(this.base.get(prim)!.clone());
      outlineGeo.setAttribute('aFade', fade);
      outline = new THREE.InstancedMesh(outlineGeo, this.outlineMat, capacity);
      outline.instanceMatrix = mesh.instanceMatrix; // same instances, drawn as a back-face hull
      outline.frustumCulled = false;
      outline.count = 0;
      outline.renderOrder = 2;
      this.parent.add(outline);
    }
    return { mesh, outline, geo, outlineGeo, fade, count: 0, capacity };
  }

  private get(prim: Prim, style: Style): Batch {
    const key = `${prim}|${style}`;
    let b = this.batches.get(key);
    if (!b) {
      b = this.build(prim, style, 64);
      this.batches.set(key, b);
    }
    if (b.count >= b.capacity) {
      const bigger = this.build(prim, style, b.capacity * 2);
      (bigger.mesh.instanceMatrix.array as Float32Array).set(b.mesh.instanceMatrix.array);
      (bigger.mesh.instanceColor!.array as Float32Array).set(b.mesh.instanceColor!.array);
      (bigger.fade.array as Float32Array).set(b.fade.array);
      bigger.count = b.count;
      this.free(b);
      this.batches.set(key, bigger);
      b = bigger;
    }
    return b;
  }

  private free(b: Batch) {
    this.parent.remove(b.mesh);
    b.mesh.dispose();
    this.track.release(b.geo);
    if (b.outline) {
      this.parent.remove(b.outline);
      b.outline.dispose();
      this.track.release(b.outlineGeo!);
    }
  }

  begin() {
    for (const b of this.batches.values()) b.count = 0;
  }

  add(prim: Prim, style: Style, m: THREE.Matrix4, color: THREE.Color, fade: number) {
    const b = this.get(prim, style);
    b.mesh.setMatrixAt(b.count, m);
    b.mesh.setColorAt(b.count, color);
    b.fade.array[b.count] = fade;
    b.count++;
  }

  end() {
    for (const b of this.batches.values()) {
      b.mesh.count = b.count;
      b.mesh.visible = b.count > 0;
      if (b.outline) {
        b.outline.count = b.count;
        b.outline.visible = b.count > 0;
      }
      if (b.count > 0) {
        b.mesh.instanceMatrix.needsUpdate = true;
        b.mesh.instanceColor!.needsUpdate = true;
        b.fade.needsUpdate = true;
      }
    }
  }

  dispose() {
    for (const b of this.batches.values()) this.free(b);
    this.batches.clear();
  }
}

const STACK_DEPTH = 24;
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();
const tmpEuler = new THREE.Euler();
const tmpLocal = new THREE.Matrix4();
const tmpOut = new THREE.Matrix4();

/**
 * Matrix stack + per-actor modifiers. Coordinates are sim px in the actor's local frame, y up,
 * +x = the direction the actor faces, +z = toward the camera.
 */
export class Rig {
  private stack: THREE.Matrix4[] = Array.from({ length: STACK_DEPTH }, () => new THREE.Matrix4());
  private depth = 0;
  /** Hit flash: toon/flat parts render white. */
  flash = false;
  /** Dissolve 0..1 applied to every part. */
  fade = 0;
  /** 0..1 mix toward slate (other lane / frozen look). */
  dim = 0;
  dimColor = new THREE.Color('#94a3b8');
  /**
   * Mirrors local z (and x/y rotations). Facing left keeps the weapon arm on the camera side,
   * like the canvas renderer's scale(-1, 1), without negative-determinant matrices.
   */
  zSign: 1 | -1 = 1;
  readonly batches: PartBatches;

  constructor(batches: PartBatches) {
    this.batches = batches;
  }

  /** Starts an actor: root = translation (three units) × yaw × uniform px→unit scale. */
  begin(root: THREE.Matrix4, zSign: 1 | -1 = 1) {
    this.depth = 0;
    this.stack[0].copy(root);
    this.flash = false;
    this.fade = 0;
    this.dim = 0;
    this.zSign = zSign;
  }

  push(x: number, y: number, z = 0, rz = 0, ry = 0, rx = 0, sx = 1, sy = 1, sz = 1) {
    const parent = this.stack[this.depth];
    this.depth = Math.min(STACK_DEPTH - 1, this.depth + 1);
    const k = this.zSign;
    tmpPos.set(x, y, z * k);
    tmpQuat.setFromEuler(tmpEuler.set(rx * k, ry * k, rz, 'YXZ'));
    tmpScale.set(sx, sy, sz);
    tmpLocal.compose(tmpPos, tmpQuat, tmpScale);
    this.stack[this.depth].multiplyMatrices(parent, tmpLocal);
  }

  pop() {
    this.depth = Math.max(0, this.depth - 1);
  }

  /** One primitive at (x,y,z) with size (sx,sy,sz) in the current frame. */
  part(
    prim: Prim,
    style: Style,
    color: string,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    rz = 0,
    ry = 0,
    rx = 0
  ) {
    const k = this.zSign;
    tmpPos.set(x, y, z * k);
    tmpQuat.setFromEuler(tmpEuler.set(rx * k, ry * k, rz, 'YXZ'));
    tmpScale.set(sx, sy, sz);
    tmpLocal.compose(tmpPos, tmpQuat, tmpScale);
    tmpOut.multiplyMatrices(this.stack[this.depth], tmpLocal);
    let c = cssColor(color);
    if (this.flash && style !== 'glow') c = WHITE;
    else if (this.dim > 0) c = tmpColor.copy(c).lerp(this.dimColor, this.dim);
    this.batches.add(prim, style, tmpOut, c, this.fade);
  }

  /** Capsule limb from (x1,y1) to (x2,y2) with radius r, at depth z. */
  limb(x1: number, y1: number, x2: number, y2: number, z: number, r: number, color: string) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx) - Math.PI / 2;
    this.part('capsule', 'toon', color, (x1 + x2) / 2, (y1 + y2) / 2, z, r, (len + 2 * r) / 4, r, ang);
  }

  /** Chibi arm: sleeve + gauntlet halves and a round fist (drawChibiArm). */
  arm(
    sx: number,
    sy: number,
    hx: number,
    hy: number,
    z: number,
    r: number,
    sleeve: string,
    gauntlet: string,
    skin = '#fde68a'
  ) {
    const mx = (sx + hx) / 2;
    const my = (sy + hy) / 2;
    this.limb(sx, sy, mx, my, z, r, sleeve);
    this.limb(mx, my, hx, hy, z, r * 1.05, gauntlet);
    this.part('sphere', 'toon', skin, hx, hy, z, r * 0.95, r * 0.95, r * 0.95);
  }

  /** Chibi leg: stubby capsule + rounded boot (drawChibiLeg). */
  leg(hx: number, hy: number, fx: number, fy: number, z: number, r: number, pants: string, boot: string) {
    this.limb(hx, hy, fx, fy + 2, z, r, pants);
    this.part('sphere', 'toon', boot, fx + 2.2, fy + 1, z, r * 1.65, r * 1.15, r * 1.2);
  }

  /** Anime eye on the +x/+z side of a head (sclera, iris, pupil, catchlight). */
  eye(x: number, y: number, z: number, w: number, h: number, iris: string) {
    this.part('sphere', 'flat', '#ffffff', x, y, z, w, h, w * 0.5);
    this.part('sphere', 'flat', iris, x + w * 0.15, y - h * 0.05, z + w * 0.25, w * 0.72, h * 0.78, w * 0.4);
    this.part('sphere', 'flat', INK, x + w * 0.2, y + h * 0.05, z + w * 0.4, w * 0.45, h * 0.45, w * 0.3);
    this.part('sphere', 'flat', '#ffffff', x - w * 0.15, y + h * 0.35, z + w * 0.55, w * 0.25, w * 0.25, w * 0.2);
    // Lash / brow line
    this.part('box', 'flat', INK, x, y + h * 1.05, z + w * 0.2, w * 2.3, 1.6, w * 0.4, -0.12);
  }
}
