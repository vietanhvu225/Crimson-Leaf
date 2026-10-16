import * as THREE from 'three';
import { SEASONS } from '../../rules/index.ts';
import type { World } from '../../engine/world.ts';
import { LANE_Z, S, toX, toY } from '../coords.ts';
import type { RenderFrame3D } from '../module.ts';
import type { Tracker } from '../resources.ts';
import { CanvasPlate, UI_FONT, inkText } from './plate.ts';

// World-space boss health bar (?ui=3d): a lacquer plaque hanging over the boss, replacing the DOM
// BossHealthBar. Same show rule as the DOM bar (engine/hud.ts: boss alive and < 860 px from the
// player). When the boss is off screen the plaque docks to the view edge on its side, with an arrow,
// so the information the DOM bar gave is never lost. Redraws only when the shown hp changes.

const TEX_W = 640;
const TEX_H = 150;
/** Plaque size in sim px at z = 0. */
const W = 320;
const H = (W * TEX_H) / TEX_W;

export class BossPlaque {
  private plate: CanvasPlate;
  private group = new THREE.Group();
  private face: THREE.Mesh;
  private x = NaN;
  private y = NaN;

  constructor(parent: THREE.Object3D, track: Tracker) {
    this.plate = new CanvasPlate(track, TEX_W, TEX_H);
    const mat = track.material(
      new THREE.MeshBasicMaterial({
        map: this.plate.texture,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      })
    );
    this.face = new THREE.Mesh(track.geometry(new THREE.PlaneGeometry(W * S, H * S)), mat);
    this.face.renderOrder = 105;
    this.group.add(this.face);
    this.group.visible = false;
    parent.add(this.group);
  }

  update(world: World, f: RenderFrame3D) {
    const boss = world.enemies.find((e) => e.archetype === 'boss');
    const p = world.player;
    if (!boss || boss.hp <= 0 || Math.hypot(boss.x - p.x, boss.y - p.y) >= 860) {
      this.group.visible = false;
      this.x = NaN;
      return;
    }
    const cfg = SEASONS[f.st.seasonId];
    const name = f.isLoop2 ? cfg.loop2BossName : cfg.bossName;
    const hp = Math.ceil(Math.max(0, boss.hp));
    const ratio = Math.max(0, Math.min(1, boss.hp / boss.maxHp));

    // Anchor over the boss's head, clamped inside the view (side arrow when docked).
    // Narrow (phone) views: shrink to fit so the plaque can still follow the boss.
    const scale = Math.min(1, (world.viewW - 24) / (W * 1.6));
    const margin = (W * scale) / 2 + 12;
    const minX = world.camX + margin;
    const maxX = world.camX + world.viewW - margin;
    const targetX = Math.max(minX, Math.min(maxX, boss.x));
    const targetY = Math.max(world.camY + H + 70, Math.min(world.camY + world.viewH - 120, boss.y - 205));
    const dock = boss.x < minX - 40 ? -1 : boss.x > maxX + 40 ? 1 : 0;
    // Ease toward the anchor so docking/undocking does not snap.
    if (Number.isNaN(this.x)) {
      this.x = targetX;
      this.y = targetY;
    } else {
      this.x += (targetX - this.x) * 0.25;
      this.y += (targetY - this.y) * 0.25;
    }

    this.plate.draw(`${name}|${hp}|${boss.maxHp}|${dock}|${f.st.seasonId}`, (c, w, h) => {
      // Lacquer plate with gold rim.
      c.fillStyle = 'rgba(14, 8, 16, 0.9)';
      c.strokeStyle = '#e11d48';
      c.lineWidth = 5;
      c.beginPath();
      c.roundRect(6, 6, w - 12, h - 12, 18);
      c.fill();
      c.stroke();
      c.strokeStyle = 'rgba(253, 224, 71, 0.55)';
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect(14, 14, w - 28, h - 28, 12);
      c.stroke();

      c.textBaseline = 'middle';
      c.textAlign = 'left';
      const arrowL = dock === -1 ? '◀ ' : '';
      inkText(c, `${arrowL}${name}`, 34, 44, 30, '#fda4af', 900, w * 0.54);
      c.font = `700 19px ${UI_FONT}`;
      c.fillStyle = '#fde047';
      c.fillText(`Tuyệt Kỹ: ${cfg.bossSkillName}`, 36, 80, w - 72);
      c.textAlign = 'right';
      // Right-aligned to a fixed edge so the bar never shifts as the digit count drops.
      inkText(c, `${hp} / ${boss.maxHp}${dock === 1 ? ' ▶' : ''}`, w - 34, 52, 30, '#f8fafc', 800);

      // Bar.
      const bx = 34;
      const by = 100;
      const bw = w - 68;
      const bh = 22;
      c.fillStyle = '#090a0f';
      c.fillRect(bx, by, bw, bh);
      const g = c.createLinearGradient(bx, 0, bx + bw, 0);
      g.addColorStop(0, '#9f1239');
      g.addColorStop(0.6, '#e11d48');
      g.addColorStop(1, '#fbbf24');
      c.fillStyle = g;
      c.fillRect(bx, by, bw * ratio, bh);
      c.strokeStyle = '#881337';
      c.lineWidth = 3;
      c.strokeRect(bx, by, bw, bh);
      // Quarter ticks.
      c.fillStyle = 'rgba(253, 224, 71, 0.5)';
      for (let i = 1; i < 4; i++) c.fillRect(bx + (bw * i) / 4 - 1, by, 2, bh);
    });

    // Hangs slightly tilted toward the camera and sways with sim time: reads as an object in the
    // scene, not a flat overlay.
    this.group.position.set(toX(this.x), toY(this.y), LANE_Z[boss.zLane] + 0.8);
    this.group.rotation.set(-0.12, Math.sin(f.t * 1.3) * 0.12, Math.sin(f.t * 0.9) * 0.02);
    this.group.scale.setScalar(scale);
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
    this.x = NaN;
  }
}
