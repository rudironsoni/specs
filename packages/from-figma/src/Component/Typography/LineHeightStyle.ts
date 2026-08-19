import type { FigmaElementNode } from '../Nodes/types.js';
import { REST_LINE_HEIGHT_PROPERTIES } from '../../Constants/ApiMappings.js';

export class LineHeightStyle {
  static value(node: FigmaElementNode): number | string | 'mixed' | null {
    const style = node.style ?? {};
    const unit = style[REST_LINE_HEIGHT_PROPERTIES.unit];
    const percent = style[REST_LINE_HEIGHT_PROPERTIES.percentFontSize];
    const px = style[REST_LINE_HEIGHT_PROPERTIES.px];
    if (isMixed(unit) || isMixed(percent) || isMixed(px)) return 'mixed';
    if (unit === 'INTRINSIC_%') return 'auto';
    if (typeof percent === 'number') return `${percent}%`;
    if (typeof px === 'number') return px;
    const text = node as FigmaElementNode & { lineHeight?: unknown };
    const raw = text.lineHeight;
    if (raw && typeof raw === 'object') {
      const height = raw as { value?: number; unit?: string };
      if (height.unit === 'AUTO') return 'auto';
      if (height.unit === 'PERCENT' && typeof height.value === 'number') return `${height.value}%`;
      if (typeof height.value === 'number') return height.value;
    }
    return null;
  }
}

function isMixed(value: unknown): boolean {
  return value === 'mixed' || value === 'MIXED' || typeof value === 'symbol';
}
