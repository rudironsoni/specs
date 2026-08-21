import { DEFAULT_CONFIG, type ResolvedConfig } from '@rudironsoni/specs-schema';
import type { Settings } from './types.Settings.js';

export function configFromSettings(settings: Settings): ResolvedConfig {
  return {
    ...DEFAULT_CONFIG,
    processing: {
      ...DEFAULT_CONFIG.processing,
      details: settings.DETAILS,
      variantDepth: settings.VARIANT_DEPTH,
      ...(settings.SUBCOMPONENTS && settings.SUBCOMPONENT_NAME_PATTERN
        ? {
          subcomponents: {
            scope: 'NESTED' as const,
            match: [settings.SUBCOMPONENT_NAME_PATTERN],
          },
        }
        : {}),
    },
    format: {
      ...DEFAULT_CONFIG.format,
      output: settings.FORMAT_OUTPUT,
      keys: settings.FORMAT_KEYS,
      layout: settings.DATA_LAYOUT,
      color: settings.FORMAT_COLOR,
      tokens: settings.DATA_STYLES_VARIABLE_FORMAT === 'OBJECT'
        ? 'TOKEN'
        : settings.DATA_STYLES_VARIABLE_FORMAT === 'NAME_WITH_COLLECTION'
          ? 'TOKEN_NAME'
          : 'TOKEN_NAME',
    },
    include: {
      ...DEFAULT_CONFIG.include,
      invalidVariants: settings.DATA_INVALID_VARIANT,
      invalidCombinations: settings.DATA_INVALID_COMBINATIONS,
      emptyVariants: settings.DATA_EMPTY_VARIANTS,
    },
  };
}

export function isSettings(value: unknown): value is Settings {
  return Boolean(value && typeof value === 'object' && 'DATA_LAYOUT' in value && 'DETAILS' in value);
}
