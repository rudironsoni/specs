import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type ResolvedConfig } from '@rudironsoni/specs-schema';
import { Components, isReferenceValue, LICENSING, RestTextNode } from '../src/index.js';
import { FontStyle } from '../src/Component/Typography/FontStyle.js';

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

describe('instance propConfigurations resolve swap ids', () => {
  it('turns an INSTANCE_SWAP node id into the component name', async () => {
    const file = canvas([
      {
        id: '1:1',
        name: 'Button',
        type: 'COMPONENT',
        children: [{
          id: '1:2',
          name: 'icon',
          type: 'INSTANCE',
          componentId: '9:1',
          componentProperties: {
            'glyph#0:1': { type: 'INSTANCE_SWAP', value: '9:2' },
          },
        }],
      },
      { id: '9:1', name: 'Icon', type: 'COMPONENT', children: [] },
      { id: '9:2', name: 'Star', type: 'COMPONENT', children: [] },
    ], {
      components: {
        '1:1': { id: '1:1', name: 'Button', type: 'COMPONENT', key: 'btn' },
        '9:1': { id: '9:1', name: 'Icon', type: 'COMPONENT', key: 'icon' },
        '9:2': { id: '9:2', name: 'Star', type: 'COMPONENT', key: 'star' },
      },
    });
    const [result] = await Components.fromRestApi(['Button'], file, DEFAULT_CONFIG, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.default.elements?.icon?.propConfigurations).toEqual({ glyph: 'Star' });
  });
});

describe('instance example InstanceExample builder', () => {
  it('resolves a swap id on a PAGE-scope example', async () => {
    const file = canvas([
      {
        id: '1:1',
        name: 'Button',
        type: 'COMPONENT',
        componentPropertyDefinitions: {
          'icon#0:1': { type: 'INSTANCE_SWAP', defaultValue: '9:1' },
        },
        children: [{ id: '1:2', name: 'icon', type: 'INSTANCE', componentId: '9:1' }],
      },
      { id: '9:1', name: 'Star', type: 'COMPONENT', children: [] },
      { id: '9:2', name: 'Heart', type: 'COMPONENT', children: [] },
      {
        id: '8:1',
        name: 'Heart button',
        type: 'INSTANCE',
        componentId: '1:1',
        componentProperties: {
          'icon#0:1': { type: 'INSTANCE_SWAP', value: '9:2' },
        },
      },
    ], {
      components: {
        '1:1': { id: '1:1', name: 'Button', type: 'COMPONENT', key: 'btn' },
        '9:1': { id: '9:1', name: 'Star', type: 'COMPONENT', key: 'star' },
        '9:2': { id: '9:2', name: 'Heart', type: 'COMPONENT', key: 'heart' },
      },
    });
    const config: ResolvedConfig = {
      ...DEFAULT_CONFIG,
      processing: { ...DEFAULT_CONFIG.processing, instanceExamples: { scope: 'PAGE' } },
    };
    const [result] = await Components.fromRestApi(['Button'], file, config, foundations, () => {});
    expect('component' in result).toBe(true);
    if (!('component' in result)) throw new Error('expected success');
    expect(result.component.instanceExamples?.Heart_button).toEqual({
      title: 'Heart button',
      propConfigurations: { icon: 'Heart' },
    });
  });
});

describe('typography field helpers', () => {
  it('reads fontName members through FontStyle', () => {
    const node = new RestTextNode({
      id: '1:2',
      name: 'text',
      type: 'TEXT',
      style: { fontFamily: 'Inter', fontStyle: 'Bold', letterSpacing: 1, lineHeightPx: 20 },
    });
    expect(FontStyle.value(node, 'fontFamily')).toBe('Inter');
    expect(FontStyle.value(node, 'fontStyle')).toBe('Bold');
  });
});

describe('reference value guard', () => {
  it('accepts a $ref object', () => {
    expect(isReferenceValue({ $ref: '#/props/label' })).toBe(true);
    expect(isReferenceValue('label')).toBe(false);
  });
});

describe('licensing constants', () => {
  it('defaults the proxy URL to empty', () => {
    expect(LICENSING.PROXY_URL).toBe(process.env.SPECS_LICENSE_PROXY_URL ?? '');
  });
});
