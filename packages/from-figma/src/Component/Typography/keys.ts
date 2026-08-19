export const TYPOGRAPHY_KEYS = [
  'fontSize',
  'fontFamily',
  'fontStyle',
  'lineHeight',
  'letterSpacing',
  'textCase',
  'textDecoration',
  'paragraphIndent',
  'paragraphSpacing',
  'leadingTrim',
  'listSpacing',
  'hangingPunctuation',
  'hangingList',
] as const;

export type TypographyKey = (typeof TYPOGRAPHY_KEYS)[number];
