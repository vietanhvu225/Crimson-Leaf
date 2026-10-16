import { computeSubterraneanSlopeY } from '../../../rules/index.ts';
import { spawnWorldItem } from '../../spawn.ts';
import type { World } from '../../world.ts';
import type { LevelContext } from '../context.ts';

// Checkpoint shrines and starter pickups.

export function placeCheckpointsAndStarterPickups(world: World, L: LevelContext) {
  world.checkpoints.push(
    {
      id: 1,
      x: L.cps.cp1,
      y:
        L.sId === 'earth_core'
          ? computeSubterraneanSlopeY(L.cps.cp1)
          : L.sId === 'sky_sanctuary'
            ? 360
            : 560,
      label: L.cfg.sectors[1],
      activated: false,
    },
    {
      id: 2,
      x: L.cps.cp2,
      y:
        L.sId === 'earth_core'
          ? computeSubterraneanSlopeY(L.cps.cp2)
          : L.sId === 'sky_sanctuary'
            ? 360
            : 560,
      label: L.cfg.sectors[2],
      activated: false,
    }
  );

  // Curated Starter Pickups
  spawnWorldItem(
    world,
    'scroll_guardian',
    520,
    L.sId === 'winter' || L.sId === 'earth_core' ? 165 : 385,
    'both'
  );
  spawnWorldItem(world, 'relic_chest', 860, 265, 'both');
}
