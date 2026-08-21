import type { TokenReference } from '@rudironsoni/specs-schema';

export const SIDES_DIRECTION_MAP = {
  left: 'start',
  right: 'end',
  top: 'top',
  bottom: 'bottom',
} as const;

export const CORNERS_DIRECTION_MAP = {
  topLeft: 'topStart',
  topRight: 'topEnd',
  bottomRight: 'bottomEnd',
  bottomLeft: 'bottomStart',
} as const;

export type LogicalSide = typeof SIDES_DIRECTION_MAP[keyof typeof SIDES_DIRECTION_MAP];
export type LogicalCorner = typeof CORNERS_DIRECTION_MAP[keyof typeof CORNERS_DIRECTION_MAP];

export const PADDING_FIGMA_KEYS = {
  paddingTop: 'top',
  paddingBottom: 'bottom',
  paddingLeft: 'start',
  paddingRight: 'end',
} as const;

export const STROKE_WEIGHT_FIGMA_KEYS = {
  strokeTopWeight: 'top',
  strokeBottomWeight: 'bottom',
  strokeLeftWeight: 'start',
  strokeRightWeight: 'end',
} as const;

export const CORNER_RADIUS_FIGMA_KEYS = {
  topLeftRadius: 'topStart',
  topRightRadius: 'topEnd',
  bottomRightRadius: 'bottomEnd',
  bottomLeftRadius: 'bottomStart',
} as const;

export const STYLE_KEYS_PRIMITIVE_MAP = {
  TYPOGRAPHY: { keys: ['typography'], tokenType: 'typography' as const },
  COLOR: { keys: ['backgroundColor', 'fillColor', 'textColor', 'strokes'], tokenType: 'color' as const },
  STROKE: { keys: ['strokeWeight', 'strokeDashPattern'], tokenType: 'dimension' as const },
  CORNER: { keys: ['cornerRadius', 'cornerSmoothing'], tokenType: 'dimension' as const },
  PADDING: { keys: ['padding'], tokenType: 'dimension' as const },
  PURE_NUMBER_DIMENSIONLESS: { keys: ['opacity', 'rotation'], tokenType: 'number' as const },
  PURE_NUMBER_DIMENSIONS: {
    keys: ['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'itemSpacing'],
    tokenType: 'dimension' as const,
  },
  MIXABLE_STRING: { keys: ['textOverflow'], tokenType: 'string' as const },
  PURE_STRING: {
    keys: [
      'layoutMode', 'layoutSizingHorizontal', 'layoutSizingVertical', 'strokeAlign',
      'mainAxisAlignment', 'crossAxisAlignment', 'primaryAxisSizingMode',
      'textAlignHorizontal', 'textAlignVertical', 'wrapAlignment',
    ],
    tokenType: 'string' as const,
  },
  BOOLEAN: {
    keys: ['visible', 'locked', 'clipContent', 'itemReverseZIndex', 'wrap'],
    tokenType: undefined,
  },
  EFFECTS: { keys: ['effects'], tokenType: 'effects' as const },
  ASPECT_RATIO: { keys: ['aspectRatio'], tokenType: undefined },
} as const;

export const STYLE_KEYS_PRIMITIVE: Record<string, string> = Object.fromEntries(
  Object.entries(STYLE_KEYS_PRIMITIVE_MAP).flatMap(([group, entry]) => (
    entry.keys.map((key) => [key, group])
  )),
);

export const STYLE_KEY_TO_TOKEN_TYPE: Record<string, TokenReference['$type']> = Object.fromEntries(
  Object.values(STYLE_KEYS_PRIMITIVE_MAP).flatMap((entry) => (
    entry.tokenType ? entry.keys.map((key) => [key, entry.tokenType]) : []
  )),
);
