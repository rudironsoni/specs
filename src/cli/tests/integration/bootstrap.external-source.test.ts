import { describe, expect, it } from 'vitest';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { runScan } from '../../bootstrap/scan/index.js';

const SOURCE = process.env.SPECS_BOOTSTRAP_SOURCE;
const PLATFORM = process.env.SPECS_BOOTSTRAP_PLATFORM ?? 'angular';

describe.skipIf(!(SOURCE && fs.existsSync(SOURCE)))('optional external bootstrap scan', () => {
  it('observes at least one component from SPECS_BOOTSTRAP_SOURCE', async () => {
    const sourceRoot = SOURCE as string;
    let revision = 'unknown';
    try {
      revision = execSync('git rev-parse HEAD', { cwd: sourceRoot, encoding: 'utf8' }).trim();
    } catch {
      revision = 'unknown';
    }
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'specs-bootstrap-source-'));
    try {
      const inventory = await runScan({
        sourceRoot,
        workspace: path.join(tmp, 'workspace'),
        platform: PLATFORM,
        repository: path.basename(sourceRoot),
        revision,
      });
      expect(inventory.components.length).toBeGreaterThan(0);
    } finally {
      await fs.remove(tmp);
    }
  }, 180000);
});
