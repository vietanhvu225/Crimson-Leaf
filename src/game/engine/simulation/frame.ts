import { SeasonConfig, StageDifficultyScaling } from '../../rules';
import { HostState } from '../world';

/** Per-frame values shared by every simulation phase. */
export interface Frame {
  dt: number;
  st: HostState;
  cfg: SeasonConfig;
  diff: StageDifficultyScaling;
}
