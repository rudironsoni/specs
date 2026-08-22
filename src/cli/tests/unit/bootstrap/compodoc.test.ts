import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScan } from '../../../bootstrap/scan/index.js';

const fixtureRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../fixtures/bootstrap/angular');

describe('Compodoc ingest', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'specs-compodoc-'));
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('records documentation.json against the matching component', async () => {
    const inventory = await runScan({
      sourceRoot: fixtureRoot,
      workspace: path.join(tmp, 'workspace'),
      platform: 'angular',
      repository: 'legacy-kit',
      revision: 'test-sha',
    });
    expect(inventory.documents.length).toBeGreaterThan(0);
    expect(inventory.documents[0].referencedComponent).toContain('legacy-primary-button');
    expect(inventory.sources.some((s) => s.extractor === 'specs-compodoc')).toBe(true);
  });
});
