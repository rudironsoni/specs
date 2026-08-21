import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@rudironsoni/specs-schema';
import { Components } from '../index.js';

const file = {
  name: 'Library',
  document: {
    id: '0:0',
    name: 'Document',
    type: 'DOCUMENT',
    children: [
      {
        id: '0:1',
        name: 'Page 1',
        type: 'CANVAS',
        children: [
          {
            id: '2:1',
            name: 'Chip',
            type: 'COMPONENT_SET',
            componentPropertyDefinitions: {
              'Size#0:0': {
                type: 'VARIANT',
                defaultValue: 'M',
                variantOptions: ['S', 'M'],
              },
            },
            children: [
              {
                id: '2:2',
                name: 'Size=S',
                type: 'COMPONENT',
                children: [{ id: '2:4', name: 'label', type: 'TEXT', characters: 'S' }],
              },
              {
                id: '2:3',
                name: 'Size=M',
                type: 'COMPONENT',
                children: [
                  { id: '2:5', name: 'label', type: 'TEXT', characters: 'M' },
                  { id: '2:6', name: 'dot', type: 'ELLIPSE' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  componentSets: {
    '2:1': { id: '2:1', name: 'Chip', type: 'COMPONENT_SET', key: 'chip' },
  },
  components: {
    '2:2': { id: '2:2', name: 'Size=S', type: 'COMPONENT', key: 's' },
    '2:3': { id: '2:3', name: 'Size=M', type: 'COMPONENT', key: 'm' },
  },
};

describe('COMPONENT_SET default variant', () => {
  it('traverses the property-definition default child', async () => {
    const results = await Components.fromRestApi(
      ['2:1'],
      file,
      DEFAULT_CONFIG,
      { styles: new Map(), variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in results[0]).toBe(true);
    if (!('component' in results[0])) throw new Error('expected success');
    const spec = results[0].component;
    expect(spec.title).toBe('Chip');
    expect(spec.anatomy.label.type).toBe('text');
    expect(spec.anatomy.dot.type).toBe('ellipse');
    expect(spec.default.layout).toEqual([{ root: ['label', 'dot'] }]);
  });
});
