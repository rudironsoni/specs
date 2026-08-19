import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ResolvedConfig } from '@rudironsoni/specs-schema';
import { Components } from '../src/index.js';

describe('variable tokens', () => {
  it('emits a token reference when a variable is bound and present in foundations', async () => {
    const file = {
      document: {
        id: '0:0',
        name: 'Document',
        type: 'DOCUMENT',
        children: [{
          id: '0:1',
          name: 'Page 1',
          type: 'CANVAS',
          children: [{
            id: '1:1',
            name: 'Card',
            type: 'COMPONENT',
            layoutMode: 'VERTICAL',
            itemSpacing: 4,
            boundVariables: {
              itemSpacing: { type: 'VARIABLE_ALIAS', id: 'VariableID:1:2' },
            },
          }],
        }],
      },
      components: { '1:1': { id: '1:1', name: 'Card', type: 'COMPONENT', key: 'card' } },
    };

    const variables = new Map([
      ['VariableID:1:2', {
        id: 'VariableID:1:2',
        name: 'space/sm',
        key: 'k',
        variableCollectionId: 'col1',
        resolvedType: 'FLOAT' as const,
        valuesByMode: { default: 4 },
        remote: false,
      }],
    ]);
    const collections = new Map([
      ['col1', {
        id: 'col1',
        name: 'DS Space',
        key: 'c',
        modes: [{ modeId: 'default', name: 'Default' }],
        defaultModeId: 'default',
        variableIds: ['VariableID:1:2'],
        remote: false,
      }],
    ]);

    const [result] = await Components.fromRestApi(
      ['Card'],
      file,
      DEFAULT_CONFIG,
      { styles: new Map(), variables, collections },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.root?.styles?.itemSpacing).toMatchObject({
      $token: 'DS Space/space/sm',
      $type: 'dimension',
    });
  });
});

describe('subcomponents', () => {
  it('promotes matching instances into subcomponents and rewrites instanceOf to a $ref', async () => {
    const file = {
      document: {
        id: '0:0',
        name: 'Document',
        type: 'DOCUMENT',
        children: [{
          id: '0:1',
          name: 'Page 1',
          type: 'CANVAS',
          children: [
            {
              id: '3:1',
              name: 'Button',
              type: 'COMPONENT',
              layoutMode: 'HORIZONTAL',
              children: [{
                id: '3:2',
                name: 'Button / _ / Icon',
                type: 'INSTANCE',
                componentId: '4:1',
              }],
            },
            {
              id: '4:1',
              name: 'Icon',
              type: 'COMPONENT',
              children: [{ id: '4:2', name: 'shape', type: 'VECTOR' }],
            },
          ],
        }],
      },
      components: {
        '3:1': { id: '3:1', name: 'Button', type: 'COMPONENT', key: 'btn' },
        '4:1': { id: '4:1', name: 'Icon', type: 'COMPONENT', key: 'icon' },
      },
    };

    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      processing: {
        ...DEFAULT_CONFIG.processing,
        subcomponents: { scope: 'NESTED', match: ['{C} / _ / {S}'] },
      },
    };

    const [result] = await Components.fromRestApi(
      ['Button'],
      file,
      config,
      { styles: new Map(), variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.anatomy['Button / _ / Icon']?.instanceOf).toEqual({
      $ref: '#/subcomponents/Icon',
    });
    expect(result.component.subcomponents?.Icon?.title).toBe('Icon');
    expect(result.component.subcomponents?.Icon?.anatomy.shape?.type).toBe('vector');
  });
});
