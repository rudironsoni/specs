import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@rudironsoni/specs-schema';
import { Components } from '../src/index.js';

describe('slot fills', () => {
  it('emits slotContentExamples from authored SLOT children', async () => {
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
            id: '5:1',
            name: 'Card',
            type: 'COMPONENT',
            layoutMode: 'VERTICAL',
            children: [{
              id: '5:2',
              name: 'body',
              type: 'SLOT',
              children: [{
                id: '5:3',
                name: 'title',
                type: 'TEXT',
                characters: 'Hello',
              }],
            }],
          }],
        }],
      },
      components: { '5:1': { id: '5:1', name: 'Card', type: 'COMPONENT', key: 'card' } },
    };

    const [result] = await Components.fromRestApi(
      ['Card'],
      file,
      DEFAULT_CONFIG,
      { styles: new Map(), variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.anatomy.body.type).toBe('slot');
    expect(result.component.slotContentExamples?.body?.anatomy.title.type).toBe('text');
    expect(result.component.slotContentExamples?.body?.elements?.title?.content).toBe('Hello');
  });
});
