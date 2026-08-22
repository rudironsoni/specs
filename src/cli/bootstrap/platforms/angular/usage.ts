import fs from 'fs-extra';
import path from 'node:path';
import { observationId } from '../../identity.js';
import { fileDigest, makeProvenance, STATIC_ENVIRONMENT } from '../../provenance.js';
import { emptyInventory } from '../../workspace.js';
import type { ScanContext, ScanContribution, UsageAdapter } from '../types.js';
import { collectFiles } from './files.js';
import { parseTemplateTags } from './html.js';
import { ANGULAR_EXTRACTOR, ANGULAR_EXTRACTOR_VERSION } from './tsMeta.js';

export const angularUsage: UsageAdapter = {
  async extract(context: ScanContext, inventory): Promise<ScanContribution> {
    const contrib = emptyInventory(inventory.workspace);
    const selectors = new Map(
      inventory.components.map((component) => {
        const ext = component.extensions.angular as { selector?: string } | undefined;
        return [ext?.selector ?? '', component] as const;
      }).filter(([selector]) => selector),
    );

    const files = [
      ...(await collectFiles(context.sourceRoot, ['.ts'])),
      ...(await collectFiles(context.sourceRoot, ['.html'])),
    ];

    for (const file of files) {
      const text = await fs.readFile(file, 'utf8');
      const digest = fileDigest(file);
      const rel = path.relative(context.sourceRoot, file);
      const tags = await parseTemplateTags(text, context.sourceRoot);
      for (const tag of tags) {
        const used = selectors.get(tag.tag);
        if (!used) continue;
        const from = inventory.components.find((c) => c.provenance.sourcePath === rel);
        const propertyValues: Record<string, unknown> = {};
        for (const [name, value] of Object.entries(tag.attrs)) {
          const key = name.replace(/^\[|\]$/g, '').replace(/^\(|\)$/g, '');
          propertyValues[key] = value;
        }
        const kind = from && from.id !== used.id ? 'composed' : 'instantiated';
        const wrapper = Boolean(from) && tags.length === 1;
        contrib.usages.push({
          observationId: observationId({
            kind: 'usage',
            sourceIdentity: used.id,
            sourceRevision: context.revision,
            sourceLocator: `${rel}:${tag.tag}`,
            normalizedPayload: { tag: tag.tag, propertyValues, from: from?.id },
            extractorVersion: ANGULAR_EXTRACTOR_VERSION,
          }),
          componentId: used.id,
          kind: wrapper && from ? 'wrapped' : kind,
          fromId: from?.id,
          propertyValues,
          provenance: makeProvenance({
            sourceRevision: context.revision,
            sourceFileDigest: digest,
            locator: tag.tag,
            sourcePath: rel,
            rawValue: tag,
            normalizedValue: { tag: tag.tag, propertyValues },
            extractorName: ANGULAR_EXTRACTOR,
            extractorVersion: ANGULAR_EXTRACTOR_VERSION,
            environmentFingerprint: STATIC_ENVIRONMENT,
            relatedObservations: [used.observationId],
          }),
        });
      }

      if (/@deprecated/.test(text)) {
        for (const component of inventory.components) {
          if (!text.includes(component.title) && !text.includes((component.extensions.angular as { selector?: string }).selector ?? '')) {
            continue;
          }
          contrib.usages.push({
            observationId: observationId({
              kind: 'usage',
              sourceIdentity: component.id,
              sourceRevision: context.revision,
              sourceLocator: `${rel}:deprecated`,
              normalizedPayload: { deprecated: true },
              extractorVersion: ANGULAR_EXTRACTOR_VERSION,
            }),
            componentId: component.id,
            kind: 'deprecated',
            provenance: makeProvenance({
              sourceRevision: context.revision,
              sourceFileDigest: digest,
              locator: 'deprecated',
              sourcePath: rel,
              rawValue: '@deprecated',
              normalizedValue: { deprecated: true },
              extractorName: ANGULAR_EXTRACTOR,
              extractorVersion: ANGULAR_EXTRACTOR_VERSION,
              relatedObservations: [component.observationId],
            }),
          });
        }
      }
    }

    contrib.sources.push({
      kind: 'usage',
      platform: 'angular',
      extractor: ANGULAR_EXTRACTOR,
      extractorVersion: ANGULAR_EXTRACTOR_VERSION,
      revision: context.revision,
      digest: inventory.workspace.revision,
    });
    return { inventory: contrib };
  },
};
