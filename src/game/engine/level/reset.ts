import { computeSubterraneanSlopeY } from '../../rules/index.ts';
import type { World } from '../world.ts';
import type { LevelContext } from './context.ts';

// Clears actors, pools and player state before a stage is (re)built.

export function resetLevelState(world: World, L: LevelContext) {
  world.platforms = [];
  world.hazards = [];
  world.sealGates = L.gateDefs.map((g) => ({
    id: g.id,
    coord: g.coord,
    title: g.title,
    unlocked: false,
    hasEliteSubBoss: g.hasEliteSubBoss,
    yOffset: L.sId === 'earth_core' ? computeSubterraneanSlopeY(g.coord) - 360 : 0,
  }));
  world.grapples = [];
  world.trunks = [];
  world.checkpoints = [];
  world.worldItems = [];
  world.enemies = [];
  world.projectiles.forEach((p) => (p.active = false));
  world.bloodOrbs.forEach((o) => (o.active = false));

  world.player.x = 200;
  world.player.y =
    L.cfg.scrollMode === 'vertical'
      ? L.cfg.stageLength - 180
      : L.sId === 'ocean_palace' || L.sId === 'sky_sanctuary'
        ? 320
        : L.sId === 'earth_core'
          ? 162
          : L.sId === 'winter'
            ? 240
            : 460;
  world.player.vx = 0;
  world.player.vy = 0;
  world.player.facing = 1;
  world.player.onGround = L.sId !== 'ocean_palace' && L.sId !== 'sky_sanctuary';
  world.player.onIce = L.sId === 'winter';
  world.player.standingPlatform = null;
  world.player.airJumpsUsed = 0;
  world.player.wallCling = 0;
  world.player.isAttacking = false;
  world.player.grappleTarget = null;
  world.player.invulnTimer = 1.0;
  world.mouseClientX = 520;
  world.mouseClientY = world.player.y - 28;
  world.player.cloakNodes.forEach((n) => {
    n.x = world.player.x;
    n.y = world.player.y;
  });

  world.combat = {
    ...world.combat,
    hp: world.combat.maxHp,
    chakra: world.combat.maxChakra,
    rage: 25,
    awakenedTimer: 0,
    dashCooldown: 0,
    dashTimer: 0,
    zLane: 0,
    zSwitchCooldown: 0,
    combo: 0,
  };
  world.trailingHp = world.combat.hp;
  world.stageTimeSec = 0;
  world.hitstopTimer = 0;
  world.cameraTrauma = 0;
  world.outcomeTriggered = false;
  world.endBeatTimer = 0;
  world.pendingOutcome = null;
  world.gateReboundCooldown = 0;
  world.kageWaveTimer = 1.8;
  world.kageWaveCount = 0;
}
