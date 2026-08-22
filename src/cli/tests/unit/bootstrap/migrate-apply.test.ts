import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compilePlatformFixture } from '../../helpers/bootstrap.js';
import { runMigrateApply } from '../../../bootstrap/migrate/index.js';

const fixtureRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../fixtures/bootstrap/react');

describe('migrate apply', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'specs-migrate-'));
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('writes accepted names then becomes a no-op', async () => {
    const workspace = path.join(tmp, 'workspace');
    await compilePlatformFixture({ fixtureRoot, workspace, platform: 'react' });
    const copy = path.join(tmp, 'src');
    await fs.copy(fixtureRoot, copy);
    const dry = await runMigrateApply(workspace, copy, { dryRun: true, platform: 'react' });
    expect(dry.plan.files.length).toBeGreaterThan(0);
    const original = await fs.readFile(path.join(copy, 'src/Card.tsx'), 'utf8');
    expect(original).toContain('PrimaryButton');

    const written = await runMigrateApply(workspace, copy, { dryRun: false, platform: 'react' });
    expect(written.written).toBeGreaterThan(0);
    const after = await fs.readFile(path.join(copy, 'src/Card.tsx'), 'utf8');
    expect(after).toContain('Button');
    expect(after).not.toContain('PrimaryButton');

    const second = await runMigrateApply(workspace, copy, { dryRun: false, platform: 'react' });
    expect(second.written ?? 0).toBe(0);
    expect(second.noop).toBe(true);
  });
});
