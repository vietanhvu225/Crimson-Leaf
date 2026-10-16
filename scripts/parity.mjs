// Parity harness (GAME_SPEC § Kiểm tra trùng khớp): reference/ vs this port, 11 stages, deterministic.
//
//   npm run parity [-- --stages spring,winter --seconds 20 --step 500 --port-params "renderer=canvas&rng=math"]
//   npm run parity -- --stages spring --port-seed 999   (negative control: must report DIFF)
//
// Both sides: seeded PRNG injected into Math.random before the app loads, requestAnimationFrame
// disabled, muted (KeyM on the title screen), stage chosen on the title screen, then the same fixed
// input script driven only by window.advanceTime(ms). At every milestone the harness compares
// render_game_to_text() + a world snapshot (player, combat, enemies, projectiles, particles, ...)
// and, as secondary evidence, a hash of the canvas pixels. Exit code 1 on any mismatch.
import crypto from 'node:crypto';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const REF_ROOT = path.join(ROOT, 'reference');
const PINNED = JSON.parse(fs.readFileSync(path.join(ROOT, 'threejs-port', 'PINNED_VERSIONS.json'), 'utf8'));
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

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) args[a.slice(2)] = true;
    else {
      args[a.slice(2)] = next;
      i++;
    }
  }
  return args;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

async function startServer(root) {
  const port = await freePort();
  const server = await createServer({
    root,
    configFile: path.join(root, 'vite.config.ts'),
    logLevel: 'warn',
    clearScreen: false,
    server: { port, strictPort: false, host: '127.0.0.1', hmr: false, watch: null },
  });
  await server.listen();
  const url = server.resolvedUrls?.local?.[0] ?? `http://127.0.0.1:${port}/`;
  return { server, url: url.endsWith('/') ? url : `${url}/` };
}

// Runs in the page before any app script: seeded Math.random (mulberry32), no rAF.
function initScript(seed) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let calls = 0;
  Math.random = () => {
    calls++;
    return next();
  };
  window.__parity = {
    reseed(n) {
      s = n >>> 0;
      calls = 0;
    },
    calls: () => calls,
  };
  window.requestAnimationFrame = () => 0;
  window.cancelAnimationFrame = () => {};
}

// Runs in the page: world snapshot. Finds the World via window.__game, else via React fiber hooks.
function snapshotInPage() {
  const findWorld = () => {
    const g = window.__game;
    if (g && g.world) return g.world;
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    const key = Object.keys(canvas).find((k) => k.startsWith('__reactFiber$'));
    let fiber = key ? canvas[key] : null;
    while (fiber) {
      let hook = fiber.memoizedState;
      while (hook && typeof hook === 'object' && 'next' in hook) {
        const v = hook.memoizedState;
        if (v && typeof v === 'object' && v.current && v.current.player && v.current.enemies) return v.current;
        hook = hook.next;
      }
      fiber = fiber.return;
    }
    return null;
  };
  const plain = (v, depth, seen) => {
    if (v === null || typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
    if (v === undefined) return null;
    if (typeof v !== 'object' || depth > 4) return undefined;
    if (seen.has(v)) return '[ref]';
    seen.add(v);
    if (Array.isArray(v)) return v.map((x) => plain(x, depth + 1, seen));
    if (v instanceof Set) return [...v].sort();
    const out = {};
    for (const k of Object.keys(v)) {
      const p = plain(v[k], depth + 1, seen);
      if (p !== undefined) out[k] = p;
    }
    return out;
  };
  const w = findWorld();
  const text = typeof window.render_game_to_text === 'function' ? window.render_game_to_text() : null;
  if (!w) return { text, world: null };
  const pick = (obj) => plain(obj, 0, new WeakSet());
  const refPos = (r) => (r ? { x: r.x, y: r.y } : null);
  const world = {
    scalars: {
      camX: w.camX,
      camY: w.camY,
      stageTimeSec: w.stageTimeSec,
      hitstopTimer: w.hitstopTimer,
      cameraTrauma: w.cameraTrauma,
      mouseWorldX: w.mouseWorldX,
      mouseWorldY: w.mouseWorldY,
      trailingHp: w.trailingHp,
      outcomeTriggered: w.outcomeTriggered,
      endBeatTimer: w.endBeatTimer,
      pendingOutcome: w.pendingOutcome,
      gateReboundCooldown: w.gateReboundCooldown,
      kageWaveTimer: w.kageWaveTimer,
      kageWaveCount: w.kageWaveCount,
      particleCursor: w.particleCursor,
      bannerCursor: w.bannerCursor,
      lightningCursor: w.lightningCursor,
      hazardIdCounter: w.hazardIdCounter,
      itemIdCounter: w.itemIdCounter,
      enemyIdCounter: w.enemyIdCounter,
      viewW: w.viewW,
      viewH: w.viewH,
    },
    player: pick({
      ...w.player,
      standingPlatform: refPos(w.player.standingPlatform),
      grappleTarget: refPos(w.player.grappleTarget),
    }),
    combat: pick(w.combat),
    enemies: pick(w.enemies),
    projectiles: pick(w.projectiles.filter((p) => p.active)),
    particles: pick(w.particles.filter((p) => p.active)),
    banners: pick(w.banners.filter((b) => b.active)),
    lightning: pick(w.lightningBolts.filter((b) => b.active)),
    bloodOrbs: pick(w.bloodOrbs.filter((b) => b.active)),
    platforms: pick(w.platforms),
    hazards: pick(w.hazards),
    sealGates: pick(w.sealGates),
    checkpoints: pick(w.checkpoints),
    worldItems: pick(w.worldItems),
  };
  return { text, world };
}

async function canvasHash(page) {
  const data = await page.evaluate(() => {
    const c = document.querySelector('canvas');
    return c ? c.toDataURL('image/png') : '';
  });
  return crypto.createHash('sha1').update(data).digest('hex').slice(0, 12);
}

/** Opens one side, gets it into `stage` playing state, muted, PRNG reseeded. */
async function openSide(browser, baseUrl, query, stageIndex, seed, viewport) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(initScript, seed);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !(m.location()?.url ?? '').endsWith('/favicon.ico')) errors.push(`console: ${m.text()}`);
  });
  await page.goto(`${baseUrl}${query ? `?${query}` : ''}`, { waitUntil: 'load', timeout: 60000 });
  await page.waitForSelector('[data-testid="start-game-btn"]', { timeout: 30000 });
  await page.waitForFunction(() => typeof window.advanceTime === 'function', null, { timeout: 30000 });
  await page.keyboard.press('KeyM'); // mute first, so audio.ts never draws from Math.random
  await sleep(50);
  // DOM clicks: the title panel can overflow a 720p viewport (main is overflow-hidden).
  await page.locator('.grid button').nth(stageIndex).evaluate((el) => el.click());
  await sleep(50);
  await page.locator('[data-testid="start-game-btn"]').evaluate((el) => el.click());
  await page.waitForFunction(() => document.body.dataset.state === 'playing', null, { timeout: 10000 });
  await sleep(150); // React effects: rebuildLevel, stateRef sync
  await page.evaluate((s) => window.__parity.reseed(s), seed);
  return { context, page, errors };
}

/** Fixed input for milestone k: which keys are held during the first 100 ms of the 500 ms window. */
function inputFor(k) {
  const keys = [];
  if (k % 3 === 0) keys.push('Space');
  if (k % 2 === 1) keys.push('KeyJ');
  if (k % 4 === 2) keys.push('KeyK');
  if (k % 8 === 5) keys.push('KeyQ');
  if (k % 10 === 7) keys.push('ShiftLeft');
  if (k % 6 === 4) keys.push('KeyE');
  if (k === 20) keys.push('KeyR'); // quick restart mid-run: exercises level reset (incl. aim reset)
  const mouse = k % 5 === 3 ? { x: 300 + ((k * 97) % 700), y: 150 + ((k * 53) % 400) } : null;
  const holdRight = Math.floor(k / 12) % 3 !== 2; // mostly run right, sometimes stop
  return { keys, mouse, holdRight };
}

async function applyMilestone(page, k, stepMs) {
  const { keys, mouse, holdRight } = inputFor(k);
  if (mouse) await page.mouse.move(mouse.x, mouse.y);
  if (holdRight) await page.keyboard.down('KeyD');
  else await page.keyboard.up('KeyD');
  for (const key of keys) await page.keyboard.down(key);
  await advanceSettled(page, 100);
  for (const key of keys) await page.keyboard.up(key);
  await advanceSettled(page, stepMs - 100);
}

/**
 * advanceTime, then let React commit + run effects (stateRef sync, gameover) before anything else
 * happens. Without this, whether a defeat reached stateRef before the next advanceTime depended on
 * Playwright round-trip timing, and the two sides diverged at random.
 */
async function advanceSettled(page, ms) {
  await page.evaluate(async (n) => {
    window.advanceTime(n);
    for (let i = 0; i < 3; i++) await new Promise((r) => setTimeout(r, 15));
  }, ms);
}

function flatten(v, prefix, out) {
  if (v !== null && typeof v === 'object') {
    const keys = Object.keys(v);
    if (keys.length === 0) out[prefix] = Array.isArray(v) ? '[]' : '{}';
    for (const k of keys) flatten(v[k], prefix ? `${prefix}.${k}` : k, out);
  } else out[prefix] = v;
  return out;
}

function firstDiffs(a, b, limit = 8) {
  const fa = flatten(a, '', {});
  const fb = flatten(b, '', {});
  const keys = [...new Set([...Object.keys(fa), ...Object.keys(fb)])];
  const diffs = [];
  for (const k of keys) {
    if (!Object.is(fa[k], fb[k])) {
      diffs.push(`${k}: ref=${JSON.stringify(fa[k])} port=${JSON.stringify(fb[k])}`);
      if (diffs.length >= limit) break;
    }
  }
  return diffs;
}

async function runStage(browser, refUrl, portUrl, opts, stage) {
  const idx = STAGES.indexOf(stage);
  const ref = await openSide(browser, refUrl, '', idx, opts.seed, opts.viewport);
  const port = await openSide(browser, portUrl, opts.portParams, idx, opts.portSeed, opts.viewport);
  const res = { stage, milestones: 0, matched: 0, pixelMatched: 0, firstDiff: null, errors: [] };
  try {
    const total = Math.round((opts.seconds * 1000) / opts.step);
    for (let k = 0; k <= total; k++) {
      if (k > 0) {
        await applyMilestone(ref.page, k, opts.step);
        await applyMilestone(port.page, k, opts.step);
      }
      const [a, b] = await Promise.all([ref.page.evaluate(snapshotInPage), port.page.evaluate(snapshotInPage)]);
      const [ca, cb] = await Promise.all([ref.page.evaluate(() => window.__parity.calls()), port.page.evaluate(() => window.__parity.calls())]);
      if (!a.world || !b.world) throw new Error(`world not found (ref=${!!a.world}, port=${!!b.world})`);
      const sa = JSON.stringify(a);
      const sb = JSON.stringify(b);
      res.milestones++;
      const same = sa === sb && ca === cb;
      if (same) res.matched++;
      else if (!res.firstDiff) {
        const diffs = firstDiffs({ ...a, randomCalls: ca }, { ...b, randomCalls: cb });
        res.firstDiff = { milestone: k, simMs: k * opts.step, diffs };
      }
      if (opts.pixels && k > 0) {
        const [ha, hb] = await Promise.all([canvasHash(ref.page), canvasHash(port.page)]);
        if (ha === hb) res.pixelMatched++;
      }
      res.last = { randomCalls: ca, player: a.world.player && { x: a.world.player.x, y: a.world.player.y }, hp: a.world.combat.hp };
    }
  } finally {
    res.errors = [...ref.errors.map((e) => `ref ${e}`), ...port.errors.map((e) => `port ${e}`)];
    await ref.context.close().catch(() => {});
    await port.context.close().catch(() => {});
  }
  return res;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stages = args.stages ? String(args.stages).split(',') : STAGES;
  const opts = {
    seed: Number(args.seed ?? 12345),
    // Negative control: a different PRNG seed on the port side must make the harness report DIFF.
    portSeed: Number(args['port-seed'] ?? args.seed ?? 12345),
    seconds: Number(args.seconds ?? 20),
    step: Number(args.step ?? 500),
    portParams: String(args['port-params'] ?? 'renderer=canvas&rng=math'),
    pixels: args.pixels !== 'false',
    viewport: { width: 1280, height: 720 },
  };
  if (!fs.existsSync(path.join(REF_ROOT, 'node_modules'))) {
    throw new Error('reference/node_modules missing: run `npm install --prefix reference` first');
  }
  let refSrv;
  let portSrv;
  let browser;
  const results = [];
  try {
    refSrv = await startServer(REF_ROOT);
    portSrv = await startServer(ROOT);
    console.log(`[parity] reference ${refSrv.url}  port ${portSrv.url}?${opts.portParams}`);
    browser = await chromium.launch(PINNED.chromiumLaunch);
    for (const stage of stages) {
      const r = await runStage(browser, refSrv.url, portSrv.url, opts, stage);
      results.push(r);
      const ok = r.matched === r.milestones && r.errors.length === 0;
      console.log(
        `[parity] ${stage.padEnd(16)} ${ok ? 'MATCH' : 'DIFF '} ${r.matched}/${r.milestones} milestones` +
          (opts.pixels ? `, pixels ${r.pixelMatched}/${r.milestones - 1}` : '') +
          `, Math.random calls ${r.last?.randomCalls ?? '-'}, hp ${r.last?.hp ?? '-'}, player (${Math.round(r.last?.player?.x ?? 0)}, ${Math.round(r.last?.player?.y ?? 0)})`
      );
      if (r.firstDiff) {
        console.log(`         first diff at milestone ${r.firstDiff.milestone} (${r.firstDiff.simMs} ms):`);
        for (const d of r.firstDiff.diffs) console.log(`           ${d}`);
      }
      for (const e of r.errors.slice(0, 5)) console.log(`         ${e}`);
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (refSrv) await refSrv.server.close().catch(() => {});
    if (portSrv) await portSrv.server.close().catch(() => {});
  }
  const matched = results.filter((r) => r.matched === r.milestones && r.errors.length === 0).length;
  console.log(`[parity] ${matched}/${results.length} stages match at every milestone`);
  return matched === results.length ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
