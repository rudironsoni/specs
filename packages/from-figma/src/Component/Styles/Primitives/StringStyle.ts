import type { FigmaElementNode } from '../../Nodes/types.js';
import type { StyleKey } from '../keys.js';
import { CROSS_AXIS_MAP, MAIN_AXIS_MAP, TEXT_ALIGN_H_MAP } from '../keys.js';

export class StringStyle {
  static value(node: FigmaElementNode, key: StyleKey | string): string | null {
    switch (key) {
      case 'layoutMode':
        return node.layoutMode === 'HORIZONTAL' || node.layoutMode === 'VERTICAL' ? node.layoutMode : 'NONE';
      case 'layoutSizingHorizontal':
        return node.layoutSizingHorizontal;
      case 'layoutSizingVertical':
        return node.layoutSizingVertical;
      case 'strokeAlign':
        return node.strokeAlign;
      case 'mainAxisAlignment':
        return MAIN_AXIS_MAP[node.primaryAxisAlignItems] ?? node.primaryAxisAlignItems ?? null;
      case 'crossAxisAlignment':
        return CROSS_AXIS_MAP[node.counterAxisAlignItems] ?? node.counterAxisAlignItems ?? null;
      case 'primaryAxisSizingMode':
        return node.primaryAxisSizingMode;
      case 'textAlignHorizontal':
        return TEXT_ALIGN_H_MAP[node.textAlignHorizontal] ?? node.textAlignHorizontal ?? null;
      case 'textAlignVertical':
        return node.textAlignVertical ?? null;
      case 'wrapAlignment':
        return node.counterAxisAlignContent === 'SPACE_BETWEEN' ? 'SPACE_BETWEEN' : 'START';
      default:
        return null;
    }
  }
}
