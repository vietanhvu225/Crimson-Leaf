// Bot playtest + perf sweep (T08): plays every stage through window.__game, per renderer.
//
//   npm run bot -- [--stages spring,autumn] [--renderers three,canvas] [--seed 1] [--loop 1]
//                  [--max-sim-sec 600] [--stuck-sec 15] [--width 1920 --height 1080]
//                  [--params "fx=low"] [--out shots/T08/bot/] [--tag base]
//
// Determinism: requestAnimationFrame is stubbed before the app loads, so the real-time loop never
// runs; the sim only advances through __game.step(1) (fixed 1/60 s). With the same seed and viewport
// both renderers therefore play the exact same run, unless a renderer touches sim state. A final
// sim fingerprint is compared across renderers: equal = render-independent; different = render bug.
//
// Perf: each step(1) = one sim step + one render, followed by a 1-pixel readback that waits for the
// GPU (WebGL readPixels / 2D getImageData). The measured ms/frame is therefore uncapped by vsync and
// includes GPU work: fps = 1000 / ms. Reported: avg, min (worst 1 s window = 60 frames), worst frame,
// p95, plus draw calls / triangles max from renderer.info after every frame (three only).
//
// Bot (decides every 0.1 s sim): run toward the goal (right, or up on vertical stages), jump gaps,
// climb to the next platform above on vertical stages, melee the nearest enemy, parry (melee) enemy
// projectiles about to hit, switch lane toward a seal-gate guard. If it makes no progress for
// --stuck-sec it calls teleportToBoss (logged). "Stuck forever" = no outcome and no boss damage for
// 90 s after the teleport, or the sim budget runs out.
//
// Writes <out>/<tag>.json (all runs) and <out>/<tag>.md (perf table), plus one PNG per run.
import fs from 'node:fs';
import path from 'node:path';
import { SEASONS } from '../src/game/rules/index.ts';
import {
  ROOT,
  STAGES,
  acquireLock,
  collectErrors,
  launchBrowser,
  parseArgs,
  releaseLock,
  sleep,
  startServer,
  touchLock,
  webglInfo,
} from './harness.mjs';

const args = parseArgs(process.argv.slice(2));
const stages = args.stages ? String(args.stages).split(',') : STAGES;
const renderers = args.renderers ? String(args.renderers).split(',') : ['three', 'canvas'];
const seed = Number(args.seed ?? 1);
const loop = Number(args.loop ?? 1) === 2 ? 2 : 1;
const maxSimSec = Number(args['max-sim-sec'] ?? 600);
const stuckSec = Number(args['stuck-sec'] ?? 15);
const width = Number(args.width ?? 1920);
const height = Number(args.height ?? 1080);
const extraParams = args.params ? String(args.params) : '';
const revive = !args['no-revive'];
const profile = !!args.profile;
const out = path.resolve(ROOT, String(args.out ?? 'shots/T08/bot/'));
const tag = String(args.tag ?? 'bot');
for (const s of stages) if (!STAGES.includes(s)) throw new Error(`unknown stage ${s}`);

/** Installed in the page once; drives the sim in segments so node can log progress in between. */
function installBot(cfg) {
  const g = window.__game;
  const w = g.world;
  const p = w.player;
  const vertical = cfg.scrollMode === 'vertical';
  const canvas = document.querySelector('canvas');
  const gl = canvas.getContext('webgl2');
  const ctx2d = gl ? null : canvas.getContext('2d');
  const px = new Uint8Array(4);
  const sync = () => {
    if (gl) gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
    else if (ctx2d) ctx2d.getImageData(0, 0, 1, 1);
  };
  const progressPct = () =>
    vertical
      ? Math.min(100, Math.max(0, ((cfg.stageLength - p.y) / (cfg.stageLength - 220)) * 100))
      : Math.min(100, Math.max(0, (p.x / (cfg.stageLength - 320)) * 100));
  const findBoss = () => w.enemies.find((e) => e.archetype === 'boss');

  const s = {
    simSec: 0,
    tick: 0,
    frames: [],
    drawMax: 0,
    triMax: 0,
    bestX: p.x,
    bestY: p.y,
    lastProgressAt: 0,
    teleports: 0,
    teleportAt: null,
    progressBeforeTeleport: null,
    bossHpAtTeleport: null,
    lastBossDamageAt: 0,
    lastBossHp: null,
    laneSwitches: 0,
    profiledAt: 0,
    profile: null,
    deaths: 0,
    firstDeathAt: null,
    firstDeathProgress: null,
    kills: w.combat.kills,
    focusId: null,
    focusHp: 0,
    lastFocus: null,
    jumps: 0,
    parries: 0,
    outcome: null,
    stuckForever: false,
    minHp: w.combat.hp,
    maxProgress: progressPct(),
    log: [],
    finished: false,
  };

  function decide() {
    const lane = w.combat.zLane;
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
    const coord = vertical ? p.y : p.x;
    const gate = w.sealGates.find((sg) => !sg.unlocked && Math.abs(sg.coord - coord) < 260);
    let guard = null;
    if (gate) {
      for (const e of w.enemies) {
        if (e.gateId === gate.id && e.hp > 0 && (!guard || Math.abs(e.x - p.x) < Math.abs(guard.x - p.x))) guard = e;
      }
    }
    const near = target && Math.abs(target.x - p.x) < 220 && Math.abs(target.y - p.y) < 160 ? target : null;
    const focus = guard ?? near;
    const input = { moveRight: !vertical, moveLeft: false, jumpHeld: false };

    // Vertical: aim for the closest platform one step above, under its middle.
    let climbTo = null;
    if (vertical && !focus) {
      let bestScore = Infinity;
      for (const pl of w.platforms) {
        if (pl.zLane !== 'both' && pl.zLane !== lane) continue;
        const dy = p.y - pl.y;
        if (dy < 40 || dy > 230) continue;
        const cx = pl.x + pl.w / 2;
        const score = dy + Math.abs(cx - p.x) * 0.5;
        if (score < bestScore) {
          bestScore = score;
          climbTo = pl;
        }
      }
      if (climbTo) {
        const cx = climbTo.x + climbTo.w / 2;
        const inside = p.x > climbTo.x + 20 && p.x < climbTo.x + climbTo.w - 20;
        input.moveRight = !inside && cx > p.x;
        input.moveLeft = !inside && cx < p.x;
        const edgeDist = Math.min(Math.abs(p.x - climbTo.x), Math.abs(p.x - (climbTo.x + climbTo.w)));
        if (p.onGround && (inside || edgeDist < 120)) {
          input.jumpPressed = true;
          input.jumpHeld = true;
          s.jumps++;
        }
      } else if (s.tick % 2 === 0) {
        input.moveRight = p.x < 560;
        input.moveLeft = p.x >= 560;
      }
    }

    if (focus) {
      input.moveRight = false;
      input.moveLeft = false;
      if (focus.x < p.x - 40) input.moveLeft = true;
      else if (focus.x > p.x + 50) input.moveRight = true;
      if (focus.zLane !== lane && Math.abs(focus.x - p.x) < 200 && s.tick % 8 === 0) {
        input.switchZPressed = true;
        s.laneSwitches++;
      }
      if (Math.abs(focus.x - p.x) < 130 && focus.zLane === lane) input.meleePressed = true;
      if (focus.y < p.y - 70 && p.onGround) {
        input.jumpPressed = true;
        input.jumpHeld = true;
      }
    } else if (s.tick % 3 === 0) {
      input.meleePressed = true;
    }

    // Parry: an enemy projectile in our lane, closing in, within the next ~0.15 s.
    for (const q of w.projectiles) {
      if (!q.active || q.fromPlayer || q.parried) continue;
      if (q.zLane !== lane && !q.crossZ) continue;
      const dx = p.x - q.x;
      const dy = p.y - 24 - q.y;
      const closing = dx * q.vx + dy * q.vy > 0;
      if (closing && Math.hypot(dx, dy) < 40 + Math.hypot(q.vx, q.vy) * 0.15) {
        input.meleePressed = true;
        s.parries++;
        break;
      }
    }

    // Horizontal: jump over gaps (no ground ahead in our lane).
    if (!vertical) {
      const ahead = p.x + (input.moveLeft ? -70 : 70);
      const groundAhead = w.platforms.some(
        (pl) =>
          (pl.zLane === 'both' || pl.zLane === lane) &&
          ahead >= pl.x - 10 &&
          ahead <= pl.x + pl.w + 10 &&
          pl.y >= p.y - 10 &&
          pl.y <= p.y + 140
      );
      if (!groundAhead && p.onGround) {
        input.jumpPressed = true;
        input.jumpHeld = true;
        s.jumps++;
      }
    }
    if (s.simSec - s.lastProgressAt > 1.2 && p.onGround) {
      input.jumpPressed = true;
      input.jumpHeld = true;
      s.jumps++;
    }
    // Swimming / flying stages and wall clings: keep holding jump while rising.
    if (!p.onGround && p.vy < 0) input.jumpHeld = true;
    // Stalled on a ledge/wall: back off for a second now and then (drop down, retry the jump).
    const stall = s.simSec - s.lastProgressAt;
    if (!vertical && !focus && stall > 4 && Math.floor(stall) % 4 === 0) {
      input.moveRight = false;
      input.moveLeft = true;
    }
    if (s.simSec - s.lastProgressAt > 2.5 && s.tick % 10 === 0) {
      input.dashPressed = true;
      input.grapplePressed = true;
    }
    if (s.simSec - s.lastProgressAt > 6 && s.tick % 20 === 0) input.switchZPressed = true;
    return { input, focus };
  }

  /** Visible meshes grouped by geometry/material, triangles × instances (no frustum test). */
  function profileScene() {
    const three = window.__three;
    if (!three) return null;
    const groups = new Map();
    three.scene.traverseVisible((o) => {
      if (!o.isMesh && !o.isPoints && !o.isLine) return;
      const geo = o.geometry;
      if (!geo) return;
      const n = geo.index ? geo.index.count : geo.attributes.position?.count ?? 0;
      const per = o.isMesh ? n / 3 : 0;
      const inst = o.isInstancedMesh ? o.count : 1;
      const mat = Array.isArray(o.material) ? o.material[0] : o.material;
      const key =
        `${o.name || o.parent?.name || ''} ${geo.type}(${geo.attributes.position?.count ?? 0}v)` +
        ` ${mat?.type ?? ''}${o.castShadow ? ' +shadow' : ''}${o.isInstancedMesh ? ' inst' : ''}`;
      const gr = groups.get(key) ?? { key, objects: 0, instances: 0, tris: 0 };
      gr.objects++;
      gr.instances += inst;
      gr.tris += per * inst * (o.castShadow ? 2 : 1);
      groups.set(key, gr);
    });
    return [...groups.values()]
      .sort((a, b) => b.tris - a.tris)
      .slice(0, 12)
      .map((gr) => ({ ...gr, tris: Math.round(gr.tris) }));
  }

  function frame() {
    const t0 = performance.now();
    g.step(1);
    sync();
    s.frames.push(performance.now() - t0);
    const st = g.stats();
    if (st.drawCalls != null && st.drawCalls > s.drawMax) s.drawMax = st.drawCalls;
    if (st.triangles != null && st.triangles > s.triMax) {
      s.triMax = st.triangles;
      if (cfg.profile && st.triangles > s.profiledAt * 1.1) {
        s.profiledAt = st.triangles;
        s.profile = { atSimSec: Math.round(s.simSec), triangles: st.triangles, drawCalls: st.drawCalls, top: profileScene() };
      }
    }
  }

  function tickOnce() {
    if (w.pendingOutcome) s.outcome = w.pendingOutcome;
    if (s.outcome) return false;
    const { input, focus } = decide();
    g.setInput(input);
    for (let i = 0; i < 6; i++) frame();
    s.simSec += 0.1;
    s.tick++;
    if (w.pendingOutcome === 'defeat' && cfg.revive && s.deaths < 30) {
      // Count the death, then revive in place so the sweep still covers the whole stage.
      s.deaths++;
      if (s.deaths === 1) {
        s.firstDeathAt = Math.round(s.simSec * 10) / 10;
        s.firstDeathProgress = Math.round(progressPct() * 10) / 10;
      }
      w.pendingOutcome = null;
      w.outcomeTriggered = false;
      w.combat = { ...w.combat, hp: w.combat.maxHp };
    }
    if (w.pendingOutcome) s.outcome = w.pendingOutcome;
    if ((!vertical && p.x > s.bestX + 40) || (vertical && p.y < s.bestY - 40)) {
      s.bestX = Math.max(s.bestX, p.x);
      s.bestY = Math.min(s.bestY, p.y);
      s.lastProgressAt = s.simSec;
    }
    // Fighting is progress only while it hurts someone (a focus that cannot be hit is a softlock).
    if (w.combat.kills > s.kills || (focus && focus.id === s.focusId && focus.hp < s.focusHp)) {
      s.lastProgressAt = Math.max(s.lastProgressAt, s.simSec - 1);
    }
    s.kills = w.combat.kills;
    s.focusId = focus ? focus.id : null;
    s.focusHp = focus ? focus.hp : 0;
    s.lastFocus = focus
      ? `${focus.archetype}#${focus.id} x=${Math.round(focus.x)} y=${Math.round(focus.y)} lane=${focus.zLane} hp=${Math.round(focus.hp)}`
      : null;
    s.minHp = Math.min(s.minHp, w.combat.hp);
    if (s.teleports === 0) s.maxProgress = Math.max(s.maxProgress, progressPct());
    const boss = findBoss();
    if (boss) {
      if (s.lastBossHp != null && boss.hp < s.lastBossHp) s.lastBossDamageAt = s.simSec;
      s.lastBossHp = boss.hp;
    }
    if (s.teleports === 0 && s.simSec - s.lastProgressAt > cfg.stuckSec) {
      s.teleports++;
      s.teleportAt = Math.round(s.simSec * 10) / 10;
      s.progressBeforeTeleport = Math.round(progressPct() * 10) / 10;
      s.log.push(
        `stuck at x=${Math.round(p.x)} y=${Math.round(p.y)} lane=${w.combat.zLane} t=${s.simSec.toFixed(1)}s` +
          ` focus=${s.lastFocus ?? '-'} -> teleportToBoss`
      );
      g.teleportToBoss();
      s.bestX = p.x;
      s.bestY = p.y;
      s.lastProgressAt = s.simSec;
      s.lastBossDamageAt = s.simSec;
    }
    if (s.teleports > 0 && s.simSec - s.lastBossDamageAt > 90) {
      s.stuckForever = true;
      s.log.push(`no boss damage for 90 s after teleport (x=${Math.round(p.x)} y=${Math.round(p.y)})`);
      return false;
    }
    return true;
  }

  window.__bot = {
    /** Runs up to `sec` of sim time; returns a short status. */
    run(sec) {
      const end = s.simSec + sec;
      while (s.simSec < end && s.simSec < cfg.maxSimSec) {
        if (!tickOnce()) {
          s.finished = true;
          break;
        }
      }
      if (s.simSec >= cfg.maxSimSec) s.finished = true;
      const boss = findBoss();
      return {
        simSec: Math.round(s.simSec),
        progress: Math.round(progressPct()),
        hp: Math.round(w.combat.hp),
        bossHp: boss ? Math.round(Math.max(0, boss.hp)) : null,
        outcome: s.outcome,
        finished: s.finished,
      };
    },
    report() {
      const warm = 60; // shader compile / pool growth
      const f = s.frames.slice(warm);
      const sum = f.reduce((a, b) => a + b, 0);
      let worstWindow = 0;
      for (let i = 0; i + 60 <= f.length; i += 30) {
        let m = 0;
        for (let j = i; j < i + 60; j++) m += f[j];
        worstWindow = Math.max(worstWindow, m / 60);
      }
      const sorted = [...f].sort((a, b) => a - b);
      const r1 = (x) => Math.round(x * 10) / 10;
      const r2 = (x) => Math.round(x * 100) / 100;
      const boss = findBoss();
      return {
        outcome: s.outcome,
        died: s.outcome === 'defeat' || s.deaths > 0,
        deaths: s.deaths,
        firstDeathAt: s.firstDeathAt,
        firstDeathProgress: s.firstDeathProgress,
        stuckForever: s.stuckForever || (!s.outcome && s.simSec >= cfg.maxSimSec),
        simSec: r1(s.simSec),
        progressPct: s.teleports ? s.progressBeforeTeleport : r1(s.maxProgress),
        teleports: s.teleports,
        teleportAt: s.teleportAt,
        hp: Math.round(w.combat.hp),
        minHp: Math.round(s.minHp),
        bossHp: boss ? Math.round(Math.max(0, boss.hp)) : null,
        kills: w.combat.kills,
        score: w.combat.score,
        jumps: s.jumps,
        parries: s.parries,
        laneSwitches: s.laneSwitches,
        frames: s.frames.length,
        firstFrameMs: r2(s.frames[0] ?? 0),
        msAvg: r2(sum / Math.max(1, f.length)),
        msP95: r2(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
        msWorst: r2(sorted[sorted.length - 1] ?? 0),
        fpsAvg: r1(1000 / Math.max(1e-6, sum / Math.max(1, f.length))),
        fpsMin: r1(1000 / Math.max(1e-6, worstWindow)),
        drawCallsMax: s.drawMax || null,
        trianglesMax: s.triMax || null,
        // Same seed + same inputs must give the same sim on every renderer.
        fingerprint: [
          Math.round(p.x),
          Math.round(p.y),
          Math.round(w.combat.hp),
          w.combat.kills,
          w.combat.score,
          w.enemies.filter((e) => e.hp > 0).length,
          s.frames.length,
        ].join('|'),
        log: s.log,
        profile: s.profile,
      };
    },
  };
}

async function playOne(browser, baseUrl, stage, renderer) {
  const context = await browser.newContext({ viewport: { width, height } });
  await context.addInitScript(() => {
    window.requestAnimationFrame = () => 0;
  });
  const page = await context.newPage();
  const errors = [];
  collectErrors(page, errors);
  const q = new URLSearchParams({ autostart: '1', stage, loop: String(loop), renderer, seed: String(seed), muted: '1' });
  const url = `${baseUrl}?${q}${extraParams ? `&${extraParams}` : ''}`;
  const result = { stage, renderer, loop, seed, url };
  const t0 = Date.now();
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__game && document.body.dataset.state === 'playing', null, {
      timeout: 30000,
    });
    await sleep(300);
    const cfg = SEASONS[stage];
    await page.evaluate(installBot, {
      scrollMode: cfg.scrollMode,
      stageLength: cfg.stageLength,
      maxSimSec,
      stuckSec,
      revive,
      profile,
    });
    for (;;) {
      const st = await page.evaluate(() => window.__bot.run(30));
      touchLock();
      process.stdout.write(`  ${stage}/${renderer} t=${st.simSec}s ${st.progress}% hp=${st.hp} boss=${st.bossHp}\r`);
      if (st.finished) break;
    }
    process.stdout.write('\n');
    Object.assign(result, await page.evaluate(() => window.__bot.report()));
    fs.mkdirSync(out, { recursive: true });
    const png = path.join(out, `${tag}-${stage}-${renderer}.png`);
    await page.evaluate(() => window.__game.step(1));
    await page.screenshot({ path: png });
    result.png = path.relative(ROOT, png).split(path.sep).join('/');
  } catch (err) {
    errors.push(`harness: ${err.message}`);
    result.crashed = true;
  } finally {
    result.errors = errors;
    result.wallSec = Math.round((Date.now() - t0) / 1000);
    await context.close().catch(() => {});
  }
  return result;
}

function table(results, gpu) {
  const by = (stage, r) => results.find((x) => x.stage === stage && x.renderer === r);
  const cell = (x) => {
    if (!x) return '–';
    if (x.crashed) return 'CRASH';
    return `${x.fpsAvg} / ${x.fpsMin}`;
  };
  const lines = [
    `GPU: ${gpu?.renderer ?? '?'} · viewport ${width}×${height} · seed ${seed} · loop ${loop}` +
      (extraParams ? ` · params \`${extraParams}\`` : ''),
    '',
    '| Màn | Kết quả bot | Chết (lần đầu ở %) | Tiến độ % (trước teleport) | Teleport | Sim s | three fps avg / min | three ms p95 / worst | three draw calls max | three tris max | canvas fps avg / min | canvas ms p95 / worst | Sim giống nhau? |',
    '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ];
  for (const stage of stages) {
    const t = by(stage, 'three');
    const c = by(stage, 'canvas');
    const ref = t ?? c;
    const outcome = ref
      ? ref.crashed
        ? 'crash'
        : ref.outcome === 'victory'
          ? 'thắng'
          : ref.outcome === 'defeat'
            ? 'chết'
            : ref.stuckForever
              ? 'KẸT'
              : 'hết giờ'
      : '–';
    const same = t && c && !t.crashed && !c.crashed ? (t.fingerprint === c.fingerprint ? 'có' : '**KHÁC**') : '–';
    lines.push(
      `| ${stage} | ${outcome} | ${ref?.deaths ? `${ref.deaths} (${ref.firstDeathProgress}%)` : '0'} | ${ref?.progressPct ?? '–'} | ${ref?.teleports ? `có (t=${ref.teleportAt}s)` : 'không'} | ${ref?.simSec ?? '–'} | ` +
        `${cell(t)} | ${t ? `${t.msP95} / ${t.msWorst}` : '–'} | ${t?.drawCallsMax ?? '–'} | ${t?.trianglesMax ?? '–'} | ` +
        `${cell(c)} | ${c ? `${c.msP95} / ${c.msWorst}` : '–'} | ${same} |`
    );
  }
  return lines.join('\n');
}

async function main() {
  await acquireLock();
  let server;
  let browser;
  const results = [];
  let gpu = null;
  try {
    const started = await startServer();
    server = started.server;
    console.log(`[bot] vite at ${started.url}`);
    browser = await launchBrowser();
    {
      const probe = await browser.newPage();
      await probe.goto('about:blank');
      gpu = await webglInfo(probe);
      await probe.close();
    }
    console.log(`[bot] webgl: ${gpu.renderer}`);
    for (const stage of stages) {
      for (const renderer of renderers) {
        const r = await playOne(browser, started.url, stage, renderer);
        results.push(r);
        console.log(
          `[bot] ${stage}/${renderer}: ${r.outcome ?? (r.stuckForever ? 'STUCK' : r.crashed ? 'CRASH' : 'timeout')} ` +
            `progress=${r.progressPct}% tp=${r.teleports} sim=${r.simSec}s fps=${r.fpsAvg}/${r.fpsMin} ` +
            `draws=${r.drawCallsMax} tris=${r.trianglesMax} errors=${r.errors.length} wall=${r.wallSec}s` +
            (r.errors.length ? `\n      ${r.errors.slice(0, 3).join('\n      ')}` : '')
        );
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await server.close().catch(() => {});
    releaseLock();
  }
  fs.mkdirSync(out, { recursive: true });
  const md = table(results, gpu);
  fs.writeFileSync(
    path.join(out, `${tag}.json`),
    JSON.stringify({ at: new Date().toISOString(), gpu, width, height, seed, loop, params: extraParams, results }, null, 2)
  );
  fs.writeFileSync(path.join(out, `${tag}.md`), `${md}\n`);
  console.log(md);
  const bad = results.filter((r) => r.crashed || r.stuckForever || r.errors.length);
  return bad.length ? 1 : 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err);
    releaseLock();
    process.exit(1);
  }
);
