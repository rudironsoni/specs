export const FIGMA_ELEMENT_NODE_TYPES = [
  'COMPONENT',
  'FRAME',
  'INSTANCE',
  'TEXT',
  'VECTOR',
  'BOOLEAN_OPERATION',
  'LINE',
  'STAR',
  'POLYGON',
  'RECTANGLE',
  'ELLIPSE',
  'SLOT',
] as const;

export type FigmaElementNodeType = (typeof FIGMA_ELEMENT_NODE_TYPES)[number];

export const ORGANIZATIONAL_TYPES = new Set(['DOCUMENT', 'CANVAS', 'PAGE', 'SECTION', 'GROUP']);
export const CONTAINER_TYPES = new Set(['FRAME', 'COMPONENT', 'COMPONENT_SET']);
export const BOUNDARY_TYPES = new Set(['COMPONENT', 'COMPONENT_SET', 'INSTANCE']);
