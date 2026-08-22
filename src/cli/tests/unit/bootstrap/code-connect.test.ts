import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compilePlatformFixture } from '../../helpers/bootstrap.js';
import { runBindingsGenerate } from '../../../bootstrap/bindings/index.js';
import { allPlatformPacks } from '../../../bootstrap/platforms/index.js';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../fixtures/bootstrap');

describe('Code Connect templates', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'specs-cc-'));
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('every pack exposes a template adapter', () => {
    for (const pack of allPlatformPacks()) {
      expect(pack.codeConnect).toBeTruthy();
      expect(pack.manifest.capabilities.codeConnect).toBe('TEMPLATE');
    }
  });

  it('emits a v2 template per bound platform', async () => {
    const workspace = path.join(tmp, 'workspace');
    await compilePlatformFixture({
      fixtureRoot: path.join(fixtures, 'vue'),
      workspace,
      platform: 'vue',
    });
    const files = await runBindingsGenerate(workspace, path.join(tmp, 'out'));
    expect(files.length).toBeGreaterThan(0);
    const content = await fs.readFile(files[0], 'utf8');
    expect(content).toContain("import figma from 'figma'");
    expect(files[0]).toMatch(/\.vue\.figma\.ts$/);
  });
});
