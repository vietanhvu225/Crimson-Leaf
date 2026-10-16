import test from 'node:test';
import assert from 'node:assert/strict';
import { SEASONS, SEASON_ORDER, type SeasonId } from '../rules/index.ts';
import { createWorld, type HostState, type World } from './world.ts';
import { rebuildLevel } from './level/index.ts';
import { stepSimulation } from './simulation/index.ts';
import { mulberry32 } from './rng.ts';

// Headless engine tests: the sim runs in Node with no DOM, canvas or renderer.

// Recorded on first run (T01). A change here means engine behaviour changed: rerun `npm run parity`.
const GOLDEN_SPRING_SEED1 = { x: 1596.317, y: 442.218, hp: 105, enemies: 154, score: 7910 };

// Lowest y (px, y down) the player may reach: horizontal stages sit around y 0–900 (earth_core
// slopes down), vertical stages start near y = stageLength and climb towards 0.
const MAX_Y = {
  horizontal: () => 2500,
  vertical: (stageLength: number) => stageLength + 200,
};

function makeHost(seasonId: SeasonId): HostState {
  const noop = () => {};
  return {
    gameState: 'playing',
    seasonId,
    loopRoute: 1,
    muted: true,
    onSyncHud: noop,
    onStageOutcome: noop,
    onTogglePause: noop,
    onToggleMute: noop,
    onOpenGdd: noop,
    onQuickRestart: noop,
    onSelectSeasonQuick: noop,
  };
}

function makeWorld(seasonId: SeasonId, seed: number): World {
  const world = createWorld({
    stateRef: { current: makeHost(seasonId) },
    touchInputRef: {
      current: {
        left: false,
        right: false,
        jump: false,
        melee: false,
        kunai: false,
        dash: false,
        grapple: false,
        switchZ: false,
      },
    },
    seed,
    viewW: 1280,
    viewH: 720,
    isHeadless: false, // keep the cosmetic particle spawns, so the RNG is exercised as in a browser
  });
  rebuildLevel(world, seasonId, 1);
  return world;
}

/** Fixed input: hold right, jump every 40 steps, slash every 25, kunai every 60, lane swap at 300. */
function runScripted(world: World, steps: number) {
  world.keysHeld.add('KeyD');
  for (let i = 0; i < steps; i++) {
    if (i % 40 === 0) world.keysJustPressed.add('Space');
    if (i % 25 === 10) world.keysJustPressed.add('KeyJ');
    if (i % 60 === 30) world.keysJustPressed.add('KeyK');
    if (i === 300) world.keysJustPressed.add('KeyQ');
    stepSimulation(world, 1 / 60);
  }
}

function snapshot(world: World) {
  return {
    x: Math.round(world.player.x * 1000) / 1000,
    y: Math.round(world.player.y * 1000) / 1000,
    hp: Math.round(world.combat.hp * 1000) / 1000,
    enemies: world.enemies.filter((e) => e.hp > 0).length,
    score: world.combat.score,
  };
}

test('rng: mulberry32 is deterministic and in [0, 1)', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 1000; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
  assert.notEqual(mulberry32(1)(), mulberry32(2)());
});

test('600 steps on spring, seed 1: golden snapshot', () => {
  const world = makeWorld('spring', 1);
  runScripted(world, 600);
  assert.deepEqual(snapshot(world), GOLDEN_SPRING_SEED1);
});

test('same seed twice gives the same run; a different seed diverges', () => {
  const a = makeWorld('spring', 7);
  const b = makeWorld('spring', 7);
  runScripted(a, 600);
  runScripted(b, 600);
  assert.deepEqual(snapshot(a), snapshot(b));
  assert.deepEqual(
    a.particles.map((p) => [p.x, p.y, p.active]),
    b.particles.map((p) => [p.x, p.y, p.active])
  );
  const c = makeWorld('spring', 8);
  runScripted(c, 600);
  assert.notDeepEqual(
    a.particles.map((p) => [p.x, p.y]),
    c.particles.map((p) => [p.x, p.y])
  );
});

for (const sId of SEASON_ORDER) {
  test(`stage ${sId}: builds and runs 300 steps without throwing or leaving the map`, () => {
    const world = makeWorld(sId, 3);
    assert.ok(world.platforms.length > 0, 'level has platforms');
    runScripted(world, 300);
    const { x, y } = world.player;
    const cfg = SEASONS[sId];
    assert.ok(Number.isFinite(x) && Number.isFinite(y), `finite position (${x}, ${y})`);
    assert.ok(x >= -200 && x <= cfg.stageLength + 1000, `x in stage: ${x}`);
    assert.ok(y >= -2000 && y <= MAX_Y[cfg.scrollMode](cfg.stageLength), `y in stage: ${y}`);
  });
}
