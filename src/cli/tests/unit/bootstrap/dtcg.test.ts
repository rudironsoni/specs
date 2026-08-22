import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compilePlatformFixture } from '../../helpers/bootstrap.js';
import { nestDtcgTokens, DTCG_SCHEMA } from '../../../bootstrap/platforms/dtcg.js';

const fixtureRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../fixtures/bootstrap/react');

describe('DTCG tokens', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'specs-dtcg-'));
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('nests dotted identities under $schema', () => {
    const tree = nestDtcgTokens({
      'color.brand.primary': { $type: 'color', $value: '#1a73e8', $description: 'brand' },
    });
    expect(tree.$schema).toBe(DTCG_SCHEMA);
    expect((tree as { color: { brand: { primary: { $value: string } } } }).color.brand.primary.$value).toBe('#1a73e8');
  });

  it('compile writes nested DTCG JSON', async () => {
    const workspace = path.join(tmp, 'workspace');
    const { compiled, paths } = await compilePlatformFixture({ fixtureRoot, workspace, platform: 'react' });
    expect(Object.keys(compiled.tokens).length).toBeGreaterThan(0);
    const file = await fs.readJson(path.join(paths.tokens, 'color.json')) as {
      $schema: string;
      color: { brand: { primary: { $type: string; $value: string } } };
    };
    expect(file.$schema).toBe(DTCG_SCHEMA);
    expect(file.color.brand.primary.$type).toBe('color');
    expect(file.color.brand.primary.$value).toBeTruthy();
  });
});
