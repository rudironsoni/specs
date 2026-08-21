import type { ResolvedConfig } from '@rudironsoni/specs-schema';
import { FigmaVariableReference } from '../References/FigmaVariableReference.js';
import type { FigmaElementNode } from '../../Nodes/types.js';

export type BiaxialFieldValue = number | FigmaVariableReference;

export class BiaxialComposite {
  constructor(private _fields: { horizontal?: BiaxialFieldValue; vertical?: BiaxialFieldValue }) {}

  static fromNode(node: FigmaElementNode, layoutMode: 'HORIZONTAL' | 'VERTICAL'): BiaxialComposite {
    const primary = node.itemSpacing;
    const counter = node.counterAxisSpacing;
    if (layoutMode === 'HORIZONTAL') {
      return new BiaxialComposite({ horizontal: primary, vertical: counter });
    }
    return new BiaxialComposite({ horizontal: counter, vertical: primary });
  }

  get(field: 'horizontal' | 'vertical'): BiaxialFieldValue | undefined {
    return this._fields[field];
  }

  fields(): string[] {
    return Object.keys(this._fields);
  }

  isEqualToScalar(scalar: number): boolean {
    return Object.values(this._fields).every((value) => typeof value === 'number' && value === scalar);
  }

  difference(baseline: number | FigmaVariableReference | BiaxialComposite): BiaxialComposite | number | null {
    if (typeof baseline === 'number') {
      const changed: { horizontal?: BiaxialFieldValue; vertical?: BiaxialFieldValue } = {};
      for (const axis of ['horizontal', 'vertical'] as const) {
        const value = this.get(axis);
        if (value !== undefined && value !== baseline) changed[axis] = value;
      }
      return Object.keys(changed).length === 0 ? null : new BiaxialComposite(changed);
    }
    if (baseline instanceof FigmaVariableReference) return this;
    const changed: { horizontal?: BiaxialFieldValue; vertical?: BiaxialFieldValue } = {};
    for (const axis of ['horizontal', 'vertical'] as const) {
      if (this.get(axis) !== baseline.get(axis) && this.get(axis) !== undefined) {
        changed[axis] = this.get(axis);
      }
    }
    return Object.keys(changed).length === 0 ? null : new BiaxialComposite(changed);
  }

  clone(): BiaxialComposite {
    return new BiaxialComposite({ ...this._fields });
  }

  data(_config: ResolvedConfig): Record<string, unknown> {
    return { ...this._fields };
  }
}
