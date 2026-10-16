import {
  GameLoopRoute,
  SealGateDefinition,
  SeasonConfig,
  SeasonId,
  StageDifficultyScaling,
  getCheckpointCoordinates,
} from '../../rules';

/** Stage-wide values shared by every level-building step. */
export interface LevelContext {
  sId: SeasonId;
  route: GameLoopRoute;
  cfg: SeasonConfig;
  cps: ReturnType<typeof getCheckpointCoordinates>;
  diff: StageDifficultyScaling;
  gateDefs: SealGateDefinition[];
}
