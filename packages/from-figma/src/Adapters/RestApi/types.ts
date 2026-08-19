export interface RestApiNode {
  id: string;
  name: string;
  type: string;
  key?: string;
  children?: RestApiNode[];
  componentPropertyDefinitions?: Record<string, unknown>;
  componentId?: string;
  [key: string]: unknown;
}

export interface RestApiFileData {
  document: RestApiNode;
  components?: Record<string, RestApiNode>;
  componentSets?: Record<string, RestApiNode>;
  styles?: Record<string, unknown>;
  variables?: Record<string, unknown>;
  schemaVersion?: number;
  name?: string;
}

export interface RestApiNodeData {
  id: string;
  name: string;
  type: string;
  children?: RestApiNodeData[];
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  size?: { x: number; y: number };
  fills?: RestPaint[];
  strokes?: RestPaint[];
  effects?: unknown[];
  styles?: {
    text?: string;
    effect?: string;
    fill?: string;
    stroke?: string;
    grid?: string;
  };
  boundVariables?: Record<string, unknown>;
  visible?: boolean;
  layoutMode?: string;
  primaryAxisSizingMode?: string;
  counterAxisSizingMode?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  layoutWrap?: string;
  layoutPositioning?: string;
  layoutSizingHorizontal?: string;
  layoutSizingVertical?: string;
  itemReverseZIndex?: boolean;
  counterAxisAlignContent?: string;
  counterAxisSpacing?: number;
  constraints?: {
    horizontal: string;
    vertical: string;
  };
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  rotation?: number;
  opacity?: number;
  clipsContent?: boolean;
  clipContent?: boolean;
  locked?: boolean;
  strokeWeight?: number;
  strokeAlign?: string;
  strokeCap?: string;
  strokeJoin?: string;
  individualStrokeWeights?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  cornerRadius?: number;
  rectangleCornerRadii?: number[];
  characters?: string;
  style?: Record<string, unknown>;
  componentId?: string;
  componentProperties?: Record<string, unknown>;
  componentPropertyDefinitions?: Record<string, unknown>;
  componentPropertyReferences?: Record<string, string>;
  [key: string]: unknown;
}

export interface RestPaint {
  type?: string;
  visible?: boolean;
  boundVariables?: Record<string, unknown>;
  gradientHandlePositions?: Array<{ x: number; y: number }>;
  gradientTransform?: number[][];
  [key: string]: unknown;
}
