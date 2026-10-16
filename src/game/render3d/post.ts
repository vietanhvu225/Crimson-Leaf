import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// Post-processing with layer-selective bloom (T05).
//
// `fx=high` (default): two composers.
//   1. bloom composer: renders ONLY objects on BLOOM_LAYER (sparks, lightning, awakening aura,
//      glowing projectiles…) over black at half resolution, then UnrealBloomPass.
//   2. final composer: normal scene render → composite pass (scene + bloom, vignette, Huyết Ảnh
//      red tint, hit-stop flash) → OutputPass (ACES tone mapping + sRGB, read from the renderer).
//   Everything else (platforms, sky, actors) never blooms, however bright it is lit.
// `fx=low`: no composer, no shadows; plain renderer.render (scene.ts default path).
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

/** Per-frame inputs of the composite pass, all derived from sim state by the vfx module. */
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

const CompositeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tBloom: { value: null as THREE.Texture | null },
    uBloom: { value: 1.0 },
    uAwaken: { value: 0 },
    uFlash: { value: 0 },
    uVignette: { value: 0.35 },
    /** `?fxdebug=bloom`: show only the bloom buffer (to check what blooms). */
    uDebugBloom: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tBloom;
    uniform float uBloom, uAwaken, uFlash, uVignette, uDebugBloom;
    varying vec2 vUv;
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      vec3 col = base.rgb + texture2D(tBloom, vUv).rgb * uBloom;
      float d = distance(vUv, vec2(0.5));
      float edge = smoothstep(0.32, 0.78, d);
      col *= 1.0 - edge * uVignette;
      // Huyết Ảnh: crimson creeping in from the screen edges.
      col = mix(col, col * vec3(1.25, 0.45, 0.5) + vec3(0.18, 0.0, 0.02), edge * uAwaken);
      // Hit-stop: brief warm flash.
      col += vec3(1.0, 0.95, 0.8) * uFlash * 0.14;
      if (uDebugBloom > 0.5) col = texture2D(tBloom, vUv).rgb;
      gl_FragColor = vec4(col, base.a);
    }`,
};

const ClampShader = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null }, uMax: { value: 1.2 } },
  vertexShader: CompositeShader.vertexShader,
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
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.9, 0, 0.2);
  // Default mip weights (1, .8, .6, .4, .2) let the 1/32-res mips wash a milky veil over the whole
  // frame whenever a big burst happens; keep the glow tight around its source instead.
  const factors = bloomPass.compositeMaterial.uniforms.bloomFactors.value as number[];
  factors.splice(0, factors.length, 1.1, 0.65, 0.3, 0.1, 0.03);
  bloomComposer.addPass(bloomPass);

  // MSAA target: the composer would otherwise drop the renderer's antialias.
  const finalComposer = new EffectComposer(
    renderer,
    new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 })
  );
  finalComposer.addPass(new RenderPass(scene, camera));
  const composite = new ShaderPass(CompositeShader);
  // (ShaderPass clones uniforms and refuses render-target textures: tBloom is assigned per frame.)
  finalComposer.addPass(composite);
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).get('fxdebug') === 'bloom') {
    composite.uniforms.uDebugBloom.value = 1;
  }
  const output = new OutputPass();
  finalComposer.addPass(output);

  return {
    render(p) {
      renderer.info.reset();
      const bg = scene.background;
      const mask = camera.layers.mask;
      scene.background = null;
      camera.layers.set(BLOOM_LAYER);
      bloomComposer.render();
      camera.layers.mask = mask;
      scene.background = bg;
      // The clamp pass swaps the composer's buffers, so the result alternates between its targets.
      composite.uniforms.tBloom.value = bloomComposer.readBuffer.texture;
      composite.uniforms.uAwaken.value = p.awaken;
      composite.uniforms.uFlash.value = p.flash;
      finalComposer.render();
    },
    resize(w, h) {
      const dpr = renderer.getPixelRatio();
      finalComposer.setPixelRatio(dpr);
      finalComposer.setSize(w, h);
      // Bloom is blurry by nature: half resolution quarters its fill-rate cost.
      bloomComposer.setPixelRatio(dpr * 0.5);
      bloomComposer.setSize(w, h);
    },
    dispose() {
      bloomPass.dispose();
      clamp.dispose();
      composite.dispose();
      output.dispose();
      bloomComposer.dispose();
      finalComposer.dispose();
      renderer.info.autoReset = true;
    },
  };
}
