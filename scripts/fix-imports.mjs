// One-off codemod (T01 step 2): make relative imports Node-resolvable (explicit `.ts`, `dir/index.ts`)
// and turn type-only named imports into `import type` / inline `type` based on tsc's TS1484 errors.
//   npm run fix-imports -- <dir-or-file> ...
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const typesOnly = process.argv.includes('--types-only');
const targets = process.argv
  .slice(2)
  .filter((a) => !a.startsWith('--'))
  .map((t) => path.resolve(ROOT, t));

function walk(p, out) {
  const st = fs.statSync(p);
  if (st.isDirectory()) for (const e of fs.readdirSync(p)) walk(path.join(p, e), out);
  else if (/\.tsx?$/.test(p)) out.push(p);
  return out;
}
const files = targets.flatMap((t) => walk(t, []));

// 1. extensions
let extFixes = 0;
for (const file of typesOnly ? [] : files) {
  const src = fs.readFileSync(file, 'utf8');
  const next = src.replace(/(\bfrom\s+|\bimport\s+)(['"])(\.{1,2}\/[^'"]*)\2/g, (m, kw, q, spec) => {
    if (/\.(ts|tsx|css|json)$/.test(spec)) return m;
    const abs = path.resolve(path.dirname(file), spec);
    for (const ext of ['.ts', '.tsx']) if (fs.existsSync(abs + ext)) return `${kw}${q}${spec}${ext}${q}`;
    for (const ext of ['.ts', '.tsx'])
      if (fs.existsSync(path.join(abs, `index${ext}`))) return `${kw}${q}${spec}/index${ext}${q}`;
    return m;
  });
  if (next !== src) {
    extFixes++;
    fs.writeFileSync(file, next);
  }
}
console.log(`[fix-imports] extensions fixed in ${extFixes} files`);

// 2. type-only imports, driven by tsc (needs verbatimModuleSyntax in tsconfig)
let out = '';
try {
  execSync('npx tsc --noEmit -p .', { cwd: ROOT, encoding: 'utf8', stdio: 'pipe', shell: true });
} catch (e) {
  out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
}
const byFile = new Map();
for (const line of out.split(/\r?\n/)) {
  const m = /^(.+?)\((\d+),(\d+)\): error TS1484: '([^']+)' is a type/.exec(line);
  if (!m) continue;
  const file = path.resolve(ROOT, m[1]);
  if (!files.includes(file)) continue;
  if (!byFile.has(file)) byFile.set(file, new Set());
  byFile.get(file).add(m[4]);
}
let typeFixes = 0;
for (const [file, names] of byFile) {
  let src = fs.readFileSync(file, 'utf8');
  src = src.replace(/import\s*\{([^}]*)\}\s*from\s*(['"][^'"]+['"]);?/g, (m, body, from) => {
    const parts = body
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const isType = (p) => p.startsWith('type ') || names.has(p.split(/\s+as\s+/)[0]);
    if (!parts.some((p) => !p.startsWith('type ') && isType(p))) return m;
    typeFixes++;
    const multiline = body.includes('\n');
    if (parts.every(isType)) {
      const names2 = parts.map((p) => p.replace(/^type\s+/, ''));
      return multiline
        ? `import type {\n${names2.map((n) => `  ${n},`).join('\n')}\n} from ${from};`
        : `import type { ${names2.join(', ')} } from ${from};`;
    }
    const mapped = parts.map((p) => (p.startsWith('type ') || !isType(p) ? p : `type ${p}`));
    return multiline
      ? `import {\n${mapped.map((n) => `  ${n},`).join('\n')}\n} from ${from};`
      : `import { ${mapped.join(', ')} } from ${from};`;
  });
  fs.writeFileSync(file, src);
}
console.log(`[fix-imports] type-only imports fixed: ${typeFixes} statements in ${byFile.size} files`);
