import {
  type GameLoopRoute,
  type SealGateDefinition,
  type SeasonConfig,
  type SeasonId,
  type StageDifficultyScaling,
  getCheckpointCoordinates,
} from '../../rules/index.ts';

/** Stage-wide values shared by every level-building step. */
export interface LevelContext {
  sId: SeasonId;
  route: GameLoopRoute;
  cfg: SeasonConfig;
  cps: ReturnType<typeof getCheckpointCoordinates>;
  diff: StageDifficultyScaling;
  gateDefs: SealGateDefinition[];
}
