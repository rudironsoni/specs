import fs from 'fs-extra';
import path from 'node:path';
import { observationId } from '../../identity.js';
import { fileDigest, makeProvenance, STATIC_ENVIRONMENT } from '../../provenance.js';
import { emptyInventory } from '../../workspace.js';
import { collectFiles } from '../angular/files.js';
import type { RenderCaseAdapter, ScanContext, ScanContribution } from '../types.js';
import { VUE_EXTRACTOR, VUE_EXTRACTOR_VERSION } from './codeModel.js';

export const vueRenderCases: RenderCaseAdapter = {
  async extract(context: ScanContext, inventory): Promise<ScanContribution> {
    const contrib = emptyInventory(inventory.workspace);
    const files = (await collectFiles(context.sourceRoot, ['.ts', '.js', '.vue'])).filter((f) => f.includes('.stories.') || f.includes('.story.'));
    for (const file of files) {
      const text = await fs.readFile(file, 'utf8');
      const rel = path.relative(context.sourceRoot, file);
      const digest = fileDigest(file);
      for (const owner of inventory.components) {
        if (!text.includes(owner.title)) continue;
        contrib.renderCases.push({
          observationId: observationId({
            kind: 'renderCase',
            sourceIdentity: owner.id,
            sourceRevision: context.revision,
            sourceLocator: rel,
            normalizedPayload: { file: rel },
            extractorVersion: VUE_EXTRACTOR_VERSION,
          }),
          componentId: owner.id,
          name: path.basename(rel),
          provenance: makeProvenance({
            sourceRevision: context.revision,
            sourceFileDigest: digest,
            locator: owner.title,
            sourcePath: rel,
            rawValue: rel,
            normalizedValue: { file: rel },
            extractorName: VUE_EXTRACTOR,
            extractorVersion: VUE_EXTRACTOR_VERSION,
            environmentFingerprint: STATIC_ENVIRONMENT,
            relatedObservations: [owner.observationId],
          }),
        });
      }
    }
    contrib.sources.push({
      kind: 'renderCase',
      platform: 'vue',
      extractor: VUE_EXTRACTOR,
      extractorVersion: VUE_EXTRACTOR_VERSION,
      revision: context.revision,
      digest: context.revision,
    });
    return { inventory: contrib };
  },
};
