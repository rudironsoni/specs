import fs from 'fs-extra';
import path from 'node:path';
import { observationId } from '../../identity.js';
import { fileDigest, makeProvenance, STATIC_ENVIRONMENT } from '../../provenance.js';
import { emptyInventory } from '../../workspace.js';
import { collectFiles } from '../angular/files.js';
import type { RenderCaseAdapter, ScanContext, ScanContribution } from '../types.js';
import { SWIFT_EXTRACTOR, SWIFT_EXTRACTOR_VERSION } from './codeModel.js';

export const swiftRenderCases: RenderCaseAdapter = {
  async extract(context: ScanContext, inventory): Promise<ScanContribution> {
    const contrib = emptyInventory(inventory.workspace);
    const files = await collectFiles(context.sourceRoot, ['.swift']);
    for (const file of files) {
      const text = await fs.readFile(file, 'utf8');
      if (!text.includes('#Preview') && !text.includes('PreviewProvider')) continue;
      const rel = path.relative(context.sourceRoot, file);
      const owner = inventory.components.find((c) => c.provenance.sourcePath === rel);
      if (!owner) continue;
      contrib.renderCases.push({
        observationId: observationId({
          kind: 'renderCase',
          sourceIdentity: owner.id,
          sourceRevision: context.revision,
          sourceLocator: `${rel}:Preview`,
          normalizedPayload: { kind: 'preview' },
          extractorVersion: SWIFT_EXTRACTOR_VERSION,
        }),
        componentId: owner.id,
        name: 'Preview',
        provenance: makeProvenance({
          sourceRevision: context.revision,
          sourceFileDigest: fileDigest(file),
          locator: 'Preview',
          sourcePath: rel,
          rawValue: 'Preview',
          normalizedValue: { kind: 'preview' },
          extractorName: SWIFT_EXTRACTOR,
          extractorVersion: SWIFT_EXTRACTOR_VERSION,
          environmentFingerprint: STATIC_ENVIRONMENT,
          relatedObservations: [owner.observationId],
        }),
      });
    }
    contrib.sources.push({
      kind: 'renderCase',
      platform: 'swiftui',
      extractor: SWIFT_EXTRACTOR,
      extractorVersion: SWIFT_EXTRACTOR_VERSION,
      revision: context.revision,
      digest: context.revision,
    });
    return { inventory: contrib };
  },
};
