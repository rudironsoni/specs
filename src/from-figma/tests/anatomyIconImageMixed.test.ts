import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ResolvedConfig } from '@rudironsoni/specs-schema';
import { Component, Components } from '../index.js';

const foundations = {
  styles: new Map(),
  variables: new Map(),
  collections: new Map(),
};

describe('anatomy detectedIn', () => {
  it('adds a variant-only element with detectedIn', async () => {
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
    expect(result.component.anatomy.dot?.type).toBe('ellipse');
    expect(result.component.anatomy.dot?.detectedIn).toBe('Size=M');
    expect(result.component.anatomy.label.detectedIn).toBeUndefined();
  });
});

describe('icon fill walk', () => {
  it('reads fillColor from a child of a glyph wrapper', async () => {
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
            children: [{
              id: '1:2',
              name: 'icon-check',
              type: 'VECTOR',
              children: [{
                id: '1:3',
                name: 'path',
                type: 'VECTOR',
                fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 1, a: 1 } }],
              }],
            }],
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
    expect(result.component.default.elements?.['icon-check']?.styles?.fillColor).toBe('#0000FF');
  });
});

describe('image fill style', () => {
  it('routes a named image fill style to backgroundImage', async () => {
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
            styles: { fill: 'S:photo' },
            fills: [{ type: 'IMAGE', imageRef: 'abcd1234', scaleMode: 'FILL' }],
          }],
        }],
      },
      components: { '3:1': { id: '3:1', name: 'Hero', type: 'COMPONENT', key: 'hero' } },
    };
    const styles = new Map([['S:photo', { id: 'S:photo', name: 'Photo/Hero', type: 'FILL' as const }]]);
    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      processing: { ...DEFAULT_CONFIG.processing, images: { backgroundImage: true, sourceProps: [] } },
    };
    const [result] = await Components.fromRestApi(
      ['Hero'],
      file,
      config,
      { styles, variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.root?.styles?.backgroundColor).toBeUndefined();
    expect(result.component.default.elements?.root?.styles?.backgroundImage).toMatchObject({
      $token: 'Photo/Hero',
      $type: 'image',
    });
    expect(result.component.images).toBeUndefined();
  });
});

describe('mixed typography runs', () => {
  it('marks mixable fields as mixed when style overrides exist', async () => {
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
              style: { fontSize: 16, fontFamily: 'Inter' },
              characterStyleOverrides: [0, 1],
              styleOverrideTable: { 1: { fontSize: 20, fontFamily: 'Inter' } },
            }],
          }],
        }],
      },
      components: { '1:1': { id: '1:1', name: 'Label', type: 'COMPONENT', key: 'l' } },
    };
    const [result] = await Components.fromRestApi(['Label'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.text?.styles?.typography).toMatchObject({
      fontSize: 'mixed',
      fontFamily: 'mixed',
    });
  });
});

describe('layout BOTH', () => {
  it('emits the layout tree and parent-children lists', async () => {
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
      format: { ...DEFAULT_CONFIG.format, layout: 'BOTH' },
    };
    const [result] = await Components.fromRestApi(['Button'], file, config, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.layout).toEqual([{ root: ['icon', 'label'] }]);
    expect(result.component.default.elements?.root?.children).toEqual(['icon', 'label']);
  });
});

describe('plugin snapshot typography', () => {
  it('maps plugin-top-level font fields into typography', async () => {
    const spec = await Component.fromPlugin({
      id: '16:1',
      name: 'Chip',
      type: 'COMPONENT',
      children: [{
        id: '16:2',
        name: 'label',
        type: 'TEXT',
        characters: 'Hi',
        fontSize: 12,
        fontName: { family: 'Inter', style: 'Bold' },
        letterSpacing: 0.5,
        textCase: 'UPPER',
      }],
    }, DEFAULT_CONFIG, { author: 'plugin' });
    expect(spec.json().default.elements?.label?.styles?.typography).toMatchObject({
      fontSize: 12,
      fontFamily: 'Inter',
      fontStyle: 'Bold',
      letterSpacing: 0.5,
      textCase: 'UPPER',
    });
  });
});
