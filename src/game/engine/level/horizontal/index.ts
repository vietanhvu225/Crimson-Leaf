import { computeSubterraneanSlopeY } from '../../../rules';
import { PlatformSubType } from '../../entities';
import { World } from '../../world';
import { LevelContext } from '../context';
import { placeCheckpointsAndStarterPickups } from './checkpoints';
import { spawnGateGarrisons, spawnOpeningSquad, spawnRoadPatrols, spawnStageBoss } from './enemies';
import { HorizontalLayout } from './layout';
import { buildUpperStructures } from './structures';
import {
  buildBossArenaFloor,
  buildBossArenaPlatforms,
  buildGroundSpans,
  buildOpeningPlatform,
} from './terrain';

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
