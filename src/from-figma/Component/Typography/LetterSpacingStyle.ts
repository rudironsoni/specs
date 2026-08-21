import type { FigmaElementNode } from '../Nodes/types.js';

export class LetterSpacingStyle {
  static value(node: FigmaElementNode): number | 'mixed' | null {
    const text = node as FigmaElementNode & { letterSpacing?: unknown };
    const raw = node.style?.letterSpacing ?? text.letterSpacing;
    if (raw === 'mixed' || raw === 'MIXED' || typeof raw === 'symbol') return 'mixed';
    if (typeof raw === 'number') return raw;
    if (raw && typeof raw === 'object' && typeof (raw as { value?: unknown }).value === 'number') {
      return (raw as { value: number }).value;
    }
    return null;
  }
}
