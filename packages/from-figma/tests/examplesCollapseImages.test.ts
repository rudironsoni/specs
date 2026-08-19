import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ResolvedConfig } from '@rudironsoni/specs-schema';
import { Components } from '../src/index.js';

describe('instance examples', () => {
  it('collects PAGE-scope instances of the component', async () => {
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
              id: '1:1',
              name: 'Button',
              type: 'COMPONENT',
              componentPropertyDefinitions: {
                'Label#0:1': { type: 'TEXT', defaultValue: 'Save' },
              },
              children: [{ id: '1:2', name: 'label', type: 'TEXT', characters: 'Save' }],
            },
            {
              id: '9:1',
              name: 'Primary save',
              type: 'INSTANCE',
              componentId: '1:1',
              componentProperties: {
                'Label#0:1': { type: 'TEXT', value: 'Publish' },
              },
            },
          ],
        }],
      },
      components: { '1:1': { id: '1:1', name: 'Button', type: 'COMPONENT', key: 'btn' } },
    };

    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      processing: {
        ...DEFAULT_CONFIG.processing,
        instanceExamples: { scope: 'PAGE' },
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
    expect(result.component.instanceExamples?.Primary_save).toEqual({
      title: 'Primary save',
      propConfigurations: { Label: 'Publish' },
    });
  });
});

describe('wrapper collapse', () => {
  it('promotes a single text child to root when the flag is on', async () => {
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
            name: 'Heading',
            type: 'COMPONENT',
            children: [{
              id: '2:2',
              name: 'text',
              type: 'TEXT',
              characters: 'Title',
              style: { fontSize: 24, fontFamily: 'Inter' },
            }],
          }],
        }],
      },
      components: { '2:1': { id: '2:1', name: 'Heading', type: 'COMPONENT', key: 'h' } },
    };

    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      processing: { ...DEFAULT_CONFIG.processing, collapsePrimitiveWrapper: true },
    };

    const [result] = await Components.fromRestApi(
      ['Heading'],
      file,
      config,
      { styles: new Map(), variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.anatomy.root.type).toBe('text');
    expect(result.component.anatomy.root.$extensions?.['com.figma']?.originalName).toBe('text');
    expect(result.component.anatomy.text).toBeUndefined();
    expect(result.component.default.elements?.root?.content).toBe('Title');
    expect(result.component.default.layout).toEqual(['root']);
  });
});

describe('image fills', () => {
  it('registers an image fill and points backgroundImage at it', async () => {
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
            id: '3:1',
            name: 'Hero',
            type: 'COMPONENT',
            fills: [{ type: 'IMAGE', imageRef: 'abcd1234', scaleMode: 'FIT' }],
          }],
        }],
      },
      components: { '3:1': { id: '3:1', name: 'Hero', type: 'COMPONENT', key: 'hero' } },
    };

    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      processing: {
        ...DEFAULT_CONFIG.processing,
        images: { backgroundImage: true, sourceProps: [] },
      },
    };

    const [result] = await Components.fromRestApi(
      ['Hero'],
      file,
      config,
      { styles: new Map(), variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.root?.styles?.backgroundImage).toEqual({
      $image: '#/images/abcd1234',
      objectFit: 'CONTAIN',
    });
    expect(result.component.images?.abcd1234?.src).toBe('figma:abcd1234');
    expect(result.component.images?.abcd1234?.$extensions?.['com.figma']?.imageHash).toBe('abcd1234');
  });
});

describe('code-only props and slot refs', () => {
  it('extracts code-only text props and stamps slot content refs', async () => {
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
            id: '4:1',
            name: 'Field',
            type: 'COMPONENT',
            children: [
              {
                id: '4:2',
                name: 'body',
                type: 'SLOT',
                children: [{ id: '4:3', name: 'hint', type: 'TEXT', characters: 'Help' }],
              },
              {
                id: '4:9',
                name: 'Code only props',
                type: 'FRAME',
                children: [{ id: '4:10', name: 'ariaLabel', type: 'TEXT', characters: 'Email' }],
              },
            ],
          }],
        }],
      },
      components: { '4:1': { id: '4:1', name: 'Field', type: 'COMPONENT', key: 'field' } },
    };

    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      processing: { ...DEFAULT_CONFIG.processing, codeOnlyPropsPattern: 'Code only props' },
      include: { ...DEFAULT_CONFIG.include, defaultSlotContent: true },
    };

    const [result] = await Components.fromRestApi(
      ['Field'],
      file,
      config,
      { styles: new Map(), variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.props?.ariaLabel).toMatchObject({
      type: 'string',
      default: 'Email',
    });
    expect(result.component.anatomy.ariaLabel).toBeUndefined();
    expect(result.component.default.elements?.body?.children).toEqual({
      $binding: '#/props/body',
      examples: [{ $slotContent: '#/slotContentExamples/body' }],
    });
  });
});
