import fs from 'fs-extra';
import path from 'node:path';
import { logicalId, observationId } from '../../identity.js';
import { fileDigest, makeProvenance, STATIC_ENVIRONMENT } from '../../provenance.js';
import { emptyInventory } from '../../workspace.js';
import { collectFiles, readPackageName } from '../angular/files.js';
import type { CodeModelAdapter, ScanContext, ScanContribution } from '../types.js';
import type { ObservedProperty } from '../../schema/types.js';

export const SWIFT_EXTRACTOR = 'specs-swiftui';
export const SWIFT_EXTRACTOR_VERSION = '1';

export const swiftCodeModel: CodeModelAdapter = {
  async extract(context: ScanContext): Promise<ScanContribution> {
    const moduleName = context.packageName || await readPackageName(context.sourceRoot);
    const files = await collectFiles(context.sourceRoot, ['.swift']);
    const inventory = emptyInventory({ repository: context.repository, revision: context.revision });
    for (const fileName of files) {
      const text = await fs.readFile(fileName, 'utf8');
      const rel = path.relative(context.sourceRoot, fileName);
      const digest = fileDigest(fileName);
      const structMatch = /struct\s+([A-Za-z0-9_]+)\s*:\s*View/.exec(text);
      if (!structMatch) continue;
      const name = structMatch[1];
      const properties: ObservedProperty[] = [];
      const events: ObservedProperty[] = [];
      const propRe = /(?:var|let)\s+([A-Za-z0-9_]+)\s*:\s*([A-Za-z0-9_<>]+)/g;
      let match: RegExpExecArray | null;
      while ((match = propRe.exec(text))) {
        if (match[1] === 'body') continue;
        const kind = match[2].includes('()') || match[1].startsWith('on') ? 'output' : 'input';
        const prop = { name: match[1], kind, valueType: match[2] } as ObservedProperty;
        if (kind === 'output') events.push(prop);
        else properties.push(prop);
      }
      const id = logicalId('swift', moduleName, name);
      inventory.components.push({
        id,
        observationId: observationId({
          kind: 'component',
          sourceIdentity: id,
          sourceRevision: context.revision,
          sourceLocator: name,
          normalizedPayload: { name, properties, events },
          extractorVersion: SWIFT_EXTRACTOR_VERSION,
        }),
        title: name,
        provenance: makeProvenance({
          sourceRevision: context.revision,
          sourceFileDigest: digest,
          locator: name,
          sourcePath: rel,
          rawValue: { name },
          normalizedValue: { symbol: name, module: moduleName },
          extractorName: SWIFT_EXTRACTOR,
          extractorVersion: SWIFT_EXTRACTOR_VERSION,
          environmentFingerprint: STATIC_ENVIRONMENT,
        }),
        properties,
        events,
        slots: [],
        deprecations: text.includes('@available(*, deprecated') ? [name] : [],
        extensions: { swiftui: { module: moduleName, symbol: name } },
      });
    }
    inventory.sources.push({
      kind: 'code',
      platform: 'swiftui',
      extractor: SWIFT_EXTRACTOR,
      extractorVersion: SWIFT_EXTRACTOR_VERSION,
      revision: context.revision,
      digest: context.revision,
    });
    return { inventory };
  },
};
