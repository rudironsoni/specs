import type { StyleKey } from './keys.js';

export const STYLE_DEFAULTS: Record<string, string | number | boolean | null> = {
  visible: true,
  opacity: 1,
  locked: false,
  rotation: 0,
  clipContent: false,
  strokeAlign: 'INSIDE',
  layoutMode: 'NONE',
  wrap: false,
  itemReverseZIndex: false,
  padding: 0,
  strokeWeight: 0,
  cornerRadius: 0,
  textOverflow: 'CLIP',
  cornerSmoothing: 0,
  itemSpacing: 0,
  primaryAxisSizingMode: 'AUTO',
};

export type StyleDefaultKey = Extract<StyleKey, keyof typeof STYLE_DEFAULTS>;
