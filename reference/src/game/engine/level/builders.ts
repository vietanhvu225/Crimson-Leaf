import { PickupItemKind, ZLane } from '../../rules';
import { PlatformBranch, PlatformSubType } from '../entities';
import { World } from '../world';

// Shared level-building helpers.

/** Order in which bonus items are placed along a stage. */
export const ITEM_ROTATION: PickupItemKind[] = [
  'scroll_kodachi',
  'jade_elixir',
  'scroll_kunai',
  'relic_chest',
  'scroll_mobility',
  'chakra_pearl',
  'scroll_deflect',
  'elemental_shrine',
  'scroll_guardian',
  'blood_orb',
];

export function pushPlat(
  world: World,
  x: number,
  y: number,
  w: number,
  zLane: ZLane | 'both',
  type: PlatformSubType,
  extra?: Partial<PlatformBranch>
) {
  world.platforms.push({
    x,
    baseX: x,
    y,
    baseY: y,
    w,
    zLane,
    type,
    ...extra,
  });
}
