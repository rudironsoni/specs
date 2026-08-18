import type { FigmaElementNode } from '../../Nodes/types.js';
import { Color } from '../../Color/Color.js';
import { FigmaVariableReference } from '../References/FigmaVariableReference.js';
import { FigmaStyleReference } from '../References/FigmaStyleReference.js';

export type IconFillValue = Color | FigmaVariableReference | FigmaStyleReference | null;

export class IconFillStyle {
  static evaluate(node: FigmaElementNode): IconFillValue {
    const bound = IconFillStyle.walk(node, true);
    if (bound) return bound;
    return IconFillStyle.walk(node, false);
  }

  private static walk(node: FigmaElementNode, bindingsOnly: boolean): IconFillValue {
    const local = IconFillStyle.evaluateNode(node, bindingsOnly);
    if (local) return local;
    if (node.type === 'INSTANCE' || node.type === 'TEXT' || node.type === 'SLOT') return null;
    for (const child of node.children) {
      const found = IconFillStyle.walk(child, bindingsOnly);
      if (found) return found;
    }
    return null;
  }

  private static evaluateNode(node: FigmaElementNode, bindingsOnly: boolean): IconFillValue {
    const style = FigmaStyleReference.evaluate(node, 'fillColor', 'color');
    if (style) return style;
    const variable = FigmaVariableReference.evaluate(node, 'fillColor', () => {
      const color = firstSolid(node);
      return color ?? 0;
    });
    if (variable) return variable;
    if (bindingsOnly) return null;
    return firstSolid(node);
  }
}

function firstSolid(node: FigmaElementNode): Color | null {
  for (const paint of node.fills ?? []) {
    const record = paint as { type?: string; visible?: boolean; color?: { r: number; g: number; b: number; a?: number }; opacity?: number };
    if (record.visible === false) continue;
    if (record.type === 'SOLID' && record.color) {
      return Color.fromFigma({ ...record.color, a: record.color.a ?? record.opacity ?? 1 });
    }
  }
  return null;
}
