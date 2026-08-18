import type { FigmaElementNode } from '../../Nodes/types.js';
import type { ProcessingContext } from '../../../Runtime/Context/interfaces.js';
import { Typography } from '../../Typography/Typography.js';
import { FigmaStyleReference } from '../References/FigmaStyleReference.js';

export class TypographyStyle {
  static value(node: FigmaElementNode, context?: ProcessingContext): FigmaStyleReference | Typography | null {
    const published = FigmaStyleReference.evaluate(node, 'typography', 'typography');
    if (published) return published;
    const typography = Typography.evaluate(node, context);
    if (typography) applyMixedRuns(node, typography);
    return typography;
  }
}

function applyMixedRuns(node: FigmaElementNode, typography: Typography): void {
  const overrides = node.characterStyleOverrides ?? [];
  const table = node.styleOverrideTable ?? {};
  if (overrides.length === 0 || Object.keys(table).length === 0) return;
  const distinct = new Set(overrides.filter((index) => index !== 0));
  if (distinct.size === 0) return;
  const fields = ['fontSize', 'fontFamily', 'fontStyle', 'letterSpacing', 'lineHeight', 'textCase', 'textDecoration'] as const;
  for (const field of fields) {
    if (overrideTouches(table, field)) typography[field] = 'mixed';
  }
}

function overrideTouches(table: Record<string, Record<string, unknown>>, field: string): boolean {
  return Object.values(table).some((entry) => {
    if (field === 'lineHeight') {
      return entry.lineHeightPx !== undefined || entry.lineHeightPercentFontSize !== undefined || entry.lineHeightUnit !== undefined;
    }
    return entry[field] !== undefined;
  });
}
