import fs from 'fs-extra';
import path from 'node:path';
import { observationId } from '../../identity.js';
import { normalizeStyleValue } from '../../model/styles.js';
import { fileDigest, makeProvenance, STATIC_ENVIRONMENT } from '../../provenance.js';
import { emptyInventory } from '../../workspace.js';
import type { ScanContext, ScanContribution, StyleAdapter } from '../types.js';
import { collectFiles } from './files.js';
import { ANGULAR_EXTRACTOR, ANGULAR_EXTRACTOR_VERSION } from './tsMeta.js';

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

export const angularStyles: StyleAdapter = {
  async extract(context: ScanContext, inventory): Promise<ScanContribution> {
    const contrib = emptyInventory(inventory.workspace);
    const files = [
      ...(await collectFiles(context.sourceRoot, ['.css'])),
      ...(await collectFiles(context.sourceRoot, ['.ts'])),
      ...(await collectFiles(context.sourceRoot, ['.html'])),
    ];

    for (const file of files) {
      const text = await fs.readFile(file, 'utf8');
      const digest = fileDigest(file);
      const rel = path.relative(context.sourceRoot, file);
      const owner = inventory.components.find((c) => c.provenance.sourcePath === rel
        || rel.replace(/\\/g, '/').startsWith(path.dirname(c.provenance.sourcePath).replace(/\\/g, '/')));
      const declarations = extractDeclarations(text);
      const hexMatches = text.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
      for (const hex of hexMatches) {
        declarations.push({ property: 'color', value: hex });
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
            extractorVersion: ANGULAR_EXTRACTOR_VERSION,
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
            extractorName: ANGULAR_EXTRACTOR,
            extractorVersion: ANGULAR_EXTRACTOR_VERSION,
            environmentFingerprint: STATIC_ENVIRONMENT,
            relatedObservations: owner ? [owner.observationId] : [],
          }),
        });
      }
    }

    contrib.sources.push({
      kind: 'style',
      platform: 'angular',
      extractor: ANGULAR_EXTRACTOR,
      extractorVersion: ANGULAR_EXTRACTOR_VERSION,
      revision: context.revision,
      digest: inventory.workspace.revision,
    });
    return { inventory: contrib };
  },
};
