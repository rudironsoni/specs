import { describe, expect, it } from 'vitest';
import { buildFigmaPlan } from '../../../bootstrap/figma/plan.js';
import { MemoryFigmaTransport } from '../../../bootstrap/figma/transports/memory.js';
import { BootstrapError } from '../../../bootstrap/errors.js';
import { emptyBindingFile } from '../../../bootstrap/workspace.js';
import type { Component } from '@rudironsoni/specs-schema';

const button: Component = {
  title: 'Button',
  anatomy: { root: { type: 'container' }, label: { type: 'text' } },
  props: { appearance: { type: 'string', default: 'primary', enum: ['primary', 'secondary'] } },
  default: { layout: [{ root: ['label'] }] },
};

describe('memory Figma transport', () => {
  it('preserves unknown nodes, no-ops a second apply, and fails a stale plan', () => {
    const transport = new MemoryFigmaTransport();
    const restBefore = transport.exportRest() as { document: { children: Array<{ children: Array<{ name: string }> }> } };
    expect(restBefore.document.children[0].children.some((n) => n.name === 'DesignerFrame')).toBe(true);

    const plan = buildFigmaPlan({
      mode: 'STAGING',
      components: { 'component:button': button },
      tokens: { 'color.brand.primary': { $type: 'color', $value: '#1a73e8' } },
      bindings: emptyBindingFile(),
      expectedTargetDigest: null,
      stagingApproved: true,
    });
    expect(plan.operations.delete).toEqual([]);

    const first = transport.apply(plan);
    expect(first.creates.length).toBeGreaterThan(0);
    const restAfter = transport.exportRest() as { document: { children: Array<{ children: Array<{ name: string }> }> } };
    expect(restAfter.document.children[0].children.some((n) => n.name === 'DesignerFrame')).toBe(true);

    const second = transport.apply({ ...plan, expectedTargetDigest: null });
    expect(second.creates).toEqual([]);
    expect(second.updates).toEqual([]);

    const stale = buildFigmaPlan({
      mode: 'STAGING',
      components: { 'component:button': button },
      tokens: {},
      bindings: emptyBindingFile(),
      expectedTargetDigest: 'not-the-digest',
      stagingApproved: true,
    });
    expect(() => transport.apply(stale)).toThrow(BootstrapError);
  });
});
