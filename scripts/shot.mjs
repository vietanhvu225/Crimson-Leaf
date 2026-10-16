// Automated screenshots + smoke gate (GAME_SPEC § Gates).
//
//   node scripts/shot.mjs --stage spring --renderer canvas --loop 1 --seed 1 --script run --out shots/T00/
//   node scripts/shot.mjs --smoke [--out shots/smoke/] [--renderers canvas,three]
//
//   --script clear  bot plays the stage via window.__game until victory/defeat (--max-sim-sec, default 900)
//   --script lanes  <name>-lane0.png / -lane1.png before/after Q
//   --script swap   F9 three↔canvas ×20, reports GPU resources / heap / fps before-after
//   --script bench  uncapped ms/frame (rAF stopped, 600 × __game.step(1)); for fx=high vs fx=low
//   --script vfx    <name>-weather/-lightning/-parry/-parry2/-debuffs/-awaken.png (T05 effects)
// Extra flags: --width 1280 --height 720 --duration <ms of input script> --name <png basename>
//              --params "debug=1&foo=bar" (appended to the URL as-is)
// Starts its own Vite server on a free port, launches Chromium with PINNED_VERSIONS.chromiumLaunch,
// holds a machine-wide lock so only one shot/smoke runs at a time, and always closes browser/server.
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PINNED = JSON.parse(fs.readFileSync(path.join(ROOT, 'threejs-port', 'PINNED_VERSIONS.json'), 'utf8'));
const SMOKE_CONFIG_PATH = path.join(ROOT, 'scripts', 'smoke.config.json');
const STAGES = [
  'spring',
  'summer',
  'autumn',
  'winter',
  'cavern',
  'thunder_peak',
  'blood_abyss',
  'celestial_altar',
  'ocean_palace',
  'earth_core',
  'sky_sanctuary',
];
const SCRIPTS = ['idle', 'run', 'combat', 'boss', 'clear', 'lanes', 'swap', 'vfx', 'bench'];
const LOCK_PATH = path.join(os.tmpdir(), 'crimson-shot.lock');
const LOCK_WAIT_MS = 20 * 60 * 1000;
const LOCK_STALE_MS = 30 * 60 * 1000;

// ---------- CLI ----------

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

function loadSmokeConfig() {
  const defaults = { minFps: 5, minPixelStd: 4, renderers: ['canvas'], durationMs: 4000, width: 1280, height: 720 };
  if (!fs.existsSync(SMOKE_CONFIG_PATH)) return defaults;
  return { ...defaults, ...JSON.parse(fs.readFileSync(SMOKE_CONFIG_PATH, 'utf8')) };
}

// ---------- machine-wide lock ----------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function acquireLock() {
  const started = Date.now();
  let announced = false;
  for (;;) {
    try {
      const fd = fs.openSync(LOCK_PATH, 'wx');
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, cwd: ROOT, at: new Date().toISOString() }));
      fs.closeSync(fd);
      return;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    try {
      const age = Date.now() - fs.statSync(LOCK_PATH).mtimeMs;
      if (age > LOCK_STALE_MS) {
        console.warn(`[shot] stale lock (${Math.round(age / 60000)} min), reclaiming ${LOCK_PATH}`);
        fs.rmSync(LOCK_PATH, { force: true });
        continue;
      }
    } catch {
      continue; // lock vanished between open and stat
    }
    if (Date.now() - started > LOCK_WAIT_MS) {
      throw new Error(`[shot] lock ${LOCK_PATH} still held after 20 min`);
    }
    if (!announced) {
      console.log(`[shot] waiting for lock ${LOCK_PATH} ...`);
      announced = true;
    }
    await sleep(2000);
  }
}

let lockHeld = false;
function releaseLock() {
  if (!lockHeld) return;
  lockHeld = false;
  try {
    const owner = JSON.parse(fs.readFileSync(LOCK_PATH, 'utf8'));
    if (owner.pid === process.pid) fs.rmSync(LOCK_PATH, { force: true });
  } catch {
    // already gone or unreadable: nothing to release
  }
}
process.on('exit', releaseLock);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(sig, () => {
    releaseLock();
    process.exit(130);
  });
}

// ---------- server ----------

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function startServer() {
  const port = await freePort();
  const server = await createServer({
    root: ROOT,
    configFile: path.join(ROOT, 'vite.config.ts'),
    logLevel: 'warn',
    clearScreen: false,
    server: { port, strictPort: false, host: '127.0.0.1', hmr: false, watch: null },
  });
  await server.listen();
  const url = server.resolvedUrls?.local?.[0] ?? `http://127.0.0.1:${port}/`;
  return { server, url: url.endsWith('/') ? url : `${url}/` };
}

// ---------- page helpers ----------

function buildUrl(base, opts) {
  const p = new URLSearchParams();
  p.set('autostart', '1');
  p.set('stage', opts.stage);
  p.set('loop', String(opts.loop));
  if (opts.renderer) p.set('renderer', opts.renderer);
  if (opts.seed !== undefined) p.set('seed', String(opts.seed));
  if (opts.muted) p.set('muted', '1');
  let q = p.toString();
  if (opts.params) q += `&${opts.params}`;
  return `${base}?${q}`;
}

async function webglInfo(page) {
  return page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { webgl: false, renderer: null };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return { webgl: true, webgl2: !!c.getContext('webgl2'), renderer };
  });
}

/** Starts an in-page rAF counter; returns a handle whose promise resolves to measured fps. */
function measureFps(page, ms) {
  return page.evaluate(
    (windowMs) =>
      new Promise((resolve) => {
        let frames = 0;
        let worst = 0;
        const t0 = performance.now();
        let last = t0;
        const tick = (now) => {
          frames++;
          worst = Math.max(worst, now - last);
          last = now;
          if (now - t0 < windowMs) requestAnimationFrame(tick);
          else resolve({ fps: (frames * 1000) / (now - t0), worstFrameMs: worst });
        };
        requestAnimationFrame(tick);
      }),
    ms
  );
}

/** Std-dev of luminance over the canvas layer only (DOM overlays hidden), computed in-page. */
async function canvasPixelStd(page) {
  const png = await page.screenshot({
    style: 'body * { visibility: hidden !important; } canvas { visibility: visible !important; }',
  });
  return page.evaluate(async (b64) => {
    const img = new Image();
    img.src = `data:image/png;base64,${b64}`;
    await img.decode();
    const w = Math.max(1, Math.floor(img.width / 4));
    const h = Math.max(1, Math.floor(img.height / 4));
    const c = new OffscreenCanvas(w, h);
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    let sum = 0;
    let sumSq = 0;
    const n = w * h;
    for (let i = 0; i < d.length; i += 4) {
      const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      sum += y;
      sumSq += y * y;
    }
    const mean = sum / n;
    return { std: Math.sqrt(Math.max(0, sumSq / n - mean * mean)), mean };
  }, png.toString('base64'));
}

async function tap(page, key, holdMs = 60) {
  await page.keyboard.down(key);
  await sleep(holdMs);
  await page.keyboard.up(key);
}

/**
 * `--script clear`: a simple bot plays the stage through window.__game (fixed 1/60 s steps, decided
 * every 0.1 s): run right, jump over gaps / when stuck, melee the nearest enemy, switch lane (Q)
 * toward a seal-gate guard on the other lane. Only after 15 s without progress does it fall back
 * to teleportToBoss (reported). Ends at victory, defeat or the sim-time budget.
 */
const VERTICAL_STAGES = ['autumn', 'thunder_peak'];

async function playToClear(page, maxSimSec, stage) {
  const vertStage = VERTICAL_STAGES.includes(stage);
  return page.evaluate(async ([maxSimSec, vertStage]) => {
    const g = window.__game;
    const w = g.world;
    const p = w.player;
    const log = [];
    let simSec = 0;
    let bestX = p.x;
    let bestY = p.y;
    let lastProgressAt = 0;
    let teleports = 0;
    let laneSwitches = 0;
    let jumps = 0;
    let outcome = null;
    let minHp = w.combat.hp;
    const yieldToReact = () => new Promise((r) => setTimeout(r, 0));
    const vertical = vertStage;
    for (let tick = 0; simSec < maxSimSec; tick++) {
      if (w.pendingOutcome) outcome = w.pendingOutcome;
      if (outcome || document.body.dataset.state === 'gameover') break;
      const lane = w.combat.zLane;
      // Nearest living enemy (prefer same lane); seal-gate guard if a gate blocks the way.
      let target = null;
      let bestD = Infinity;
      for (const e of w.enemies) {
        if (e.hp <= 0 || e.koTimer > 0 || e.ambushEntryTimer > 0) continue;
        const d = Math.hypot(e.x - p.x, (e.y - p.y) * 1.5) + (e.zLane === lane ? 0 : 120);
        if (d < bestD) {
          bestD = d;
          target = e;
        }
      }
      const gate = w.sealGates.find((s) => !s.unlocked && Math.abs(s.coord - p.x) < 260);
      let guard = null;
      if (gate) {
        for (const e of w.enemies) {
          if (e.gateId === gate.id && e.hp > 0 && (!guard || Math.abs(e.x - p.x) < Math.abs(guard.x - p.x))) guard = e;
        }
      }
      const focus = guard ?? (target && Math.abs(target.x - p.x) < 220 ? target : null);
      const input = { moveRight: true, moveLeft: false, jumpHeld: false };
      if (focus) {
        if (focus.x < p.x - 40) {
          input.moveRight = false;
          input.moveLeft = true;
        } else if (Math.abs(focus.x - p.x) < 50) {
          input.moveRight = false;
        }
        if (focus.zLane !== lane && Math.abs(focus.x - p.x) < 200 && tick % 8 === 0) {
          input.switchZPressed = true;
          laneSwitches++;
        }
        if (Math.abs(focus.x - p.x) < 130 && focus.zLane === lane) input.meleePressed = true;
        if (focus.y < p.y - 70 && p.onGround) {
          input.jumpPressed = true;
          input.jumpHeld = true;
        }
      } else if (tick % 3 === 0) {
        input.meleePressed = true;
      }
      // Jump over gaps: no ground ahead in our lane.
      const ahead = p.x + (input.moveLeft ? -70 : 70);
      const groundAhead = w.platforms.some(
        (pl) =>
          (pl.zLane === 'both' || pl.zLane === lane) &&
          ahead >= pl.x - 10 &&
          ahead <= pl.x + pl.w + 10 &&
          pl.y >= p.y - 10 &&
          pl.y <= p.y + 140
      );
      if ((!groundAhead || simSec - lastProgressAt > 1.2) && p.onGround) {
        input.jumpPressed = true;
        input.jumpHeld = true;
        jumps++;
      }
      if (!p.onGround && p.vy < 0) input.jumpHeld = true;
      if (simSec - lastProgressAt > 2.5 && tick % 10 === 0) {
        input.dashPressed = true;
        input.grapplePressed = true;
      }
      if (simSec - lastProgressAt > 6 && tick % 20 === 0) input.switchZPressed = true;
      g.setInput(input);
      g.step(6);
      simSec += 0.1;
      if (p.x > bestX + 40 || (vertical && p.y < bestY - 40)) {
        bestX = Math.max(bestX, p.x);
        bestY = Math.min(bestY, p.y);
        lastProgressAt = simSec;
      }
      if (focus) lastProgressAt = Math.max(lastProgressAt, simSec - 1); // fighting is progress
      minHp = Math.min(minHp, w.combat.hp);
      if (simSec - lastProgressAt > 15) {
        teleports++;
        log.push(`stuck at x=${Math.round(p.x)} y=${Math.round(p.y)} t=${simSec.toFixed(1)}s -> teleportToBoss`);
        g.teleportToBoss();
        bestX = p.x;
        bestY = p.y;
        lastProgressAt = simSec;
      }
      if (tick % 20 === 0) await yieldToReact();
    }
    g.setInput({ moveRight: false, moveLeft: false, jumpHeld: false });
    for (let i = 0; i < 20 && document.body.dataset.state !== 'gameover'; i++) await yieldToReact();
    const boss = w.enemies.find((e) => e.archetype === 'boss');
    return {
      outcome,
      simSec: Math.round(simSec * 10) / 10,
      finalX: Math.round(p.x),
      finalY: Math.round(p.y),
      bossHp: boss ? Math.max(0, boss.hp) : null,
      hp: w.combat.hp,
      minHp,
      kills: w.combat.kills,
      score: w.combat.score,
      teleports,
      laneSwitches,
      jumps,
      log,
    };
  }, [maxSimSec, vertStage]);
}

/**
 * `--script lanes`: stands still on lane 0, captures, presses Q, captures again (proves the lane
 * switch is a real depth change). Writes <name>-lane0.png / <name>-lane1.png.
 */
async function laneShots(page, opts) {
  await page.evaluate(() => {
    const g = window.__game;
    g.toggleImmortal();
    g.setInput({ moveRight: true });
    g.step(150);
    g.setInput({ moveRight: false });
    g.step(60);
  });
  fs.mkdirSync(opts.out, { recursive: true });
  const z0 = await page.evaluate(() => window.__game.world.combat.zLane);
  await page.screenshot({ path: path.join(opts.out, `${opts.name}-lane${z0}.png`) });
  await page.evaluate(() => {
    window.__game.setInput({ switchZPressed: true });
    window.__game.step(40);
  });
  await sleep(300);
  const z1 = await page.evaluate(() => window.__game.world.combat.zLane);
  const player = await page.evaluate(() => {
    const p = window.__game.world.player;
    const w = window.__game.world;
    const under = w.platforms
      .filter((pl) => p.x >= pl.x - 14 && p.x <= pl.x + pl.w + 14)
      .map((pl) => ({ x: pl.x, w: pl.w, y: pl.y, lane: pl.zLane, type: pl.type }));
    return { x: p.x, y: p.y, onGround: p.onGround, standing: p.standingPlatform?.y ?? null, under };
  });
  await page.screenshot({ path: path.join(opts.out, `${opts.name}-lane${z1}.png`) });
  return { lanes: [z0, z1], player };
}

/**
 * `--script vfx` (T05): stops the real-time loop (rAF → no-op), then drives the sim with
 * __game.step and captures one PNG per effect. Mechanics are triggered for real where the sim allows:
 *   -weather   ambient stage particles after a short run
 *   -lightning thunder element + melee on an enemy placed in reach → LightningArc + chain + stun
 *   -parry     enemy fireball flying at the player + melee timed by distance → frame of hit-stop
 *   -parry2    3 steps later (sparks spreading, sim still frozen)
 *   -debuffs   burn / freeze / stun timers set on three enemies (injected: the procs are random)
 *   -awaken    H (Huyết Ảnh) like the player would, after the banner settles
 * Each capture records hitstopTimer etc. in the result.
 */
async function vfxShots(page, opts) {
  fs.mkdirSync(opts.out, { recursive: true });
  const shots = {};
  const snap = async (tag) => {
    await sleep(120);
    const file = path.join(opts.out, `${opts.name}-${tag}.png`);
    await page.screenshot({ path: file });
    shots[tag] = await page.evaluate(() => {
      const w = window.__game.world;
      return {
        hitstop: w.hitstopTimer,
        trauma: Math.round(w.cameraTrauma * 100) / 100,
        awakened: w.combat.awakenedTimer,
        particles: w.particles.filter((p) => p.active).length,
        bolts: w.lightningBolts.filter((b) => b.active).length,
      };
    });
  };
  await page.evaluate(() => {
    window.requestAnimationFrame = () => 0;
    const g = window.__game;
    g.toggleImmortal(); // keep the run alive; turned off again before the shots
    g.setInput({ moveRight: true });
    g.step(150);
    g.setInput({ moveRight: false });
    g.step(30);
    g.toggleImmortal();
    g.step(1);
  });
  await snap('weather');

  // Put enemy #i at dx px in front of the player, same lane, harmless for a while.
  const placeEnemies = (dxs) =>
    page.evaluate((dxs) => {
      const w = window.__game.world;
      const p = w.player;
      const alive = w.enemies.filter((e) => e.hp > 0 && e.archetype !== 'boss');
      dxs.forEach((dx, i) => {
        const e = alive[i];
        if (!e) return;
        e.x = p.x + p.facing * dx;
        e.baseX = e.x;
        e.y = p.y;
        e.vx = 0;
        e.vy = 0;
        e.zLane = w.combat.zLane;
        e.attackCooldown = 9;
        e.windupTimer = 0;
        e.ambushEntryTimer = 0;
      });
      return alive.length;
    }, dxs);

  // Lightning: thunder stance, melee an enemy in reach.
  await placeEnemies([40, 150]);
  const bolts = await page.evaluate(() => {
    const g = window.__game;
    const w = g.world;
    // rage 0: hits fill rage and auto-trigger Huyết Ảnh, which would tint the lightning/parry shots.
    w.combat = { ...w.combat, rage: 0, skills: { ...w.combat.skills, activeElement: 'thunder_lightning' } };
    for (let i = 0; i < 40; i++) {
      if (i % 12 === 0) g.setInput({ meleePressed: true });
      g.step(1);
      if (w.lightningBolts.some((b) => b.active)) break;
    }
    g.step(2);
    return w.lightningBolts.filter((b) => b.active).length;
  });
  await snap('lightning');

  // Parry: enemy fireball at the player, melee when it is close.
  const parried = await page.evaluate(() => {
    const g = window.__game;
    const w = g.world;
    g.step(40);
    w.combat = { ...w.combat, rage: 0, awakenedTimer: 0 };
    const p = w.player;
    const slot = w.projectiles.find((q) => !q.active) ?? w.projectiles[0];
    Object.assign(slot, {
      active: true, x: p.x + p.facing * 220, y: p.y - 24, vx: -p.facing * 420, vy: 0,
      fromPlayer: false, parried: false, piercing: false, explosive: false, homing: false,
      crossZ: false, isSwordBeam: false, isFireball: true, damage: 10, zLane: w.combat.zLane,
      life: 3, gravity: 0, waveAmp: 0, boomerangReturn: false, customColor: undefined,
    });
    let pressed = false;
    for (let i = 0; i < 60; i++) {
      if (!pressed && Math.abs(slot.x - p.x) < 70) {
        g.setInput({ meleePressed: true });
        pressed = true;
      }
      g.step(1);
      if (slot.parried && w.hitstopTimer > 0) return { ok: true, step: i, hitstop: w.hitstopTimer };
    }
    return { ok: false };
  });
  await snap('parry');
  await page.evaluate(() => window.__game.step(3));
  await snap('parry2');

  // Elemental debuffs (timers injected on three enemies in a row).
  await page.evaluate(() => window.__game.step(30));
  await placeEnemies([140, 240, 340]);
  await page.evaluate(() => {
    const w = window.__game.world;
    const p = w.player;
    const row = w.enemies
      .filter((e) => e.hp > 0 && e.zLane === w.combat.zLane && Math.abs(e.y - p.y) < 2)
      .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
    if (row[0]) row[0].burnTimer = 3;
    if (row[1]) row[1].freezeTimer = 3;
    if (row[2]) row[2].stunTimer = 3;
    w.combat = { ...w.combat, rage: 0, awakenedTimer: 0 };
    window.__game.step(2);
  });
  await snap('debuffs');

  // Huyết Ảnh: the real H key path (input.ts keydown → triggerAwakening).
  await page.evaluate(() => {
    const w = window.__game.world;
    w.combat = { ...w.combat, rage: 100 };
  });
  await page.keyboard.press('KeyH');
  await page.evaluate(() => window.__game.step(45));
  await snap('awaken');
  return { bolts, parried, shots };
}

/**
 * `--script bench` (T05): vsync caps the rAF fps (144 on PC2) for every config, so it cannot tell
 * fx=high from fx=low. This stops rAF, puts the player in a busy scene (run 2 s, Huyết Ảnh on, a
 * burst of fights), then times `frames` back-to-back __game.step(1) calls (sim + render each) with a
 * readPixels at the end to drain the GPU queue. Reports ms/frame and the uncapped fps it implies.
 */
async function benchShots(page, frames) {
  return page.evaluate(async (frames) => {
    window.requestAnimationFrame = () => 0;
    const g = window.__game;
    g.toggleImmortal();
    g.setInput({ moveRight: true });
    g.step(120);
    const w = g.world;
    w.combat = { ...w.combat, rage: 100 };
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyH', key: 'h' }));
    const canvas = document.querySelector('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('2d');
    const px = new Uint8Array(4);
    const sync = () => {
      if (gl && 'readPixels' in gl && gl.readPixels.length >= 7) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    };
    const run = (n) => {
      for (let i = 0; i < n; i++) {
        if (i % 20 === 0) g.setInput({ meleePressed: true, kunaiPressed: true });
        g.step(1);
      }
      sync();
    };
    run(60); // warm-up (shader compile, pools)
    const t0 = performance.now();
    run(frames);
    const ms = (performance.now() - t0) / frames;
    const s = g.stats();
    return { frames, msPerFrame: Math.round(ms * 100) / 100, uncappedFps: Math.round(10000 / ms) / 10, entities: s.entities };
  }, frames);
}

/**
 * `--script swap`: presses F9 (three ↔ canvas) `cycles` × 2 times while the run continues, and
 * records GPU resource counts after each return to three plus JS heap, to spot leaks.
 */
async function swapRenderers(page, cycles, warnings) {
  const heap = () => page.evaluate(() => performance.memory?.usedJSHeapSize ?? null);
  const readStats = () =>
    page.evaluate(() => ({
      renderer: document.querySelector('canvas')?.dataset.renderer ?? null,
      canvases: document.querySelectorAll('canvas').length,
      stats: window.__game?.stats(),
      x: Math.round(window.__game.world.player.x),
    }));
  const samples = [];
  await sleep(1500);
  const fpsBefore = (await measureFps(page, 2000)).fps;
  const heapStart = await heap();
  for (let i = 0; i < cycles; i++) {
    await page.keyboard.press('F9');
    await sleep(700);
    const toCanvas = await readStats();
    await page.keyboard.press('F9');
    await sleep(700);
    const toThree = await readStats();
    samples.push({ cycle: i + 1, toCanvas: toCanvas.renderer, three: toThree });
  }
  const heapEnd = await heap();
  await sleep(1500);
  const fpsAfter = (await measureFps(page, 2000)).fps;
  return {
    cycles,
    fpsBefore: Math.round(fpsBefore),
    fpsAfter: Math.round(fpsAfter),
    // Same world spot as before the swaps, to compare like with like.
    playerX: (await readStats()).x,
    heapStartMB: heapStart && Math.round(heapStart / 1e5) / 10,
    heapEndMB: heapEnd && Math.round(heapEnd / 1e5) / 10,
    first: samples[0],
    last: samples[samples.length - 1],
    geometriesPerCycle: samples.map((s) => s.three.stats?.geometries ?? null),
    texturesPerCycle: samples.map((s) => s.three.stats?.textures ?? null),
    webglWarnings: warnings.filter((w) => /webgl|context/i.test(w)),
  };
}

/** Real-time keyboard input script. Keys follow src/game/engine/input.ts + simulation/frameInput.ts. */
async function runInputScript(page, script, durationMs) {
  const end = Date.now() + durationMs;
  if (script === 'idle') {
    await sleep(durationMs);
    return;
  }
  if (script === 'boss') {
    await tap(page, 'KeyB'); // immortal, so the shot is not a death screen
    await tap(page, 'KeyV'); // teleport to boss
    await sleep(400);
  }
  const fighting = script === 'combat' || script === 'boss';
  await page.keyboard.down('KeyD');
  try {
    let i = 0;
    while (Date.now() < end) {
      if (i % 3 === 0) await tap(page, 'Space', 120);
      if (fighting) {
        await tap(page, 'KeyJ');
        if (i % 2 === 0) await tap(page, 'KeyK');
      }
      await sleep(fighting ? 180 : 280);
      i++;
    }
  } finally {
    await page.keyboard.up('KeyD');
  }
}

async function readStats(page) {
  return page.evaluate(() => {
    const w = window;
    const out = {};
    if (typeof w.render_game_to_text === 'function') {
      try {
        out.game = JSON.parse(w.render_game_to_text());
      } catch {
        out.game = null;
      }
    }
    if (w.__game && typeof w.__game.stats === 'function') {
      try {
        out.stats = w.__game.stats();
      } catch {
        out.stats = null;
      }
    }
    return out;
  });
}

/** One page run: load, play the input script, measure, screenshot. */
async function capture(browser, baseUrl, opts) {
  const context = await browser.newContext({ viewport: { width: opts.width, height: opts.height } });
  const page = await context.newPage();
  const errors = [];
  const warnings = [];
  page.on('console', (msg) => {
    if (msg.type() === 'warning') warnings.push(msg.text());
    if (msg.type() !== 'error') return;
    const where = msg.location()?.url;
    // The reference game ships no favicon; Chromium's automatic /favicon.ico probe is not a game error.
    if (where && new URL(where).pathname === '/favicon.ico') return;
    errors.push(`console: ${msg.text()}${where ? ` (${where})` : ''}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  page.on('response', (res) => {
    if (res.status() >= 400) errors.push(`http ${res.status()}: ${res.url()}`);
  });
  const url = buildUrl(baseUrl, opts);
  const result = { stage: opts.stage, renderer: opts.renderer ?? null, loop: opts.loop, script: opts.script, url };
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 30000 });
    await page.waitForFunction(() => typeof window.advanceTime === 'function', null, { timeout: 30000 });
    await page.locator('canvas').first().focus().catch(() => {});
    await sleep(500); // first frames, fonts

    if (opts.script === 'clear') {
      result.bot = await playToClear(page, Number(opts.maxSimSec ?? 900), opts.stage);
      await sleep(800); // outcome modal
    } else if (opts.script === 'swap') {
      result.swap = await swapRenderers(page, 20, warnings);
    } else if (opts.script === 'lanes') {
      result.lanes = await laneShots(page, opts);
    } else if (opts.script === 'vfx') {
      result.vfx = await vfxShots(page, opts);
    } else if (opts.script === 'bench') {
      result.bench = await benchShots(page, 600);
    } else {
      const fpsWindow = Math.max(1000, opts.durationMs - 1000);
      const fpsPromise = sleep(500).then(() => measureFps(page, fpsWindow));
      await runInputScript(page, opts.script, opts.durationMs);
      const fps = await fpsPromise;
      result.fps = Math.round(fps.fps * 10) / 10;
      result.worstFrameMs = Math.round(fps.worstFrameMs);
    }

    const pixel = await canvasPixelStd(page);
    result.pixelStd = Math.round(pixel.std * 100) / 100;
    result.pixelMean = Math.round(pixel.mean * 100) / 100;

    const stats = await readStats(page);
    if (stats.game) {
      result.gameState = stats.game.gameState;
      result.seasonId = stats.game.seasonId;
      result.player = stats.game.player;
    }
    if (stats.stats) result.stats = stats.stats;

    fs.mkdirSync(opts.out, { recursive: true });
    const file = path.join(opts.out, `${opts.name}.png`);
    await page.screenshot({ path: file });
    result.png = path.relative(ROOT, file).split(path.sep).join('/');
  } catch (err) {
    errors.push(`harness: ${err.message}`);
  } finally {
    result.errors = errors;
    await context.close().catch(() => {});
  }
  return result;
}

// ---------- main ----------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cfg = loadSmokeConfig();
  const smoke = !!args.smoke;
  const out = path.resolve(ROOT, String(args.out ?? (smoke ? 'shots/smoke/' : 'shots/manual/')));
  const width = Number(args.width ?? cfg.width);
  const height = Number(args.height ?? cfg.height);
  const durationMs = Number(args.duration ?? cfg.durationMs);
  const loop = Number(args.loop ?? 1) === 2 ? 2 : 1;
  const script = String(args.script ?? 'run');
  if (!SCRIPTS.includes(script)) throw new Error(`--script must be one of ${SCRIPTS.join('|')}`);

  const jobs = [];
  if (smoke) {
    const renderers = args.renderers ? String(args.renderers).split(',') : cfg.renderers;
    for (const renderer of renderers) {
      for (const stage of STAGES) {
        jobs.push({ stage, renderer, loop: 1, script: 'run', muted: true, name: `${stage}-${renderer}` });
      }
    }
  } else {
    const stage = String(args.stage ?? 'spring');
    if (!STAGES.includes(stage)) throw new Error(`--stage must be one of ${STAGES.join('|')}`);
    const renderer = args.renderer ? String(args.renderer) : undefined;
    jobs.push({
      stage,
      renderer,
      loop,
      script,
      seed: args.seed !== undefined ? Number(args.seed) : undefined,
      muted: args.muted !== 'false',
      params: args.params ? String(args.params) : undefined,
      maxSimSec: args['max-sim-sec'] !== undefined ? Number(args['max-sim-sec']) : undefined,
      name: String(args.name ?? `${stage}-l${loop}-${renderer ?? 'default'}-${script}`),
    });
  }

  await acquireLock();
  lockHeld = true;
  let server;
  let browser;
  const results = [];
  let gpu = null;
  try {
    const started = await startServer();
    server = started.server;
    const baseUrl = started.url;
    console.log(`[shot] vite at ${baseUrl}`);
    browser = await chromium.launch(PINNED.chromiumLaunch);
    {
      const probe = await browser.newPage();
      await probe.goto('about:blank');
      gpu = await webglInfo(probe);
      await probe.close();
    }
    console.log(`[shot] webgl: ${gpu.renderer}`);
    for (const job of jobs) {
      const r = await capture(browser, baseUrl, { ...job, out, width, height, durationMs });
      results.push(r);
      console.log(
        `[shot] ${job.name}: fps=${r.fps ?? '-'} std=${r.pixelStd ?? '-'} errors=${r.errors.length}` +
          (r.errors.length ? `\n         ${r.errors.slice(0, 3).join('\n         ')}` : '')
      );
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await server.close().catch(() => {});
    releaseLock();
  }

  if (!smoke) {
    const r = results[0];
    if (r?.bot) console.log(`[shot] bot ${JSON.stringify(r.bot)}`);
    if (r?.lanes) console.log(`[shot] lanes ${JSON.stringify(r.lanes)}`);
    if (r?.vfx) console.log(`[shot] vfx ${JSON.stringify(r.vfx)}`);
    if (r?.bench) console.log(`[shot] bench ${JSON.stringify(r.bench)}`);
    if (r?.swap) console.log(`[shot] swap ${JSON.stringify(r.swap)}`);
    if (r?.stats) console.log(`[shot] stats ${JSON.stringify(r.stats)}`);
    if (r?.png) {
      console.log(`[shot] saved ${r.png}`);
      fs.writeFileSync(path.join(out, `${jobs[0].name}.json`), JSON.stringify(r, null, 2));
    }
    return r && r.errors.length === 0 ? 0 : 1;
  }

  const failures = [];
  for (const r of results) {
    const why = [];
    if (r.errors.length) why.push(`${r.errors.length} error(s)`);
    if (!(r.pixelStd >= cfg.minPixelStd)) why.push(`pixelStd ${r.pixelStd} < ${cfg.minPixelStd}`);
    if (!(r.fps >= cfg.minFps)) why.push(`fps ${r.fps} < ${cfg.minFps}`);
    r.pass = why.length === 0;
    if (!r.pass) failures.push(`${r.stage}/${r.renderer}: ${why.join(', ')}`);
  }
  const summary = {
    at: new Date().toISOString(),
    pass: failures.length === 0,
    thresholds: { minFps: cfg.minFps, minPixelStd: cfg.minPixelStd },
    chromiumLaunch: PINNED.chromiumLaunch,
    gpu,
    viewport: { width, height },
    durationMs,
    minFpsMeasured: Math.min(...results.map((r) => r.fps ?? 0)),
    minPixelStdMeasured: Math.min(...results.map((r) => r.pixelStd ?? 0)),
    failures,
    results,
  };
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(summary, null, 2));
  console.log(
    `[shot] smoke ${summary.pass ? 'PASS' : 'FAIL'} (${results.length} runs, min fps ${summary.minFpsMeasured}, ` +
      `min std ${summary.minPixelStdMeasured}) -> ${path.relative(ROOT, path.join(out, 'result.json'))}`
  );
  for (const f of failures) console.log(`  FAIL ${f}`);
  return summary.pass ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    releaseLock();
    process.exit(1);
  }
);
