import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@rudironsoni/specs-schema';
import { Components } from '../index.js';

const button = {
  name: 'Library',
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
        layoutMode: 'HORIZONTAL',
        itemSpacing: 8,
        paddingLeft: 12,
        paddingRight: 12,
        paddingTop: 8,
        paddingBottom: 8,
        fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
        children: [
          { id: '1:2', name: 'icon', type: 'VECTOR' },
          {
            id: '1:3',
            name: 'label',
            type: 'TEXT',
            characters: 'Save',
            style: { fontSize: 14, fontFamily: 'Inter', fontStyle: 'Medium' },
          },
        ],
      }],
    }],
  },
  components: { '1:1': { id: '1:1', name: 'Button', type: 'COMPONENT', key: 'btn' } },
};

const chip = {
  name: 'Library',
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
          'Size#0:0': { type: 'VARIANT', defaultValue: 'M', variantOptions: ['S', 'M'] },
        },
        children: [
          {
            id: '2:2',
            name: 'Size=S',
            type: 'COMPONENT',
            layoutMode: 'HORIZONTAL',
            paddingLeft: 4,
            paddingRight: 4,
            paddingTop: 2,
            paddingBottom: 2,
            children: [{ id: '2:4', name: 'label', type: 'TEXT', characters: 'S' }],
          },
          {
            id: '2:3',
            name: 'Size=M',
            type: 'COMPONENT',
            layoutMode: 'HORIZONTAL',
            paddingLeft: 8,
            paddingRight: 8,
            paddingTop: 4,
            paddingBottom: 4,
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

describe('styles', () => {
  it('emits layout, padding, fill, and text styles on the default variant', async () => {
    const [result] = await Components.fromRestApi(
      ['Button'],
      button,
      DEFAULT_CONFIG,
      { styles: new Map(), variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    const root = result.component.default.elements?.root?.styles;
    expect(root?.layoutMode).toBe('HORIZONTAL');
    expect(root?.itemSpacing).toBe(8);
    expect(root?.padding).toEqual({ top: 8, end: 12, bottom: 8, start: 12 });
    expect(root?.backgroundColor).toBe('#000000');
    const label = result.component.default.elements?.label;
    expect(label?.content).toBe('Save');
    expect(label?.styles?.typography).toMatchObject({ fontSize: 14, fontFamily: 'Inter' });
  });
});

describe('variants and props', () => {
  it('emits enum props and layered variant diffs', async () => {
    const [result] = await Components.fromRestApi(
      ['Chip'],
      chip,
      DEFAULT_CONFIG,
      { styles: new Map(), variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.props?.Size).toMatchObject({
      type: 'string',
      default: 'M',
      enum: ['S', 'M'],
    });
    expect(result.component.default.elements?.root?.styles?.padding).toEqual({
      top: 4, end: 8, bottom: 4, start: 8,
    });
    expect(result.component.variants).toHaveLength(1);
    const small = result.component.variants?.[0];
    expect(small?.configuration).toEqual({ Size: 'S' });
    expect(small?.elements?.root?.styles?.padding).toEqual({
      top: 2, end: 4, bottom: 2, start: 4,
    });
    expect(small?.elements?.label?.content).toBe('S');
  });
});
