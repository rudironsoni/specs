import type { FigmaElementNode } from '../../Nodes/types.js';

export class MixedStyle {
  static value<T>(member: string, node: FigmaElementNode): T | 'mixed' | null {
    const record = node as unknown as Record<string, unknown>;
    const value = record[member] ?? node.style?.[member] ?? node.raw[member];
    if (value === undefined || value === null) return null;
    if (typeof value === 'symbol' || value === 'mixed' || value === 'MIXED') return 'mixed';
    return value as T;
  }
}
