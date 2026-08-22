import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'fs-extra';
import { createPlaywrightRenderer, playwrightRenderer } from '../../../bootstrap/platforms/angular/renderer.js';
import { BootstrapError } from '../../../bootstrap/errors.js';
import { emptyInventory } from '../../../bootstrap/workspace.js';

describe('Playwright renderer', () => {
  it('fails with MISSING_RUNTIME_PROVIDER when Playwright cannot load', async () => {
    await expect(playwrightRenderer.capture({
      sourceRoot: os.tmpdir(),
      repository: 'r',
      revision: 'sha',
      packageName: 'kit',
      workspaceRoot: os.tmpdir(),
    }, emptyInventory({ repository: 'r', revision: 'sha' }))).rejects.toMatchObject({
      code: 'MISSING_RUNTIME_PROVIDER',
    });
  });

  it('stores ariaSnapshot text when Playwright is supplied', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'specs-pw-'));
    await fs.outputJson(path.join(tmp, 'harness', 'playwright.json'), {
      pages: [{ url: 'https://example.invalid/button', name: 'primary', componentId: 'angular:kit:button' }],
    });
    const renderer = createPlaywrightRenderer(async () => ({
      chromium: {
        launch: async () => ({
          newPage: async () => ({
            goto: async () => undefined,
            locator: () => ({
              ariaSnapshot: async () => '- button "Save"',
            }),
          }),
          close: async () => undefined,
        }),
      },
    }));
    const result = await renderer.capture({
      sourceRoot: tmp,
      repository: 'r',
      revision: 'sha',
      packageName: 'kit',
      workspaceRoot: tmp,
      harness: path.join(tmp, 'harness'),
    }, emptyInventory({ repository: 'r', revision: 'sha' }));
    expect(result.inventory.renderCases[0].provenance.normalizedValue).toEqual({ accessibility: '- button "Save"' });
    await fs.remove(tmp);
  });

  it('BootstrapError is the thrown type when missing', async () => {
    const renderer = createPlaywrightRenderer(async () => {
      throw new Error('not installed');
    });
    await expect(renderer.capture({
      sourceRoot: os.tmpdir(),
      repository: 'r',
      revision: 'sha',
      packageName: 'kit',
      workspaceRoot: os.tmpdir(),
    }, emptyInventory({ repository: 'r', revision: 'sha' }))).rejects.toBeInstanceOf(BootstrapError);
  });
});
