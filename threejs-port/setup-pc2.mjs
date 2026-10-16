#!/usr/bin/env node
// setup-pc2.mjs: kiểm tra điều kiện cần (prerequisite) trên PC chạy đêm, rồi dựng repo crimson-three.
//
// Chạy từ thư mục game gốc (nơi có threejs-port/):
//   node threejs-port/setup-pc2.mjs                  # kiểm tra + dựng repo ở ../crimson-three
//   node threejs-port/setup-pc2.mjs --check-only     # chỉ kiểm tra, không tạo gì
//   node threejs-port/setup-pc2.mjs --target D:\2_dev\crimson-three
//   node threejs-port/setup-pc2.mjs --skip-auth      # bỏ qua bước gọi thử `claude -p` (tốn một chút usage)
//
// Script chỉ dùng Node built-in. Nó KHÔNG đổi cài đặt hệ thống (power, PATH...). Gặp vấn đề nào thì in hướng dẫn để bạn tự sửa.
// Thoát mã 1 nếu có mục FAIL.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // .../threejs-port
const SRC = path.resolve(HERE, '..'); // thư mục game gốc
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const CHECK_ONLY = flag('--check-only');
const SKIP_AUTH = flag('--skip-auth');
const TARGET = path.resolve(opt('--target') ?? path.join(SRC, '..', 'crimson-three'));
const IS_WIN = process.platform === 'win32';

// Script con chạy trong .setup-tmp (cần playwright đã cài ở đó).
const WEBGL_CHECK_SRC = String.raw`
import { chromium } from 'playwright';
const configs = [
  { label: 'headless-shell mặc định', launch: { headless: true, args: [] } },
  { label: 'headless-shell + SwiftShader', launch: { headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
  { label: 'chromium new-headless + GPU (ANGLE D3D11)', launch: { headless: true, channel: 'chromium', args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] } },
  { label: 'chromium new-headless + SwiftShader', launch: { headless: true, channel: 'chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] } },
];
const probe = async () => {
  const c = document.createElement('canvas');
  c.width = 1280; c.height = 720; document.body.appendChild(c);
  const gl = c.getContext('webgl2');
  if (!gl) return { webgl2: false };
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, '#version 300 es\nin vec2 p;uniform float t;void main(){gl_Position=vec4(p.x*cos(t)-p.y*sin(t),p.x*sin(t)+p.y*cos(t),0.,1.);}');
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, '#version 300 es\nprecision mediump float;out vec4 o;void main(){o=vec4(.8,.1,.1,1.);}');
  gl.compileShader(fs);
  const pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, fs); gl.linkProgram(pr); gl.useProgram(pr);
  const N = 2000, d = new Float32Array(N * 6);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const ut = gl.getUniformLocation(pr, 't');
  let frames = 0; const t0 = performance.now();
  await new Promise((res) => {
    const loop = (now) => {
      gl.clearColor(0.1, 0.1, 0.2, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(ut, now / 1000); gl.drawArrays(gl.TRIANGLES, 0, N * 3);
      frames++;
      if (now - t0 < 3000) requestAnimationFrame(loop); else res();
    };
    requestAnimationFrame(loop);
  });
  return { webgl2: true, renderer, fps: Math.round(frames / ((performance.now() - t0) / 1000)) };
};
const out = [];
for (const cfg of configs) {
  let browser;
  try {
    browser = await chromium.launch(cfg.launch);
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.setContent('<html><body style="margin:0"></body></html>');
    const r = await page.evaluate(probe);
    out.push({ label: cfg.label, launch: cfg.launch, ...r });
  } catch (e) {
    out.push({ label: cfg.label, launch: cfg.launch, webgl2: false, error: String(e.message || e).split('\n')[0] });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
console.log(JSON.stringify(out));
`;

const results = []; // { name, status: 'OK'|'WARN'|'FAIL', detail }
const facts = {}; // dữ liệu ghi vào PINNED_VERSIONS.json / PREFLIGHT.md

function record(name, status, detail = '') {
  results.push({ name, status, detail });
  const icon = status === 'OK' ? '✅' : status === 'WARN' ? '⚠️ ' : '❌';
  console.log(`${icon} ${name}${detail ? ' — ' + detail : ''}`);
}

/** Chạy một lệnh shell (chuỗi). Trả { ok, code, out }. */
function sh(cmd, { cwd = process.cwd(), timeoutMs = 120_000, env } = {}) {
  const r = spawnSync(cmd, {
    cwd,
    shell: true,
    encoding: 'utf8',
    timeout: timeoutMs,
    env: env ?? process.env,
    windowsHide: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
  const timedOut = r.error && /ETIMEDOUT/.test(String(r.error.code ?? r.error));
  return { ok: r.status === 0 && !r.error, code: r.status, out: timedOut ? `TIMEOUT sau ${timeoutMs / 1000}s\n${out}` : out };
}

const tail = (s, n = 15) => s.split(/\r?\n/).slice(-n).join('\n');
const q = (p) => `"${p}"`;

function section(title) {
  console.log(`\n=== ${title} ===`);
}

// ---------------------------------------------------------------------------
section('1. Hệ điều hành, Node, npm');

record('Hệ điều hành', 'OK', `${process.platform} ${os.release()} ${process.arch}, ${os.cpus().length} luồng CPU, ${(os.totalmem() / 2 ** 30).toFixed(1)} GB RAM`);
facts.os = `${process.platform} ${os.release()} ${process.arch}`;

{
  const [maj, min] = process.versions.node.split('.').map(Number);
  // `node --test file.ts` cần type stripping mặc định: 22.18+, 23.6+, hoặc 24+.
  const ok = maj >= 24 || (maj === 23 && min >= 6) || (maj === 22 && min >= 18);
  facts.node = process.versions.node;
  record(
    'Node.js',
    ok ? 'OK' : 'FAIL',
    ok
      ? `v${process.versions.node}`
      : `v${process.versions.node} quá cũ. Cần >= 22.18 (hoặc 24 LTS) để node --test chạy thẳng file .ts. Cài từ https://nodejs.org`
  );
}

{
  const r = sh('npm --version');
  facts.npm = r.out;
  record('npm', r.ok ? 'OK' : 'FAIL', r.ok ? `v${r.out}` : 'không chạy được npm');
}

// ---------------------------------------------------------------------------
section('2. Git + Git Bash (Claude Code trên Windows chạy lệnh qua Git Bash)');

let gitOk = false;
{
  const r = sh('git --version');
  gitOk = r.ok;
  facts.git = r.out;
  record('Git', r.ok ? 'OK' : 'FAIL', r.ok ? r.out : 'chưa cài Git. Cài Git for Windows: https://git-scm.com/download/win');
}

let gitIdentity = { name: '', email: '' };
if (gitOk) {
  gitIdentity.name = sh('git config --global user.name').out;
  gitIdentity.email = sh('git config --global user.email').out;
  if (gitIdentity.name && gitIdentity.email) {
    record('Git identity', 'OK', `${gitIdentity.name} <${gitIdentity.email}>`);
  } else {
    record('Git identity', 'WARN', 'chưa có user.name/email global. Script sẽ đặt local cho repo mới là "Crimson Night Run <night-run@localhost>" để commit không bị lỗi.');
  }
}

let bashPath = null;
if (IS_WIN) {
  const candidates = [];
  if (process.env.CLAUDE_CODE_GIT_BASH_PATH) candidates.push(process.env.CLAUDE_CODE_GIT_BASH_PATH);
  const whereGit = sh('where git');
  if (whereGit.ok) {
    for (const g of whereGit.out.split(/\r?\n/)) {
      // ...\Git\cmd\git.exe -> ...\Git\bin\bash.exe
      candidates.push(path.join(path.dirname(path.dirname(g.trim())), 'bin', 'bash.exe'));
    }
  }
  candidates.push('C:\\Program Files\\Git\\bin\\bash.exe', 'C:\\Program Files (x86)\\Git\\bin\\bash.exe');
  bashPath = candidates.find((c) => c && fs.existsSync(c)) ?? null;
  if (!bashPath) {
    record('Git Bash', 'FAIL', 'không tìm thấy bash.exe. Cài Git for Windows, hoặc đặt biến môi trường CLAUDE_CODE_GIT_BASH_PATH trỏ tới bash.exe');
  } else {
    record('Git Bash', 'OK', bashPath);
    // Orchestrator dùng `timeout 150m` và `sleep 1800`: phải là GNU coreutils, không phải C:\Windows\System32\timeout.exe.
    const r = sh(`${q(bashPath)} -lc "timeout --version | head -1; command -v sleep"`);
    const gnu = r.ok && /coreutils/i.test(r.out);
    record('timeout/sleep trong Git Bash', gnu ? 'OK' : 'FAIL', gnu ? r.out.split(/\r?\n/)[0] : `\`timeout\` trong Git Bash không phải GNU coreutils:\n${tail(r.out, 5)}`);
  }
} else {
  bashPath = 'bash';
  record('Bash', 'OK', 'không phải Windows, dùng bash hệ thống');
}

// ---------------------------------------------------------------------------
section('3. Claude Code CLI (khác với app Claude desktop)');

let claudeOk = false;
{
  const r = sh('claude --version', { timeoutMs: 60_000 });
  claudeOk = r.ok;
  facts.claude = r.out;
  record(
    'Claude Code CLI',
    r.ok ? 'OK' : 'FAIL',
    r.ok
      ? r.out
      : 'chưa có lệnh `claude`. Cài bằng PowerShell: `irm https://claude.ai/install.ps1 | iex` (hoặc `npm install -g @anthropic-ai/claude-code`), mở terminal mới, chạy `claude` một lần để đăng nhập, rồi chạy lại script này.'
  );
}

if (claudeOk && !SKIP_AUTH) {
  // Gọi thử headless đúng kiểu worker sẽ được gọi. Chạy trong thư mục tạm để không đụng repo.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-auth-'));
  const r = sh('claude -p "Reply with exactly: OK" --permission-mode dontAsk --output-format json', { cwd: tmp, timeoutMs: 180_000 });
  let detail = tail(r.out, 6);
  let ok = false;
  try {
    const j = JSON.parse(r.out.slice(r.out.indexOf('{')));
    ok = j.is_error === false;
    detail = ok ? `claude -p chạy được (result: ${String(j.result).slice(0, 40)})` : `is_error=true: ${String(j.result).slice(0, 200)}`;
  } catch {
    /* giữ detail thô */
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  record('Claude Code đăng nhập + chạy headless', ok ? 'OK' : 'FAIL', ok ? detail : `${detail}\n   → Chạy \`claude\` một lần trong terminal để đăng nhập, rồi thử lại.`);
} else if (SKIP_AUTH) {
  record('Claude Code đăng nhập', 'WARN', 'bỏ qua (--skip-auth)');
}

// ---------------------------------------------------------------------------
section('4. Mạng tới npm registry + chốt version');

const pinned = {};
{
  const pkgs = ['three', '@types/three', 'playwright'];
  let allOk = true;
  for (const p of pkgs) {
    const r = sh(`npm view ${p} version`, { timeoutMs: 60_000 });
    if (r.ok && /^\d+\.\d+\.\d+/.test(r.out.trim())) pinned[p] = r.out.trim();
    else allOk = false;
  }
  record(
    'npm registry',
    allOk ? 'OK' : 'FAIL',
    allOk ? Object.entries(pinned).map(([k, v]) => `${k}@${v}`).join(', ') : 'không lấy được version từ registry.npmjs.org (kiểm tra mạng/proxy npm)'
  );
}

// ---------------------------------------------------------------------------
section('5. Ổ đĩa và chế độ ngủ');

{
  try {
    fs.mkdirSync(path.dirname(TARGET), { recursive: true });
    const s = fs.statfsSync(path.dirname(TARGET));
    const freeGb = (s.bavail * s.bsize) / 2 ** 30;
    facts.diskFreeGb = Number(freeGb.toFixed(1));
    // reference + root + tối đa 2 worktree, mỗi chỗ một node_modules (~0.5–1 GB) + Chromium (~0.5 GB) + ảnh chụp.
    const status = freeGb >= 15 ? 'OK' : freeGb >= 8 ? 'WARN' : 'FAIL';
    record('Dung lượng trống', status, `${freeGb.toFixed(1)} GB ở ${path.parse(TARGET).root} (khuyến nghị >= 15 GB)`);
  } catch (e) {
    record('Dung lượng trống', 'WARN', `không đo được: ${e.message}`);
  }
}

if (IS_WIN) {
  // Chỉ đọc. Hai giá trị hex cuối của output là AC rồi DC (đơn vị giây); 0 = không bao giờ ngủ.
  const read = (sub) => {
    const r = sh(`powercfg /query SCHEME_CURRENT SUB_SLEEP ${sub}`);
    const hex = r.out.match(/0x[0-9a-fA-F]{8}/g);
    if (!r.ok || !hex || hex.length < 2) return null;
    return parseInt(hex[hex.length - 2], 16);
  };
  const standby = read('STANDBYIDLE');
  const hibernate = read('HIBERNATEIDLE');
  const fmt = (v) => (v === null ? '?' : v === 0 ? 'không bao giờ' : `${Math.round(v / 60)} phút`);
  const ok = standby === 0 && (hibernate === 0 || hibernate === null);
  record(
    'Chế độ ngủ khi cắm điện',
    ok ? 'OK' : 'WARN',
    `sleep: ${fmt(standby)}, hibernate: ${fmt(hibernate)}.` +
      (ok ? '' : ' Máy ngủ là đêm chạy dừng. Tự tắt bằng PowerShell (admin): `powercfg /change standby-timeout-ac 0` và `powercfg /change hibernate-timeout-ac 0`. Nên tạm hoãn Windows Update để máy không tự khởi động lại.')
  );
}

// ---------------------------------------------------------------------------
if (CHECK_ONLY) {
  finish();
}

section(`6. Dựng repo ở ${TARGET}`);

if (results.some((r) => r.status === 'FAIL')) {
  console.log('\nCó mục FAIL ở trên. Sửa xong rồi chạy lại; script chưa tạo gì.');
  finish();
}

// Cho phép thư mục đích đã có sẵn `skills/` (bản clone các repo skill gốc, chỉ để tham khảo, không commit).
const ALLOWED_PREEXISTING = new Set(['skills']);
if (fs.existsSync(TARGET)) {
  const extra = fs.readdirSync(TARGET).filter((n) => !ALLOWED_PREEXISTING.has(n));
  if (extra.length > 0) {
    record('Thư mục đích', 'FAIL', `${TARGET} đã có: ${extra.join(', ')}. Chỉ chấp nhận sẵn có thư mục skills/. Dọn những thứ khác (hoặc dùng --target <thư mục khác>) rồi chạy lại.`);
    finish();
  }
}

const EXCLUDE_TOP = new Set(['node_modules', 'dist', '.git', 'threejs-port', 'shots', '.claude', '.vite', 'coverage']);
fs.mkdirSync(path.join(TARGET, 'reference'), { recursive: true });
fs.cpSync(SRC, path.join(TARGET, 'reference'), {
  recursive: true,
  filter: (src) => {
    const rel = path.relative(SRC, src);
    if (!rel) return true;
    const parts = rel.split(path.sep);
    if (EXCLUDE_TOP.has(parts[0])) return false;
    if (parts.includes('node_modules')) return false;
    return true;
  },
});
fs.cpSync(HERE, path.join(TARGET, 'threejs-port'), { recursive: true });
fs.mkdirSync(path.join(TARGET, '.claude'), { recursive: true });
fs.copyFileSync(path.join(HERE, 'claude-settings.json'), path.join(TARGET, '.claude', 'settings.json'));
// Skill dự án: threejs-port/skills/<tên>/ -> .claude/skills/<tên>/ (commit vào repo nên mọi worktree đều có).
{
  const srcSkills = path.join(HERE, 'skills');
  const names = fs.existsSync(srcSkills) ? fs.readdirSync(srcSkills).filter((n) => fs.existsSync(path.join(srcSkills, n, 'SKILL.md'))) : [];
  for (const n of names) fs.cpSync(path.join(srcSkills, n), path.join(TARGET, '.claude', 'skills', n), { recursive: true });
  record('Skill dự án', names.length ? 'OK' : 'WARN', names.length ? `.claude/skills/${names.join(', ')}` : 'không thấy threejs-port/skills/*/SKILL.md');
}
fs.writeFileSync(
  path.join(TARGET, '.gitignore'),
  ['node_modules/', 'dist/', '.vite/', 'test-results/', 'playwright-report/', '.setup-tmp/', 'threejs-port/logs/', '# bản clone repo skill gốc (có .git riêng), chỉ để tham khảo. Dấu / đầu dòng để KHÔNG bỏ qua .claude/skills/', '/skills/', '*.log', ''].join('\n')
);
record('Copy reference/ + threejs-port/ + .claude/settings.json', 'OK', TARGET);

// --- Baseline bản gốc trên PC này ---
const REF = path.join(TARGET, 'reference');
{
  const r = sh('npm install --no-audit --no-fund', { cwd: REF, timeoutMs: 15 * 60_000 });
  record('reference: npm install', r.ok ? 'OK' : 'FAIL', r.ok ? 'xong (package-lock.json mới được tạo và sẽ commit để chốt version)' : tail(r.out));
  if (r.ok) {
    for (const s of ['typecheck', 'test', 'build']) {
      const t = sh(`npm run ${s}`, { cwd: REF, timeoutMs: 10 * 60_000 });
      facts[`reference_${s}`] = t.ok ? 'pass' : 'fail';
      record(`reference: npm run ${s}`, t.ok ? 'OK' : 'FAIL', t.ok ? '' : `bản gốc không xanh trên PC này, T00 sẽ đỏ theo:\n${tail(t.out)}`);
    }
    const lock = JSON.parse(fs.readFileSync(path.join(REF, 'package-lock.json'), 'utf8'));
    const v = (n) => lock.packages?.[`node_modules/${n}`]?.version;
    facts.referenceResolved = { vite: v('vite'), react: v('react'), typescript: v('typescript'), tailwindcss: v('tailwindcss') };
  }
}

// --- Playwright: thư viện npm + Chromium. KHÔNG cần Playwright MCP. ---
const PW_TMP = path.join(TARGET, '.setup-tmp');
let launchRecommendation = null;
if (pinned.playwright) {
  fs.mkdirSync(PW_TMP, { recursive: true });
  fs.writeFileSync(path.join(PW_TMP, 'package.json'), JSON.stringify({ name: 'pw-check', private: true, type: 'module' }));
  let r = sh(`npm install playwright@${pinned.playwright} --no-audit --no-fund`, { cwd: PW_TMP, timeoutMs: 10 * 60_000 });
  if (r.ok) r = sh('npx playwright install chromium', { cwd: PW_TMP, timeoutMs: 15 * 60_000 });
  record(`Playwright ${pinned.playwright} + Chromium`, r.ok ? 'OK' : 'FAIL', r.ok ? 'Chromium đã tải về cache dùng chung của Playwright (%LOCALAPPDATA%\\ms-playwright)' : tail(r.out));

  if (r.ok) {
    fs.writeFileSync(path.join(PW_TMP, 'webgl-check.mjs'), WEBGL_CHECK_SRC);
    const w = sh('node webgl-check.mjs', { cwd: PW_TMP, timeoutMs: 5 * 60_000 });
    let rows = [];
    try {
      rows = JSON.parse(w.out.slice(w.out.indexOf('[')));
    } catch {
      /* ignore */
    }
    facts.webgl = rows;
    for (const row of rows) {
      record(
        `WebGL headless [${row.label}]`,
        row.webgl2 ? 'OK' : 'WARN',
        row.webgl2 ? `${row.renderer} | ~${row.fps} fps (cảnh test 2000 tam giác, 1280×720)` : row.error ?? 'không tạo được WebGL2'
      );
    }
    // Ưu tiên GPU thật (nhanh, số fps sát thực tế hơn), sau đó SwiftShader.
    const good = rows.filter((x) => x.webgl2);
    launchRecommendation =
      good.find((x) => !/swiftshader/i.test(x.renderer)) ?? good.find((x) => /swiftshader/i.test(x.renderer)) ?? null;
    record(
      'Cấu hình Chromium headless khuyến nghị',
      launchRecommendation ? 'OK' : 'FAIL',
      launchRecommendation ? `${launchRecommendation.label}: ${JSON.stringify(launchRecommendation.launch)}` : `không cấu hình nào có WebGL2:\n${tail(w.out)}`
    );
  }
  fs.rmSync(PW_TMP, { recursive: true, force: true });
}

// --- Ghi version chốt + kết quả preflight để T00 và orchestrator đọc ---
const pinnedOut = {
  generatedAt: new Date().toISOString(),
  note: 'T00 phải dùng ĐÚNG các version này (không dấu ^). shot.mjs phải launch Chromium bằng chromiumLaunch.',
  packages: pinned,
  referenceResolved: facts.referenceResolved ?? null,
  node: facts.node,
  chromiumLaunch: launchRecommendation?.launch ?? null,
  headlessFpsProbe: launchRecommendation?.fps ?? null,
};
fs.writeFileSync(path.join(TARGET, 'threejs-port', 'PINNED_VERSIONS.json'), JSON.stringify(pinnedOut, null, 2) + '\n');

function writePreflightMd() {
  const lines = [
    '# PREFLIGHT — kết quả setup-pc2.mjs',
    '',
    `Thời điểm: ${new Date().toISOString()} · Máy: ${os.hostname()} · ${facts.os}`,
    '',
    '| Mục | Kết quả | Chi tiết |',
    '|---|---|---|',
    ...results.map((r) => `| ${r.name} | ${r.status} | ${r.detail.replace(/\r?\n/g, '<br>').replace(/\|/g, '\\|')} |`),
    '',
    'Version chốt và cấu hình Chromium: `threejs-port/PINNED_VERSIONS.json`.',
    '',
  ];
  fs.writeFileSync(path.join(TARGET, 'threejs-port', 'PREFLIGHT.md'), lines.join('\n'));
}

// --- git init + seed commit ---
if (!results.some((r) => r.status === 'FAIL')) {
  writePreflightMd();
  const g = (c) => sh(`git ${c}`, { cwd: TARGET });
  let r = g('init -b main');
  if (r.ok) {
    g('config core.longpaths true');
    g('config core.autocrlf false');
    if (!gitIdentity.name || !gitIdentity.email) {
      g('config user.name "Crimson Night Run"');
      g('config user.email "night-run@localhost"');
    }
    g('add -A');
    r = g('commit -q -m "seed: reference canvas game + port plan"');
  }
  record('git init + seed commit', r.ok ? 'OK' : 'FAIL', r.ok ? sh('git log --oneline -1', { cwd: TARGET }).out : tail(r.out));
} else {
  writePreflightMd();
  console.log('\nCó mục FAIL nên chưa git init. Sửa xong thì xoá mọi thứ trong thư mục đích TRỪ skills/ rồi chạy lại script.');
}

finish();

// ---------------------------------------------------------------------------
function finish() {
  const fails = results.filter((r) => r.status === 'FAIL');
  const warns = results.filter((r) => r.status === 'WARN');
  console.log(`\n=== Tổng kết: ${results.length - fails.length - warns.length} OK · ${warns.length} WARN · ${fails.length} FAIL ===`);
  if (!CHECK_ONLY && fails.length === 0 && fs.existsSync(path.join(TARGET, '.git'))) {
    console.log(`\nBước tiếp theo (xem threejs-port/RUN.md):\n  cd ${q(TARGET)}\n  claude --permission-mode acceptEdits\n  > Đọc threejs-port/ORCHESTRATOR.md và bắt đầu. Chạy đến khi mọi task DONE hoặc BLOCKED.`);
  }
  process.exit(fails.length ? 1 : 0);
}
