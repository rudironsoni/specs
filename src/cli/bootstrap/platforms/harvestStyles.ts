import fs from 'fs-extra';
import path from 'node:path';
import { observationId } from '../identity.js';
import { normalizeStyleValue } from '../model/styles.js';
import { fileDigest, makeProvenance, STATIC_ENVIRONMENT } from '../provenance.js';
import { emptyInventory } from '../workspace.js';
import { collectFiles } from './angular/files.js';
import type { ScanContext, ScanContribution, StyleAdapter } from './types.js';

function extractDeclarations(css: string): Array<{ property: string; value: string }> {
  const declarations: Array<{ property: string; value: string }> = [];
  let i = 0;
  while (i < css.length) {
    const colon = css.indexOf(':', i);
    if (colon === -1) break;
    const semi = css.indexOf(';', colon + 1);
    const end = semi === -1 ? css.length : semi;
    const property = css.slice(i, colon).trim().split(/[\s{]/).pop() ?? '';
    const value = css.slice(colon + 1, end).trim();
    if (property && value && !property.startsWith('@') && !property.includes('/*')) {
      declarations.push({ property, value });
    }
    i = end + 1;
  }
  return declarations;
}

export function createStyleAdapter(options: {
  platform: string;
  extractor: string;
  version: string;
  extensions: string[];
}): StyleAdapter {
  return {
    async extract(context: ScanContext, inventory): Promise<ScanContribution> {
      const contrib = emptyInventory(inventory.workspace);
      const files = await collectFiles(context.sourceRoot, options.extensions);
      for (const file of files) {
        const text = await fs.readFile(file, 'utf8');
        const digest = fileDigest(file);
        const rel = path.relative(context.sourceRoot, file);
        const owner = inventory.components.find((c) =>
          c.provenance.sourcePath === rel
          || rel.replace(/\\/g, '/').startsWith(path.dirname(c.provenance.sourcePath).replace(/\\/g, '/')),
        );
        const declarations = extractDeclarations(text);
        for (const hex of text.match(/#[0-9a-fA-F]{3,8}/g) ?? []) {
          declarations.push({ property: 'color', value: hex });
        }
        const swiftColor = /Color\(\s*red:\s*([\d.]+)\s*,\s*green:\s*([\d.]+)\s*,\s*blue:\s*([\d.]+)/g;
        let swiftMatch: RegExpExecArray | null;
        while ((swiftMatch = swiftColor.exec(text))) {
          const r = Math.round(Number(swiftMatch[1]) * 255);
          const g = Math.round(Number(swiftMatch[2]) * 255);
          const b = Math.round(Number(swiftMatch[3]) * 255);
          declarations.push({ property: 'color', value: `rgb(${r}, ${g}, ${b})` });
        }
        for (const decl of declarations) {
          const normalized = normalizeStyleValue(decl.value.replace(/['"]/g, ''));
          if (normalized.type === 'other' && !decl.value.includes('#')) continue;
          contrib.styles.push({
            observationId: observationId({
              kind: 'style',
              sourceIdentity: owner?.id ?? rel,
              sourceRevision: context.revision,
              sourceLocator: `${rel}:${decl.property}`,
              normalizedPayload: normalized,
              extractorVersion: options.version,
            }),
            authored: decl.value,
            normalized,
            propertyContext: decl.property,
            componentId: owner?.id,
            provenance: makeProvenance({
              sourceRevision: context.revision,
              sourceFileDigest: digest,
              locator: decl.property,
              sourcePath: rel,
              rawValue: decl.value,
              normalizedValue: normalized,
              extractorName: options.extractor,
              extractorVersion: options.version,
              environmentFingerprint: STATIC_ENVIRONMENT,
              relatedObservations: owner ? [owner.observationId] : [],
            }),
          });
        }
      }
      contrib.sources.push({
        kind: 'style',
        platform: options.platform,
        extractor: options.extractor,
        extractorVersion: options.version,
        revision: context.revision,
        digest: inventory.workspace.revision,
      });
      return { inventory: contrib };
    },
  };
}
