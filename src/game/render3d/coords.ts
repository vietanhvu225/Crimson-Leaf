import type { ZLane } from '../rules/index.ts';

// GAME_SPEC § Ánh xạ tọa độ 2.5D: sim px (y down) → three units (y up), 100 px = 1 unit.

export const S = 0.01;

/** Lane 0 (Ngoài) sits on z = 0, lane 1 (Trong) on z = -3. */
export const LANE_Z: Record<ZLane, number> = { 0: 0, 1: -3 };

/** Half depth of a single-lane slab; 'both' slabs span lane 0 to lane 1 plus this margin. */
export const LANE_HALF_DEPTH = 0.6;

export const toX = (simX: number) => simX * S;
export const toY = (simY: number) => -simY * S;

/** z centre and depth of something that lives on `lane` ('both' = spans the two lanes). */
export function laneSpan(lane: ZLane | 'both'): { z: number; depth: number } {
  if (lane === 'both') {
    return { z: (LANE_Z[0] + LANE_Z[1]) / 2, depth: LANE_Z[0] - LANE_Z[1] + LANE_HALF_DEPTH * 2 };
  }
  return { z: LANE_Z[lane], depth: LANE_HALF_DEPTH * 2 };
}
