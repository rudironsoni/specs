import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ResolvedConfig } from '@rudironsoni/specs-schema';
import { Component, Components } from '../src/index.js';

const foundations = {
  styles: new Map(),
  variables: new Map(),
  collections: new Map(),
};

function restFile(children: unknown[], extras: Record<string, unknown> = {}) {
  return {
    document: {
      id: '0:0',
      name: 'Document',
      type: 'DOCUMENT',
      children,
    },
    ...extras,
  };
}

describe('text overflow and maxLines', () => {
  it('maps ENDING truncation to ELLIPSIS', async () => {
    const file = restFile([{
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
          characters: 'Hello',
          style: { textTruncation: 'ENDING', maxLines: 2, fontSize: 14 },
        }],
      }],
    }], { components: { '1:1': { id: '1:1', name: 'Label', type: 'COMPONENT', key: 'l' } } });
    const [result] = await Components.fromRestApi(['Label'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.text?.styles?.textOverflow).toBe('ELLIPSIS');
    expect(result.component.default.elements?.text?.styles?.maxLines).toBe(2);
  });
});

describe('stroke dash, wrap, min/max, corners', () => {
  it('emits dash pattern, wrap spacing, min width, and per-corner radius', async () => {
    const file = restFile([{
      id: '0:1',
      name: 'Page 1',
      type: 'CANVAS',
      children: [{
        id: '1:1',
        name: 'Card',
        type: 'COMPONENT',
        layoutMode: 'HORIZONTAL',
        layoutWrap: 'WRAP',
        itemSpacing: 8,
        counterAxisSpacing: 12,
        minWidth: 120,
        maxWidth: 400,
        rectangleCornerRadii: [1, 2, 3, 4],
        strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
        strokeDashes: [4, 2],
        individualStrokeWeights: { top: 1, right: 2, bottom: 3, left: 4 },
      }],
    }], { components: { '1:1': { id: '1:1', name: 'Card', type: 'COMPONENT', key: 'c' } } });
    const [result] = await Components.fromRestApi(['Card'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    const styles = result.component.default.elements?.root?.styles;
    expect(styles?.strokeDashPattern).toEqual({ dash: 4, gap: 2 });
    expect(styles?.wrap).toBe(true);
    expect(styles?.itemSpacing).toEqual({ horizontal: 8, vertical: 12 });
    expect(styles?.minWidth).toBe(120);
    expect(styles?.maxWidth).toBe(400);
    expect(styles?.cornerRadius).toEqual({ topStart: 1, topEnd: 2, bottomEnd: 3, bottomStart: 4 });
    expect(styles?.strokeWeight).toEqual({ top: 1, end: 2, bottom: 3, start: 4 });
  });
});

describe('color format', () => {
  it('emits RGBA strings when format.color is RGBA', async () => {
    const file = restFile([{
      id: '0:1',
      name: 'Page 1',
      type: 'CANVAS',
      children: [{
        id: '1:1',
        name: 'Box',
        type: 'COMPONENT',
        fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0, a: 0.5 } }],
      }],
    }], { components: { '1:1': { id: '1:1', name: 'Box', type: 'COMPONENT', key: 'b' } } });
    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      format: { ...DEFAULT_CONFIG.format, color: 'RGBA' },
    };
    const [result] = await Components.fromRestApi(['Box'], file, config, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.root?.styles?.backgroundColor).toMatch(/^rgba\(/);
  });
});

describe('FILE-scope instance examples', () => {
  it('finds instances on another page when scope is FILE', async () => {
    const file = restFile([
      {
        id: '0:1',
        name: 'Page 1',
        type: 'CANVAS',
        children: [{
          id: '1:1',
          name: 'Button',
          type: 'COMPONENT',
          componentPropertyDefinitions: { 'Label#0:1': { type: 'TEXT', defaultValue: 'Save' } },
          children: [{ id: '1:2', name: 'label', type: 'TEXT', characters: 'Save' }],
        }],
      },
      {
        id: '0:2',
        name: 'Page 2',
        type: 'CANVAS',
        children: [{
          id: '9:1',
          name: 'Other page save',
          type: 'INSTANCE',
          componentId: '1:1',
          componentProperties: { 'Label#0:1': { type: 'TEXT', value: 'Go' } },
        }],
      },
    ], { components: { '1:1': { id: '1:1', name: 'Button', type: 'COMPONENT', key: 'btn' } } });
    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      processing: { ...DEFAULT_CONFIG.processing, instanceExamples: { scope: 'FILE' } },
    };
    const [result] = await Components.fromRestApi(['Button'], file, config, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.instanceExamples?.Other_page_save).toEqual({
      title: 'Other page save',
      propConfigurations: { Label: 'Go' },
    });
  });
});

describe('published effect style', () => {
  it('emits an effects token when effectStyleId is set', async () => {
    const file = restFile([{
      id: '0:1',
      name: 'Page 1',
      type: 'CANVAS',
      children: [{
        id: '1:1',
        name: 'Card',
        type: 'COMPONENT',
        styles: { effect: 'S:soft' },
        effects: [{ type: 'DROP_SHADOW', radius: 8, offset: { x: 0, y: 4 }, color: { r: 0, g: 0, b: 0, a: 1 } }],
      }],
    }], { components: { '1:1': { id: '1:1', name: 'Card', type: 'COMPONENT', key: 'c' } } });
    const styles = new Map([['S:soft', { id: 'S:soft', name: 'Shadow/Soft', type: 'EFFECT' as const }]]);
    const [result] = await Components.fromRestApi(
      ['Card'],
      file,
      DEFAULT_CONFIG,
      { styles, variables: new Map(), collections: new Map() },
      () => {},
    );
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.root?.styles?.effects).toMatchObject({
      $token: 'Shadow/Soft',
      $type: 'effects',
    });
  });
});

describe('plugin dashPattern', () => {
  it('maps plugin dashPattern to strokeDashPattern', async () => {
    const spec = await Component.fromPlugin({
      id: '16:1',
      name: 'Box',
      type: 'COMPONENT',
      strokes: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0, a: 1 } }],
      dashPattern: [6, 3],
    }, DEFAULT_CONFIG);
    expect(spec.json().default.elements?.root?.styles?.strokeDashPattern).toEqual({ dash: 6, gap: 3 });
  });
});
