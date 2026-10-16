import * as THREE from 'three';
import type { World } from '../../engine/world.ts';
import type { EnemyActor } from '../../engine/entities.ts';
import { LANE_Z, S, toX, toY } from '../coords.ts';
import type { RenderFrame3D, RenderModule, RenderModuleContext, RenderModuleDef } from '../module.ts';
import { cssColor } from '../resources.ts';

// T02 placeholder actors: player = red capsule, enemies = capsules coloured by archetype (same trim
// colours as render/characters/enemy.ts), a dark visor shows facing. Meshes are pooled and keyed by
// enemy id; nothing is created per frame once the pool is warm. T04 replaces this slot (`actors`).

const PLAYER_H = 58;
const PLAYER_R = 15;

function enemyColor(en: EnemyActor, accent: string): string {
  switch (en.archetype) {
    case 'boss':
      return accent;
    case 'elite_guard':
      return '#fde047';
    case 'blue_kiter':
      return '#38bdf8';
    case 'fire_monk':
      return '#fbbf24';
    case 'bomb_alchemist':
      return '#fb923c';
    case 'chain_kusarigama':
      return '#c084fc';
    case 'claw_assassin':
      return '#22d3ee';
    case 'tessen_gale':
      return '#34d399';
    case 'thunder_puppeteer':
      return '#facc15';
    default:
      return '#fb7185';
  }
}

function enemySize(en: EnemyActor) {
  if (en.archetype === 'boss') return { h: 82, r: 21 };
  if (en.archetype === 'elite_guard') return { h: 70, r: 17.5 };
  return { h: 58, r: 14 };
}

interface ActorView {
  group: THREE.Group;
  body: THREE.Mesh;
  visor: THREE.Mesh;
  crown: THREE.Mesh;
  alert: THREE.Mesh;
  /** Lane z eased toward the target so a lane switch reads as motion in depth. */
  z: number;
  seenFrame: number;
}

function create(ctx: RenderModuleContext): RenderModule {
  const { scene, track } = ctx;
  const root = new THREE.Group();
  root.name = 'actors-placeholder';
  scene.add(root);

  // Unit capsule: radius 1, total height 4 (scaled per actor).
  const capsule = track.geometry(new THREE.CapsuleGeometry(1, 2, 4, 12));
  capsule.translate(0, 2, 0); // origin at the feet, like the sim
  const box = track.geometry(new THREE.BoxGeometry(1, 1, 1));
  const ring = track.geometry(new THREE.RingGeometry(0.7, 1, 24, 1, -1.1, 2.2));
  const disc = track.geometry(new THREE.CircleGeometry(1, 20));
  disc.rotateX(-Math.PI / 2);

  const visorMat = track.material(new THREE.MeshStandardMaterial({ color: '#1a0f0a', roughness: 0.5 }));
  const flashMat = track.material(new THREE.MeshBasicMaterial({ color: '#ffffff' }));
  const alertMat = track.material(new THREE.MeshBasicMaterial({ color: '#fbbf24', toneMapped: false }));
  const shadowMat = track.material(
    new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false })
  );
  const bodyMats = new Map<string, THREE.MeshStandardMaterial>();
  const bodyMat = (css: string) => {
    let m = bodyMats.get(css);
    if (!m) {
      m = track.material(new THREE.MeshStandardMaterial({ color: cssColor(css), roughness: 0.7 }));
      bodyMats.set(css, m);
    }
    return m;
  };

  function makeActor(mat: THREE.Material): ActorView {
    const group = new THREE.Group();
    const body = new THREE.Mesh(capsule, mat);
    body.castShadow = true;
    const visor = new THREE.Mesh(box, visorMat);
    visor.castShadow = false;
    const crown = new THREE.Mesh(box, mat);
    crown.visible = false;
    const alert = new THREE.Mesh(box, alertMat);
    alert.visible = false;
    group.add(body, visor, crown, alert);
    root.add(group);
    return { group, body, visor, crown, alert, z: 0, seenFrame: -1 };
  }

  /** Lays the parts out for a capsule of height h, radius r (sim px), facing ±1. */
  function layout(a: ActorView, h: number, r: number, facing: number) {
    const rs = r * S;
    a.body.scale.set(rs, (h * S) / 4, rs);
    a.visor.scale.set(rs * 0.9, rs * 0.45, rs * 1.6);
    a.visor.position.set(facing * rs * 0.55, h * S * 0.78, 0);
    a.crown.scale.set(rs * 1.6, rs * 0.5, rs * 1.6);
    a.crown.position.set(0, h * S + rs * 0.2, 0);
    a.alert.scale.set(rs * 0.4, rs * 1.0, rs * 0.4);
    a.alert.position.set(0, h * S + rs * 1.4, 0);
  }

  // Player: capsule + visor + slash arc + blob shadow.
  const player = makeActor(bodyMat('#dc2626'));
  const scarf = new THREE.Mesh(box, bodyMat('#b91c1c'));
  scarf.castShadow = true;
  player.group.add(scarf);
  const slash = new THREE.Mesh(
    ring,
    track.material(
      new THREE.MeshBasicMaterial({
        color: '#f8fafc',
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
        toneMapped: false,
      })
    )
  );
  slash.renderOrder = 5;
  root.add(slash);
  const playerShadow = new THREE.Mesh(disc, shadowMat);
  playerShadow.renderOrder = 1;
  root.add(playerShadow);

  const enemyViews = new Map<number, ActorView>();
  const free: ActorView[] = [];
  let frame = 0;

  function syncPlayer(world: World, f: RenderFrame3D) {
    const p = world.player;
    const targetZ = LANE_Z[world.combat.zLane];
    player.z += (targetZ - player.z) * 0.3;
    if (Math.abs(targetZ - player.z) < 0.002) player.z = targetZ;
    layout(player, PLAYER_H, PLAYER_R, p.facing);
    player.group.position.set(toX(p.x), toY(p.y), player.z);
    player.group.scale.set(p.scaleX, p.scaleY, 1);
    const blink = p.invulnTimer > 0 && Math.floor(f.t * 20) % 2 === 0;
    player.group.visible = !blink;
    player.body.material = world.combat.awakenedTimer > 0 ? bodyMat('#f43f5e') : bodyMat('#dc2626');
    // Scarf trails opposite to velocity.
    const sway = Math.max(-1, Math.min(1, -p.vx / 400));
    scarf.scale.set(0.26, 0.05, 0.08);
    scarf.position.set((sway === 0 ? -p.facing : sway) * 0.14, PLAYER_H * S * 0.66, 0);
    scarf.rotation.z = Math.sin(f.t * 11) * 0.15;
    // Melee arc in the attack direction (sim angle, y down → negate).
    slash.visible = p.isAttacking;
    if (p.isAttacking) {
      slash.position.set(toX(p.x), toY(p.y - 28), player.z + 0.05);
      slash.scale.setScalar(0.62);
      slash.rotation.z = -p.attackAngle;
    }
    // Blob shadow on the ground under the player (ground y = player y when grounded).
    playerShadow.visible = p.onGround;
    playerShadow.position.set(toX(p.x), toY(p.y) + 0.01, player.z);
    playerShadow.scale.set(0.2, 1, 0.12);
  }

  return {
    update(world, f) {
      frame++;
      syncPlayer(world, f);

      for (const en of world.enemies) {
        if (en.hp <= 0 && en.koTimer <= 0) continue;
        if (en.x < f.viewMinX - 150 || en.x > f.viewMaxX + 150) continue;
        let a = enemyViews.get(en.id);
        if (!a) {
          a = free.pop() ?? makeActor(bodyMat('#fb7185'));
          a.z = LANE_Z[en.zLane];
          enemyViews.set(en.id, a);
        }
        a.seenFrame = frame;
        const { h, r } = enemySize(en);
        const targetZ = LANE_Z[en.zLane];
        a.z += (targetZ - a.z) * 0.3;
        layout(a, h, r, en.facing);
        const mat = en.hitFlashTimer > 0 ? flashMat : bodyMat(enemyColor(en, f.cfg.accentColor));
        a.body.material = mat;
        a.crown.material = mat;
        a.crown.visible = en.archetype === 'boss' || en.archetype === 'elite_guard';
        a.alert.visible = en.windupTimer > 0;
        a.group.visible = true;
        a.group.position.set(toX(en.x), toY(en.y), a.z);
        const s = en.ambushEntryTimer > 0 ? 0.75 : 1;
        if (en.koTimer > 0) {
          const k = Math.max(0, en.koTimer / 0.4);
          a.group.rotation.z = -(1 - k) * en.facing * 1.45;
          a.group.scale.setScalar(s * (0.4 + 0.6 * k));
        } else {
          a.group.rotation.z = 0;
          a.group.scale.setScalar(s);
        }
      }
      // Release views whose enemy died, despawned or left the view.
      for (const [id, a] of enemyViews) {
        if (a.seenFrame === frame) continue;
        a.group.visible = false;
        enemyViews.delete(id);
        free.push(a);
      }
    },
    dispose() {
      enemyViews.clear();
      free.length = 0;
      scene.remove(root);
    },
  };
}

export const placeholderActors: RenderModuleDef = { slot: 'actors', name: 'actors-placeholder', create };
