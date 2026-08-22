import fs from 'fs-extra';
import path from 'node:path';
import { observationId } from '../../identity.js';
import { fileDigest, makeProvenance, STATIC_ENVIRONMENT } from '../../provenance.js';
import { emptyInventory } from '../../workspace.js';
import { collectFiles } from '../angular/files.js';
import { findStartTags } from '../angular/html.js';
import type { ScanContext, ScanContribution, UsageAdapter } from '../types.js';
import { parseSfc } from './sfc.js';
import { VUE_EXTRACTOR, VUE_EXTRACTOR_VERSION } from './codeModel.js';

export const vueUsage: UsageAdapter = {
  async extract(context: ScanContext, inventory): Promise<ScanContribution> {
    const contrib = emptyInventory(inventory.workspace);
    const byName = new Map(inventory.components.map((c) => [c.title, c]));
    const files = await collectFiles(context.sourceRoot, ['.vue']);
    for (const file of files) {
      const text = await fs.readFile(file, 'utf8');
      const sfc = parseSfc(text);
      const rel = path.relative(context.sourceRoot, file);
      const digest = fileDigest(file);
      const from = inventory.components.find((c) => c.provenance.sourcePath === rel);
      for (const tag of findStartTags(sfc.template)) {
        const used = byName.get(tag.tag) ?? [...byName.values()].find((c) =>
          (c.extensions.vue as { component?: string } | undefined)?.component?.toLowerCase() === tag.tag.toLowerCase(),
        );
        if (!used || used.id === from?.id) continue;
        contrib.usages.push({
          observationId: observationId({
            kind: 'usage',
            sourceIdentity: used.id,
            sourceRevision: context.revision,
            sourceLocator: `${rel}:${tag.tag}`,
            normalizedPayload: { tag: tag.tag, attrs: tag.attrs },
            extractorVersion: VUE_EXTRACTOR_VERSION,
          }),
          componentId: used.id,
          kind: 'composed',
          fromId: from?.id,
          propertyValues: tag.attrs,
          provenance: makeProvenance({
            sourceRevision: context.revision,
            sourceFileDigest: digest,
            locator: tag.tag,
            sourcePath: rel,
            rawValue: tag,
            normalizedValue: tag.attrs,
            extractorName: VUE_EXTRACTOR,
            extractorVersion: VUE_EXTRACTOR_VERSION,
            environmentFingerprint: STATIC_ENVIRONMENT,
            relatedObservations: [used.observationId],
          }),
        });
      }
    }
    contrib.sources.push({
      kind: 'usage',
      platform: 'vue',
      extractor: VUE_EXTRACTOR,
      extractorVersion: VUE_EXTRACTOR_VERSION,
      revision: context.revision,
      digest: context.revision,
    });
    return { inventory: contrib };
  },
};
