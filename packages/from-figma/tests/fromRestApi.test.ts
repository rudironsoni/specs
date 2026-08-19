import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@rudironsoni/specs-schema';
import { Components } from '../src/index.js';

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
            id: '1:1',
            name: 'Button',
            type: 'COMPONENT',
            layoutMode: 'HORIZONTAL',
            itemSpacing: 8,
            children: [
              { id: '1:2', name: 'icon', type: 'VECTOR' },
              { id: '1:3', name: 'label', type: 'TEXT', characters: 'Save' },
            ],
          },
        ],
      },
    ],
  },
  components: {
    '1:1': { id: '1:1', name: 'Button', type: 'COMPONENT', key: 'btn' },
  },
};

describe('Components.fromRestApi', () => {
  it('emits anatomy and layout for a simple component', async () => {
    const events: string[] = [];
    const results = await Components.fromRestApi(
      ['Button'],
      file,
      DEFAULT_CONFIG,
      {
        styles: new Map(),
        variables: new Map(),
        collections: new Map(),
        author: 'test',
      },
      (event) => events.push(event.status),
    );

    expect(results).toHaveLength(1);
    expect('component' in results[0]).toBe(true);
    if (!('component' in results[0])) throw new Error('expected success');

    const spec = results[0].component;
    expect(spec.title).toBe('Button');
    expect(spec.anatomy.root.type).toBe('container');
    expect(spec.anatomy.icon.type).toBe('vector');
    expect(spec.anatomy.label.type).toBe('text');
    expect(spec.default.layout).toEqual([
      { root: ['icon', 'label'] },
    ]);
    expect(events).toEqual(['processing', 'success']);
  });

  it('returns an error entry when the component is missing', async () => {
    const results = await Components.fromRestApi(
      ['Missing'],
      file,
      DEFAULT_CONFIG,
      { styles: new Map(), variables: new Map(), collections: new Map() },
      () => {},
    );
    expect(results[0]).toMatchObject({ name: 'Missing' });
    expect('error' in results[0]).toBe(true);
  });

  it('keeps a mixed batch going after one missing id', async () => {
    const statuses: string[] = [];
    const results = await Components.fromRestApi(
      ['Button', 'Missing'],
      file,
      DEFAULT_CONFIG,
      { styles: new Map(), variables: new Map(), collections: new Map() },
      (event) => statuses.push(event.status),
    );
    expect(results).toHaveLength(2);
    expect('component' in results[0]).toBe(true);
    expect('error' in results[1]).toBe(true);
    expect(statuses).toEqual(['processing', 'success', 'processing', 'error']);
  });
});
