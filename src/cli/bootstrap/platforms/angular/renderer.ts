import fs from 'fs-extra';
import path from 'node:path';
import { observationId } from '../../identity.js';
import { fileDigest, makeProvenance } from '../../provenance.js';
import { emptyInventory } from '../../workspace.js';
import type { CaptureContext, RendererAdapter, ScanContribution } from '../types.js';
import { ANGULAR_EXTRACTOR, ANGULAR_EXTRACTOR_VERSION } from './tsMeta.js';
import { BootstrapError } from '../../errors.js';

/**
 * Test harness renderer. Reads committed capture YAML/JSON next to the fixture.
 * Does not drive a browser.
 */
export const fixtureRenderer: RendererAdapter = {
  async capture(context: CaptureContext, inventory): Promise<ScanContribution> {
    const harnessDir = context.harness ?? path.join(context.sourceRoot, 'harness');
    const contrib = emptyInventory(inventory.workspace);
    if (!(await fs.pathExists(harnessDir))) {
      throw new BootstrapError(
        'MISSING_RUNTIME_PROVIDER',
        `No capture harness at ${harnessDir}`,
        { harnessDir },
      );
    }
    const files = (await fs.readdir(harnessDir)).filter((name) => name.endsWith('.json') && name !== 'playwright.json').sort();
    for (const name of files) {
      const full = path.join(harnessDir, name);
      const payload = await fs.readJson(full) as {
        componentId: string;
        name: string;
        structure: unknown;
        accessibility: string;
        computedStyles: Record<string, string>;
        environment: Record<string, unknown>;
      };
      const owner = inventory.components.find((c) => c.id === payload.componentId);
      contrib.renderCases.push({
        observationId: observationId({
          kind: 'renderCase',
          sourceIdentity: payload.componentId,
          sourceRevision: context.revision,
          sourceLocator: `harness:${name}`,
          normalizedPayload: {
            structure: payload.structure,
            accessibility: payload.accessibility,
            environment: payload.environment,
          },
          extractorVersion: ANGULAR_EXTRACTOR_VERSION,
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
          extractorName: `${ANGULAR_EXTRACTOR}-harness`,
          extractorVersion: ANGULAR_EXTRACTOR_VERSION,
          environmentFingerprint: JSON.stringify(payload.environment),
          relatedObservations: owner ? [owner.observationId] : [],
        }),
      });
    }
    contrib.sources.push({
      kind: 'runtime',
      platform: 'angular',
      extractor: `${ANGULAR_EXTRACTOR}-harness`,
      extractorVersion: ANGULAR_EXTRACTOR_VERSION,
      revision: context.revision,
      digest: context.revision,
    });
    return { inventory: contrib };
  },
};

interface PlaywrightLike {
  chromium: {
    launch: () => Promise<{
      newPage: () => Promise<{
        goto: (url: string) => Promise<unknown>;
        locator: (selector: string) => { ariaSnapshot: () => Promise<string> };
      }>;
      close: () => Promise<void>;
    }>;
  };
}

export function createPlaywrightRenderer(
  loadPlaywright: () => Promise<PlaywrightLike> = () => import('playwright') as Promise<PlaywrightLike>,
): RendererAdapter {
  return {
    async capture(context: CaptureContext, inventory): Promise<ScanContribution> {
      let playwright: PlaywrightLike;
      try {
        playwright = await loadPlaywright();
      } catch {
        throw new BootstrapError(
          'MISSING_RUNTIME_PROVIDER',
          'Playwright is not installed for this run',
        );
      }
      const harnessDir = context.harness ?? path.join(context.sourceRoot, 'harness');
      const configPath = path.join(harnessDir, 'playwright.json');
      if (!(await fs.pathExists(configPath))) {
        throw new BootstrapError(
          'MISSING_RUNTIME_PROVIDER',
          `No playwright.json at ${configPath}`,
          { configPath },
        );
      }
      const config = await fs.readJson(configPath) as {
        pages: Array<{ url: string; name: string; componentId: string }>;
      };
      const contrib = emptyInventory(inventory.workspace);
      const browser = await playwright.chromium.launch();
      try {
        for (const pageSpec of config.pages) {
          const page = await browser.newPage();
          await page.goto(pageSpec.url);
          const accessibility = await page.locator('body').ariaSnapshot();
          const owner = inventory.components.find((c) => c.id === pageSpec.componentId);
          contrib.renderCases.push({
            observationId: observationId({
              kind: 'renderCase',
              sourceIdentity: pageSpec.componentId,
              sourceRevision: context.revision,
              sourceLocator: `playwright:${pageSpec.name}`,
              normalizedPayload: { accessibility },
              extractorVersion: ANGULAR_EXTRACTOR_VERSION,
            }),
            componentId: pageSpec.componentId,
            name: pageSpec.name,
            states: [],
            provenance: makeProvenance({
              sourceRevision: context.revision,
              sourceFileDigest: fileDigest(configPath),
              locator: pageSpec.name,
              sourcePath: path.relative(context.sourceRoot, configPath),
              rawValue: { url: pageSpec.url, accessibility },
              normalizedValue: { accessibility },
              extractorName: `${ANGULAR_EXTRACTOR}-playwright`,
              extractorVersion: ANGULAR_EXTRACTOR_VERSION,
              environmentFingerprint: JSON.stringify({ url: pageSpec.url }),
              relatedObservations: owner ? [owner.observationId] : [],
            }),
          });
        }
      } finally {
        await browser.close();
      }
      contrib.sources.push({
        kind: 'runtime',
        platform: 'angular',
        extractor: `${ANGULAR_EXTRACTOR}-playwright`,
        extractorVersion: ANGULAR_EXTRACTOR_VERSION,
        revision: context.revision,
        digest: context.revision,
      });
      return { inventory: contrib };
    },
  };
}

export const playwrightRenderer = createPlaywrightRenderer();
