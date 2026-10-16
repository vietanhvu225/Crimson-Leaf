// T00 bootstrap: copy reference/src, index.html, package-lock.json into repo root.
// Usage: node scripts/copy-reference.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ref = path.join(root, 'reference');

fs.cpSync(path.join(ref, 'src'), path.join(root, 'src'), { recursive: true });
for (const f of ['index.html', 'package-lock.json']) {
  fs.copyFileSync(path.join(ref, f), path.join(root, f));
}
console.log('copied reference/src, index.html, package-lock.json');
