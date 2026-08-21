export const REST_TEXT_PROPERTIES = [
  'fontSize',
  'letterSpacing',
  'textCase',
  'textDecoration',
  'leadingTrim',
  'paragraphIndent',
  'paragraphSpacing',
  'listSpacing',
  'hangingPunctuation',
  'hangingList',
] as const;

export const REST_FONT_PROPERTIES = ['fontFamily', 'fontStyle'] as const;

export const FONT_NAME_MEMBER_MAP: Record<string, string> = {
  fontFamily: 'family',
  fontStyle: 'style',
};

export const REST_LINE_HEIGHT_PROPERTIES = {
  unit: 'lineHeightUnit',
  percentFontSize: 'lineHeightPercentFontSize',
  px: 'lineHeightPx',
} as const;

export type RestTextProperty = typeof REST_TEXT_PROPERTIES[number];
export type RestFontProperty = typeof REST_FONT_PROPERTIES[number];
