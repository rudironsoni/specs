import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ResolvedConfig } from '@rudironsoni/specs-schema';
import { Components } from '../index.js';

describe('published styles and aspect ratio', () => {
  it('emits a fill style token and a locked aspect ratio', async () => {
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
            id: '30:1',
            name: 'Media',
            type: 'COMPONENT',
            styles: { fill: 'S:brand' },
            fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 1 } }],
            targetAspectRatio: { x: 16, y: 9 },
          }],
        }],
      },
      components: { '30:1': { id: '30:1', name: 'Media', type: 'COMPONENT', key: 'media' } },
    };

    const styles = new Map([
      ['S:brand', { id: 'S:brand', name: 'Color/Brand', type: 'FILL' as const }],
    ]);

    const [result] = await Components.fromRestApi(
      ['Media'],
      file,
      DEFAULT_CONFIG,
      { styles, variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.root?.styles?.backgroundColor).toMatchObject({
      $token: 'Color/Brand',
      $type: 'color',
    });
    expect(result.component.default.elements?.root?.styles?.aspectRatio).toEqual({ x: 16, y: 9 });
  });
});

describe('visible binding', () => {
  it('emits $binding for a layer whose visible is bound to a BOOLEAN prop', async () => {
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
            id: '31:1',
            name: 'Button',
            type: 'COMPONENT',
            componentPropertyDefinitions: {
              'Show icon#0:1': { type: 'BOOLEAN', defaultValue: true },
            },
            children: [{
              id: '31:2',
              name: 'icon',
              type: 'VECTOR',
              visible: true,
              componentPropertyReferences: { visible: 'Show icon#0:1' },
            }],
          }],
        }],
      },
      components: { '31:1': { id: '31:1', name: 'Button', type: 'COMPONENT', key: 'btn' } },
    };

    const [result] = await Components.fromRestApi(
      ['Button'],
      file,
      DEFAULT_CONFIG,
      { styles: new Map(), variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.icon?.styles?.visible).toEqual({
      $binding: '#/props/Show icon',
    });
  });
});

describe('slot constraints', () => {
  it('promotes minItems/maxItems/anyOf onto the matching slot prop', async () => {
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
            id: '32:1',
            name: 'Stack',
            type: 'COMPONENT',
            componentPropertyDefinitions: {
              'Children#0:1': { type: 'SLOT', defaultValue: null },
            },
            children: [
              { id: '32:2', name: 'Children', type: 'SLOT' },
              {
                id: '32:3',
                name: 'Code only props',
                type: 'FRAME',
                children: [
                  { id: '32:4', name: 'Children minItems', type: 'TEXT', characters: '1' },
                  { id: '32:5', name: 'Children maxItems', type: 'TEXT', characters: '3' },
                  { id: '32:6', name: 'Children anyOf', type: 'TEXT', characters: 'Row, Card' },
                ],
              },
            ],
          }],
        }],
      },
      components: { '32:1': { id: '32:1', name: 'Stack', type: 'COMPONENT', key: 'stack' } },
    };

    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      processing: {
        ...DEFAULT_CONFIG.processing,
        codeOnlyPropsPattern: 'Code only props',
        slotConstraints: true,
      },
    };

    const [result] = await Components.fromRestApi(
      ['Stack'],
      file,
      config,
      { styles: new Map(), variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.props?.Children).toMatchObject({
      type: 'slot',
      minChildren: 1,
      maxChildren: 3,
      anyOf: ['Row', 'Card'],
    });
    expect(result.component.props?.['Children minItems']).toBeUndefined();
  });
});

describe('PAGE-scope subcomponents', () => {
  it('picks up a sibling component that matches the pattern', async () => {
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
              id: '33:1',
              name: 'Card',
              type: 'COMPONENT',
              children: [{ id: '33:2', name: 'title', type: 'TEXT', characters: 'Hi' }],
            },
            {
              id: '33:9',
              name: 'Card / _ / Meta',
              type: 'COMPONENT',
              children: [{ id: '33:10', name: 'label', type: 'TEXT', characters: 'Meta' }],
            },
          ],
        }],
      },
      components: {
        '33:1': { id: '33:1', name: 'Card', type: 'COMPONENT', key: 'card' },
        '33:9': { id: '33:9', name: 'Card / _ / Meta', type: 'COMPONENT', key: 'meta' },
      },
    };

    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      processing: {
        ...DEFAULT_CONFIG.processing,
        subcomponents: { scope: 'PAGE', match: ['{C} / _ / {S}'] },
      },
    };

    const [result] = await Components.fromRestApi(
      ['Card'],
      file,
      config,
      { styles: new Map(), variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.subcomponents?.Meta?.title).toBe('Card / _ / Meta');
    expect(result.component.subcomponents?.Meta?.anatomy.label.type).toBe('text');
  });
});
