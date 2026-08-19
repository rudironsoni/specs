import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ResolvedConfig } from '@rudironsoni/specs-schema';
import {
  Components,
  Layout,
  ProgressCoordinator,
  RestTextNode,
  buildPhaseConfiguration,
  configFromSettings,
  DEFAULT_SETTINGS,
} from '../src/index.js';

const foundations = {
  styles: new Map(),
  variables: new Map(),
  collections: new Map(),
};

function canvas(children: unknown[], extras: Record<string, unknown> = {}) {
  return {
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
    ...extras,
  };
}

describe('RestTextNode', () => {
  it('lifts REST style typography to plugin getters', async () => {
    const file = canvas([{
      id: '1:1',
      name: 'Label',
      type: 'COMPONENT',
      children: [{
        id: '1:2',
        name: 'text',
        type: 'TEXT',
        characters: 'Hi',
        style: {
          fontSize: 18,
          fontFamily: 'Inter',
          fontStyle: 'Medium',
          letterSpacing: 0.5,
          lineHeightPx: 24,
          textCase: 'UPPER',
        },
      }],
    }], { components: { '1:1': { id: '1:1', name: 'Label', type: 'COMPONENT', key: 'l' } } });

    const [result] = await Components.fromRestApi(['Label'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    const typography = result.component.default.elements?.text?.styles?.typography as Record<string, unknown>;
    expect(typography?.fontSize).toBe(18);
    expect(typography?.fontFamily).toBe('Inter');
    expect(typography?.fontStyle).toBe('Medium');
    expect(typography?.lineHeight).toBe(24);
    expect(typography?.textCase).toBe('UPPER');

    const node = new RestTextNode({
      id: '1:2',
      name: 'text',
      type: 'TEXT',
      style: { fontSize: 18, fontFamily: 'Inter', fontStyle: 'Medium' },
    });
    expect(node.fontSize).toBe(18);
    expect(node.fontName).toEqual({ family: 'Inter', style: 'Medium' });
  });
});

describe('settings and phase configuration', () => {
  it('maps plugin Settings onto ResolvedConfig', () => {
    const config = configFromSettings({
      ...DEFAULT_SETTINGS,
      FORMAT_KEYS: 'CAMEL',
      DATA_INVALID_COMBINATIONS: false,
      SUBCOMPONENTS: true,
      SUBCOMPONENT_NAME_PATTERN: '{C} / {S}',
      VARIANT_DEPTH: 2,
    });
    expect(config.format.keys).toBe('CAMEL');
    expect(config.include.invalidCombinations).toBe(false);
    expect(config.processing.variantDepth).toBe(2);
    expect(config.processing.subcomponents?.match).toEqual(['{C} / {S}']);
  });

  it('builds output phases from Settings and reports them', async () => {
    const phases: string[] = [];
    const coordinator = new ProgressCoordinator(buildPhaseConfiguration(DEFAULT_SETTINGS), (state) => {
      phases.push(state.phase);
    });
    const file = canvas([{
      id: '1:1',
      name: 'Box',
      type: 'COMPONENT',
    }], { components: { '1:1': { id: '1:1', name: 'Box', type: 'COMPONENT', key: 'b' } } });
    await Components.fromRestApi(
      ['Box'],
      file,
      DEFAULT_CONFIG,
      { ...foundations, coordinator },
      () => {},
    );
    expect(phases).toContain('Setting up variants');
    expect(phases).toContain('Outputting Anatomy');
    expect(phases).toContain('Outputting data');
  });
});

describe('layout compare', () => {
  it('detects added and removed children', () => {
    const current = new Layout(DEFAULT_CONFIG, {
      root: {
        name: 'root',
        children: [
          { name: 'label', children: [] },
          { name: 'extra', children: [] },
        ],
      },
    });
    const baseline = new Layout(DEFAULT_CONFIG, {
      root: {
        name: 'root',
        children: [
          { name: 'label', children: [] },
          { name: 'gone', children: [] },
        ],
      },
    });
    const diff = current.diff(baseline);
    expect(diff.equal).toBe(false);
    expect(diff.added).toEqual(['extra']);
    expect(diff.removed).toEqual(['gone']);
    expect(current.compare(baseline)).toBe(current);
    expect(current.compare(current)).toBeUndefined();
  });

  it('detects reordered siblings', () => {
    const current = new Layout(DEFAULT_CONFIG, {
      root: {
        name: 'root',
        children: [
          { name: 'label', children: [] },
          { name: 'icon', children: [] },
        ],
      },
    });
    const baseline = new Layout(DEFAULT_CONFIG, {
      root: {
        name: 'root',
        children: [
          { name: 'icon', children: [] },
          { name: 'label', children: [] },
        ],
      },
    });
    const diff = current.diff(baseline);
    expect(diff.equal).toBe(false);
    expect(diff.orderChanges[0]?.currentOrder).toEqual(['label', 'icon']);
    expect(diff.orderChanges[0]?.previousOrder).toEqual(['icon', 'label']);
  });
});

describe('invalidBySimplerVariant', () => {
  it('keeps only the simpler missing combination', async () => {
    const file = canvas([{
      id: '2:1',
      name: 'Chip',
      type: 'COMPONENT_SET',
      componentPropertyDefinitions: {
        'Size#0:0': { type: 'VARIANT', defaultValue: 'M', variantOptions: ['S', 'M'] },
        'Tone#0:1': { type: 'VARIANT', defaultValue: 'Light', variantOptions: ['Light', 'Dark'] },
      },
      children: [{
        id: '2:2',
        name: 'Size=M, Tone=Light',
        type: 'COMPONENT',
        children: [{ id: '2:5', name: 'label', type: 'TEXT', characters: 'M' }],
      }],
    }], {
      componentSets: { '2:1': { id: '2:1', name: 'Chip', type: 'COMPONENT_SET', key: 'chip' } },
      components: { '2:2': { id: '2:2', name: 'Size=M, Tone=Light', type: 'COMPONENT', key: 'ml' } },
    });
    const [result] = await Components.fromRestApi(['Chip'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.invalidVariantCombinations).toEqual([{ Size: 'S' }, { Tone: 'Dark' }]);
  });
});

describe('INSTANCE_SWAP published keys', () => {
  it('resolves preferredValues published keys to component names', async () => {
    const file = canvas([
      {
        id: '1:1',
        name: 'Button',
        type: 'COMPONENT',
        componentPropertyDefinitions: {
          'icon#0:2': {
            type: 'INSTANCE_SWAP',
            defaultValue: '9:1',
            preferredValues: [{ type: 'COMPONENT', key: 'star-key' }],
          },
        },
        children: [{
          id: '1:2',
          name: 'icon',
          type: 'INSTANCE',
          componentId: '9:1',
        }],
      },
      { id: '9:1', name: 'Star', type: 'COMPONENT', children: [] },
    ], {
      components: {
        '1:1': { id: '1:1', name: 'Button', type: 'COMPONENT', key: 'btn' },
        '9:1': { id: '9:1', name: 'Star', type: 'COMPONENT', key: 'star-key' },
      },
    });
    const [result] = await Components.fromRestApi(['Button'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.props?.icon).toMatchObject({
      type: 'string',
      default: 'Star',
      examples: ['Star'],
    });
  });
});

describe('subcomponent slot base path', () => {
  it('stamps slot fills under #/subcomponents/{key}', async () => {
    const file = canvas([
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
        children: [{
          id: '4:2',
          name: 'glyph',
          type: 'SLOT',
          children: [{ id: '4:3', name: 'shape', type: 'VECTOR' }],
        }],
      },
    ], {
      components: {
        '3:1': { id: '3:1', name: 'Button', type: 'COMPONENT', key: 'btn' },
        '4:1': { id: '4:1', name: 'Icon', type: 'COMPONENT', key: 'icon' },
      },
    });
    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      include: { ...DEFAULT_CONFIG.include, defaultSlotContent: true },
      processing: {
        ...DEFAULT_CONFIG.processing,
        subcomponents: { scope: 'NESTED', match: ['{C} / _ / {S}'] },
      },
    };
    const [result] = await Components.fromRestApi(['Button'], file, config, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    const icon = result.component.subcomponents?.Icon as {
      slotContentExamples?: Record<string, unknown>;
      default?: { elements?: Record<string, { children?: { examples?: Array<{ $slotContent?: string }> } }> };
    };
    expect(icon?.slotContentExamples?.glyph).toBeDefined();
    expect(icon?.default?.elements?.glyph?.children?.examples?.[0]?.$slotContent).toBe(
      '#/subcomponents/Icon/slotContentExamples/glyph',
    );
  });
});
