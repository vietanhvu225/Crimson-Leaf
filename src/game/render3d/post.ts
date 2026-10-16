import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Post-processing with layer-selective bloom (T05).
//
// `fx=high` (default):
//   1. bloom composer: renders ONLY objects on BLOOM_LAYER (sparks, lightning, awakening aura,
//      glowing projectiles…) over black at half resolution, then UnrealBloomPass.
//   2. the scene itself is rendered straight to the screen with renderer.render, exactly like
//      `fx=low`, so every material keeps its own tone mapping / colorspace / fog behaviour.
//   3. full-screen overlay quads blended on top: bloom (additive), Huyết Ảnh red edge tint
//      (multiply + add), hit-stop flash (add).
//   Platforms, sky and actors are therefore pixel-identical to `fx=low` outside glowing areas.
//
// Why not RenderPass → HalfFloat target → OutputPass (attempt 1): inside a render target three
// skips per-material tone mapping and applies fog in linear space; OutputPass then runs ACES over
// everything, including `toneMapped: false` sky domes, halos and the fog colour. With the real env
// that lifted the whole frame into a milky haze.
// `fx=low`: no bloom, no overlays, no shadows; plain renderer.render (scene.ts default path).
//
// Trade-off: the bloom pass does not see non-bloom geometry, so a glow is not occluded by a platform
// standing in front of it. VFX sit in front of the play field, so this almost never shows.

export const BLOOM_LAYER = 1;

export type FxLevel = 'high' | 'low';

export function readFxLevel(): FxLevel {
  if (typeof location === 'undefined') return 'high';
  return new URLSearchParams(location.search).get('fx') === 'low' ? 'low' : 'high';
}

/** `?cam=flat` also turns off the FOV punch (GAME_SPEC: dynamic camera must be switchable off). */
export function readCamFlat(): boolean {
  if (typeof location === 'undefined') return false;
  return new URLSearchParams(location.search).get('cam') === 'flat';
}

/** Per-frame inputs of the overlay, all derived from sim state by the vfx module. */
export interface PostParams {
  /** 0..1 Huyết Ảnh (awakening) intensity: red edge tint. */
  awaken: number;
  /** 0..1 hit-stop flash. */
  flash: number;
}

export interface PostFx {
  render(p: PostParams): void;
  resize(w: number, h: number): void;
  dispose(): void;
}

const QuadVertex = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// Only the outer rim of the screen: attempt 1 started at 0.32 and added red there, which put a pink
// veil over almost the whole frame for the entire Huyết Ảnh duration.
const EDGE = /* glsl */ `float edgeOf(vec2 uv) { return smoothstep(0.52, 0.8, distance(uv, vec2(0.5))); }`;

/** Additive layer: bloom (linear HDR → soft-clipped) + awaken edge glow + flash. */
const AddShader = {
  uniforms: {
    tBloom: { value: null as THREE.Texture | null },
    uBloom: { value: 1.0 },
    uAwaken: { value: 0 },
    uFlash: { value: 0 },
  },
  vertexShader: QuadVertex,
  fragmentShader: /* glsl */ `
    uniform sampler2D tBloom;
    uniform float uBloom, uAwaken, uFlash;
    varying vec2 vUv;
    ${EDGE}
    void main() {
      // Added as-is onto the sRGB framebuffer (no linear→sRGB encode): encoding would lift the faint
      // blur tails (linear 0.005 → sRGB 0.06) into a haze over the whole frame. The small floor drops
      // what is left of them.
      vec3 b = max(texture2D(tBloom, vUv).rgb * uBloom - 0.01, 0.0);
      vec3 col = 1.0 - exp(-b); // soft clip: stacked bursts saturate instead of blowing out to white
      col += vec3(0.05, 0.0, 0.004) * edgeOf(vUv) * uAwaken;
      // Hit-stop: brief faint warm flash (the sim freeze + FOV punch carry the hit; actors stay readable).
      col += vec3(1.0, 0.92, 0.75) * uFlash * 0.04;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

/** Multiply layer: Huyết Ảnh crimson creeping in from the screen edges. */
const MulShader = {
  uniforms: { uAwaken: { value: 0 } },
  vertexShader: QuadVertex,
  fragmentShader: /* glsl */ `
    uniform float uAwaken;
    varying vec2 vUv;
    ${EDGE}
    void main() {
      float k = edgeOf(vUv) * uAwaken;
      gl_FragColor = vec4(mix(vec3(1.0), vec3(0.9, 0.35, 0.4), k), 1.0);
    }`,
};

const ClampShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, uMax: { value: 1.2 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uMax;
    varying vec2 vUv;
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float m = max(max(c.r, c.g), max(c.b, 1e-4));
      gl_FragColor = vec4(c * min(1.0, uMax / m), 1.0); // keeps hue, caps brightness
    }`,
};

function quad(mat: THREE.ShaderMaterial, geo: THREE.BufferGeometry, order: number): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  m.renderOrder = order;
  return m;
}

export function createPost(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): PostFx {
  // With several render() calls per frame, renderer.info must accumulate over the whole frame.
  renderer.info.autoReset = false;

  const bloomComposer = new EffectComposer(renderer);
  bloomComposer.renderToScreen = false;
  const bloomRender = new RenderPass(scene, camera, undefined, new THREE.Color(0, 0, 0), 1);
  bloomComposer.addPass(bloomRender);
  // Stacked additive sparks sum to HDR values far above 1; unclamped, the low bloom mips smear
  // them over the whole screen as a milky haze. Clamp the bloom input first.
  const clamp = new ShaderPass(ClampShader);
  bloomComposer.addPass(clamp);
  // Input is already only the glowing VFX, so the threshold just drops faint fringes.
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.8, 0, 0.2);
  // Default mip weights (1, .8, .6, .4, .2) let the 1/32-res mips wash a veil over the whole
  // frame whenever a big burst happens; keep the glow tight around its source instead.
  const factors = bloomPass.compositeMaterial.uniforms.bloomFactors.value as number[];
  factors.splice(0, factors.length, 1.0, 0.6, 0.25, 0.08, 0.02);
  bloomComposer.addPass(bloomPass);

  const fxdebug = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('fxdebug') : null;
  const debugBloom = fxdebug === 'bloom';

  // Overlay quads (clip-space, no camera transform).
  const overlay = new THREE.Scene();
  const overlayCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const mulMat = new THREE.ShaderMaterial({
    ...MulShader,
    uniforms: THREE.UniformsUtils.clone(MulShader.uniforms),
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.ZeroFactor,
    blendDst: THREE.SrcColorFactor, // dst * src
  });
  const addMat = new THREE.ShaderMaterial({
    ...AddShader,
    uniforms: THREE.UniformsUtils.clone(AddShader.uniforms),
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
    blending: debugBloom ? THREE.NoBlending : THREE.AdditiveBlending,
  });
  const mulQuad = quad(mulMat, quadGeo, 0);
  overlay.add(mulQuad, quad(addMat, quadGeo, 1));

  return {
    render(p) {
      renderer.info.reset();
      if (fxdebug === 'nopost') {
        renderer.render(scene, camera);
        return;
      }
      const bg = scene.background;
      const mask = camera.layers.mask;
      scene.background = null;
      camera.layers.set(BLOOM_LAYER);
      bloomComposer.render();
      camera.layers.mask = mask;
      scene.background = bg;

      // The scene goes to the screen exactly as with fx=low.
      renderer.setRenderTarget(null);
      if (!debugBloom) renderer.render(scene, camera);

      // The clamp pass swaps the composer's buffers, so the result alternates between its targets.
      addMat.uniforms.tBloom.value = bloomComposer.readBuffer.texture;
      addMat.uniforms.uAwaken.value = debugBloom ? 0 : p.awaken;
      addMat.uniforms.uFlash.value = debugBloom ? 0 : p.flash;
      mulMat.uniforms.uAwaken.value = p.awaken;
      mulQuad.visible = !debugBloom && p.awaken > 0;
      const autoClear = renderer.autoClear;
      renderer.autoClear = debugBloom;
      renderer.render(overlay, overlayCam);
      renderer.autoClear = autoClear;
    },
    resize(w, h) {
      // Bloom is blurry by nature: half resolution quarters its fill-rate cost.
      bloomComposer.setPixelRatio(renderer.getPixelRatio() * 0.5);
      bloomComposer.setSize(w, h);
    },
    dispose() {
      bloomPass.dispose();
      clamp.dispose();
      bloomComposer.dispose();
      mulMat.dispose();
      addMat.dispose();
      quadGeo.dispose();
      renderer.info.autoReset = true;
    },
  };
}
