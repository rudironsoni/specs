export const SPEC_TO_FIGMA_KEY_MAP: Readonly<Record<string, string>> = {
  backgroundColor: 'fills',
  fillColor: 'fills',
  textColor: 'fills',
  strokes: 'strokes',
  clipContent: 'clipsContent',
  wrap: 'layoutWrap',
  mainAxisAlignment: 'primaryAxisAlignItems',
  crossAxisAlignment: 'counterAxisAlignItems',
};

export function toFigmaKey(specKey: string): string {
  return SPEC_TO_FIGMA_KEY_MAP[specKey] ?? specKey;
}

export const FILL_SPEC_KEYS: ReadonlyArray<string> = ['backgroundColor', 'fillColor', 'textColor'];
