import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ResolvedConfig } from '@rudironsoni/specs-schema';
import { Components } from '../index.js';

const foundations = {
  styles: new Map(),
  variables: new Map(),
  collections: new Map(),
};

describe('image component and source props', () => {
  it('does not emit backgroundImage when only sourceProps are enabled', async () => {
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
      processing: { ...DEFAULT_CONFIG.processing, images: { backgroundImage: false, sourceProps: [] } },
    };
    const [result] = await Components.fromRestApi(['Hero'], file, config, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.root?.styles?.backgroundImage).toBeUndefined();
    expect(result.component.images).toBeUndefined();
  });

  it('retypes sourceProps and binds a designated image instance', async () => {
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
              name: 'Avatar',
              type: 'COMPONENT',
              children: [
                {
                  id: '1:2',
                  name: 'photo',
                  type: 'INSTANCE',
                  componentId: '9:1',
                  fills: [{ type: 'IMAGE', imageRef: 'face99', scaleMode: 'FILL' }],
                },
                {
                  id: '1:9',
                  name: 'Code only props',
                  type: 'FRAME',
                  children: [{ id: '1:10', name: 'image', type: 'TEXT', characters: '' }],
                },
              ],
            },
            {
              id: '9:1',
              name: 'dsImage',
              type: 'COMPONENT',
              fills: [{ type: 'IMAGE', imageRef: 'face99', scaleMode: 'FILL' }],
            },
          ],
        }],
      },
      components: {
        '1:1': { id: '1:1', name: 'Avatar', type: 'COMPONENT', key: 'av' },
        '9:1': { id: '9:1', name: 'dsImage', type: 'COMPONENT', key: 'img' },
      },
    };
    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      processing: {
        ...DEFAULT_CONFIG.processing,
        codeOnlyPropsPattern: 'Code only props',
        images: { backgroundImage: false, imageComponent: 'dsImage', sourceProps: ['image'] },
      },
    };
    const [result] = await Components.fromRestApi(['Avatar'], file, config, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.props?.image).toMatchObject({ type: 'image', default: null, nullable: true });
    expect(result.component.default.elements?.photo?.styles?.backgroundImage).toBeUndefined();
    expect(result.component.default.elements?.photo?.propConfigurations?.image).toEqual({
      $binding: '#/props/image',
      examples: [{ $image: '#/images/face99' }],
    });
    expect(result.component.images?.face99?.src).toBe('figma:face99');
  });
});

describe('parent-children layout', () => {
  it('emits children name lists and omits the layout tree', async () => {
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
            children: [
              { id: '1:2', name: 'icon', type: 'VECTOR' },
              { id: '1:3', name: 'label', type: 'TEXT', characters: 'Save' },
            ],
          }],
        }],
      },
      components: { '1:1': { id: '1:1', name: 'Button', type: 'COMPONENT', key: 'btn' } },
    };
    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      format: { ...DEFAULT_CONFIG.format, layout: 'PARENT_CHILDREN' },
    };
    const [result] = await Components.fromRestApi(['Button'], file, config, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.layout).toBeUndefined();
    expect(result.component.default.elements?.root?.children).toEqual(['icon', 'label']);
  });
});

describe('processing.states', () => {
  it('omits a browser-driven variant prop from the contract', async () => {
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
              'State#0:0': { type: 'VARIANT', defaultValue: 'Default', variantOptions: ['Default', 'Hover'] },
              'Size#0:1': { type: 'VARIANT', defaultValue: 'M', variantOptions: ['S', 'M'] },
            },
            children: [
              {
                id: '2:2',
                name: 'State=Default, Size=M',
                type: 'COMPONENT',
                children: [{ id: '2:5', name: 'label', type: 'TEXT', characters: 'M' }],
              },
              {
                id: '2:3',
                name: 'State=Hover, Size=M',
                type: 'COMPONENT',
                children: [{ id: '2:6', name: 'label', type: 'TEXT', characters: 'M' }],
              },
              {
                id: '2:4',
                name: 'State=Default, Size=S',
                type: 'COMPONENT',
                children: [{ id: '2:7', name: 'label', type: 'TEXT', characters: 'S' }],
              },
            ],
          }],
        }],
      },
      componentSets: { '2:1': { id: '2:1', name: 'Chip', type: 'COMPONENT_SET', key: 'chip' } },
      components: {
        '2:2': { id: '2:2', name: 'State=Default, Size=M', type: 'COMPONENT', key: 'dm' },
        '2:3': { id: '2:3', name: 'State=Hover, Size=M', type: 'COMPONENT', key: 'hm' },
        '2:4': { id: '2:4', name: 'State=Default, Size=S', type: 'COMPONENT', key: 'ds' },
      },
    };
    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      processing: {
        ...DEFAULT_CONFIG.processing,
        states: {
          hover: { prop: 'State', value: 'Hover', contract: 'omit' },
        },
      },
    };
    const [result] = await Components.fromRestApi(['Chip'], file, config, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.props?.State).toBeUndefined();
    expect(result.component.props?.Size).toMatchObject({ type: 'string', enum: ['S', 'M'] });
    expect(result.component.variants?.some((variant) => variant.configuration?.State === 'Hover')).toBe(true);
  });
});
