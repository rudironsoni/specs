import path from 'node:path';
import fs from 'fs-extra';
import { fileDigest } from '../provenance.js';
import type { FailureRecord, Inventory } from '../schema/types.js';
import { BootstrapError } from '../errors.js';

export function assertFreshInventory(inventory: Inventory, sourceRoot: string, revision: string): void {
  const failures: FailureRecord[] = [];
  const observations = [
    ...inventory.components.map((c) => c.provenance),
    ...inventory.usages.map((c) => c.provenance),
    ...inventory.styles.map((c) => c.provenance),
    ...inventory.renderCases.map((c) => c.provenance),
    ...inventory.documents.map((c) => c.provenance),
  ];
  for (const provenance of observations) {
    if (provenance.sourceRevision !== revision && revision !== inventory.workspace.revision) {
      failures.push({
        code: 'STALE_OBSERVATION',
        message: `Revision ${provenance.sourceRevision} does not match ${revision}`,
        sourcePath: provenance.sourcePath,
      });
    }
    const abs = path.resolve(sourceRoot, provenance.sourcePath);
    if (fs.existsSync(abs)) {
      const digest = fileDigest(abs);
      if (digest !== provenance.sourceFileDigest) {
        failures.push({
          code: 'STALE_OBSERVATION',
          message: `Digest mismatch for ${provenance.sourcePath}`,
          sourcePath: provenance.sourcePath,
        });
      }
    }
  }
  if (failures.length > 0) {
    throw new BootstrapError('STALE_OBSERVATION', failures[0].message, { failures });
  }
}
