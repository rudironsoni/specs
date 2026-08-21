import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ResolvedConfig } from '@rudironsoni/specs-schema';
import { Components } from '../index.js';

const foundations = {
  styles: new Map(),
  variables: new Map(),
  collections: new Map(),
};

function canvas(children: unknown[]) {
  return {
    name: 'Library',
    document: {
      id: '0:0',
      name: 'Document',
      type: 'DOCUMENT',
      children: [{
        id: '0:1',
        name: 'Page 1',
        type: 'CANVAS',
        children,
      }],
    },
  };
}

describe('BOOLEAN + content pairings', () => {
  it('merges visible + characters into a Conditional and content $binding', async () => {
    const file = {
      ...canvas([{
        id: '1:1',
        name: 'Button',
        type: 'COMPONENT',
        componentPropertyDefinitions: {
          'showLabel#0:1': { type: 'BOOLEAN', defaultValue: true },
          'label#0:2': { type: 'TEXT', defaultValue: 'Save' },
        },
        children: [{
          id: '1:2',
          name: 'label',
          type: 'TEXT',
          characters: 'Save',
          componentPropertyReferences: {
            visible: 'showLabel#0:1',
            characters: 'label#0:2',
          },
        }],
      }]),
      components: { '1:1': { id: '1:1', name: 'Button', type: 'COMPONENT', key: 'btn' } },
    };

    const [result] = await Components.fromRestApi(['Button'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');

    expect(result.component.props?.showLabel).toBeUndefined();
    expect(result.component.props?.label).toMatchObject({
      type: 'string',
      default: 'Save',
      nullable: true,
    });
    expect(result.component.default.elements?.label?.content).toEqual({ $binding: '#/props/label' });
    expect(result.component.default.elements?.label?.styles?.visible).toEqual({
      if: {
        condition: {
          operation: 'isNotNull',
          args: { value: { $binding: '#/props/label' } },
        },
        then: true,
        else: false,
      },
    });
  });

  it('nulls the content default when the paired boolean defaults to false', async () => {
    const file = {
      ...canvas([{
        id: '1:1',
        name: 'Button',
        type: 'COMPONENT',
        componentPropertyDefinitions: {
          'showLabel#0:1': { type: 'BOOLEAN', defaultValue: false },
          'label#0:2': { type: 'TEXT', defaultValue: 'Save' },
        },
        children: [{
          id: '1:2',
          name: 'label',
          type: 'TEXT',
          characters: 'Save',
          componentPropertyReferences: {
            visible: 'showLabel#0:1',
            characters: 'label#0:2',
          },
        }],
      }]),
      components: { '1:1': { id: '1:1', name: 'Button', type: 'COMPONENT', key: 'btn' } },
    };

    const [result] = await Components.fromRestApi(['Button'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.props?.label).toMatchObject({ default: null, nullable: true });
  });

  it('merges visible + mainComponent into instanceOf $binding', async () => {
    const file = {
      ...canvas([
        {
          id: '1:1',
          name: 'Button',
          type: 'COMPONENT',
          componentPropertyDefinitions: {
            'showIcon#0:1': { type: 'BOOLEAN', defaultValue: true },
            'icon#0:2': { type: 'INSTANCE_SWAP', defaultValue: '9:1' },
          },
          children: [{
            id: '1:2',
            name: 'icon',
            type: 'INSTANCE',
            componentId: '9:1',
            componentPropertyReferences: {
              visible: 'showIcon#0:1',
              mainComponent: 'icon#0:2',
            },
          }],
        },
        { id: '9:1', name: 'Star', type: 'COMPONENT', children: [] },
      ]),
      components: {
        '1:1': { id: '1:1', name: 'Button', type: 'COMPONENT', key: 'btn' },
        '9:1': { id: '9:1', name: 'Star', type: 'COMPONENT', key: 'star' },
      },
    };

    const [result] = await Components.fromRestApi(['Button'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.props?.showIcon).toBeUndefined();
    expect(result.component.props?.icon).toMatchObject({ type: 'string', nullable: true });
    expect(result.component.default.elements?.icon?.instanceOf).toEqual({ $binding: '#/props/icon' });
    expect(result.component.default.elements?.icon?.styles?.visible).toMatchObject({
      if: { condition: { operation: 'isNotNull' } },
    });
  });

  it('keeps an unpaired visible BOOLEAN as a visible $binding', async () => {
    const file = {
      ...canvas([{
        id: '1:1',
        name: 'Button',
        type: 'COMPONENT',
        componentPropertyDefinitions: {
          'showLabel#0:1': { type: 'BOOLEAN', defaultValue: true },
        },
        children: [{
          id: '1:2',
          name: 'label',
          type: 'TEXT',
          characters: 'Save',
          componentPropertyReferences: { visible: 'showLabel#0:1' },
        }],
      }]),
      components: { '1:1': { id: '1:1', name: 'Button', type: 'COMPONENT', key: 'btn' } },
    };

    const [result] = await Components.fromRestApi(['Button'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.props?.showLabel).toMatchObject({ type: 'boolean', default: true });
    expect(result.component.default.elements?.label?.content).toBe('Save');
    expect(result.component.default.elements?.label?.styles?.visible).toEqual({ $binding: '#/props/showLabel' });
  });

  it('rejects a pair when a variant has the content binding without visible', async () => {
    const file = {
      ...canvas([{
        id: '2:1',
        name: 'Chip',
        type: 'COMPONENT_SET',
        componentPropertyDefinitions: {
          'Size#0:0': { type: 'VARIANT', defaultValue: 'M', variantOptions: ['S', 'M'] },
          'showLabel#0:1': { type: 'BOOLEAN', defaultValue: true },
          'label#0:2': { type: 'TEXT', defaultValue: 'M' },
        },
        children: [
          {
            id: '2:2',
            name: 'Size=S',
            type: 'COMPONENT',
            children: [{
              id: '2:4',
              name: 'label',
              type: 'TEXT',
              characters: 'S',
              componentPropertyReferences: { characters: 'label#0:2' },
            }],
          },
          {
            id: '2:3',
            name: 'Size=M',
            type: 'COMPONENT',
            children: [{
              id: '2:5',
              name: 'label',
              type: 'TEXT',
              characters: 'M',
              componentPropertyReferences: {
                visible: 'showLabel#0:1',
                characters: 'label#0:2',
              },
            }],
          },
        ],
      }]),
      componentSets: { '2:1': { id: '2:1', name: 'Chip', type: 'COMPONENT_SET', key: 'chip' } },
      components: {
        '2:2': { id: '2:2', name: 'Size=S', type: 'COMPONENT', key: 's' },
        '2:3': { id: '2:3', name: 'Size=M', type: 'COMPONENT', key: 'm' },
      },
    };

    const [result] = await Components.fromRestApi(['Chip'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.props?.showLabel).toMatchObject({ type: 'boolean' });
    expect(result.component.props?.label).not.toMatchObject({ nullable: true });
    expect(result.component.default.elements?.label?.styles?.visible).toEqual({ $binding: '#/props/showLabel' });
  });
});

describe('invalid variant combinations', () => {
  it('emits missing cartesian combinations', async () => {
    const file = {
      ...canvas([{
        id: '2:1',
        name: 'Chip',
        type: 'COMPONENT_SET',
        componentPropertyDefinitions: {
          'Size#0:0': { type: 'VARIANT', defaultValue: 'M', variantOptions: ['S', 'M'] },
          'Tone#0:1': { type: 'VARIANT', defaultValue: 'Light', variantOptions: ['Light', 'Dark'] },
        },
        children: [
          {
            id: '2:2',
            name: 'Size=M, Tone=Light',
            type: 'COMPONENT',
            children: [{ id: '2:5', name: 'label', type: 'TEXT', characters: 'M Light' }],
          },
          {
            id: '2:3',
            name: 'Size=S, Tone=Light',
            type: 'COMPONENT',
            children: [{ id: '2:6', name: 'label', type: 'TEXT', characters: 'S Light' }],
          },
          {
            id: '2:4',
            name: 'Size=M, Tone=Dark',
            type: 'COMPONENT',
            children: [{ id: '2:7', name: 'label', type: 'TEXT', characters: 'M Dark' }],
          },
        ],
      }]),
      componentSets: { '2:1': { id: '2:1', name: 'Chip', type: 'COMPONENT_SET', key: 'chip' } },
      components: {
        '2:2': { id: '2:2', name: 'Size=M, Tone=Light', type: 'COMPONENT', key: 'ml' },
        '2:3': { id: '2:3', name: 'Size=S, Tone=Light', type: 'COMPONENT', key: 'sl' },
        '2:4': { id: '2:4', name: 'Size=M, Tone=Dark', type: 'COMPONENT', key: 'md' },
      },
    };

    const [result] = await Components.fromRestApi(['Chip'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.invalidVariantCombinations).toEqual([{ Size: 'S', Tone: 'Dark' }]);
    expect(result.component.variants?.some((variant) => variant.invalid)).toBeFalsy();
  });

  it('omits invalidVariantCombinations when include.invalidCombinations is false', async () => {
    const file = {
      ...canvas([{
        id: '2:1',
        name: 'Chip',
        type: 'COMPONENT_SET',
        componentPropertyDefinitions: {
          'Size#0:0': { type: 'VARIANT', defaultValue: 'M', variantOptions: ['S', 'M'] },
          'Tone#0:1': { type: 'VARIANT', defaultValue: 'Light', variantOptions: ['Light', 'Dark'] },
        },
        children: [
          {
            id: '2:2',
            name: 'Size=M, Tone=Light',
            type: 'COMPONENT',
            children: [{ id: '2:5', name: 'label', type: 'TEXT', characters: 'M' }],
          },
        ],
      }]),
      componentSets: { '2:1': { id: '2:1', name: 'Chip', type: 'COMPONENT_SET', key: 'chip' } },
      components: {
        '2:2': { id: '2:2', name: 'Size=M, Tone=Light', type: 'COMPONENT', key: 'ml' },
      },
    };

    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      include: { ...DEFAULT_CONFIG.include, invalidCombinations: false },
    };
    const [result] = await Components.fromRestApi(['Chip'], file, config, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.invalidVariantCombinations).toBeUndefined();
  });
});

describe('glyph fillColor', () => {
  it('uses GLYPH style keys when the name matches glyphNamePattern', async () => {
    const file = {
      ...canvas([{
        id: '1:1',
        name: 'Button',
        type: 'COMPONENT',
        children: [{
          id: '1:2',
          name: 'icon-check',
          type: 'VECTOR',
          fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } }],
        }],
      }]),
      components: { '1:1': { id: '1:1', name: 'Button', type: 'COMPONENT', key: 'btn' } },
    };

    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      processing: { ...DEFAULT_CONFIG.processing, glyphNamePattern: 'icon-' },
    };
    const [result] = await Components.fromRestApi(['Button'], file, config, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.anatomy['icon-check']?.type).toBe('glyph');
    expect(result.component.default.elements?.['icon-check']?.styles?.fillColor).toBe('#FF0000');
    expect(result.component.default.elements?.['icon-check']?.styles?.backgroundColor).toBeUndefined();
  });
});
