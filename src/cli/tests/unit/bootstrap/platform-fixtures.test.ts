import { describe, expect, it } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPlatformPack } from '../../../bootstrap/platforms/index.js';
import { assertCommandCapabilities } from '../../../bootstrap/platforms/capabilities.js';
import { reactCodeModel } from '../../../bootstrap/platforms/react/codeModel.js';
import { vueCodeModel } from '../../../bootstrap/platforms/vue/codeModel.js';
import { swiftCodeModel } from '../../../bootstrap/platforms/swiftui/codeModel.js';
import { composeCodeModel } from '../../../bootstrap/platforms/compose/codeModel.js';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../fixtures/bootstrap');

describe('platform observation fixtures', () => {
  it('share id, properties, events, slots, extensions', async () => {
    for (const platform of ['react', 'vue', 'swiftui', 'compose']) {
      const payload = await fs.readJson(path.join(fixtures, platform, 'button.observation.json')) as {
        id: string;
        properties: unknown[];
        events: unknown[];
        slots: unknown[];
        extensions: Record<string, unknown>;
      };
      expect(payload.id).toContain(':');
      expect(payload.properties.length).toBeGreaterThan(0);
      expect(payload.events.length).toBeGreaterThan(0);
      expect(payload.extensions).toBeTruthy();
    }
  });

  it('allows scan on remaining packs', () => {
    for (const id of ['react', 'vue', 'swiftui', 'compose'] as const) {
      expect(() => assertCommandCapabilities(getPlatformPack(id), 'scan')).not.toThrow();
    }
  });

  it('extracts components from remaining pack fixtures', async () => {
    const context = {
      repository: 'legacy-kit',
      revision: 'test-sha',
      packageName: 'legacy-kit',
      workspaceRoot: fixtures,
    };
    const react = await reactCodeModel.extract({ ...context, sourceRoot: path.join(fixtures, 'react') });
    const vue = await vueCodeModel.extract({ ...context, sourceRoot: path.join(fixtures, 'vue') });
    const swift = await swiftCodeModel.extract({ ...context, sourceRoot: path.join(fixtures, 'swiftui') });
    const compose = await composeCodeModel.extract({ ...context, sourceRoot: path.join(fixtures, 'compose') });
    expect(react.inventory.components.length).toBeGreaterThanOrEqual(2);
    expect(vue.inventory.components.length).toBeGreaterThanOrEqual(2);
    expect(swift.inventory.components.length).toBeGreaterThanOrEqual(2);
    expect(compose.inventory.components.length).toBeGreaterThanOrEqual(2);
  });
});
