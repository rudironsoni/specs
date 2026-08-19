import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@rudironsoni/specs-schema';
import { Component, Components } from '../src/index.js';

describe('effects and gradients', () => {
  it('emits drop shadows and linear gradients', async () => {
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
            id: '12:1',
            name: 'Card',
            type: 'COMPONENT',
            fills: [{
              type: 'GRADIENT_LINEAR',
              gradientHandlePositions: [
                { x: 0.5, y: 0 },
                { x: 0.5, y: 1 },
                { x: 1, y: 0 },
              ],
              gradientStops: [
                { position: 0, color: { r: 1, g: 0, b: 0, a: 1 } },
                { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
              ],
            }],
            effects: [{
              type: 'DROP_SHADOW',
              visible: true,
              radius: 8,
              spread: 0,
              offset: { x: 0, y: 4 },
              color: { r: 0, g: 0, b: 0, a: 0.25 },
            }],
          }],
        }],
      },
      components: { '12:1': { id: '12:1', name: 'Card', type: 'COMPONENT', key: 'card' } },
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
    const styles = result.component.default.elements?.root?.styles;
    expect(styles?.backgroundColor).toMatchObject({
      type: 'LINEAR',
      stops: [
        { position: 0, color: '#FF0000' },
        { position: 1, color: '#0000FF' },
      ],
    });
    expect(styles?.effects?.shadows?.[0]).toMatchObject({
      visible: true,
      offsetY: 4,
      blur: 8,
      color: '#000000',
    });
  });
});

describe('instance propConfigurations', () => {
  it('copies scalar instance props onto the instance element', async () => {
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
            id: '13:1',
            name: 'Tile',
            type: 'COMPONENT',
            children: [{
              id: '13:2',
              name: 'icon',
              type: 'INSTANCE',
              componentId: '14:1',
              componentProperties: {
                'Size#0:1': { type: 'VARIANT', value: 'S' },
              },
            }],
          }, {
            id: '14:1',
            name: 'Glyph',
            type: 'COMPONENT',
          }],
        }],
      },
      components: {
        '13:1': { id: '13:1', name: 'Tile', type: 'COMPONENT', key: 'tile' },
        '14:1': { id: '14:1', name: 'Glyph', type: 'COMPONENT', key: 'glyph' },
      },
    };

    const [result] = await Components.fromRestApi(
      ['Tile'],
      file,
      DEFAULT_CONFIG,
      { styles: new Map(), variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.icon?.instanceOf).toBe('Glyph');
    expect(result.component.default.elements?.icon?.propConfigurations).toEqual({ Size: 'S' });
  });
});

describe('boolean code-only props', () => {
  it('extracts a BOOLEAN from a visible binding inside the code-only container', async () => {
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
            id: '15:1',
            name: 'Field',
            type: 'COMPONENT',
            children: [{
              id: '15:2',
              name: 'Code only props',
              type: 'FRAME',
              children: [{
                id: '15:3',
                name: 'flag',
                type: 'FRAME',
                visible: false,
                componentPropertyReferences: { visible: 'Disabled#1:2' },
              }],
            }],
          }],
        }],
      },
      components: { '15:1': { id: '15:1', name: 'Field', type: 'COMPONENT', key: 'field' } },
    };

    const [result] = await Components.fromRestApi(
      ['Field'],
      file,
      { ...DEFAULT_CONFIG, processing: { ...DEFAULT_CONFIG.processing, codeOnlyPropsPattern: 'Code only props' } },
      { styles: new Map(), variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.props?.Disabled).toMatchObject({ type: 'boolean', default: false });
  });
});

describe('fromPlugin', () => {
  it('snapshots a live plugin-shaped node and emits anatomy', async () => {
    const pluginNode = {
      id: '16:1',
      name: 'Chip',
      type: 'COMPONENT',
      layoutMode: 'HORIZONTAL',
      itemSpacing: 4,
      children: [{
        id: '16:2',
        name: 'label',
        type: 'TEXT',
        characters: 'Hi',
        fontSize: 12,
        fontName: { family: 'Inter', style: 'Regular' },
      }],
    };

    const spec = await Component.fromPlugin(pluginNode, DEFAULT_CONFIG, { author: 'plugin' });
    const json = spec.json();
    expect(json.title).toBe('Chip');
    expect(json.anatomy.label.type).toBe('text');
    expect(json.default.elements?.label?.content).toBe('Hi');
    expect(json.metadata?.author).toBe('plugin');
    expect(json.metadata?.generator).toBeTruthy();
  });
});
