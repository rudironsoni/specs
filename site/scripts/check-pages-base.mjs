import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const unprefixed = /(?:href|src)="\/(?!specs\/)(?:_astro|cli|schema|plugin|guides|overview|settings|pagefind)\//;
const failures = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }
    if (!name.endsWith('.html')) continue;
    const html = readFileSync(path, 'utf8');
    const found = html.match(new RegExp(unprefixed, 'g'));
    if (found) failures.push(`${path}: ${[...new Set(found)].join(', ')}`);
  }
}

walk(dist);

if (failures.length > 0) {
  console.error('Docs HTML still has root-absolute URLs. GitHub Pages serves this site at /specs/.');
  for (const line of failures) console.error(line);
  process.exit(1);
}

console.log('Docs HTML prefixes internal URLs with /specs/.');
