import type { AspectRatioValue } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../../Nodes/types.js';

export class AspectRatioStyle {
  static value(node: FigmaElementNode): AspectRatioValue | null {
    const value = node.targetAspectRatio
      ?? (node.raw as { targetAspectRatio?: { x: number; y: number } | null }).targetAspectRatio;
    if (!value || typeof value.x !== 'number' || typeof value.y !== 'number') return null;
    return { x: value.x, y: value.y };
  }

  static difference(a: AspectRatioValue | null, b: AspectRatioValue | null): boolean {
    if (a === b) return false;
    if (!a || !b) return true;
    return a.x !== b.x || a.y !== b.y;
  }

  static isAspectRatioStyle(key: string, value: unknown): value is AspectRatioValue {
    if (key !== 'aspectRatio' || !value || typeof value !== 'object') return false;
    const record = value as { x?: unknown; y?: unknown };
    return typeof record.x === 'number' && typeof record.y === 'number';
  }
}
