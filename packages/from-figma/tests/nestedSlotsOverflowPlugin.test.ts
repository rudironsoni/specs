import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@rudironsoni/specs-schema';
import { Components, FigmaPluginFoundations, FigmaPluginNodes } from '../src/index.js';

describe('nested slot $nested paths', () => {
  it('addresses a slot two instance boundaries down from the composed fill', async () => {
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
            id: '10:1',
            name: 'Page',
            type: 'COMPONENT',
            children: [{
              id: '10:2',
              name: 'body',
              type: 'SLOT',
              children: [{
                id: '10:3',
                name: 'filterGrid',
                type: 'INSTANCE',
                componentId: '20:1',
                children: [{
                  id: '10:4',
                  name: 'filterHeader',
                  type: 'INSTANCE',
                  componentId: '21:1',
                  children: [{
                    id: '10:5',
                    name: 'row',
                    type: 'INSTANCE',
                    componentId: '22:1',
                    children: [{
                      id: '10:6',
                      name: 'children',
                      type: 'SLOT',
                      children: [{ id: '10:7', name: 'title', type: 'TEXT', characters: 'Filters' }],
                    }],
                  }],
                }],
              }],
            }],
          }],
        }],
      },
      components: {
        '10:1': { id: '10:1', name: 'Page', type: 'COMPONENT', key: 'page' },
        '20:1': { id: '20:1', name: 'FilterGrid', type: 'COMPONENT', key: 'grid' },
        '21:1': { id: '21:1', name: 'FilterHeader', type: 'COMPONENT', key: 'header' },
        '22:1': { id: '22:1', name: 'Row', type: 'COMPONENT', key: 'row' },
      },
    };

    const [result] = await Components.fromRestApi(
      ['Page'],
      file,
      DEFAULT_CONFIG,
      { styles: new Map(), variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    const body = result.component.slotContentExamples?.body;
    expect(body?.elements?.filterGrid?.instanceOf).toBe('FilterGrid');
    const nested = body?.elements?.filterGrid?.propConfigurations?.$nested;
    expect(nested).toEqual([
      {
        path: ['filterHeader', 'row'],
        children: { $slotContent: expect.stringMatching(/^#\/slotContentExamples\//) },
      },
    ]);
    const childKey = String((nested?.[0] as { children?: { $slotContent?: string } })?.children?.$slotContent ?? '').split('/').pop();
    expect(childKey).toBeTruthy();
    expect(result.component.slotContentExamples?.[childKey as string]?.elements?.title?.content).toBe('Filters');
  });
});

describe('text overflow', () => {
  it('maps Figma ENDING truncation to ELLIPSIS and keeps maxLines', async () => {
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
            id: '11:1',
            name: 'Label',
            type: 'COMPONENT',
            children: [{
              id: '11:2',
              name: 'text',
              type: 'TEXT',
              characters: 'Long label',
              style: { fontSize: 12, textTruncation: 'ENDING', maxLines: 2 },
            }],
          }],
        }],
      },
      components: { '11:1': { id: '11:1', name: 'Label', type: 'COMPONENT', key: 'label' } },
    };

    const [result] = await Components.fromRestApi(
      ['Label'],
      file,
      DEFAULT_CONFIG,
      { styles: new Map(), variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.text?.styles?.textOverflow).toBe('ELLIPSIS');
    expect(result.component.default.elements?.text?.styles?.maxLines).toBe(2);
  });
});

describe('plugin adapters', () => {
  afterEach(() => {
    delete (globalThis as { figma?: unknown }).figma;
  });

  it('looks up nodes and variables through the figma global', async () => {
    const page = {
      id: '0:1',
      name: 'Page 1',
      type: 'PAGE',
      parent: { id: '0:0', name: 'Document', type: 'DOCUMENT' },
      children: [{
        id: '8:1',
        name: 'Demo',
        type: 'INSTANCE',
        componentId: '1:1',
        parent: null as unknown,
      }],
    };
    page.children[0].parent = page;
    (globalThis as { figma: unknown }).figma = {
      getNodeByIdAsync: async (id: string) => (id === '8:1' || id === '0:1' ? (id === '8:1' ? page.children[0] : page) : null),
      variables: {
        getVariableByIdAsync: async () => ({
          id: 'VariableID:1',
          name: 'space/sm',
          key: 'k',
          variableCollectionId: 'col1',
          resolvedType: 'FLOAT',
          valuesByMode: {},
          remote: false,
        }),
        getVariableCollectionByIdAsync: async () => ({
          id: 'col1',
          name: 'DS Space',
          key: 'c',
          modes: [{ modeId: 'm', name: 'Default' }],
          defaultModeId: 'm',
          variableIds: ['VariableID:1'],
          remote: false,
        }),
      },
    };

    const nodes = new FigmaPluginNodes();
    const siblings = await nodes.getPageSiblings('8:1', ['INSTANCE']);
    expect(siblings).toHaveLength(1);
    expect(siblings[0].name).toBe('Demo');
    expect(siblings[0].mainComponentId).toBe('1:1');

    const foundations = new FigmaPluginFoundations();
    expect(await foundations.getVariableName('VariableID:1')).toBe('space/sm');
    expect(await foundations.getCollectionName('VariableID:1')).toBe('DS Space');
  });

  it('throws on FILE-scope discovery', async () => {
    (globalThis as { figma: unknown }).figma = {};
    const nodes = new FigmaPluginNodes();
    await expect(nodes.getAllPagesNodes(['INSTANCE'])).rejects.toThrow(/FILE-scope/);
  });
});
