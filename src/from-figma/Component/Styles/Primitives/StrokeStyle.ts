import type { FigmaElementNode } from '../../Nodes/types.js';
import { QuadComposite } from '../Composites/QuadComposite.js';
import { FigmaVariableReference } from '../References/FigmaVariableReference.js';

export class StrokeStyle {
  static hasVisibleStrokes(node: FigmaElementNode): boolean {
    for (const paint of node.strokes ?? []) {
      const record = paint as { visible?: boolean };
      if (record.visible !== false) return true;
    }
    return false;
  }

  static value(node: FigmaElementNode): number | FigmaVariableReference | QuadComposite | null {
    if (!StrokeStyle.hasVisibleStrokes(node)) return null;
    return QuadComposite.fromStroke(node);
  }
}
