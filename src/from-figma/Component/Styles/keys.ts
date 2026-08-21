export const STYLE_KEYS = {
  ALL: [
    'rotation', 'visible', 'opacity', 'locked',
    'backgroundColor', 'fillColor', 'textColor', 'effects',
    'clipContent', 'cornerRadius',
    'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'position', 'top', 'bottom', 'start', 'end', 'centerHorizontalOffset', 'centerVerticalOffset',
    'layoutSizingHorizontal', 'layoutSizingVertical',
    'strokes', 'strokeAlign', 'strokeWeight', 'strokeDashPattern',
    'typography', 'textAlignHorizontal', 'textAlignVertical', 'textOverflow', 'maxLines',
    'mainAxisAlignment', 'primaryAxisSizingMode', 'crossAxisAlignment',
    'layoutMode', 'wrap', 'wrapAlignment', 'itemReverseZIndex', 'itemSpacing', 'padding',
    'cornerSmoothing', 'aspectRatio',
  ],
  CONTAINER: [
    'rotation', 'visible', 'opacity', 'locked',
    'backgroundColor', 'effects', 'clipContent', 'cornerRadius',
    'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'position', 'top', 'bottom', 'start', 'end', 'centerHorizontalOffset', 'centerVerticalOffset',
    'layoutSizingHorizontal', 'layoutSizingVertical',
    'strokes', 'strokeAlign', 'strokeWeight', 'strokeDashPattern',
    'mainAxisAlignment', 'primaryAxisSizingMode', 'crossAxisAlignment',
    'layoutMode', 'wrap', 'wrapAlignment', 'itemReverseZIndex', 'itemSpacing', 'padding',
    'cornerSmoothing', 'aspectRatio',
  ],
  TEXT: [
    'visible', 'opacity', 'width', 'height',
    'position', 'top', 'bottom', 'start', 'end', 'centerHorizontalOffset', 'centerVerticalOffset',
    'layoutSizingHorizontal', 'layoutSizingVertical',
    'typography', 'textAlignHorizontal', 'textAlignVertical', 'textOverflow', 'maxLines', 'textColor',
  ],
  SHAPE: [
    'visible', 'opacity', 'rotation',
    'backgroundColor', 'effects', 'cornerRadius',
    'width', 'height',
    'position', 'top', 'bottom', 'start', 'end', 'centerHorizontalOffset', 'centerVerticalOffset',
    'layoutSizingHorizontal', 'layoutSizingVertical',
    'strokes', 'strokeAlign', 'strokeWeight', 'strokeDashPattern',
  ],
  LINE: [
    'visible', 'opacity', 'rotation', 'width', 'height',
    'strokes', 'strokeAlign', 'strokeWeight', 'strokeDashPattern',
  ],
  GLYPH: [
    'visible', 'opacity', 'width', 'height', 'fillColor', 'rotation',
  ],
} as const;

export type StyleKey = (typeof STYLE_KEYS.ALL)[number];

export function styleKeysForNodeType(type: string): readonly string[] {
  switch (type) {
    case 'TEXT':
    case 'text':
      return STYLE_KEYS.TEXT;
    case 'glyph':
      return STYLE_KEYS.GLYPH;
    case 'LINE':
    case 'line':
      return STYLE_KEYS.LINE;
    case 'VECTOR':
    case 'vector':
    case 'BOOLEAN_OPERATION':
    case 'RECTANGLE':
    case 'rectangle':
    case 'ELLIPSE':
    case 'ellipse':
    case 'STAR':
    case 'star':
    case 'POLYGON':
    case 'polygon':
      return STYLE_KEYS.SHAPE;
    default:
      return STYLE_KEYS.CONTAINER;
  }
}

export { SPEC_TO_FIGMA_KEY_MAP, toFigmaKey, FILL_SPEC_KEYS } from './figmaKeyMap.js';
export { STYLE_DEFAULTS } from './defaults.js';

export const MAIN_AXIS_MAP: Record<string, string> = {
  MIN: 'START',
  MAX: 'END',
  CENTER: 'CENTER',
  SPACE_BETWEEN: 'SPACE_BETWEEN',
};

export const CROSS_AXIS_MAP: Record<string, string> = {
  MIN: 'START',
  MAX: 'END',
  CENTER: 'CENTER',
  STRETCH: 'STRETCH',
  BASELINE: 'BASELINE',
};

export const TEXT_ALIGN_H_MAP: Record<string, string> = {
  LEFT: 'START',
  RIGHT: 'END',
  CENTER: 'CENTER',
  JUSTIFIED: 'JUSTIFY',
};
