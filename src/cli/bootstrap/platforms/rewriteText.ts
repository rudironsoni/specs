import fs from 'fs-extra';
import path from 'node:path';
import type { BindingFile } from '../schema/types.js';
import { collectFiles } from './angular/files.js';
import type { RewritePlan } from './types.js';

export function replaceIdentifier(source: string, from: string, to: string): string {
  const parts: string[] = [];
  let remaining = source;
  while (remaining.length > 0) {
    const index = remaining.indexOf(from);
    if (index === -1) {
      parts.push(remaining);
      break;
    }
    const before = remaining[index - 1] ?? '';
    const after = remaining[index + from.length] ?? '';
    const boundary = (ch: string) => !ch || /[^A-Za-z0-9_-]/.test(ch);
    parts.push(remaining.slice(0, index));
    parts.push(boundary(before) && boundary(after) ? to : from);
    remaining = remaining.slice(index + from.length);
  }
  return parts.join('');
}

export async function planTextRewrite(options: {
  sourceRoot: string;
  bindings: BindingFile;
  platform: string;
  extensions: string[];
}): Promise<RewritePlan> {
  const files = await collectFiles(options.sourceRoot, options.extensions);
  const plan: RewritePlan = { files: [] };
  const maps: Array<{ from: string; to: string }> = [];
  for (const binding of options.bindings.bindings) {
    const impl = binding.implementations[options.platform];
    if (!impl) continue;
    const accepted = impl.selector ?? impl.exportName ?? impl.symbol;
    for (const mapping of binding.propertyMappings.filter((m) => m.platform === options.platform)) {
      if (mapping.platformProperty !== mapping.contractProperty && mapping.platformProperty !== accepted) {
        maps.push({ from: mapping.platformProperty, to: mapping.contractProperty === 'selector' ? accepted : mapping.contractProperty });
      }
    }
  }
  for (const file of files) {
    const original = await fs.readFile(file, 'utf8');
    let next = original;
    const hunks: Array<{ before: string; after: string }> = [];
    for (const map of maps) {
      if (map.from === map.to) continue;
      const replaced = replaceIdentifier(next, map.from, map.to);
      if (replaced !== next) {
        hunks.push({ before: map.from, after: map.to });
        next = replaced;
      }
    }
    if (hunks.length > 0) {
      plan.files.push({
        path: path.relative(options.sourceRoot, file),
        description: 'Apply accepted binding names',
        hunks,
      });
    }
  }
  return plan;
}

export async function applyRewritePlan(sourceRoot: string, plan: RewritePlan): Promise<number> {
  let written = 0;
  for (const file of plan.files) {
    const abs = path.join(sourceRoot, file.path);
    if (!(await fs.pathExists(abs))) continue;
    let text = await fs.readFile(abs, 'utf8');
    const before = text;
    for (const hunk of file.hunks) {
      text = replaceIdentifier(text, hunk.before, hunk.after);
    }
    if (text !== before) {
      await fs.writeFile(abs, text);
      written += 1;
    }
  }
  return written;
}
