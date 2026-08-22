import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compilePlatformFixture } from '../helpers/bootstrap.js';
import { runBindingsGenerate } from '../../bootstrap/bindings/index.js';
import { runMigrateApply } from '../../bootstrap/migrate/index.js';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/bootstrap');

const PACKS = [
  { platform: 'react', binding: 'react', minComponents: 3 },
  { platform: 'vue', binding: 'vue', minComponents: 3 },
  { platform: 'swiftui', binding: 'ios', minComponents: 2 },
  { platform: 'compose', binding: 'android', minComponents: 3 },
] as const;

describe('remaining platform packs', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'specs-pack-'));
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  for (const pack of PACKS) {
    it(`scans, compiles, binds, and applies ${pack.platform}`, async () => {
      const fixtureRoot = path.join(fixtures, pack.platform);
      const workspace = path.join(tmp, pack.platform, 'workspace');
      const { inventory, compiled } = await compilePlatformFixture({
        fixtureRoot,
        workspace,
        platform: pack.platform,
      });
      expect(inventory.components.length).toBeGreaterThanOrEqual(pack.minComponents);
      expect(compiled.components['component:button']).toBeTruthy();
      expect(compiled.bindings.bindings.some((b) => b.implementations[pack.binding])).toBe(true);
      expect(compiled.bindings.bindings.some((b) => b.implementations.angular)).toBe(false);

      const connect = await runBindingsGenerate(workspace, path.join(tmp, pack.platform, 'code-connect'));
      expect(connect.some((file) => file.endsWith('.figma.ts'))).toBe(true);
      const template = await fs.readFile(connect[0], 'utf8');
      expect(template).toContain("import figma from 'figma'");
      expect(template).toContain('figma.selectedInstance');

      const copy = path.join(tmp, pack.platform, 'src-copy');
      await fs.copy(fixtureRoot, copy);
      const applied = await runMigrateApply(workspace, copy, { dryRun: false, platform: pack.platform });
      expect(applied.plan.files.length).toBeGreaterThan(0);
      expect(applied.written).toBeGreaterThan(0);
      const second = await runMigrateApply(workspace, copy, { dryRun: false, platform: pack.platform });
      expect(second.written ?? 0).toBe(0);
      expect(second.noop).toBe(true);
    });
  }
});
