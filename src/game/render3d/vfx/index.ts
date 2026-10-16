import * as THREE from 'three';
import { PHYSICS_CONSTANTS } from '../../rules/index.ts';
import { CAMERA_FOV } from '../camera.ts';
import { LANE_Z, S, toX, toY } from '../coords.ts';
import { TextSprite } from '../label.ts';
import type { RenderModule, RenderModuleContext, RenderModuleDef } from '../module.ts';
import { createPost, readCamFlat, readFxLevel, type PostFx } from '../post.ts';
import { cssColor } from '../resources.ts';
import { createAmbientFx } from './ambient.ts';
import { createAuraFx } from './aura.ts';
import { createCombatFx } from './combat.ts';
import { createItemFx } from './items.ts';
import { createFxKit } from './shared.ts';

// T05 VFX module (slot `vfx`): combat effects, character auras/debuffs, items, stage atmosphere,
// banners, aim reticle, grapple rope, and the post-processing chain (post.ts).
//
// Timing comes only from the sim: animation from frame.t (= world.stageTimeSec), hit-stop from
// world.hitstopTimer (the sim already freezes during it; we add a flash + FOV punch), screen shake
// from world.cameraTrauma (scene.ts, same formula as canvas). No timers of our own.
//
// `?fx=low`: no composer/bloom, no shadow maps (to compare cost). `?cam=flat`: no FOV punch.

const BANNER_BASE_W = 512 * S;
const BANNER_BASE_H = 24 * S;

function create(ctx: RenderModuleContext): RenderModule {
  const { scene, renderer, camera, track } = ctx;
  const fx = readFxLevel();
  const camFlat = readCamFlat();
  if (fx === 'low') renderer.shadowMap.enabled = false;

  const kit = createFxKit(track, scene);
  const combat = createCombatFx(kit);
  const aura = createAuraFx(kit, combat);
  const ambient = createAmbientFx(kit, combat);
  const items = createItemFx(kit, combat);
  const post: PostFx | null = fx === 'high' ? createPost(renderer, scene, camera) : null;

  // Aim reticle: ring + 4 ticks, always on top.
  const reticleMat = track.material(
    new THREE.MeshBasicMaterial({ color: '#38bdf8', depthTest: false, transparent: true, toneMapped: false })
  );
  const reticle = new THREE.Group();
  reticle.add(new THREE.Mesh(track.geometry(new THREE.RingGeometry(0.085, 0.11, 32)), reticleMat));
  const tick = track.geometry(new THREE.PlaneGeometry(0.09, 0.02));
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(tick, reticleMat);
    const a = (i * Math.PI) / 2;
    m.position.set(Math.cos(a) * 0.105, Math.sin(a) * 0.105, 0);
    m.rotation.z = a;
    reticle.add(m);
  }
  for (const m of reticle.children) m.renderOrder = 99;
  kit.root.add(reticle);

  const banners: TextSprite[] = [];
  const c = new THREE.Color();
  let awaken = 0;
  let flash = 0;

  return {
    update(world, f) {
      combat.begin();
      combat.update(world, f);
      awaken = aura.update(world, f);
      ambient.update(world, f);
      items.update(world, f);

      // Grapple rope: dark core + accent glow (canvas: ink 6px + accent 3px).
      const gt = world.player.grappleTarget;
      if (gt) {
        const z = LANE_Z[world.combat.zLane];
        const x1 = toX(world.player.x);
        const y1 = toY(world.player.y - 24);
        c.copy(cssColor(f.st.seasonId === 'ocean_palace' ? '#22d3ee' : f.cfg.accentColor)).multiplyScalar(1.4);
        combat.shared.addBeam(x1, y1, toX(gt.x), toY(gt.y), z + 0.05, 0.08, c);
        c.setRGB(1, 1, 1).multiplyScalar(0.6);
        combat.shared.addBeam(x1, y1, toX(gt.x), toY(gt.y), z + 0.06, 0.02, c);
      }
      combat.end();

      reticle.visible = f.st.gameState === 'playing';
      reticle.position.set(toX(world.mouseWorldX), toY(world.mouseWorldY), 0);
      reticle.rotation.z = f.t * 0.8;
      reticleMat.color.copy(cssColor(world.combat.awakenedTimer > 0 ? '#f43f5e' : '#38bdf8'));

      // Banners: pop in (scale overshoot over the first 0.2 s of their 1.3 s life), then fade.
      for (let i = 0; i < world.banners.length; i++) {
        const b = world.banners[i];
        if (i >= banners.length) banners.push(new TextSprite(track, kit.root));
        const label = banners[i];
        if (!b.active) {
          label.hide();
          continue;
        }
        label.set(b.text, b.color);
        label.place(toX(b.x), toY(b.y), 0.5, Math.min(1, b.life * 1.5));
        const age = 1.3 - b.life;
        const pop = age < 0.2 ? 1 + Math.sin((age / 0.2) * Math.PI) * 0.35 : 1;
        label.sprite.scale.set(BANNER_BASE_W * pop, BANNER_BASE_H * pop, 1);
      }

      // Hit-stop (sim-owned timer): flash + a short FOV punch-in while the sim is frozen.
      flash = world.hitstopTimer > 0 ? Math.min(1, world.hitstopTimer / PHYSICS_CONSTANTS.HITSTOP_PARRY) : 0;
      if (!camFlat && flash > 0) {
        camera.fov = CAMERA_FOV - 1.6 * flash;
        camera.updateProjectionMatrix();
      }
    },
    render() {
      if (post) post.render({ awaken, flash });
      else renderer.render(scene, camera);
    },
    resize(w, h) {
      post?.resize(w, h);
    },
    dispose() {
      combat.dispose();
      aura.dispose();
      ambient.dispose();
      items.dispose();
      post?.dispose();
      kit.dispose();
    },
  };
}

export const vfxModule: RenderModuleDef = { slot: 'vfx', name: 'vfx', create };
