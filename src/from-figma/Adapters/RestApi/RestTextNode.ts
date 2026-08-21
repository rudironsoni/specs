import { RestBaseNode, FIGMA_MIXED } from './RestBaseNode.js';
import { registerNodeWrapper } from './wrapNode.js';

/**
 * REST text nodes keep typography under style.*.
 * This adapter lifts those fields to the Plugin API surface
 * (node.fontSize, node.fontName, and the rest).
 */
export class RestTextNode extends RestBaseNode {
  get fontSize(): number | typeof FIGMA_MIXED | undefined {
    const value = this.style?.fontSize;
    if (isMixed(value)) return FIGMA_MIXED;
    return typeof value === 'number' ? value : undefined;
  }

  get fontName(): { family: string; style: string } | typeof FIGMA_MIXED | undefined {
    const family = this.style?.fontFamily;
    const style = this.style?.fontStyle ?? this.style?.fontPostScriptName;
    if (isMixed(family) || isMixed(style)) return FIGMA_MIXED;
    if (typeof family !== 'string') return undefined;
    return { family, style: typeof style === 'string' ? style : 'Regular' };
  }

  get letterSpacing(): number | { value: number; unit: string } | typeof FIGMA_MIXED | undefined {
    const value = this.style?.letterSpacing;
    if (isMixed(value)) return FIGMA_MIXED;
    if (typeof value === 'number') return value;
    if (value && typeof value === 'object') return value as { value: number; unit: string };
    return undefined;
  }

  get lineHeight(): number | { value: number; unit: string } | typeof FIGMA_MIXED | undefined {
    const style = this.style ?? {};
    if (isMixed(style.lineHeightPx) || isMixed(style.lineHeightPercentFontSize) || isMixed(style.lineHeightUnit)) {
      return FIGMA_MIXED;
    }
    if (style.lineHeightUnit === 'INTRINSIC_%') return { value: 0, unit: 'AUTO' };
    if (typeof style.lineHeightPercentFontSize === 'number') {
      return { value: style.lineHeightPercentFontSize, unit: 'PERCENT' };
    }
    if (typeof style.lineHeightPx === 'number') return { value: style.lineHeightPx, unit: 'PIXELS' };
    return undefined;
  }

  get textCase(): string | undefined {
    return typeof this.style?.textCase === 'string' ? this.style.textCase : undefined;
  }

  get textDecoration(): string | undefined {
    return typeof this.style?.textDecoration === 'string' ? this.style.textDecoration : undefined;
  }

  get paragraphIndent(): number | undefined {
    return typeof this.style?.paragraphIndent === 'number' ? this.style.paragraphIndent : undefined;
  }

  get paragraphSpacing(): number | undefined {
    return typeof this.style?.paragraphSpacing === 'number' ? this.style.paragraphSpacing : undefined;
  }

  get leadingTrim(): string | undefined {
    return typeof this.style?.leadingTrim === 'string' ? this.style.leadingTrim : undefined;
  }

  get listSpacing(): number | undefined {
    return typeof this.style?.listSpacing === 'number' ? this.style.listSpacing : undefined;
  }

  get hangingPunctuation(): boolean | undefined {
    return typeof this.style?.hangingPunctuation === 'boolean' ? this.style.hangingPunctuation : undefined;
  }

  get hangingList(): boolean | undefined {
    return typeof this.style?.hangingList === 'boolean' ? this.style.hangingList : undefined;
  }
}

function isMixed(value: unknown): boolean {
  return value === 'mixed' || value === 'MIXED' || typeof value === 'symbol';
}

registerNodeWrapper('TEXT', (data, parent) => new RestTextNode(data, parent));
