import { soundEngine } from '../../audio';
import { findBoss, getStageProgressPct, snapshotCombat } from '../hud';
import { spawnBanner, spawnParticle } from '../spawn';
import { World } from '../world';
import { Frame } from './frame';

// Non-playing states, end-of-stage beat, and victory/defeat detection.

/** Title pan / paused handling. Returns true when the frame should stop here. */
export function handleInactiveStates(world: World, f: Frame): boolean {
  if (f.st.gameState === 'title') {
    world.titlePanTime += f.dt;
    world.camX = 120 + Math.sin(world.titlePanTime * 0.22) * 220;
    world.camY = 0;
    world.keysJustPressed.clear();
    world.lmbJustPressed = false;
    world.rmbJustPressed = false;
    return true;
  }

  if (f.st.gameState !== 'playing') {
    world.keysJustPressed.clear();
    world.lmbJustPressed = false;
    world.rmbJustPressed = false;
    return true;
  }

  return false;
}

/** Plays out the short beat after victory/defeat, then reports the outcome. Returns true while active. */
export function advanceEndBeat(world: World, f: Frame): boolean {
  if (world.pendingOutcome) {
    world.endBeatTimer -= f.dt;
    // On Final Stage (sky_sanctuary) victory, fly Kage toward his Mother at the Golden Cloud Altar!
    if (world.pendingOutcome === 'victory' && f.st.seasonId === 'sky_sanctuary') {
      const motherX = f.cfg.stageLength - 185;
      const motherY = 320;
      world.player.x += (motherX - 42 - world.player.x) * Math.min(1, f.dt * 4.5);
      world.player.y += (motherY - world.player.y) * Math.min(1, f.dt * 4.5);
      world.player.facing = 1;
      world.camX +=
        (Math.max(
          0,
          Math.min(f.cfg.stageLength - world.viewW, world.player.x - world.viewW * 0.42)
        ) -
          world.camX) *
        Math.min(1, f.dt * 6);
    }
    if (world.endBeatTimer <= 0) {
      const outcome = world.pendingOutcome;
      world.pendingOutcome = null;
      const boss = findBoss(world);
      const progressPct = getStageProgressPct(world, f.cfg);
      if (typeof f.st.onStageOutcome === 'function') {
        f.st.onStageOutcome(
          outcome,
          snapshotCombat(world.combat),
          world.stageTimeSec,
          progressPct,
          boss ? Math.max(0, boss.hp) : 0
        );
      } else if (outcome === 'victory') {
        f.st.onStageClear?.();
      } else {
        f.st.onPlayerDefeated?.();
      }
    }
    return true;
  }

  return false;
}

export function checkStageOutcome(world: World, f: Frame) {
  const boss = findBoss(world);
  if (world.combat.hp <= 0 && !world.outcomeTriggered) {
    world.outcomeTriggered = true;
    world.pendingOutcome = 'defeat';
    world.endBeatTimer = 0.55;
  } else if (boss && boss.hp <= 0 && !world.outcomeTriggered) {
    world.outcomeTriggered = true;
    world.pendingOutcome = 'victory';
    world.endBeatTimer = f.st.seasonId === 'sky_sanctuary' ? 1.45 : 0.55;
    soundEngine.playStageClear();
    if (f.st.seasonId === 'sky_sanctuary') {
      spawnBanner(
        world,
        world.player.x,
        world.player.y - 80,
        'PHÁ VỠ PHONG ẤN! ĐÃ GIẢI CỨU MẸ THÀNH CÔNG!',
        '#4ade80'
      );
      for (let i = 0; i < 32; i++) {
        const ang = (Math.PI * 2 * i) / 32;
        spawnParticle(
          world,
          f.cfg.stageLength - 185,
          300,
          Math.cos(ang) * 260,
          Math.sin(ang) * 260,
          5,
          i % 2 === 0 ? '#fde047' : '#fda4af',
          0.9,
          'petal'
        );
      }
    } else {
      spawnBanner(world, world.player.x, world.player.y - 70, 'TRÙM MÀN CHƠI ĐÃ BỊ HẠ!', '#fbbf24');
    }
  }
}
