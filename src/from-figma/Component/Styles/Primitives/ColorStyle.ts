import type { FigmaElementNode } from '../../Nodes/types.js';
import { Color } from '../../Color/Color.js';
import { Gradient } from '../../Gradient/Gradient.js';

export class ColorStyle {
  static value(node: FigmaElementNode, key: string): Color | Gradient | null {
    const paints = key === 'strokes' ? node.strokes : node.fills;
    return ColorStyle.styleFromPaints(paints);
  }

  static styleFromPaints(paints: readonly unknown[] | undefined): Color | Gradient | null {
    if (!paints) return null;
    for (const paint of paints) {
      const record = paint as { type?: string; visible?: boolean };
      if (record.visible === false) continue;
      if (Gradient.isGradientPaint(record)) return Gradient.fromPaint(record);
      const color = ColorStyle.firstSolid(paint);
      if (color) return color;
    }
    return null;
  }

  static firstSolid(paint: unknown): Color | null {
    const record = paint as { type?: string; visible?: boolean; color?: { r: number; g: number; b: number; a?: number }; opacity?: number };
    if (record.visible === false) return null;
    if (record.type === 'SOLID' && record.color) {
      return Color.fromFigma({ ...record.color, a: record.color.a ?? record.opacity ?? 1 });
    }
    return null;
  }
}
