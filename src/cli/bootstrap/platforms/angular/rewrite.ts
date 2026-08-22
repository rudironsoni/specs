import fs from 'fs-extra';
import path from 'node:path';
import type { BindingFile } from '../../schema/types.js';
import type { RewriteAdapter, RewritePlan, ScanContext } from '../types.js';
import { collectFiles } from './files.js';

export function planAngularRewrite(sourceRoot: string, bindings: BindingFile): Promise<RewritePlan> {
  return (async () => {
    const files = [
      ...(await collectFiles(sourceRoot, ['.ts'])),
      ...(await collectFiles(sourceRoot, ['.html'])),
    ];
    const plan: RewritePlan = { files: [] };
    const selectorMaps: Array<{ from: string; to: string }> = [];
    const propertyMaps: Array<{ from: string; to: string }> = [];

    for (const binding of bindings.bindings) {
      const impl = binding.implementations.angular;
      if (!impl?.selector) continue;
      for (const mapping of binding.propertyMappings.filter((m) => m.platform === 'angular')) {
        if (mapping.contractProperty === 'selector' && mapping.platformProperty !== impl.selector) {
          selectorMaps.push({ from: mapping.platformProperty, to: impl.selector });
          continue;
        }
        if (mapping.contractProperty !== 'selector' && mapping.contractProperty !== mapping.platformProperty) {
          propertyMaps.push({ from: mapping.platformProperty, to: mapping.contractProperty });
        }
      }
    }

    for (const file of files) {
      const original = await fs.readFile(file, 'utf8');
      let next = original;
      const hunks: Array<{ before: string; after: string }> = [];
      for (const map of [...selectorMaps, ...propertyMaps]) {
        if (map.from === map.to) continue;
        const replaced = replaceIdentifier(next, map.from, map.to);
        if (replaced !== next) {
          hunks.push({ before: map.from, after: map.to });
          next = replaced;
        }
      }
      if (hunks.length > 0) {
        plan.files.push({
          path: path.relative(sourceRoot, file),
          description: 'Apply accepted binding names',
          hunks,
        });
      }
    }
    return plan;
  })();
}

function replaceIdentifier(source: string, from: string, to: string): string {
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

export function createAngularRewrite(bindings: BindingFile): RewriteAdapter {
  return {
    async plan(context: ScanContext): Promise<RewritePlan> {
      return planAngularRewrite(context.sourceRoot, bindings);
    },
  };
}
