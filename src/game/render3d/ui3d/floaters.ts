import * as THREE from 'three';
import type { World } from '../../engine/world.ts';
import { LANE_Z, S, toX, toY } from '../coords.ts';
import type { RenderFrame3D } from '../module.ts';
import type { Tracker } from '../resources.ts';
import { CanvasPlate, inkText } from './plate.ts';

// World-space damage numbers and combo counter (?ui=3d). Damage is not an event the sim emits, so
// it is read off the World: an enemy (by id) or the player whose hp dropped since the last frame
// gets a number at its head. Animation runs on sim time (frame.t): it freezes in hit-stop and pause
// like everything else. Pools are fixed; a number only redraws its canvas when spawned.

const POOL = 24;
const LIFE = 0.9;
/** Canvas px per sim px at z = 0 (numbers are drawn at ~2.6× the size they show). */
const PX = 2.6;
const NUM_W = 256;
const NUM_H = 80;

interface Floater {
  plate: CanvasPlate;
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  born: number;
  x: number;
  y: number;
  z: number;
  drift: number;
  big: boolean;
  active: boolean;
}

export class Floaters {
  private pool: Floater[] = [];
  private cursor = 0;
  private lastHp = new Map<number, number>();
  private seen = new Set<number>();
  private lastPlayerHp = -1;
  private lastLevel = -1;
  private lastT = 0;
  private combo: { plate: CanvasPlate; sprite: THREE.Sprite; mat: THREE.SpriteMaterial };
  private comboValue = 0;
  private comboChangedAt = -10;

  constructor(parent: THREE.Object3D, track: Tracker) {
    for (let i = 0; i < POOL; i++) {
      const plate = new CanvasPlate(track, NUM_W, NUM_H);
      const mat = track.material(
        new THREE.SpriteMaterial({ map: plate.texture, transparent: true, depthTest: false, depthWrite: false, fog: false })
      );
      const sprite = new THREE.Sprite(mat);
      sprite.renderOrder = 110;
      sprite.visible = false;
      parent.add(sprite);
      this.pool.push({ plate, sprite, mat, born: 0, x: 0, y: 0, z: 0, drift: 0, big: false, active: false });
    }
    const plate = new CanvasPlate(track, 512, 112);
    const mat = track.material(
      new THREE.SpriteMaterial({ map: plate.texture, transparent: true, depthTest: false, depthWrite: false, fog: false })
    );
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = 111;
    sprite.visible = false;
    parent.add(sprite);
    this.combo = { plate, sprite, mat };
  }

  private spawn(t: number, x: number, y: number, z: number, amount: number, kind: 'hit' | 'crit' | 'hurt') {
    const f = this.pool[this.cursor++ % POOL];
    const text = kind === 'hurt' ? `-${amount}` : `${amount}`;
    const fill = kind === 'hurt' ? '#f43f5e' : kind === 'crit' ? '#fde047' : '#f8fafc';
    f.plate.draw(`${kind}|${text}`, (c, w, h) => {
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      inkText(c, text, w / 2, h / 2 + 2, kind === 'crit' ? 60 : 50, fill, 900);
    });
    f.born = t;
    f.x = x;
    f.y = y;
    f.z = z;
    // Visual-only scatter so stacked hits do not overlap (deterministic, no RNG).
    f.drift = ((this.cursor * 37) % 11) - 5;
    f.big = kind === 'crit';
    f.active = true;
  }

  update(world: World, f: RenderFrame3D, playing: boolean) {
    const t = f.t;
    if (f.levelVersion !== this.lastLevel || t < this.lastT) {
      // New level or restart: forget hp history, clear what is on screen.
      this.lastLevel = f.levelVersion;
      this.lastHp.clear();
      this.lastPlayerHp = -1;
      for (const p of this.pool) {
        p.active = false;
        p.sprite.visible = false;
      }
    }
    this.lastT = t;

    if (playing) {
      this.seen.clear();
      for (const en of world.enemies) {
        this.seen.add(en.id);
        const prev = this.lastHp.get(en.id);
        const hp = Math.max(0, en.hp);
        if (prev !== undefined && hp < prev - 0.5) {
          const dmg = Math.round(prev - hp);
          const boss = en.archetype === 'boss';
          this.spawn(t, en.x, en.y - (boss ? 150 : 82), LANE_Z[en.zLane] + 0.5, dmg, dmg >= 30 ? 'crit' : 'hit');
        }
        this.lastHp.set(en.id, hp);
      }
      for (const id of this.lastHp.keys()) if (!this.seen.has(id)) this.lastHp.delete(id);

      const php = world.combat.hp;
      if (this.lastPlayerHp >= 0 && php < this.lastPlayerHp - 0.5) {
        const p = world.player;
        this.spawn(t, p.x, p.y - 70, LANE_Z[world.combat.zLane] + 0.6, Math.round(this.lastPlayerHp - php), 'hurt');
      }
      this.lastPlayerHp = php;
    }

    for (const p of this.pool) {
      if (!p.active) continue;
      const age = t - p.born;
      if (age >= LIFE || age < 0) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      const k = age / LIFE;
      const rise = 46 * (1 - (1 - k) * (1 - k));
      const pop = age < 0.12 ? 1 + 0.6 * (1 - age / 0.12) : 1;
      const s = (p.big ? 1.25 : 1) * pop;
      p.sprite.position.set(toX(p.x + p.drift * k * 3), toY(p.y - rise), p.z);
      p.sprite.scale.set((NUM_W / PX) * S * s, (NUM_H / PX) * S * s, 1);
      p.mat.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      p.sprite.visible = true;
    }

    // Combo counter beside the player's head, pops when it grows, fades as the combo timer runs out.
    const c = world.combat;
    const show = playing && c.combo >= 2 && c.comboTimer > 0;
    if (c.combo !== this.comboValue) {
      if (c.combo > this.comboValue) this.comboChangedAt = t;
      this.comboValue = c.combo;
    }
    const cs = this.combo;
    if (!show) {
      cs.sprite.visible = false;
      return;
    }
    cs.plate.draw(`${c.combo}`, (ctx, w, h) => {
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      const g = ctx.createLinearGradient(0, 10, 0, h - 10);
      g.addColorStop(0, '#fef08a');
      g.addColorStop(1, '#f97316');
      inkText(ctx, `${c.combo}`, w * 0.48, h / 2 + 4, 84, g, 900);
      ctx.textAlign = 'left';
      inkText(ctx, 'COMBO', w * 0.5, h / 2 + 12, 40, '#fda4af', 900);
    });
    const age = t - this.comboChangedAt;
    const pop = age >= 0 && age < 0.15 ? 1 + 0.35 * (1 - age / 0.15) : 1;
    const p = world.player;
    cs.sprite.position.set(toX(p.x + 70), toY(p.y - 128), LANE_Z[c.zLane] + 0.6);
    cs.sprite.scale.set((512 / PX) * S * 0.62 * pop, (112 / PX) * S * 0.62 * pop, 1);
    cs.mat.opacity = Math.min(1, c.comboTimer / 0.5);
    cs.sprite.visible = true;
  }

  hide() {
    for (const p of this.pool) p.sprite.visible = false;
    this.combo.sprite.visible = false;
  }
}
