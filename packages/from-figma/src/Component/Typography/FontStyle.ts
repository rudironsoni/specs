import type { FigmaElementNode } from '../Nodes/types.js';
import { FONT_NAME_MEMBER_MAP } from '../../Constants/ApiMappings.js';

export class FontStyle {
  static value(node: FigmaElementNode, key: string): string | null {
    const style = node.style ?? {};
    if (key === 'fontFamily' || key === 'fontStyle') {
      if (typeof style[key] === 'string') return style[key] as string;
      const text = node as FigmaElementNode & { fontName?: { family?: string; style?: string } | symbol };
      if (text.fontName && typeof text.fontName === 'object') {
        const member = FONT_NAME_MEMBER_MAP[key] as 'family' | 'style';
        const value = text.fontName[member];
        if (typeof value === 'string') return value;
      }
      if (key === 'fontStyle' && typeof style.fontPostScriptName === 'string') return style.fontPostScriptName;
    }
    return null;
  }
}
