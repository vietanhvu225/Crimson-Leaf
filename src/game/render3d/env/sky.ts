import * as THREE from 'three';
import type { ChibiStagePalette } from '../../render/map/stagePalette.ts';
import type { Tracker } from '../resources.ts';

// Gradient sky dome (shader-cookbook § gradient sky dome): a BackSide sphere that rides with the
// camera, three palette stops (top / mid / bottom) like the canvas linear gradient. Colours are
// authored in display space, so no tone mapping, only the output colour-space conversion.

const VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform vec3 uTop;
uniform vec3 uMid;
uniform vec3 uBottom;
uniform vec3 uGlowColor;
uniform vec3 uGlowDir;
uniform float uGlow;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  // FOV 30°: the screen spans roughly dir.y in [-0.3, 0.3].
  float t = clamp(d.y * 1.7 + 0.5, 0.0, 1.0);
  vec3 col = t < 0.45 ? mix(uBottom, uMid, t / 0.45) : mix(uMid, uTop, (t - 0.45) / 0.55);
  float g = clamp(dot(d, normalize(uGlowDir)), 0.0, 1.0);
  col += uGlowColor * pow(g, 24.0) * uGlow;
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export class SkyDome {
  readonly mesh: THREE.Mesh;
  private mat: THREE.ShaderMaterial;

  constructor(track: Tracker, parent: THREE.Object3D) {
    this.mat = track.material(
      new THREE.ShaderMaterial({
        uniforms: {
          uTop: { value: new THREE.Color() },
          uMid: { value: new THREE.Color() },
          uBottom: { value: new THREE.Color() },
          uGlowColor: { value: new THREE.Color() },
          uGlowDir: { value: new THREE.Vector3(0.3, 0.15, -1) },
          uGlow: { value: 0 },
        },
        vertexShader: VERT,
        fragmentShader: FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
        toneMapped: false,
      })
    );
    this.mesh = new THREE.Mesh(track.geometry(new THREE.SphereGeometry(300, 24, 16)), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -100;
    parent.add(this.mesh);
  }

  setPalette(pal: ChibiStagePalette, css: (s: string) => THREE.Color, glowColor: string, glow: number, glowDir: THREE.Vector3) {
    const u = this.mat.uniforms;
    (u.uTop.value as THREE.Color).copy(css(pal.skyTop));
    (u.uMid.value as THREE.Color).copy(css(pal.skyMid));
    (u.uBottom.value as THREE.Color).copy(css(pal.skyBottom));
    (u.uGlowColor.value as THREE.Color).copy(css(glowColor));
    (u.uGlowDir.value as THREE.Vector3).copy(glowDir);
    u.uGlow.value = glow;
  }

  follow(camera: THREE.Camera) {
    this.mesh.position.copy(camera.position);
  }
}
