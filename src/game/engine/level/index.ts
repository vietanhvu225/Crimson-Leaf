import {
  GameLoopRoute,
  SEASONS,
  SeasonId,
  getCheckpointCoordinates,
  getStageDifficultyMultipliers,
  getStageSealGates,
} from '../../rules';
import { World } from '../world';
import { LevelContext } from './context';
import { buildStageLayout } from './layout';
import { resetLevelState } from './reset';

// Level construction for each stage (platforms, hazards, enemies, gates).

export function rebuildLevel(world: World, sId: SeasonId, route: GameLoopRoute) {
  const cfg = SEASONS[sId];
  const cps = getCheckpointCoordinates(sId);
  const diff = getStageDifficultyMultipliers(sId, route);
  const gateDefs = getStageSealGates(sId);
  const L: LevelContext = { sId, route, cfg, cps, diff, gateDefs };
  resetLevelState(world, L);
  buildStageLayout(world, L);
  world.camX = Math.max(0, world.player.x - world.viewW * 0.35);
  world.camY =
    cfg.scrollMode === 'vertical'
      ? Math.max(0, world.player.y - world.viewH * 0.65)
      : sId === 'ocean_palace' || sId === 'sky_sanctuary'
        ? 0
        : Math.max(-180, Math.min(180, world.player.y - world.viewH * 0.68));
}
