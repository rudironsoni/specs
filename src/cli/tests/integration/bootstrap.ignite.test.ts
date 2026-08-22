import { describe, expect, it } from 'vitest';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { runScan } from '../../bootstrap/scan/index.js';

const IGNITE = process.env.SPECS_IGNITE_ROOT
  ?? '/Users/rudimar.ronsoni@feverup.com/repos/feverzoneclient/projects/ignite';

describe.skipIf(!(fs.existsSync(IGNITE)))('feverzoneclient Ignite scan', () => {
  it('observes ignt-button from the Ignite library', async () => {
    let revision = 'unknown';
    try {
      revision = execSync('git rev-parse HEAD', { cwd: IGNITE, encoding: 'utf8' }).trim();
    } catch {
      revision = 'unknown';
    }
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'specs-ignite-'));
    try {
      const inventory = await runScan({
        sourceRoot: IGNITE,
        workspace: path.join(tmp, 'workspace'),
        platform: 'angular',
        repository: 'feverzoneclient',
        revision,
      });
      const selectors = inventory.components
        .map((c) => (c.extensions.angular as { selector?: string } | undefined)?.selector)
        .filter((value): value is string => Boolean(value));
      expect(selectors.some((selector) => selector === 'ignt-button')).toBe(true);
      expect(inventory.components.length).toBeGreaterThan(10);
    } finally {
      await fs.remove(tmp);
    }
  }, 180000);
});
