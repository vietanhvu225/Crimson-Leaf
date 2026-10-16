import { soundEngine } from '../../audio.ts';
import { SEASONS, clampDt, getStageDifficultyMultipliers } from '../../rules/index.ts';
import { syncHud } from '../hud.ts';
import type { World } from '../world.ts';
import { updateGrapple, updateStageAbilities } from './abilities.ts';
import { updateAmbientEffects } from './ambient.ts';
import { updateAmbushWaves } from './ambush.ts';
import { updateCamera } from './camera.ts';
import {
  enforceSealGates,
  integrateMotion,
  recoverFromPits,
  resolvePlatformLanding,
  resolveTerrainCollision,
} from './collision.ts';
import { updateEnemies } from './enemies.ts';
import type { Frame } from './frame.ts';
import { readFrameInput } from './frameInput.ts';
import { updateGuardianBlades } from './guardian.ts';
import { updateHazards } from './hazards.ts';
import { updateJumping } from './jumping.ts';
import { resolveMoveState, updateFreeSwimOrFlight, updateWallClingAndCloak } from './movement.ts';
import { advanceEndBeat, checkStageOutcome, handleInactiveStates } from './outcome.ts';
import { updateCheckpointsAndPickups } from './pickups.ts';
import { updateMovingPlatforms } from './platforms.ts';
import { updateKunaiFire, updateMeleeAttack } from './playerAttacks.ts';
import { updateProjectiles } from './projectiles.ts';
import { tickPlayerTimers } from './timers.ts';

// Per-frame simulation step: physics, AI, collisions, bosses, stage mechanics.

export function stepSimulation(world: World, rawDt: number) {
  const dt = clampDt(rawDt);
  const st = world.stateRef.current;
  soundEngine.setMuted(st.muted);
  const cfg = SEASONS[st.seasonId];
  const diff = getStageDifficultyMultipliers(st.seasonId, st.loopRoute);
  const f: Frame = { dt, st, cfg, diff };
  updateAmbientEffects(world, f);
  if (handleInactiveStates(world, f)) return;
  world.stageTimeSec += dt;
  if (world.gateReboundCooldown > 0) {
    world.gateReboundCooldown = Math.max(0, world.gateReboundCooldown - dt);
  }
  if (advanceEndBeat(world, f)) return;
  if (world.hitstopTimer > 0) {
    world.hitstopTimer = Math.max(0, world.hitstopTimer - dt);
    return;
  }
  tickPlayerTimers(world, f);
  updateMovingPlatforms(world, f);
  updateGuardianBlades(world, f);
  const input = readFrameInput(world);
  const move = resolveMoveState(world, f);
  updateFreeSwimOrFlight(world, f, input, move);
  updateStageAbilities(world, f, input, move);
  updateGrapple(world, f, input, move);
  updateJumping(world, f, input, move);
  const motion = integrateMotion(world, f, input);
  resolveTerrainCollision(world, f, move, motion);
  enforceSealGates(world, f);
  resolvePlatformLanding(world, f, move, motion);
  recoverFromPits(world, f, move);
  updateHazards(world, f);
  updateCheckpointsAndPickups(world, f);
  updateWallClingAndCloak(world, f, input, move);
  updateMeleeAttack(world, f, input, move);
  updateKunaiFire(world, f, input, move);
  updateAmbushWaves(world, f);
  updateEnemies(world, f);
  updateProjectiles(world, f);
  checkStageOutcome(world, f);
  updateCamera(world, f);
  world.keysJustPressed.clear();
  world.lmbJustPressed = false;
  world.rmbJustPressed = false;
  world.hudSyncTimer += dt;
  if (world.hudSyncTimer >= 0.08) {
    world.hudSyncTimer = 0;
    syncHud(world);
  }
}
