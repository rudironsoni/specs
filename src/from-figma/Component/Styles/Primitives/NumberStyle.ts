import type { FigmaElementNode } from '../../Nodes/types.js';
import type { StyleKey } from '../keys.js';

export class NumberStyle {
  static value(node: FigmaElementNode, key: StyleKey | string): number | null {
    const record = node as unknown as Record<string, unknown>;
    const raw = record[key];
    if (typeof raw === 'number') return NumberStyle.rounded(raw);
    return null;
  }

  static rounded(value: number | null | undefined): number | null {
    if (value == null || Number.isNaN(value)) return null;
    return Math.round(value * 100) / 100;
  }
}
