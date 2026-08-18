import type { FigmaElementNode } from '../../Nodes/types.js';
import type { StyleKey } from '../keys.js';

export class BooleanStyle {
  static value(node: FigmaElementNode, key: StyleKey | string): boolean | null {
    switch (key) {
      case 'visible':
        return node.visible;
      case 'locked':
        return node.locked;
      case 'clipContent':
        return node.clipContent;
      case 'itemReverseZIndex':
        return node.itemReverseZIndex;
      case 'wrap':
        return node.layoutWrap === 'WRAP';
      default:
        return null;
    }
  }
}
