import fs from 'fs-extra';
import path from 'node:path';
import { BootstrapError } from '../errors.js';
import { observationId } from '../identity.js';
import { fileDigest, makeProvenance } from '../provenance.js';
import { emptyInventory } from '../workspace.js';
import type { CaptureContext, RendererAdapter, ScanContribution } from './types.js';

export function createHarnessRenderer(extractor: string, version: string): RendererAdapter {
  return {
    async capture(context: CaptureContext, inventory): Promise<ScanContribution> {
      const harnessDir = context.harness ?? path.join(context.sourceRoot, 'harness');
      const contrib = emptyInventory(inventory.workspace);
      if (!(await fs.pathExists(harnessDir))) {
        throw new BootstrapError('MISSING_RUNTIME_PROVIDER', `No capture harness at ${harnessDir}`, { harnessDir });
      }
      const files = (await fs.readdir(harnessDir)).filter((name) => name.endsWith('.json')).sort();
      for (const name of files) {
        const full = path.join(harnessDir, name);
        const payload = await fs.readJson(full) as {
          componentId: string;
          name: string;
          structure: unknown;
          accessibility?: string;
          environment?: Record<string, unknown>;
        };
        const owner = inventory.components.find((c) => c.id === payload.componentId);
        contrib.renderCases.push({
          observationId: observationId({
            kind: 'renderCase',
            sourceIdentity: payload.componentId,
            sourceRevision: context.revision,
            sourceLocator: `harness:${name}`,
            normalizedPayload: payload.structure,
            extractorVersion: version,
          }),
          componentId: payload.componentId,
          name: payload.name,
          states: [],
          provenance: makeProvenance({
            sourceRevision: context.revision,
            sourceFileDigest: fileDigest(full),
            locator: name,
            sourcePath: path.relative(context.sourceRoot, full),
            rawValue: payload,
            normalizedValue: payload.structure,
            extractorName: `${extractor}-harness`,
            extractorVersion: version,
            environmentFingerprint: JSON.stringify(payload.environment ?? {}),
            relatedObservations: owner ? [owner.observationId] : [],
          }),
        });
      }
      contrib.sources.push({
        kind: 'runtime',
        platform: extractor,
        extractor: `${extractor}-harness`,
        extractorVersion: version,
        revision: context.revision,
        digest: context.revision,
      });
      return { inventory: contrib };
    },
  };
}
