export const TYPOGRAPHY_DEFAULTS = {
  fontSize: 16,
  fontFamily: null,
  fontStyle: null,
  textCase: 'ORIGINAL',
  textDecoration: 'NONE',
  letterSpacing: 0,
  lineHeight: 'auto',
  paragraphIndent: 0,
  paragraphSpacing: 0,
  leadingTrim: 'NONE',
  listSpacing: 0,
  hangingPunctuation: false,
  hangingList: false,
} as const;

export type TypographyProperty = keyof typeof TYPOGRAPHY_DEFAULTS;
