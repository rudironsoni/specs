import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import { Style } from '../Styles/Style.js';
import { FigmaStyleReference } from '../Styles/References/FigmaStyleReference.js';
import { FigmaVariableReference } from '../Styles/References/FigmaVariableReference.js';
import { Typography } from './Typography.js';
import { VARIABLE_PROPERTIES } from './constants.js';
import { TYPOGRAPHY_DEFAULTS } from './defaults.js';
import { TYPOGRAPHY_KEYS } from './keys.js';

export class TypographyProcessor {
  static async postProcess(
    style: Style | undefined,
    context?: ProcessingContext,
    removeDefaults = false,
  ): Promise<void> {
    if (!style) return;
    if (style.value instanceof FigmaStyleReference) {
      await style.value.resolveName(context?.foundations);
      return;
    }
    if (!(style.value instanceof Typography)) return;
    await TypographyProcessor.lookupVariables(style.value, context);
    if (removeDefaults) TypographyProcessor.removeDefaults(style.value);
    if (style.value.isEmpty()) style.setValue(null);
  }

  private static async lookupVariables(typography: Typography, context?: ProcessingContext): Promise<void> {
    for (const key of VARIABLE_PROPERTIES) {
      const value = typography[key];
      if (value instanceof FigmaVariableReference) {
        await value.resolveName(context?.foundations, true);
      }
    }
  }

  private static removeDefaults(typography: Typography): void {
    for (const key of TYPOGRAPHY_KEYS) {
      const fallback = TYPOGRAPHY_DEFAULTS[key as keyof typeof TYPOGRAPHY_DEFAULTS];
      if (fallback === undefined) continue;
      if (typography[key] === fallback) typography[key] = undefined;
    }
  }
}
