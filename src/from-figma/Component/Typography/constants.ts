export const VARIABLE_PROPERTIES = [
  'fontSize',
  'fontFamily',
  'fontStyle',
  'lineHeight',
  'letterSpacing',
  'paragraphIndent',
  'paragraphSpacing',
] as const;

export type VariableTypographyProperty = (typeof VARIABLE_PROPERTIES)[number];
