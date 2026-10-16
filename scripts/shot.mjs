// Automated screenshots + smoke gate (GAME_SPEC § Gates).
//
//   node scripts/shot.mjs --stage spring --renderer canvas --loop 1 --seed 1 --script run --out shots/T00/
//   node scripts/shot.mjs --smoke [--out shots/smoke/] [--renderers canvas,three]
//
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
const SCRIPTS = ['idle', 'run', 'combat', 'boss'];
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
  page.on('console', (msg) => {
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

    const fpsWindow = Math.max(1000, opts.durationMs - 1000);
    const fpsPromise = sleep(500).then(() => measureFps(page, fpsWindow));
    await runInputScript(page, opts.script, opts.durationMs);
    const fps = await fpsPromise;
    result.fps = Math.round(fps.fps * 10) / 10;
    result.worstFrameMs = Math.round(fps.worstFrameMs);

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
    if (r?.png) console.log(`[shot] saved ${r.png}`);
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
