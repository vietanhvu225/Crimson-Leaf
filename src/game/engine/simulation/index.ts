import { soundEngine } from '../../audio';
import { SEASONS, clampDt, getStageDifficultyMultipliers } from '../../rules';
import { syncHud } from '../hud';
import { World } from '../world';
import { updateGrapple, updateStageAbilities } from './abilities';
import { updateAmbientEffects } from './ambient';
import { updateAmbushWaves } from './ambush';
import { updateCamera } from './camera';
import {
  enforceSealGates,
  integrateMotion,
  recoverFromPits,
  resolvePlatformLanding,
  resolveTerrainCollision,
} from './collision';
import { updateEnemies } from './enemies';
import { Frame } from './frame';
import { readFrameInput } from './frameInput';
import { updateGuardianBlades } from './guardian';
import { updateHazards } from './hazards';
import { updateJumping } from './jumping';
import { resolveMoveState, updateFreeSwimOrFlight, updateWallClingAndCloak } from './movement';
import { advanceEndBeat, checkStageOutcome, handleInactiveStates } from './outcome';
import { updateCheckpointsAndPickups } from './pickups';
import { updateMovingPlatforms } from './platforms';
import { updateKunaiFire, updateMeleeAttack } from './playerAttacks';
import { updateProjectiles } from './projectiles';
import { tickPlayerTimers } from './timers';

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
