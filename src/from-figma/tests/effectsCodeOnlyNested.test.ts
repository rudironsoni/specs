import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@rudironsoni/specs-schema';
import { Components, PHASE_NAMES, ProgressCoordinator } from '../index.js';

const foundations = {
  styles: new Map(),
  variables: new Map(),
  collections: new Map(),
};

describe('effect and gradient variables', () => {
  it('resolves bound shadow and gradient-stop variables', async () => {
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
                {
                  position: 0,
                  color: { r: 1, g: 0, b: 0, a: 1 },
                  boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'VariableID:c1' } },
                },
                { position: 1, color: { r: 0, g: 0, b: 1, a: 1 } },
              ],
            }],
            effects: [{
              type: 'DROP_SHADOW',
              visible: true,
              radius: 8,
              spread: 0,
              offset: { x: 0, y: 4 },
              color: { r: 0, g: 0, b: 0, a: 1 },
              boundVariables: { color: { type: 'VARIABLE_ALIAS', id: 'VariableID:c2' } },
            }],
          }],
        }],
      },
      components: { '12:1': { id: '12:1', name: 'Card', type: 'COMPONENT', key: 'card' } },
    };

    const variables = new Map([
      ['VariableID:c1', {
        id: 'VariableID:c1',
        name: 'color/red',
        key: 'k1',
        variableCollectionId: 'col1',
        resolvedType: 'COLOR' as const,
        valuesByMode: { default: { r: 1, g: 0, b: 0, a: 1 } },
        remote: false,
      }],
      ['VariableID:c2', {
        id: 'VariableID:c2',
        name: 'color/shadow',
        key: 'k2',
        variableCollectionId: 'col1',
        resolvedType: 'COLOR' as const,
        valuesByMode: { default: { r: 0, g: 0, b: 0, a: 1 } },
        remote: false,
      }],
    ]);

    const [result] = await Components.fromRestApi(
      ['Card'],
      file,
      DEFAULT_CONFIG,
      { styles: new Map(), variables, collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    const styles = result.component.default.elements?.root?.styles;
    expect((styles?.backgroundColor as { stops?: Array<{ color?: { $token?: string } }> })?.stops?.[0]?.color).toMatchObject({
      $token: 'color/red',
    });
    expect(styles?.effects?.shadows?.[0]?.color).toMatchObject({ $token: 'color/shadow' });
  });
});

describe('code-only extractors', () => {
  it('names a TEXT code-only prop from its characters binding', async () => {
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
                name: 'ignored',
                type: 'TEXT',
                characters: 'Hello',
                componentPropertyReferences: { characters: 'Label#9:9' },
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
      foundations,
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.props?.Label).toMatchObject({ type: 'string', default: 'Hello' });
    expect(result.component.props?.ignored).toBeUndefined();
  });

  it('extracts an enum from a single-VARIANT instance picker', async () => {
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
              id: '15:1',
              name: 'Field',
              type: 'COMPONENT',
              children: [{
                id: '15:2',
                name: 'Code only props',
                type: 'FRAME',
                children: [{
                  id: '15:3',
                  name: 'tonePicker',
                  type: 'INSTANCE',
                  componentId: '16:1',
                }],
              }],
            },
            {
              id: '16:1',
              name: 'TonePicker',
              type: 'COMPONENT',
              componentPropertyDefinitions: {
                'Tone#0:1': { type: 'VARIANT', defaultValue: 'Light', variantOptions: ['Light', 'Dark'] },
              },
            },
          ],
        }],
      },
      components: {
        '15:1': { id: '15:1', name: 'Field', type: 'COMPONENT', key: 'field' },
        '16:1': { id: '16:1', name: 'TonePicker', type: 'COMPONENT', key: 'tone' },
      },
    };
    const [result] = await Components.fromRestApi(
      ['Field'],
      file,
      { ...DEFAULT_CONFIG, processing: { ...DEFAULT_CONFIG.processing, codeOnlyPropsPattern: 'Code only props' } },
      foundations,
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.props?.Tone).toMatchObject({
      type: 'string',
      default: 'Light',
      enum: ['Light', 'Dark'],
    });
  });
});

describe('nested instance propConfigurations', () => {
  it('emits $nested paths for descendant instance props', async () => {
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
              id: '13:1',
              name: 'Tile',
              type: 'COMPONENT',
              children: [{
                id: '13:2',
                name: 'card',
                type: 'INSTANCE',
                componentId: '14:1',
                children: [{
                  id: '13:3',
                  name: 'icon',
                  type: 'INSTANCE',
                  componentId: '15:1',
                  componentProperties: { 'Size#0:1': { type: 'VARIANT', value: 'S' } },
                }],
              }],
            },
            { id: '14:1', name: 'Card', type: 'COMPONENT' },
            { id: '15:1', name: 'Glyph', type: 'COMPONENT' },
          ],
        }],
      },
      components: {
        '13:1': { id: '13:1', name: 'Tile', type: 'COMPONENT', key: 'tile' },
        '14:1': { id: '14:1', name: 'Card', type: 'COMPONENT', key: 'card' },
        '15:1': { id: '15:1', name: 'Glyph', type: 'COMPONENT', key: 'glyph' },
      },
    };
    const [result] = await Components.fromRestApi(['Tile'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.card?.propConfigurations?.$nested).toEqual([
      { path: ['Glyph'], Size: 'S' },
    ]);
  });
});

describe('progress coordinator', () => {
  it('notifies evaluate and layer phases', async () => {
    const phases: string[] = [];
    const coordinator = new ProgressCoordinator(4, (state) => { phases.push(state.phase); });
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
            children: [{ id: '1:2', name: 'label', type: 'TEXT', characters: 'Save' }],
          }],
        }],
      },
      components: { '1:1': { id: '1:1', name: 'Button', type: 'COMPONENT', key: 'btn' } },
    };
    await Components.fromRestApi(
      ['Button'],
      file,
      DEFAULT_CONFIG,
      { ...foundations, coordinator },
      () => {},
    );
    expect(phases).toContain(PHASE_NAMES.SETUP_VARIANTS);
    expect(phases).toContain(PHASE_NAMES.EVALUATE_VARIANTS);
    expect(phases).toContain(PHASE_NAMES.LAYER_VARIANTS);
  });
});
