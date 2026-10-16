import * as THREE from 'three';
import { SEASONS, type SeasonId } from '../../rules/index.ts';
import type { World } from '../../engine/world.ts';
import type { EnemyActor } from '../../engine/entities.ts';
import { LANE_Z, S, toX, toY } from '../coords.ts';
import type { RenderFrame3D, RenderModule, RenderModuleContext, RenderModuleDef } from '../module.ts';
import { cssColor } from '../resources.ts';
import { Cape, type CapeNode } from './cape.ts';
import { drawEnemy, enemyBody, enemyTrim } from './enemy.ts';
import { GALLERY_BOSSES, GALLERY_ENEMIES, GALLERY_POSES, GALLERY_SEASONS, POSE_LABEL, bossTag } from './gallery.ts';
import { drawMother } from './mother.ts';
import { Overhead } from './overhead.ts';
import { PartBatches, Rig } from './parts.ts';
import {
  ATTACK_SEC,
  classifyPlayer,
  drawPlayerAura,
  drawProtagonist,
  elemColor,
  type PlayerAnim,
  type PlayerPose,
} from './protagonist.ts';

// T04 actors module (slot `actors`): procedural chibi protagonist, every enemy archetype, elites,
// the 11 stage bosses and the captive mother, all built from instanced primitive parts
// (parts.ts) so draw calls do not grow with the enemy count. Animation state is read from the
// sim; short beats the sim does not time (hurt, parry, death) are measured here from sim time.

const YAW = 0.45; // turn toward the camera so faces read in 3/4 view
const HURT_SEC = 0.32;
const PARRY_SEC = 0.28;

const ARCHETYPE_LABEL: Record<EnemyActor['archetype'], string> = {
  blue_kiter: 'LAM ẢNH TIÊU',
  red_ambusher: 'HUYẾT ĐAO QUỶ',
  fire_monk: 'HỎA THIỀN SƯ',
  bomb_alchemist: 'BỘC PHÁ SƯ',
  chain_kusarigama: 'XÍCH LIÊM NHẪN',
  claw_assassin: 'THIẾT TRẢO HỒ',
  tessen_gale: 'THIẾT PHIẾN CƠ',
  thunder_puppeteer: 'LÔI KHÔI LỖI',
  elite_guard: 'HỘ PHÁP TINH ANH',
  boss: 'BÁ CHỦ TRẤN ẢI',
};

/** Facing state that turns through the camera (yaw −YAW … −(π−YAW)), see Rig.zSign. */
interface Turn {
  yaw: number;
}
const yawFor = (facing: number) => (facing === 1 ? -YAW : -(Math.PI - YAW));
function ease(turn: Turn, facing: number, rate = 0.35) {
  const target = yawFor(facing);
  turn.yaw += (target - turn.yaw) * rate;
  if (Math.abs(target - turn.yaw) < 0.01) turn.yaw = target;
}
const zSignOf = (yaw: number): 1 | -1 => (yaw > -Math.PI / 2 ? 1 : -1);

interface EnemyView extends Turn {
  z: number;
  seen: number;
}

const mTmp = new THREE.Matrix4();
const mRot = new THREE.Matrix4();
const vPos = new THREE.Vector3();
const vScl = new THREE.Vector3();
const qId = new THREE.Quaternion();

/** root = T(x,y,z) · Rz(roll) · diag(sx, sy, sx) · Ry(yaw) · S·scale */
function actorRoot(
  out: THREE.Matrix4,
  x: number,
  y: number,
  z: number,
  yaw: number,
  sx = 1,
  sy = 1,
  roll = 0,
  scale = 1
) {
  out.makeRotationY(yaw);
  mTmp.makeScale(sx, sy, sx);
  out.premultiply(mTmp);
  if (roll !== 0) {
    mRot.makeRotationZ(roll);
    out.premultiply(mRot);
  }
  vPos.set(x, y, z);
  vScl.set(1, 1, 1);
  mTmp.compose(vPos, qId, vScl);
  out.premultiply(mTmp);
  mTmp.makeScale(S * scale, S * scale, S * scale);
  out.multiply(mTmp);
  return out;
}

function readGalleryFlag(): boolean {
  try {
    const q = new URLSearchParams(window.location.search);
    return q.get('gallery') === 'actors' && q.get('debug') === '1';
  } catch {
    return false;
  }
}

function create(ctx: RenderModuleContext): RenderModule {
  const { scene, track } = ctx;
  const root = new THREE.Group();
  root.name = 'actors';
  scene.add(root);

  const batches = new PartBatches(root, track);
  const rig = new Rig(batches);
  const overhead = new Overhead(root, track);
  const capeMat = track.material(
    new THREE.MeshToonMaterial({ color: '#ffffff', vertexColors: true, side: THREE.DoubleSide })
  );
  const playerCape = new Cape(root, track, capeMat);
  const rootM = new THREE.Matrix4();

  // X-ray silhouette: drawn only where something already in the depth buffer (level geometry)
  // hides the player, so a lane-1 player behind a lane-0 slab stays readable without washing
  // over the detailed model. Opaque pass, renderOrder 1 (after env, before actors).
  const xrayMat = track.material(
    new THREE.MeshBasicMaterial({
      color: '#b91c1c',
      depthFunc: THREE.GreaterDepth,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      fog: false,
    })
  );
  const xrayBody = new THREE.Mesh(track.geometry(new THREE.CapsuleGeometry(0.12, 0.12, 4, 10)), xrayMat);
  const xrayHead = new THREE.Mesh(track.geometry(new THREE.SphereGeometry(0.165, 14, 10)), xrayMat);
  for (const m of [xrayBody, xrayHead]) {
    m.renderOrder = 1;
    m.frustumCulled = false;
    root.add(m);
  }

  // Gallery: backdrop + extra capes.
  const gallery = readGalleryFlag();
  let backdrop: THREE.Mesh | null = null;
  const galleryCapes: Cape[] = [];
  if (gallery) {
    backdrop = new THREE.Mesh(
      track.geometry(new THREE.PlaneGeometry(1, 1)),
      track.material(new THREE.MeshBasicMaterial({ color: '#1f2a3d', fog: false }))
    );
    root.add(backdrop);
    for (let i = 0; i < GALLERY_POSES.length; i++) galleryCapes.push(new Cape(root, track, capeMat));
  }

  // Player state the sim does not keep.
  const pTurn: Turn = { yaw: -YAW };
  let pz = 0;
  let lastT = -1;
  let lastHp = -1;
  let lastParry = 0;
  let hurtAt = -99;
  let parryAt = -99;
  let deadAt = -1;

  const enemyViews = new Map<number, EnemyView>();
  const freeViews: EnemyView[] = [];
  let frame = 0;
  const tmpNodes: CapeNode[] = Array.from({ length: 6 }, () => ({ x: 0, y: 0 }));

  const pose: PlayerPose = {
    anim: 'idle',
    t: 0,
    vx: 0,
    vy: 0,
    onGround: true,
    gaitPhase: 0,
    attackAngle: 0,
    attackK: 0,
    facing: 1,
    wallCling: 0,
    beatK: 0,
    combat: null as unknown as PlayerPose['combat'],
    guardianAngle: 0,
    seasonId: 'spring',
  };

  /** Emits a protagonist (body + aura) at three-space (x, y, z). */
  function emitPlayer(
    pp: PlayerPose,
    x: number,
    y: number,
    z: number,
    turn: Turn,
    sx: number,
    sy: number,
    scale: number,
    fade = 0
  ) {
    // Wall cling faces the wall so hands and feet press against it.
    const facing = pp.facing;
    if (pp.anim === 'wall' && pp.wallCling !== 0) pp.facing = pp.wallCling;
    const yaw = turn.yaw;
    actorRoot(rootM, x, y, z, yaw, sx, sy, 0, scale);
    rig.begin(rootM, zSignOf(yaw));
    rig.fade = pp.anim === 'dead' ? Math.min(0.55, Math.max(0, pp.beatK - 0.6)) : fade;
    drawProtagonist(rig, pp);
    pp.facing = facing;
    actorRoot(rootM, x, y, z, 0, 1, 1, 0, scale);
    rig.begin(rootM, 1);
    drawPlayerAura(rig, pp);
  }

  function syncPlayer(world: World, f: RenderFrame3D) {
    const p = world.player;
    const c = world.combat;
    const t = f.t;
    if (t < lastT || lastHp < 0) {
      // Level reset / first frame.
      hurtAt = -99;
      parryAt = -99;
      deadAt = -1;
      lastParry = c.parryCount;
      lastHp = c.hp;
    }
    lastT = t;
    if (c.hp < lastHp && c.hp > 0) hurtAt = t;
    if (c.parryCount > lastParry) parryAt = t;
    lastParry = c.parryCount;
    lastHp = c.hp;
    if (c.hp <= 0) {
      if (deadAt < 0) deadAt = t;
    } else deadAt = -1;

    const hurt = t - hurtAt < HURT_SEC ? t - hurtAt : -1;
    const parry = t - parryAt < PARRY_SEC ? t - parryAt : -1;
    const anim = classifyPlayer(world, { hurt: hurt >= 0 ? 1 : 0, parry: parry >= 0 ? 1 : 0, dead: deadAt >= 0 });
    pose.anim = anim;
    pose.t = t;
    pose.vx = p.vx;
    pose.vy = p.vy;
    pose.onGround = p.onGround;
    pose.gaitPhase = p.gaitPhase;
    pose.attackAngle = p.attackAngle;
    pose.attackK = p.attackElapsed / ATTACK_SEC;
    pose.facing = p.facing;
    pose.wallCling = p.wallCling;
    pose.beatK =
      anim === 'hurt' ? hurt / HURT_SEC : anim === 'parry' ? parry / PARRY_SEC : anim === 'dead' ? (t - deadAt) / 0.8 : 0;
    pose.combat = c;
    pose.guardianAngle = p.guardianAngle;
    pose.seasonId = f.st.seasonId;

    const targetZ = LANE_Z[c.zLane];
    pz += (targetZ - pz) * 0.3;
    if (Math.abs(targetZ - pz) < 0.002) pz = targetZ;
    ease(pTurn, anim === 'wall' && p.wallCling !== 0 ? p.wallCling : p.facing);

    const x = toX(p.x);
    const y = toY(p.y);
    const blink = p.invulnTimer > 0 && Math.floor(t * 18) % 2 === 0;

    // Dash / awakened afterimages at trailing cloak nodes (elemental tint, dithered).
    const dashing = c.dashTimer > 0;
    if (dashing || c.awakenedTimer > 0) {
      const ghosts = dashing ? 3 : 2;
      for (let g = ghosts; g >= 1; g--) {
        const node = p.cloakNodes[Math.min(p.cloakNodes.length - 1, g * 2 - 1)];
        if (!node || Math.hypot(node.x - p.x, node.y - p.y) < 8) continue;
        const yaw = pTurn.yaw;
        actorRoot(rootM, toX(node.x), y, pz - 0.02 * g, yaw, p.scaleX, p.scaleY);
        rig.begin(rootM, zSignOf(yaw));
        rig.dimColor.copy(cssColor(c.awakenedTimer > 0 ? '#f43f5e' : elemColor(c)));
        rig.dim = 0.85;
        rig.fade = 0.45 + g * 0.15;
        drawProtagonist(rig, pose);
      }
    }

    // Invulnerability blink: half-dissolve on alternate frames (never fully invisible).
    emitPlayer(pose, x, y, pz, pTurn, p.scaleX, p.scaleY, 1, blink ? 0.5 : 0);
    if (anim === 'hurt' && pose.beatK < 0.3) {
      // Hit flash: a short pale burst behind the body.
      actorRoot(rootM, x, y, pz - 0.15, 0);
      rig.begin(rootM, 1);
      rig.part('octa', 'glow', '#fecaca', 0, 30, 0, 30 + pose.beatK * 40, 34 + pose.beatK * 40, 4, pose.beatK * 2);
    }

    // Blob shadow (grounded).
    if (p.onGround && anim !== 'dead') {
      actorRoot(rootM, x, y + 0.01, pz, 0);
      rig.begin(rootM, 1);
      rig.part('cyl', 'clear', '#000000', 0, 0, 0, 22, 1, 10);
    }

    // Cloak.
    if (anim === 'dead') playerCape.hide();
    else playerCape.update(p.cloakNodes, p.facing, pz, t, c.awakenedTimer > 0, elemColor(c));

    // X-ray silhouette follows the body.
    xrayBody.position.set(x, y + 0.2, pz);
    xrayHead.position.set(x, y + 0.45, pz);
    xrayBody.visible = xrayHead.visible = anim !== 'dead';
  }

  function emitEnemy(en: EnemyActor, view: EnemyView, seasonId: SeasonId, accent: string, t: number, otherLane: boolean, scale = 1, x?: number, y?: number, z?: number) {
    ease(view, en.facing, 0.25);
    const ex = x ?? toX(en.x);
    const ey = y ?? toY(en.y);
    const ez = z ?? view.z;
    const amb = en.ambushEntryTimer > 0 ? 0.75 : 1;
    let roll = 0;
    let fade = 0;
    if (en.koTimer > 0) {
      const k = Math.max(0, en.koTimer / 0.4);
      roll = -(1 - k) * en.facing * 1.45;
      fade = 1 - k;
    } else if (en.ambushEntryTimer > 0) {
      fade = Math.min(0.7, en.ambushEntryTimer * 0.8);
    }
    const b = enemyBody(en.archetype);
    // Ground shadow + boss/elite ring (not in water/sky stances).
    if (en.koTimer <= 0 && (en.onGround ?? true) && seasonId !== 'ocean_palace') {
      actorRoot(rootM, ex, ey + 0.01, ez, 0, amb, 1, 0, scale);
      rig.begin(rootM, 1);
      const sw = en.archetype === 'boss' ? 36 : en.archetype === 'elite_guard' ? 28 : 21;
      rig.part('cyl', 'clear', '#000000', 0, 0, 0, sw, 1, sw * 0.45);
      if (en.archetype === 'boss' || en.archetype === 'elite_guard') {
        const pulse = 1 + Math.sin(t * 5 + en.id) * 0.04;
        rig.part('torus', 'glow', en.archetype === 'elite_guard' ? '#fde047' : accent, 0, 1, 0, sw * 1.15 * pulse, sw * 0.55 * pulse, 10, 0, 0, Math.PI / 2);
      }
    }
    actorRoot(rootM, ex, ey, ez, view.yaw, amb, amb, roll, scale);
    rig.begin(rootM, zSignOf(view.yaw));
    rig.flash = en.hitFlashTimer > 0;
    rig.fade = fade;
    if (otherLane) {
      rig.dimColor.copy(cssColor('#94a3b8'));
      rig.dim = 0.3;
    }
    drawEnemy(rig, en, { t, seasonId, accent });
    return b;
  }

  function emitEnemyOverhead(en: EnemyActor, b: { totalH: number }, z: number, accent: string, otherLane: boolean, x = en.x, y = en.y) {
    if (en.hp <= 0 || en.koTimer > 0) return;
    const isBoss = en.archetype === 'boss';
    const isElite = en.archetype === 'elite_guard';
    const barW = isBoss ? 88 : isElite ? 64 : 46;
    const barH = isBoss || isElite ? 7 : 5.5;
    const barY = y - b.totalH - 22;
    const trim = enemyTrim(en.archetype, accent);
    overhead.bar(x, barY, z + 0.3, barW, barH, en.hp / en.maxHp, isElite ? '#fde047' : otherLane ? '#94a3b8' : trim);
    const frozen = (en.freezeTimer ?? 0) > 0;
    const stunned = (en.stunTimer ?? 0) > 0;
    const suffix = frozen
      ? ' · [ĐÓNG BĂNG]'
      : stunned
        ? ' · [CHOÁNG SÉT]'
        : en.burnTimer > 0
          ? ' · [BỐC CHÁY]'
          : !isBoss && (en.gatesCleared ?? 0) > 0
            ? ` ★Ải ${en.gatesCleared}`
            : '';
    const color = frozen ? '#7dd3fc' : stunned ? '#fde047' : isBoss ? '#fda4af' : isElite ? '#fde047' : '#e2e8f0';
    overhead.tag(`${ARCHETYPE_LABEL[en.archetype]}${suffix}`, color, x, barY - 8, z + 0.3);
  }

  function syncEnemies(world: World, f: RenderFrame3D) {
    const accent = f.cfg.accentColor;
    for (const en of world.enemies) {
      if (en.hp <= 0 && en.koTimer <= 0) continue;
      if (en.x < f.viewMinX - 150 || en.x > f.viewMaxX + 150) continue;
      let v = enemyViews.get(en.id);
      if (!v) {
        v = freeViews.pop() ?? { yaw: 0, z: 0, seen: 0 };
        v.yaw = yawFor(en.facing);
        v.z = LANE_Z[en.zLane];
        enemyViews.set(en.id, v);
      }
      v.seen = frame;
      const tz = LANE_Z[en.zLane];
      v.z += (tz - v.z) * 0.3;
      const otherLane = en.zLane !== world.combat.zLane;
      const b = emitEnemy(en, v, f.st.seasonId, accent, f.t, otherLane);
      emitEnemyOverhead(en, b, v.z, accent, otherLane);
    }
    for (const [id, v] of enemyViews) {
      if (v.seen === frame) continue;
      enemyViews.delete(id);
      freeViews.push(v);
    }
  }

  function syncMother(world: World, f: RenderFrame3D) {
    if (f.st.seasonId !== 'sky_sanctuary') return;
    const boss = world.enemies.find((e) => e.archetype === 'boss');
    const alive = !boss || boss.hp > 0;
    const mx = f.cfg.stageLength - 185;
    if (mx < f.viewMinX - 200 || mx > f.viewMaxX + 200) return;
    const my = 320 + Math.sin(f.t * 2.6) * 6;
    const z = (LANE_Z[0] + LANE_Z[1]) / 2;
    actorRoot(rootM, toX(mx), toY(my), z, 0);
    rig.begin(rootM, 1);
    drawMother(rig, alive, f.t);
    overhead.tag(
      alive ? 'MẪU THÂN (BỊ PHONG ẤN — HẠ BOSS ĐỂ CỨU MẸ!)' : 'ĐÃ GIẢI CỨU MẸ THÀNH CÔNG! ĐOÀN TỤ MẪU TỬ!',
      alive ? '#fda4af' : '#fde047',
      mx,
      my - 96,
      z + 0.3,
      alive ? 11 : 13
    );
  }

  // ---------- gallery ----------
  const gTurns: Turn[] = Array.from({ length: 40 }, () => ({ yaw: -YAW }));
  const gViews: EnemyView[] = Array.from({ length: 40 }, () => ({ yaw: -YAW, z: 0, seen: 0 }));
  const galleryCombat = {
    awakenedTimer: 0,
    isImmortal: false,
    dashTimer: 0,
    skills: { activeElement: 'crimson_fire', kodachiLevel: 3, guardianLevel: 1 },
  } as unknown as PlayerPose['combat'];

  function syncGallery(world: World, f: RenderFrame3D) {
    const t = f.t;
    const vw = world.viewW;
    const vh = world.viewH;
    const z = 1.0;
    const cx = world.camX + vw / 2;
    const cy = world.camY + vh / 2;
    backdrop!.position.set(toX(cx), toY(cy), 0.85);
    backdrop!.scale.set(vw * S * 1.4, vh * S * 1.4, 1);
    const fit = Math.min(1.25, vw / 1500);

    // Row 1: road ninjas + elite guard + the captive mother.
    const row1 = world.camY + vh * 0.28;
    const n1 = GALLERY_ENEMIES.length + 1;
    GALLERY_ENEMIES.forEach((en, i) => {
      const sx = world.camX + (vw * (i + 0.7)) / (n1 + 0.4);
      en.x = sx;
      en.y = row1;
      en.vx = i % 3 === 1 ? 60 : 0; // a few walk in place
      en.windupTimer = i === 2 ? 0.3 + 0.2 * Math.sin(t * 3) : 0;
      const v = gViews[i];
      emitEnemy(en, v, 'spring', SEASONS.spring.accentColor, t, false, fit, toX(sx), toY(row1), z);
      emitEnemyOverhead(en, enemyBody(en.archetype), z, SEASONS.spring.accentColor, false, sx, row1);
    });
    {
      const mx = world.camX + (vw * (n1 - 1 + 0.7)) / (n1 + 0.4);
      actorRoot(rootM, toX(mx), toY(row1 - 10), z, 0, 1, 1, 0, fit * 0.85);
      rig.begin(rootM, 1);
      drawMother(rig, true, t);
      overhead.tag('MẪU THÂN', '#fda4af', mx, row1 - 110 * fit, z + 0.3, 10);
    }

    // Row 2: the 11 bosses, each in its own stage look.
    const row2 = world.camY + vh * 0.58;
    GALLERY_BOSSES.forEach((en, i) => {
      const s = GALLERY_SEASONS[i];
      const sx = world.camX + (vw * (i + 0.6)) / (GALLERY_BOSSES.length + 0.2);
      en.x = sx;
      en.y = row2;
      const accent = SEASONS[s].accentColor;
      emitEnemy(en, gViews[20 + i], s, accent, t, false, fit * 0.9, toX(sx), toY(row2), z);
      overhead.tag(bossTag(i, s), accent, sx, row2 - (i % 2 ? 128 : 112) * fit, z + 0.3, 8);
    });

    // Row 3: protagonist animation states.
    const row3 = world.camY + vh * 0.86;
    GALLERY_POSES.forEach((anim: PlayerAnim, i) => {
      const sx = world.camX + (vw * (i + 0.6)) / (GALLERY_POSES.length + 0.2);
      const k = (t * 1.3 + i * 0.1) % 1;
      pose.anim = anim;
      pose.t = t;
      pose.vx = anim === 'run' ? 320 : anim === 'dash' ? 900 : 0;
      pose.vy = anim === 'jump' ? -400 : anim === 'fall' ? 400 : 0;
      pose.onGround = anim === 'idle' || anim === 'run' || anim === 'attack' || anim === 'parry' || anim === 'hurt' || anim === 'dead';
      pose.gaitPhase = t * 14;
      pose.attackAngle = -0.3;
      pose.attackK = anim === 'attack' ? k : 0;
      pose.facing = 1;
      pose.wallCling = anim === 'wall' ? 1 : 0;
      pose.beatK = anim === 'dead' ? Math.min(1, k * 1.5) : k;
      pose.combat = galleryCombat;
      pose.guardianAngle = t * 2;
      pose.seasonId = 'spring';
      const turn = gTurns[i];
      turn.yaw = yawFor(1);
      const lift = anim === 'jump' || anim === 'fall' ? 18 : anim === 'wall' ? 26 : 0;
      emitPlayer(pose, toX(sx), toY(row3 - lift), z, turn, 1, 1, fit);
      // Trailing cloak nodes (what the sim chain would settle to).
      const trail = anim === 'run' || anim === 'dash' ? 1.4 : 0.6;
      for (let n = 0; n < tmpNodes.length; n++) {
        tmpNodes[n].x = sx - (8 + n * 10 * trail) * fit;
        tmpNodes[n].y = row3 - lift - (36 - n * 4 * (anim === 'fall' ? -0.6 : 1) - Math.sin(t * 12 + n) * 2.5) * fit;
      }
      const cape = galleryCapes[i];
      if (anim === 'dead') cape.hide();
      else cape.update(tmpNodes, 1, z, t, false, '#ef4444');
      overhead.tag(POSE_LABEL[anim], '#e2e8f0', sx, row3 - lift - 90 * fit, z + 0.3, 9);
    });
  }

  return {
    update(world, f) {
      frame++;
      batches.begin();
      overhead.begin();
      if (gallery) {
        playerCape.hide();
        xrayBody.visible = xrayHead.visible = false;
        syncGallery(world, f);
      } else {
        syncPlayer(world, f);
        syncEnemies(world, f);
        syncMother(world, f);
      }
      batches.end();
      overhead.end();
    },
    dispose() {
      batches.dispose();
      overhead.dispose();
      enemyViews.clear();
      freeViews.length = 0;
      scene.remove(root);
    },
  };
}

export const actorsModule: RenderModuleDef = { slot: 'actors', name: 'actors', create };
