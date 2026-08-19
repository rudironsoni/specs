import type { ResolvedConfig } from '@rudironsoni/specs-schema';
import { FigmaVariableReference } from '../References/FigmaVariableReference.js';
import type { FigmaElementNode } from '../../Nodes/types.js';

export type FieldValue = number | FigmaVariableReference;
export type QuadValue = number | FigmaVariableReference | QuadComposite;
export type QuadKind = 'SIDES' | 'CORNERS';

const SIDE_KEYS = ['top', 'end', 'bottom', 'start'] as const;
const CORNER_KEYS = ['topStart', 'topEnd', 'bottomEnd', 'bottomStart'] as const;

export class QuadComposite {
  constructor(
    private _fields: Record<string, FieldValue>,
    private _kind: QuadKind = 'SIDES',
  ) {}

  static fromPadding(node: FigmaElementNode): QuadValue {
    return QuadComposite.fromPairs('SIDES', {
      top: node.paddingTop,
      end: node.paddingRight,
      bottom: node.paddingBottom,
      start: node.paddingLeft,
    }, node, {
      top: 'paddingTop',
      end: 'paddingRight',
      bottom: 'paddingBottom',
      start: 'paddingLeft',
    });
  }

  static fromStroke(node: FigmaElementNode): QuadValue {
    return QuadComposite.fromPairs('SIDES', {
      top: node.strokeTopWeight,
      end: node.strokeRightWeight,
      bottom: node.strokeBottomWeight,
      start: node.strokeLeftWeight,
    }, node, {
      top: 'strokeTopWeight',
      end: 'strokeRightWeight',
      bottom: 'strokeBottomWeight',
      start: 'strokeLeftWeight',
    });
  }

  static fromCorners(node: FigmaElementNode): QuadValue {
    return QuadComposite.fromPairs('CORNERS', {
      topStart: node.topLeftRadius,
      topEnd: node.topRightRadius,
      bottomEnd: node.bottomRightRadius,
      bottomStart: node.bottomLeftRadius,
    }, node, {
      topStart: 'topLeftRadius',
      topEnd: 'topRightRadius',
      bottomEnd: 'bottomRightRadius',
      bottomStart: 'bottomLeftRadius',
    });
  }

  private static fromPairs(
    kind: QuadKind,
    values: Record<string, number>,
    node: FigmaElementNode,
    figmaKeys: Record<string, string>,
  ): QuadValue {
    const fields: Record<string, FieldValue> = {};
    const numbers: number[] = [];
    for (const [logical, raw] of Object.entries(values)) {
      const variable = FigmaVariableReference.evaluate(node, figmaKeys[logical] ?? logical, () => raw);
      fields[logical] = variable ?? raw;
      numbers.push(raw);
    }
    const allEqual = numbers.every((value) => value === numbers[0]);
    const firstVar = Object.values(fields).find((value) => value instanceof FigmaVariableReference);
    if (allEqual && !firstVar) return numbers[0] ?? 0;
    if (allEqual && firstVar && Object.values(fields).every((value) => value instanceof FigmaVariableReference && value.id === firstVar.id)) {
      return firstVar;
    }
    return new QuadComposite(fields, kind);
  }

  get kind(): QuadKind {
    return this._kind;
  }

  get(field: string): FieldValue | undefined {
    return this._fields[field];
  }

  fields(): string[] {
    return Object.keys(this._fields);
  }

  isEqualToScalar(scalar: number): boolean {
    return Object.values(this._fields).every((value) => typeof value === 'number' && value === scalar);
  }

  difference(baseline: QuadValue): QuadValue | null {
    if (typeof baseline === 'number') {
      const changed: Record<string, FieldValue> = {};
      for (const [key, value] of Object.entries(this._fields)) {
        if (typeof value === 'number' && value === baseline) continue;
        changed[key] = value;
      }
      return Object.keys(changed).length === 0 ? null : new QuadComposite(changed, this._kind);
    }
    if (baseline instanceof FigmaVariableReference) {
      return this;
    }
    const changed: Record<string, FieldValue> = {};
    const keys = new Set([...this.fields(), ...baseline.fields()]);
    for (const key of keys) {
      const current = this.get(key);
      const previous = baseline.get(key);
      if (JSON.stringify(serializeField(current)) !== JSON.stringify(serializeField(previous))) {
        if (current !== undefined) changed[key] = current;
      }
    }
    return Object.keys(changed).length === 0 ? null : new QuadComposite(changed, this._kind);
  }

  clone(): QuadComposite {
    const fields: Record<string, FieldValue> = {};
    for (const [key, value] of Object.entries(this._fields)) {
      fields[key] = value instanceof FigmaVariableReference ? value.clone() : value;
    }
    return new QuadComposite(fields, this._kind);
  }

  data(_config: ResolvedConfig): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(this._fields)) {
      out[key] = value instanceof FigmaVariableReference ? value.data(_config) : value;
    }
    return out;
  }

  async resolveVariables(foundations: import('../../../Runtime/Foundations/interfaces.js').FigmaFoundations | undefined): Promise<void> {
    for (const value of Object.values(this._fields)) {
      if (value instanceof FigmaVariableReference) await value.resolveName(foundations, true);
    }
  }
}

function serializeField(value: FieldValue | undefined): unknown {
  if (value instanceof FigmaVariableReference) return { id: value.id };
  return value;
}

export const QUAD_FIELD_ORDER = { SIDES: SIDE_KEYS, CORNERS: CORNER_KEYS };
