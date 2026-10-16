import * as THREE from 'three';
import type { SeasonId } from '../../rules/index.ts';
import { S } from '../coords.ts';
import type { Tracker } from '../resources.ts';

// Water / magma: hand-written shader (waves + fresnel). Two meshes share the wave function:
// a horizontal surface sheet (runs back to the horizon on summer = the lake) and a vertical
// front curtain whose top edge follows the same waves (the cut-away "aquarium" face the side view
// looks at, like the canvas gradient body with its crest ribbon).

const WAVE_GLSL = /* glsl */ `
uniform float uTime;
uniform float uAmp;
float waveY(vec2 p) {
  return uAmp * (sin(p.x * 1.6 + uTime * 3.2) * 0.6 + sin(p.x * 0.55 - uTime * 1.3 + p.y * 0.9) * 0.4);
}
`;

const SURFACE_VERT = /* glsl */ `
${WAVE_GLSL}
varying vec3 vWorld;
varying vec3 vNormalW;
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  wp.y += waveY(wp.xz);
  float e = 0.05;
  float dx = (waveY(wp.xz + vec2(e, 0.0)) - waveY(wp.xz - vec2(e, 0.0))) / (2.0 * e);
  float dz = (waveY(wp.xz + vec2(0.0, e)) - waveY(wp.xz - vec2(0.0, e))) / (2.0 * e);
  vNormalW = normalize(vec3(-dx, 1.0, -dz));
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const SURFACE_FRAG = /* glsl */ `
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uCrest;
uniform float uGlow;
uniform float uTime;
uniform float uOpacity;
varying vec3 vWorld;
varying vec3 vNormalW;
#include <fog_pars_fragment>
void main() {
  vec3 V = normalize(cameraPosition - vWorld);
  float fres = pow(1.0 - clamp(dot(vNormalW, V), 0.0, 1.0), 3.0);
  vec3 col = mix(uDeep, uShallow, 0.2 + 0.6 * fres);
  // Glints / lava cells: sparse procedural sparkle on the crests, fading with distance.
  float cell = sin(vWorld.x * 3.1 + vWorld.z * 1.3 + uTime * 2.0) * sin(vWorld.z * 2.3 - vWorld.x * 0.7 - uTime * 1.4);
  float near = clamp(1.0 - length(cameraPosition - vWorld) / 60.0, 0.0, 1.0);
  col += uCrest * smoothstep(0.9, 0.99, cell) * (0.3 + uGlow) * near;
  col *= 1.0 + uGlow * (0.4 + 0.3 * sin(uTime * 2.4 + vWorld.x * 0.8));
  gl_FragColor = vec4(col, mix(uOpacity, 1.0, fres * 0.5));
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

const BODY_VERT = /* glsl */ `
${WAVE_GLSL}
varying vec2 vUv;
varying float vDepthBelow;
#include <fog_pars_vertex>
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  float top = waveY(wp.xz);
  if (uv.y > 0.5) wp.y += top;
  vUv = uv;
  vDepthBelow = (1.0 - uv.y);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const BODY_FRAG = /* glsl */ `
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uCrest;
uniform float uGlow;
uniform float uTime;
uniform float uOpacity;
uniform float uHeight;
varying vec2 vUv;
varying float vDepthBelow;
#include <fog_pars_fragment>
void main() {
  float dPx = vDepthBelow * uHeight; // units below the surface
  vec3 col = mix(uShallow, uDeep, smoothstep(0.0, 2.6, dPx));
  // Crest ribbon just under the surface line (canvas: 4px crest stroke).
  float crest = smoothstep(0.1, 0.03, dPx) * smoothstep(0.0, 0.02, dPx);
  col = mix(col, uCrest, crest);
  col *= 1.0 + uGlow * (0.3 + 0.25 * sin(uTime * 1.7 + vUv.x * 40.0));
  float a = mix(uOpacity, min(1.0, uOpacity + 0.2), smoothstep(0.0, 2.6, dPx));
  gl_FragColor = vec4(col, max(a, crest));
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

export interface WaterLook {
  shallow: string;
  deep: string;
  crest: string;
  glow: number;
  opacity: number;
  amp: number;
}

export function waterLook(seasonId: SeasonId, isLoop2: boolean): WaterLook {
  if (seasonId === 'blood_abyss') {
    return { shallow: '#f97316', deep: '#7f1d1d', crest: '#fef08a', glow: 0.7, opacity: 0.95, amp: 0.05 };
  }
  if (seasonId === 'cavern') {
    return { shallow: '#a855f7', deep: '#3b0764', crest: '#f5d0fe', glow: 0.15, opacity: 0.8, amp: 0.05 };
  }
  if (seasonId === 'ocean_palace') {
    return { shallow: '#67e8f9', deep: '#0e7490', crest: '#cffafe', glow: 0, opacity: 0.16, amp: 0.05 };
  }
  return {
    shallow: isLoop2 ? '#38bdf8' : '#06b6d4',
    deep: '#083344',
    crest: '#cffafe',
    glow: 0,
    opacity: 0.8,
    amp: 0.05,
  };
}

export class WaterSurface {
  readonly surface: THREE.Mesh;
  readonly body: THREE.Mesh;
  private surfMat: THREE.ShaderMaterial;
  private bodyMat: THREE.ShaderMaterial;

  constructor(track: Tracker, parent: THREE.Object3D) {
    const uniforms = () =>
      THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uAmp: { value: 0.05 },
          uShallow: { value: new THREE.Color() },
          uDeep: { value: new THREE.Color() },
          uCrest: { value: new THREE.Color() },
          uGlow: { value: 0 },
          uOpacity: { value: 0.8 },
          uHeight: { value: 4 },
        },
      ]);
    this.surfMat = track.material(
      new THREE.ShaderMaterial({
        uniforms: uniforms(),
        vertexShader: SURFACE_VERT,
        fragmentShader: SURFACE_FRAG,
        transparent: true,
        depthWrite: false,
        fog: true,
        side: THREE.DoubleSide,
      })
    );
    this.bodyMat = track.material(
      new THREE.ShaderMaterial({
        uniforms: uniforms(),
        vertexShader: BODY_VERT,
        fragmentShader: BODY_FRAG,
        transparent: true,
        depthWrite: false,
        fog: true,
      })
    );
    const sg = new THREE.PlaneGeometry(1, 1, 96, 24);
    sg.rotateX(-Math.PI / 2); // horizontal, z from -0.5 (back) to +0.5 (front)
    this.surface = new THREE.Mesh(track.geometry(sg), this.surfMat);
    this.surface.frustumCulled = false;
    this.surface.renderOrder = 4;
    this.body = new THREE.Mesh(track.geometry(new THREE.PlaneGeometry(1, 1, 96, 1)), this.bodyMat);
    this.body.frustumCulled = false;
    this.body.renderOrder = 5;
    this.surface.visible = this.body.visible = false;
    parent.add(this.surface, this.body);
  }

  setLook(look: WaterLook, css: (s: string) => THREE.Color) {
    for (const m of [this.surfMat, this.bodyMat]) {
      const u = m.uniforms;
      (u.uShallow.value as THREE.Color).copy(css(look.shallow));
      (u.uDeep.value as THREE.Color).copy(css(look.deep));
      (u.uCrest.value as THREE.Color).copy(css(look.crest));
      u.uGlow.value = look.glow;
      u.uOpacity.value = look.opacity;
      u.uAmp.value = look.amp;
    }
  }

  hide() {
    this.surface.visible = this.body.visible = false;
  }

  /**
   * Places the water: surface at sim y `surfaceY`, spanning sim x [x0, x1], from z `front` back to
   * z `back`; the front curtain drops `bodyH` sim px below the surface.
   */
  place(x0: number, x1: number, surfaceY: number, front: number, back: number, bodyH: number, t: number) {
    const w = (x1 - x0) * S;
    const cx = ((x0 + x1) / 2) * S;
    const y = -surfaceY * S;
    this.surface.visible = this.body.visible = true;
    this.surface.position.set(cx, y, (front + back) / 2);
    this.surface.scale.set(w, 1, front - back);
    const h = bodyH * S;
    this.body.position.set(cx, y - h / 2, front);
    this.body.scale.set(w, h, 1);
    this.surfMat.uniforms.uTime.value = t;
    this.bodyMat.uniforms.uTime.value = t;
    this.bodyMat.uniforms.uHeight.value = h;
  }
}
