import { computeSubterraneanSlopeY } from '../../../rules/index.ts';
import type { PlatformSubType } from '../../entities.ts';
import type { World } from '../../world.ts';
import type { LevelContext } from '../context.ts';
import { placeCheckpointsAndStarterPickups } from './checkpoints.ts';
import { spawnGateGarrisons, spawnOpeningSquad, spawnRoadPatrols, spawnStageBoss } from './enemies.ts';
import type { HorizontalLayout } from './layout.ts';
import { buildUpperStructures } from './structures.ts';
import {
  buildBossArenaFloor,
  buildBossArenaPlatforms,
  buildGroundSpans,
  buildOpeningPlatform,
} from './terrain.ts';

/** Horizontal-scrolling stage layout. */
export function buildHorizontalStage(world: World, L: LevelContext) {
  const s1End = L.cps.cp1;
  const s2End = L.cps.cp2;
  const bossArenaStart = L.cfg.stageLength - 980;
  const groundStyle: PlatformSubType =
    L.sId === 'winter' ? 'ice' : L.sId === 'summer' ? 'piling' : 'ground';
  const earthBossFloorY = computeSubterraneanSlopeY(bossArenaStart);
  const isFree3DStage = L.sId === 'ocean_palace' || L.sId === 'sky_sanctuary';
  const H: HorizontalLayout = {
    s1End,
    s2End,
    bossArenaStart,
    groundStyle,
    earthBossFloorY,
    isFree3DStage,
  };
  buildOpeningPlatform(world, L, H);
  buildGroundSpans(world, L, H);
  buildBossArenaFloor(world, L, H);
  placeCheckpointsAndStarterPickups(world, L);
  buildUpperStructures(world, L, H);
  buildBossArenaPlatforms(world, L, H);
  spawnOpeningSquad(world, L, H);
  spawnRoadPatrols(world, L, H);
  spawnGateGarrisons(world, L, H);
  spawnStageBoss(world, L, H);
}
