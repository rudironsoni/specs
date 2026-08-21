import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@rudironsoni/specs-schema';
import { Component, Components } from '../index.js';

const foundations = {
  styles: new Map(),
  variables: new Map(),
  collections: new Map(),
};

describe('subcomponent element refs', () => {
  it('rewrites element instanceOf to a subcomponent $ref', async () => {
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
    const [result] = await Components.fromRestApi(
      ['Button'],
      file,
      {
        ...DEFAULT_CONFIG,
        processing: {
          ...DEFAULT_CONFIG.processing,
          subcomponents: { scope: 'NESTED', match: ['{C} / _ / {S}'] },
        },
      },
      foundations,
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.['Button / _ / Icon']?.instanceOf).toEqual({
      $ref: '#/subcomponents/Icon',
    });
  });
});

describe('BOOLEAN_OPERATION', () => {
  it('maps a boolean operation to vector anatomy', async () => {
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
            name: 'Mark',
            type: 'COMPONENT',
            children: [{ id: '1:2', name: 'union', type: 'BOOLEAN_OPERATION' }],
          }],
        }],
      },
      components: { '1:1': { id: '1:1', name: 'Mark', type: 'COMPONENT', key: 'm' } },
    };
    const [result] = await Components.fromRestApi(['Mark'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.anatomy.union.type).toBe('vector');
  });
});

describe('INSTANCE_SWAP preferredValues', () => {
  it('resolves preferred swap targets to examples', async () => {
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
                'icon#0:1': {
                  type: 'INSTANCE_SWAP',
                  defaultValue: '9:1',
                  preferredValues: [
                    { type: 'COMPONENT', key: '9:1' },
                    { type: 'COMPONENT', key: '9:2' },
                  ],
                },
              },
              children: [{ id: '1:2', name: 'icon', type: 'INSTANCE', componentId: '9:1' }],
            },
            { id: '9:1', name: 'Star', type: 'COMPONENT' },
            { id: '9:2', name: 'Heart', type: 'COMPONENT' },
          ],
        }],
      },
      components: {
        '1:1': { id: '1:1', name: 'Button', type: 'COMPONENT', key: 'btn' },
        '9:1': { id: '9:1', name: 'Star', type: 'COMPONENT', key: 'star' },
        '9:2': { id: '9:2', name: 'Heart', type: 'COMPONENT', key: 'heart' },
      },
    };
    const [result] = await Components.fromRestApi(['Button'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.props?.icon).toMatchObject({
      type: 'string',
      default: 'Star',
      examples: ['Star', 'Heart'],
    });
  });
});

describe('stroke skip', () => {
  it('omits stroke styles when the node has no strokes', async () => {
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
            name: 'Box',
            type: 'COMPONENT',
            fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
          }],
        }],
      },
      components: { '1:1': { id: '1:1', name: 'Box', type: 'COMPONENT', key: 'box' } },
    };
    const [result] = await Components.fromRestApi(['Box'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.root?.styles?.strokeWeight).toBeUndefined();
    expect(result.component.default.elements?.root?.styles?.strokes).toBeUndefined();
    expect(result.component.default.elements?.root?.styles?.strokeAlign).toBeUndefined();
  });
});

describe('plugin snapshot extras', () => {
  it('keeps locked and layout sizing from a plugin node', async () => {
    const spec = await Component.fromPlugin({
      id: '16:1',
      name: 'Chip',
      type: 'COMPONENT',
      locked: true,
      layoutMode: 'HORIZONTAL',
      layoutSizingHorizontal: 'HUG',
      layoutSizingVertical: 'FIXED',
      children: [{ id: '16:2', name: 'label', type: 'TEXT', characters: 'Hi' }],
    }, DEFAULT_CONFIG);
    const root = spec.json().default.elements?.root?.styles;
    expect(root?.locked).toBe(true);
    expect(root?.layoutSizingHorizontal).toBe('HUG');
    expect(root?.layoutSizingVertical).toBe('FIXED');
  });
});
