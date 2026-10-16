import type { ZLane } from '../../rules';

// Minimal shapes the map renderers need from engine entities.

export interface MapTrunk {
  x: number;
  w: number;
  zDepth: number; // -1 = background, 0 = main plane
}

export interface MapHazardZone {
  id: number;
  kind: 'updraft' | 'geyser' | 'icicle' | 'lightning' | 'spike_trap';
  x: number;
  y: number;
  w: number;
  h: number;
  timer: number;
  period: number;
  active: boolean;
  fallY?: number;
}

export interface MapCheckpoint {
  id: number;
  x: number;
  y: number;
  label: string;
  activated: boolean;
}

export interface MapSealGate {
  id: number;
  coord: number;
  title: string;
  unlocked: boolean;
  hasEliteSubBoss: boolean;
  yOffset?: number;
}

export interface MapPlatform {
  x: number;
  baseX: number;
  y: number;
  baseY: number;
  w: number;
  zLane: ZLane | 'both';
  type:
    | 'ground'
    | 'branch'
    | 'roof'
    | 'piling'
    | 'springboard'
    | 'moving'
    | 'ice'
    | 'collapsing'
    | 'bagua_pad';
  collapseTimer?: number;
  respawnTimer?: number;
}

export interface MapGrapplePoint {
  x: number;
  y: number;
}
