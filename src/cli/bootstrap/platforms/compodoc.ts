import fs from 'fs-extra';
import path from 'node:path';
import { observationId } from '../identity.js';
import { fileDigest, makeProvenance, STATIC_ENVIRONMENT } from '../provenance.js';
import { emptyInventory } from '../workspace.js';
import type { ScanContext, ScanContribution } from './types.js';
import type { Inventory } from '../schema/types.js';

const COMPODOC_EXTRACTOR = 'specs-compodoc';
const COMPODOC_VERSION = '1';

interface CompodocComponent {
  name?: string;
  selector?: string;
  description?: string;
  file?: string;
  inputsClass?: unknown[];
  outputsClass?: unknown[];
}

export async function extractCompodoc(context: ScanContext, inventory: Inventory): Promise<ScanContribution> {
  const contrib = emptyInventory(inventory.workspace);
  const docPath = path.join(context.sourceRoot, 'documentation.json');
  if (!(await fs.pathExists(docPath))) return { inventory: contrib };

  const raw = await fs.readJson(docPath) as { components?: CompodocComponent[] } | CompodocComponent[];
  const components = Array.isArray(raw) ? raw : (raw.components ?? []);
  const digest = fileDigest(docPath);

  for (const entry of components) {
    const selector = entry.selector ?? entry.name;
    if (!selector) continue;
    const owner = inventory.components.find((component) => {
      const ext = component.extensions.angular as { selector?: string; className?: string } | undefined;
      return ext?.selector === entry.selector
        || ext?.className === entry.name
        || component.title === entry.name;
    });
    contrib.documents.push({
      observationId: observationId({
        kind: 'document',
        sourceIdentity: owner?.id ?? selector,
        sourceRevision: context.revision,
        sourceLocator: `compodoc:${selector}`,
        normalizedPayload: { selector, description: entry.description ?? '' },
        extractorVersion: COMPODOC_VERSION,
      }),
      provenance: makeProvenance({
        sourceRevision: context.revision,
        sourceFileDigest: digest,
        locator: selector,
        sourcePath: path.relative(context.sourceRoot, docPath),
        rawValue: entry,
        normalizedValue: { selector, description: entry.description ?? '' },
        extractorName: COMPODOC_EXTRACTOR,
        extractorVersion: COMPODOC_VERSION,
        environmentFingerprint: STATIC_ENVIRONMENT,
        relatedObservations: owner ? [owner.observationId] : [],
      }),
      referencedComponent: owner?.id,
    });
  }

  contrib.sources.push({
    kind: 'documentation',
    platform: 'compodoc',
    extractor: COMPODOC_EXTRACTOR,
    extractorVersion: COMPODOC_VERSION,
    revision: context.revision,
    digest: context.revision,
  });
  return { inventory: contrib };
}
