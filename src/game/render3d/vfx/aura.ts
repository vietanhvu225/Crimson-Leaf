import * as THREE from 'three';
import type { EnemyActor } from '../../engine/entities.ts';
import type { World } from '../../engine/world.ts';
import { LANE_Z, S, toX, toY } from '../coords.ts';
import type { RenderFrame3D } from '../module.ts';
import { BLOOM_LAYER } from '../post.ts';
import { cssColor } from '../resources.ts';
import type { CombatFx } from './combat.ts';
import { hash01, type FxKit } from './shared.ts';

// Character-bound VFX:
// - Huyết Ảnh (combat.awakenedTimer > 0): fresnel flame shell around the player, rising blood
//   wisps, pulsing ground sigil, and a red point light that tints the surroundings (a real-light
//   effect canvas cannot do). Immortal mode (B) uses the same aura in gold.
// - Elemental debuffs on enemies (canvas: render/characters/enemy.ts § 8): burn = flame tongues,
//   freeze = faceted ice block, chill = frost glow at the feet, stun = orbiting stars + zig-zag.
// - Enemy wind-up telegraph: charging glow (bigger and with converging rays for bosses).
// The point light always exists (intensity 0 when idle) so toggling never recompiles shaders.

const AURA_VERT = /* glsl */ `
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vV = normalize(-mv.xyz);
    vP = position;
    gl_Position = projectionMatrix * mv;
  }`;

const AURA_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uStrength;
  varying vec3 vN;
  varying vec3 vV;
  varying vec3 vP;
  void main() {
    float rim = pow(1.0 - abs(dot(vN, vV)), 1.6);
    // Upward-licking flame bands.
    float band = sin(vP.y * 9.0 - uTime * 11.0 + sin(atan(vP.x, vP.z) * 5.0 + uTime * 3.0) * 1.6);
    float flame = smoothstep(-0.2, 1.0, band) * smoothstep(1.0, -0.2, vP.y);
    float a = (rim * 1.4 + flame * rim * 1.2) * uStrength;
    gl_FragColor = vec4(uColor * a, 1.0);
  }`;

function enemyHeight(en: EnemyActor) {
  return en.archetype === 'boss' ? 82 : en.archetype === 'elite_guard' ? 70 : 58;
}

export function createAuraFx(kit: FxKit, combat: CombatFx) {
  const { track, root } = kit;
  const { glows, flames, beams, shards, rings, addJagged } = combat.shared;

  const auraMat = track.material(
    new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color('#f43f5e') },
        uTime: { value: 0 },
        uStrength: { value: 1 },
      },
      vertexShader: AURA_VERT,
      fragmentShader: AURA_FRAG,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    })
  );
  const aura = new THREE.Mesh(track.geometry(new THREE.SphereGeometry(1, 24, 16)), auraMat);
  aura.layers.enable(BLOOM_LAYER);
  aura.renderOrder = 5;
  aura.visible = false;
  root.add(aura);

  // Ground sigil (ring lying on the ground, facing up).
  const sigil = new THREE.Mesh(
    track.geometry(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)),
    kit.ringMat.clone()
  );
  track.material(sigil.material as THREE.Material);
  sigil.layers.enable(BLOOM_LAYER);
  sigil.visible = false;
  root.add(sigil);

  const light = new THREE.PointLight('#ff2d55', 0, 6, 1.6);
  root.add(light);

  // Freeze shell: faceted translucent ice.
  const iceMat = track.material(
    new THREE.MeshStandardMaterial({
      color: '#7dd3fc',
      roughness: 0.15,
      metalness: 0.1,
      transparent: true,
      opacity: 0.55,
      flatShading: true,
      emissive: '#0c4a6e',
      emissiveIntensity: 0.4,
      depthWrite: false,
    })
  );
  const ice = kit.batch(track.geometry(new THREE.IcosahedronGeometry(1, 0)), iceMat, 16, false, { renderOrder: 4 });

  const c = new THREE.Color();

  function awakening(world: World, f: RenderFrame3D) {
    const awakened = world.combat.awakenedTimer > 0;
    const immortal = !!world.combat.isImmortal;
    const on = awakened || immortal;
    aura.visible = on;
    sigil.visible = on;
    if (!on) {
      light.intensity = 0;
      return 0;
    }
    const p = world.player;
    const x = toX(p.x);
    const y = toY(p.y - 28);
    const z = LANE_Z[world.combat.zLane];
    const col = cssColor(awakened ? '#f43f5e' : '#fde047');
    // Fade in/out over the last half second of the timer.
    const k = awakened ? Math.min(1, world.combat.awakenedTimer * 2) : 0.6;
    const pulse = 1 + Math.sin(f.t * 9) * 0.06;
    aura.position.set(x, y, z);
    aura.scale.set(0.42 * pulse, 0.56 * pulse, 0.42 * pulse);
    auraMat.uniforms.uColor.value.copy(col).multiplyScalar(1.6);
    auraMat.uniforms.uTime.value = f.t;
    auraMat.uniforms.uStrength.value = k;

    sigil.position.set(x, toY(p.y) + 0.02, z);
    const sr = 1.2 + Math.sin(f.t * 5) * 0.1;
    sigil.scale.set(sr, 1, sr);
    sigil.rotation.y = f.t * 1.5;
    (sigil.material as THREE.MeshBasicMaterial).color.copy(col).multiplyScalar(1.4 * k);

    light.position.set(x, y + 0.2, z + 0.8);
    light.color.copy(col);
    light.intensity = 9 * k * pulse;

    // Rising blood wisps around the body (analytic from sim time, no state).
    for (let i = 0; i < 22; i++) {
      const seed = hash01(i * 3.7);
      const life = (f.t * (0.7 + seed * 0.6) + seed) % 1;
      const ang = hash01(i * 9.1) * Math.PI * 2 + f.t * 0.8;
      const rad = 0.18 + hash01(i * 1.3) * 0.22;
      const wx = x + Math.cos(ang) * rad * (1 - life * 0.5);
      const wy = toY(p.y) + 0.05 + life * 0.95;
      const wz = z + Math.sin(ang) * rad * 0.6;
      c.copy(col).multiplyScalar(2.2 * (1 - life) * k);
      glows.add(wx, wy, wz + 0.1, 0.09 + 0.06 * (1 - life), 0.16 + 0.12 * (1 - life), 1, c);
    }
    // Afterimage streak behind the cloak when moving fast.
    if (Math.abs(p.vx) > 120) {
      c.copy(col).multiplyScalar(0.8 * k);
      beams.add(x - Math.sign(p.vx) * 0.35, y, z - 0.05, 0.7, 0.45, 1, c);
    }
    return awakened ? k : 0;
  }

  function debuffs(world: World, f: RenderFrame3D) {
    for (const en of world.enemies) {
      if (en.hp <= 0) continue;
      if (en.x < f.viewMinX || en.x > f.viewMaxX || en.y < f.viewMinY || en.y > f.viewMaxY) continue;
      const h = enemyHeight(en);
      const x = toX(en.x);
      const yFeet = toY(en.y);
      const z = LANE_Z[en.zLane] + 0.25;

      if (en.burnTimer > 0) {
        for (let k = 0; k < 4; k++) {
          const fx = (k - 1.5) * 9 + Math.sin(f.t * 14 + k) * 3;
          const fy = h * (0.35 + 0.18 * hash01(k + en.id)) + Math.sin(f.t * 20 + k * 1.7) * 3;
          const len = (16 + Math.sin(f.t * 25 + k * 2.3) * 5) * S;
          c.copy(cssColor(k % 2 === 0 ? '#f97316' : '#fde047')).multiplyScalar(1.8);
          flames.add(x + fx * S, yFeet + fy * S + len * 0.5, z, len, 0.07, 0.07, c, -Math.PI / 2);
        }
        c.copy(cssColor('#f97316')).multiplyScalar(0.7);
        glows.add(x, yFeet + h * 0.5 * S, z, h * 2.2 * S, h * 2.4 * S, 1, c);
      }

      if ((en.freezeTimer ?? 0) > 0) {
        ice.add(x, yFeet + h * 0.52 * S, LANE_Z[en.zLane], h * 0.55 * S, h * 0.62 * S, 0.4, cssColor('#bae6fd'), 0.2, 0.5);
        c.copy(cssColor('#7dd3fc')).multiplyScalar(0.8);
        glows.add(x, yFeet + h * 0.5 * S, z + 0.2, h * 2 * S, h * 2.2 * S, 1, c);
      } else if (en.chillTimer > 0) {
        c.copy(cssColor('#7dd3fc')).multiplyScalar(1.1);
        rings.add(x, yFeet + 0.05, z, h * 1.4 * S, h * 0.45 * S, 1, c);
        for (let k = 0; k < 3; k++) {
          const a = f.t * 2 + k * 2.1;
          shards.add(x + Math.cos(a) * 0.28, yFeet + (h * 0.3 + k * 12) * S, z + Math.sin(a) * 0.2, 0.03, 0.045, 0.02, cssColor('#e0f2fe'), f.t * 3 + k);
        }
      }

      if ((en.stunTimer ?? 0) > 0) {
        for (let s = 0; s < 3; s++) {
          const a = f.t * 9 + (s * Math.PI * 2) / 3;
          const sx = x + Math.cos(a) * h * 0.38 * S;
          const sy = yFeet + (h + 8 + Math.sin(a) * 4) * S;
          const sz = z + Math.sin(a) * 0.25;
          c.copy(cssColor(s % 2 === 0 ? '#fde047' : '#38bdf8')).multiplyScalar(2.4);
          glows.add(sx, sy, sz, 0.16, 0.16, 1, c);
          shards.add(sx, sy, sz, 0.035, 0.035, 0.035, cssColor('#fef9c3'), f.t * 6);
        }
        addJagged(
          x - 12 * S, yFeet + h * 0.65 * S, x + 12 * S, yFeet + h * 0.2 * S, z + 0.1,
          0.06, en.id, f.t, cssColor('#fde047'), 1, 0.35
        );
      }

      if (en.windupTimer > 0 && en.hp > 0) {
        const boss = en.archetype === 'boss' || en.archetype === 'elite_guard';
        const pulse = 0.5 + 0.5 * Math.sin(f.t * 24);
        const col = cssColor(boss ? '#f43f5e' : '#fbbf24');
        const r = (boss ? 1.6 : 0.8) * (0.85 + pulse * 0.25);
        c.copy(col).multiplyScalar(boss ? 1.4 : 0.9);
        glows.add(x, yFeet + h * 0.55 * S, z + 0.3, r, r, 1, c);
        c.copy(col).multiplyScalar(1.6);
        rings.add(x, yFeet + h * 0.55 * S, z + 0.3, r * 0.9 * (1.2 - pulse * 0.4), r * 0.9 * (1.2 - pulse * 0.4), 1, c);
        if (boss) {
          // Energy converging towards the boss.
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2 + f.t * 1.5;
            const u = (f.t * 2.5 + k * 0.37) % 1;
            const d = 1.6 * (1 - u) + 0.2;
            c.copy(col).multiplyScalar(2 * u);
            beams.add(x + Math.cos(a) * d, yFeet + h * 0.55 * S + Math.sin(a) * d, z + 0.3, 0.35, 0.05, 1, c, a);
          }
        }
      }
    }
  }

  return {
    /** Returns the awakening intensity (0..1) for the post pass. */
    update(world: World, f: RenderFrame3D) {
      ice.begin();
      const awaken = awakening(world, f);
      debuffs(world, f);
      ice.end();
      return awaken;
    },
    dispose() {
      ice.dispose();
      light.dispose();
    },
  };
}
