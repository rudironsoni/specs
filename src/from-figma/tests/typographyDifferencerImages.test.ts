import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ResolvedConfig } from '@rudironsoni/specs-schema';
import {
  Components,
  resolveComponentImages,
} from '../index.js';

const foundations = {
  styles: new Map(),
  variables: new Map(),
  collections: new Map(),
};

describe('typography processor', () => {
  it('emits typography fields and binds a fontSize variable', async () => {
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
            name: 'Label',
            type: 'COMPONENT',
            children: [{
              id: '1:2',
              name: 'text',
              type: 'TEXT',
              characters: 'Hi',
              style: { fontSize: 16, fontFamily: 'Inter', textCase: 'ORIGINAL', textDecoration: 'NONE' },
              boundVariables: {
                fontSize: { type: 'VARIABLE_ALIAS', id: 'VariableID:9:9' },
              },
            }],
          }],
        }],
      },
      components: { '1:1': { id: '1:1', name: 'Label', type: 'COMPONENT', key: 'l' } },
    };

    const variables = new Map([
      ['VariableID:9:9', {
        id: 'VariableID:9:9',
        name: 'font/size',
        key: 'k',
        variableCollectionId: 'col1',
        resolvedType: 'FLOAT' as const,
        valuesByMode: { default: 16 },
        remote: false,
      }],
    ]);

    const [result] = await Components.fromRestApi(
      ['Label'],
      file,
      DEFAULT_CONFIG,
      { styles: new Map(), variables, collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    const typography = result.component.default.elements?.text?.styles?.typography as Record<string, unknown>;
    expect(typography?.fontFamily).toBe('Inter');
    expect(typography?.fontSize).toMatchObject({ $token: 'font/size' });
  });
});

describe('differencer', () => {
  it('hoists an element that exists only on a later variant onto default', async () => {
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
            id: '2:1',
            name: 'Chip',
            type: 'COMPONENT_SET',
            componentPropertyDefinitions: {
              'Size#0:0': { type: 'VARIANT', defaultValue: 'S', variantOptions: ['S', 'M'] },
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
          }],
        }],
      },
      componentSets: { '2:1': { id: '2:1', name: 'Chip', type: 'COMPONENT_SET', key: 'chip' } },
      components: {
        '2:2': { id: '2:2', name: 'Size=S', type: 'COMPONENT', key: 's' },
        '2:3': { id: '2:3', name: 'Size=M', type: 'COMPONENT', key: 'm' },
      },
    };

    const [result] = await Components.fromRestApi(['Chip'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.dot).toBeDefined();
  });
});

describe('glyph factory', () => {
  it('sets glyph content from the name pattern', async () => {
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
            name: 'Button',
            type: 'COMPONENT',
            children: [{ id: '1:2', name: 'icon-check', type: 'VECTOR' }],
          }],
        }],
      },
      components: { '1:1': { id: '1:1', name: 'Button', type: 'COMPONENT', key: 'btn' } },
    };
    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      processing: { ...DEFAULT_CONFIG.processing, glyphNamePattern: 'icon-' },
    };
    const [result] = await Components.fromRestApi(['Button'], file, config, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.['icon-check']?.content).toBe('check');
  });
});

describe('get-images', () => {
  it('replaces figma: placeholders with emitted file paths', async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const written: string[] = [];
    const component = await resolveComponentImages(
      {
        title: 'Hero',
        anatomy: { root: { type: 'container' } },
        default: {},
        images: {
          abcd1234: {
            src: 'figma:abcd1234',
            $extensions: { 'com.figma': { imageHash: 'abcd1234' } },
          },
        },
      },
      {
        fileKey: 'FILE',
        token: 'TOKEN',
        outDir: '/tmp/out',
        deps: {
          fetch: async (input) => {
            const url = String(input);
            if (url.includes('/images') && url.includes('FILE')) {
              return new Response(JSON.stringify({ images: { abcd1234: 'https://cdn.example/img' } }), {
                status: 200,
                headers: { 'content-type': 'application/json' },
              });
            }
            return new Response(png, { status: 200, headers: { 'content-type': 'image/png' } });
          },
          mkdir: async () => {},
          writeFile: async (path) => { written.push(path); },
        },
      },
    );
    expect(component.images?.abcd1234?.src).toBe('_images/abcd1234.png');
    expect(written).toEqual(['/tmp/out/_images/abcd1234.png']);
  });
});
