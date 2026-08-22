import fs from 'fs-extra';
import path from 'node:path';

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.specs',
  '.angular',
  '.turbo',
  'coverage',
  'storybook-static',
  'tmp',
  'e2e',
]);

export async function collectFiles(root: string, extensions: string[]): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    if (!(await fs.pathExists(dir))) return;
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(full);
      } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
        out.push(full);
      }
    }
  }
  await walk(root);
  return out;
}

export async function readPackageName(sourceRoot: string): Promise<string> {
  const pkgPath = path.join(sourceRoot, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    const pkg = await fs.readJson(pkgPath) as { name?: string };
    if (pkg.name) return pkg.name.replace(/^@[^/]+\//, '');
  }
  return path.basename(sourceRoot);
}
