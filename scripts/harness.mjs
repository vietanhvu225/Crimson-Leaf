// Shared plumbing for shot.mjs / bot.mjs: machine-wide lock, Vite server on a free port, Chromium
// launched with PINNED_VERSIONS.chromiumLaunch, page error collection.
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

export const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PINNED = JSON.parse(fs.readFileSync(path.join(ROOT, 'threejs-port', 'PINNED_VERSIONS.json'), 'utf8'));
export const STAGES = [
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

const LOCK_PATH = path.join(os.tmpdir(), 'crimson-shot.lock');
const LOCK_WAIT_MS = 20 * 60 * 1000;
const LOCK_STALE_MS = 30 * 60 * 1000;

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function parseArgs(argv) {
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

// ---------- machine-wide lock (GAME_SPEC § Gates: one WebGL run at a time) ----------

let lockHeld = false;

export async function acquireLock() {
  const started = Date.now();
  let announced = false;
  for (;;) {
    try {
      const fd = fs.openSync(LOCK_PATH, 'wx');
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, cwd: ROOT, at: new Date().toISOString() }));
      fs.closeSync(fd);
      lockHeld = true;
      return;
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;
    }
    try {
      const age = Date.now() - fs.statSync(LOCK_PATH).mtimeMs;
      if (age > LOCK_STALE_MS) {
        console.warn(`[harness] stale lock (${Math.round(age / 60000)} min), reclaiming ${LOCK_PATH}`);
        fs.rmSync(LOCK_PATH, { force: true });
        continue;
      }
    } catch {
      continue; // lock vanished between open and stat
    }
    if (Date.now() - started > LOCK_WAIT_MS) {
      throw new Error(`[harness] lock ${LOCK_PATH} still held after 20 min`);
    }
    if (!announced) {
      console.log(`[harness] waiting for lock ${LOCK_PATH} ...`);
      announced = true;
    }
    await sleep(2000);
  }
}

/** Keeps a long run's lock fresh so another process never treats it as stale (> 30 min). */
export function touchLock() {
  if (!lockHeld) return;
  try {
    const now = new Date();
    fs.utimesSync(LOCK_PATH, now, now);
  } catch {
    // gone: nothing to refresh
  }
}

export function releaseLock() {
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

// ---------- server / browser ----------

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

export async function startServer() {
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

export function launchBrowser() {
  return chromium.launch(PINNED.chromiumLaunch);
}

export async function webglInfo(page) {
  return page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return { webgl: false, renderer: null };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return { webgl: true, webgl2: !!c.getContext('webgl2'), renderer };
  });
}

/** Collects console errors / page errors / HTTP >= 400 into `errors`, warnings into `warnings`. */
export function collectErrors(page, errors, warnings = []) {
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
}
