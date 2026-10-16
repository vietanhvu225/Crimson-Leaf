import type { SeasonConfig } from '../rules';
import type { HostState } from '../engine/world';

/** Per-frame values shared by the scene draw passes. */
export interface RenderFrame {
  st: HostState;
  cfg: SeasonConfig;
  isLoop2: boolean;
}
