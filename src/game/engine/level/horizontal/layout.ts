import { PlatformSubType } from '../../entities';

/** Key x/y anchors of a horizontal stage, derived once per build. */
export interface HorizontalLayout {
  s1End: number;
  s2End: number;
  bossArenaStart: number;
  groundStyle: PlatformSubType;
  earthBossFloorY: number;
  isFree3DStage: boolean;
}
