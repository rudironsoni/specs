import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { angularStyles, extractSassColorTokens } from '../../../bootstrap/platforms/angular/styles.js';
import { emptyInventory } from '../../../bootstrap/workspace.js';

describe('angular Sass color extraction', () => {
  it('resolves palette hex and semantic aliases', () => {
    const tokens = extractSassColorTokens([
      {
        sourcePath: 'theme/src/foundations/color/_palette.scss',
        text: '$palette-danger-500: #eb0052 !default;\n$palette-danger-600: #d10047 !default;\n',
      },
      {
        sourcePath: 'theme/src/foundations/color/_semantics.scss',
        text: '$color-text-danger: $palette-danger-500;\n$color-action-background-danger: $palette-danger-500;\n',
      },
    ]);
    expect(tokens).toEqual(expect.arrayContaining([
      { name: 'palette-danger-500', hex: '#eb0052', sourcePath: 'theme/src/foundations/color/_palette.scss', kind: 'hex' },
      { name: 'color-text-danger', hex: '#eb0052', sourcePath: 'theme/src/foundations/color/_semantics.scss', kind: 'alias', ref: 'palette-danger-500' },
      { name: 'color-action-background-danger', hex: '#eb0052', sourcePath: 'theme/src/foundations/color/_semantics.scss', kind: 'alias', ref: 'palette-danger-500' },
    ]));
  });

  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'specs-sass-'));
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('records Sass names in inventory and ignores spec hex fixtures', async () => {
    await fs.outputFile(path.join(tmp, 'theme/_palette.scss'), '$palette-danger-500: #eb0052 !default;\n$color-text-danger: $palette-danger-500;\n');
    await fs.outputFile(path.join(tmp, 'button.component.ts'), "const example = '#e31b23';\n");
    await fs.outputFile(path.join(tmp, 'button.component.spec.ts'), "expect('#e31b23').toBe('#e31b23');\n");
    const contrib = await angularStyles.extract({
      sourceRoot: tmp,
      repository: 'test',
      revision: 'sha',
      packageName: 'ignite',
      workspaceRoot: tmp,
    }, emptyInventory({ repository: 'test', revision: 'sha' }));
    const names = contrib.inventory.styles.map((style) => style.propertyContext);
    expect(names).toContain('$palette-danger-500');
    expect(names).toContain('$color-text-danger');
    expect(contrib.inventory.styles.some((style) => style.authored.toLowerCase() === '#e31b23')).toBe(true);
    expect(contrib.inventory.styles.some((style) => style.provenance.sourcePath.endsWith('.spec.ts'))).toBe(false);
  });
});
