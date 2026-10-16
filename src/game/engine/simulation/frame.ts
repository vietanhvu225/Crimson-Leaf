import type { SeasonConfig, StageDifficultyScaling } from '../../rules/index.ts';
import type { HostState } from '../world.ts';

/** Per-frame values shared by every simulation phase. */
export interface Frame {
  dt: number;
  st: HostState;
  cfg: SeasonConfig;
  diff: StageDifficultyScaling;
}
