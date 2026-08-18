import type { FigmaElementNode } from '../../Nodes/types.js';
import type { ProcessingContext } from '../../../Runtime/Context/interfaces.js';
import { Effects } from '../../Effects/Effects.js';
import { FigmaStyleReference } from '../References/FigmaStyleReference.js';

export class EffectsStyle {
  static value(node: FigmaElementNode, _context?: ProcessingContext): Effects | FigmaStyleReference | null {
    const published = FigmaStyleReference.evaluate(node, 'effects', 'effects');
    if (published) return published;
    return Effects.fromNode(node.effects);
  }
}
