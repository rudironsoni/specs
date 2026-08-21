import type { FigmaElementNode } from '../../Nodes/types.js';
import { QuadComposite } from '../Composites/QuadComposite.js';
import type { FigmaVariableReference } from '../References/FigmaVariableReference.js';

export class CornerStyle {
  static value(node: FigmaElementNode): number | FigmaVariableReference | QuadComposite | null {
    return QuadComposite.fromCorners(node);
  }
}
