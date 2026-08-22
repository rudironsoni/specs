import fs from 'fs-extra';
import path from 'node:path';
import { logicalId, observationId } from '../../identity.js';
import { fileDigest, makeProvenance, STATIC_ENVIRONMENT } from '../../provenance.js';
import { emptyInventory } from '../../workspace.js';
import { collectFiles, readPackageName } from '../angular/files.js';
import type { CodeModelAdapter, ScanContext, ScanContribution } from '../types.js';
import type { ObservedProperty } from '../../schema/types.js';

export const COMPOSE_EXTRACTOR = 'specs-compose';
export const COMPOSE_EXTRACTOR_VERSION = '1';

export const composeCodeModel: CodeModelAdapter = {
  async extract(context: ScanContext): Promise<ScanContribution> {
    const pkg = context.packageName || await readPackageName(context.sourceRoot);
    const files = await collectFiles(context.sourceRoot, ['.kt']);
    const inventory = emptyInventory({ repository: context.repository, revision: context.revision });
    for (const fileName of files) {
      const text = await fs.readFile(fileName, 'utf8');
      if (!text.includes('@Composable')) continue;
      const rel = path.relative(context.sourceRoot, fileName);
      const digest = fileDigest(fileName);
      const funRe = /@Composable\s*(?:\r?\n|\s)*fun\s+([A-Z][A-Za-z0-9_]*)\s*\(([^)]*)\)/g;
      let match: RegExpExecArray | null;
      while ((match = funRe.exec(text))) {
        const name = match[1];
        if (name.endsWith('Preview')) continue;
        const params = match[2];
        const properties: ObservedProperty[] = [];
        const events: ObservedProperty[] = [];
        for (const part of params.split(',').map((p) => p.trim()).filter(Boolean)) {
          const [rawName, rawType] = part.split(':').map((s) => s.trim());
          if (!rawName) continue;
          const pname = rawName.replace(/\s+/g, ' ').split(' ').pop() ?? rawName;
          const prop: ObservedProperty = { name: pname, kind: pname.startsWith('on') ? 'output' : 'input', valueType: rawType };
          if (prop.kind === 'output') events.push(prop);
          else properties.push(prop);
        }
        const id = logicalId('kotlin', pkg, name);
        inventory.components.push({
          id,
          observationId: observationId({
            kind: 'component',
            sourceIdentity: id,
            sourceRevision: context.revision,
            sourceLocator: name,
            normalizedPayload: { name, properties, events },
            extractorVersion: COMPOSE_EXTRACTOR_VERSION,
          }),
          title: name,
          provenance: makeProvenance({
            sourceRevision: context.revision,
            sourceFileDigest: digest,
            locator: name,
            sourcePath: rel,
            rawValue: { name },
            normalizedValue: { symbol: name, package: pkg },
            extractorName: COMPOSE_EXTRACTOR,
            extractorVersion: COMPOSE_EXTRACTOR_VERSION,
            environmentFingerprint: STATIC_ENVIRONMENT,
          }),
          properties,
          events,
          slots: [],
          deprecations: text.includes('@Deprecated') ? [name] : [],
          extensions: { compose: { package: pkg, symbol: name } },
        });
      }
    }
    inventory.sources.push({
      kind: 'code',
      platform: 'android',
      extractor: COMPOSE_EXTRACTOR,
      extractorVersion: COMPOSE_EXTRACTOR_VERSION,
      revision: context.revision,
      digest: context.revision,
    });
    return { inventory };
  },
};
