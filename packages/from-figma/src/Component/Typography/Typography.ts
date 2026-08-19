import type { ResolvedConfig, Typography as SchemaTypography } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../Nodes/types.js';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import { FigmaVariableReference } from '../Styles/References/FigmaVariableReference.js';
import { TYPOGRAPHY_KEYS, type TypographyKey } from './keys.js';
import { VARIABLE_PROPERTIES } from './constants.js';
import { FontStyle } from './FontStyle.js';
import { LetterSpacingStyle } from './LetterSpacingStyle.js';
import { LineHeightStyle } from './LineHeightStyle.js';

export const FIGMA_MIXED = 'mixed';

export type TypographyField =
  | FigmaVariableReference
  | number
  | string
  | boolean
  | typeof FIGMA_MIXED
  | null
  | undefined;

export class Typography {
  fontSize?: TypographyField;
  fontFamily?: TypographyField;
  fontStyle?: TypographyField;
  lineHeight?: TypographyField;
  letterSpacing?: TypographyField;
  textCase?: TypographyField;
  textDecoration?: TypographyField;
  paragraphIndent?: TypographyField;
  paragraphSpacing?: TypographyField;
  leadingTrim?: TypographyField;
  listSpacing?: TypographyField;
  hangingPunctuation?: TypographyField;
  hangingList?: TypographyField;

  static evaluate(node: FigmaElementNode, _context?: ProcessingContext): Typography | null {
    const typography = new Typography();
    const style = node.style ?? {};
    const text = node as FigmaElementNode & {
      fontSize?: unknown;
    };
    assignNumber(typography, 'fontSize', style.fontSize ?? text.fontSize);
    assignString(typography, 'fontFamily', FontStyle.value(node, 'fontFamily'));
    assignString(typography, 'fontStyle', FontStyle.value(node, 'fontStyle'));
    const letterSpacing = LetterSpacingStyle.value(node);
    if (letterSpacing === 'mixed') typography.letterSpacing = FIGMA_MIXED;
    else if (letterSpacing !== null) typography.letterSpacing = letterSpacing;
    const lineHeight = LineHeightStyle.value(node);
    if (lineHeight === 'mixed') typography.lineHeight = FIGMA_MIXED;
    else if (lineHeight !== null) typography.lineHeight = lineHeight;
    assignString(typography, 'textCase', style.textCase);
    assignString(typography, 'textDecoration', style.textDecoration);
    assignNumber(typography, 'paragraphIndent', style.paragraphIndent);
    assignNumber(typography, 'paragraphSpacing', style.paragraphSpacing);
    if (style.leadingTrim === 'NONE' || style.leadingTrim === 'CAP_HEIGHT') {
      typography.leadingTrim = style.leadingTrim;
    }
    assignNumber(typography, 'listSpacing', style.listSpacing);
    assignBoolean(typography, 'hangingPunctuation', style.hangingPunctuation);
    assignBoolean(typography, 'hangingList', style.hangingList);

    for (const key of VARIABLE_PROPERTIES) {
      const raw = typography[key];
      const getter = (): string | number | boolean => {
        if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return raw;
        return 0;
      };
      const variable = FigmaVariableReference.evaluate(node, key, getter);
      if (variable) typography[key] = variable;
    }

    return typography.isEmpty() ? null : typography;
  }

  isEmpty(): boolean {
    return TYPOGRAPHY_KEYS.every((key) => this[key] === undefined);
  }

  data(config: ResolvedConfig): SchemaTypography {
    const out: SchemaTypography = {};
    for (const key of TYPOGRAPHY_KEYS) {
      const value = this[key];
      if (value === undefined) continue;
      (out as Record<string, unknown>)[key] = this.serializeProperty(value, config);
    }
    return out;
  }

  clone(): Typography {
    const copy = new Typography();
    for (const key of TYPOGRAPHY_KEYS) copy[key] = cloneField(this[key]);
    return copy;
  }

  difference(base: Typography): boolean {
    return TYPOGRAPHY_KEYS.some((key) => differField(this[key], base[key]));
  }

  merge(typography: Typography): Typography {
    return typography.clone();
  }

  private serializeProperty(value: TypographyField, config: ResolvedConfig): unknown {
    if (value instanceof FigmaVariableReference) return value.data(config);
    return value;
  }
}

function assignNumber(target: Typography, key: TypographyKey, value: unknown): void {
  if (isMixed(value)) target[key] = FIGMA_MIXED;
  else if (typeof value === 'number') target[key] = value;
}

function assignString(target: Typography, key: TypographyKey, value: unknown): void {
  if (isMixed(value)) target[key] = FIGMA_MIXED;
  else if (typeof value === 'string') target[key] = value;
}

function assignBoolean(target: Typography, key: TypographyKey, value: unknown): void {
  if (isMixed(value)) target[key] = FIGMA_MIXED;
  else if (typeof value === 'boolean') target[key] = value;
}

function isMixed(value: unknown): boolean {
  return value === 'mixed' || value === 'MIXED' || (typeof value === 'symbol');
}

function cloneField(value: TypographyField): TypographyField {
  if (value instanceof FigmaVariableReference) return value.clone();
  return value;
}

function differField(current: TypographyField, base: TypographyField): boolean {
  if (current === undefined && base === undefined) return false;
  if (current === undefined || base === undefined) return true;
  if (current === null || base === null) return current !== base;
  if (current instanceof FigmaVariableReference && base instanceof FigmaVariableReference) {
    return current.difference(base);
  }
  if (current instanceof FigmaVariableReference || base instanceof FigmaVariableReference) return true;
  return current !== base;
}
