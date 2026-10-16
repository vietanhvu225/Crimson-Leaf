import { World } from '../world';
import { LevelContext } from './context';
import { buildHorizontalStage } from './horizontal';
import { buildVerticalStage } from './vertical';
export function buildStageLayout(world: World, L: LevelContext) {
  if (L.cfg.scrollMode === 'horizontal') {
    buildHorizontalStage(world, L);
  } else {
    buildVerticalStage(world, L);
  }
}
