import fs from 'fs-extra';
import path from 'node:path';
import { observationId } from '../../identity.js';
import { fileDigest, makeProvenance, STATIC_ENVIRONMENT } from '../../provenance.js';
import { emptyInventory } from '../../workspace.js';
import { collectFiles } from '../angular/files.js';
import type { ScanContext, ScanContribution, UsageAdapter } from '../types.js';
import { COMPOSE_EXTRACTOR, COMPOSE_EXTRACTOR_VERSION } from './codeModel.js';

export const composeUsage: UsageAdapter = {
  async extract(context: ScanContext, inventory): Promise<ScanContribution> {
    const contrib = emptyInventory(inventory.workspace);
    const files = await collectFiles(context.sourceRoot, ['.kt']);
    for (const file of files) {
      const text = await fs.readFile(file, 'utf8');
      const rel = path.relative(context.sourceRoot, file);
      const digest = fileDigest(file);
      const from = inventory.components.find((c) => c.provenance.sourcePath === rel);
      for (const used of inventory.components) {
        if (used.id === from?.id) continue;
        if (!text.includes(`${used.title}(`)) continue;
        contrib.usages.push({
          observationId: observationId({
            kind: 'usage',
            sourceIdentity: used.id,
            sourceRevision: context.revision,
            sourceLocator: `${rel}:${used.title}`,
            normalizedPayload: { call: used.title, from: from?.id },
            extractorVersion: COMPOSE_EXTRACTOR_VERSION,
          }),
          componentId: used.id,
          kind: 'composed',
          fromId: from?.id,
          provenance: makeProvenance({
            sourceRevision: context.revision,
            sourceFileDigest: digest,
            locator: used.title,
            sourcePath: rel,
            rawValue: used.title,
            normalizedValue: { call: used.title },
            extractorName: COMPOSE_EXTRACTOR,
            extractorVersion: COMPOSE_EXTRACTOR_VERSION,
            environmentFingerprint: STATIC_ENVIRONMENT,
            relatedObservations: [used.observationId],
          }),
        });
      }
    }
    contrib.sources.push({
      kind: 'usage',
      platform: 'android',
      extractor: COMPOSE_EXTRACTOR,
      extractorVersion: COMPOSE_EXTRACTOR_VERSION,
      revision: context.revision,
      digest: context.revision,
    });
    return { inventory: contrib };
  },
};
