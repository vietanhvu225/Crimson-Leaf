import type { World } from '../world.ts';
import type { LevelContext } from './context.ts';
import { buildHorizontalStage } from './horizontal/index.ts';
import { buildVerticalStage } from './vertical.ts';
export function buildStageLayout(world: World, L: LevelContext) {
  if (L.cfg.scrollMode === 'horizontal') {
    buildHorizontalStage(world, L);
  } else {
    buildVerticalStage(world, L);
  }
}
