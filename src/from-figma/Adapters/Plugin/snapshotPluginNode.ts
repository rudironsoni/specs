import type { RestApiNodeData } from '../RestApi/types.js';

type PluginLike = {
  id: string;
  name: string;
  type: string;
  children?: readonly PluginLike[];
  fills?: unknown;
  strokes?: unknown;
  effects?: unknown;
  visible?: boolean;
  opacity?: number;
  rotation?: number;
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  layoutMode?: string;
  layoutSizingHorizontal?: string;
  layoutSizingVertical?: string;
  primaryAxisAlignItems?: string;
  counterAxisAlignItems?: string;
  locked?: boolean;
  itemReverseZIndex?: boolean;
  constraints?: { horizontal: string; vertical: string };
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  itemSpacing?: number;
  layoutWrap?: string;
  layoutPositioning?: string;
  characters?: string;
  fontSize?: number | symbol;
  fontName?: { family: string; style: string } | symbol;
  letterSpacing?: number | { value: number; unit: string } | symbol;
  lineHeight?: number | { value: number; unit: string } | symbol;
  textAlignHorizontal?: string;
  textAlignVertical?: string;
  textCase?: string;
  textDecoration?: string;
  paragraphIndent?: number;
  paragraphSpacing?: number;
  textTruncation?: string;
  maxLines?: number | null;
  fillStyleId?: string | symbol;
  textStyleId?: string | symbol;
  strokeStyleId?: string | symbol;
  effectStyleId?: string | symbol;
  componentId?: string;
  componentProperties?: Record<string, unknown>;
  componentPropertyDefinitions?: Record<string, unknown>;
  componentPropertyReferences?: Record<string, string>;
  boundVariables?: Record<string, unknown>;
  clipsContent?: boolean;
  strokeWeight?: number;
  strokeAlign?: string;
  dashPattern?: number[];
  strokeDashes?: number[];
  minWidth?: number | null;
  maxWidth?: number | null;
  minHeight?: number | null;
  maxHeight?: number | null;
  counterAxisSpacing?: number;
  counterAxisAlignContent?: string;
  targetAspectRatio?: { x: number; y: number } | null;
  cornerRadius?: number;
  topLeftRadius?: number;
  topRightRadius?: number;
  bottomRightRadius?: number;
  bottomLeftRadius?: number;
  getMainComponentAsync?: () => Promise<{ id: string } | null>;
};

export async function snapshotPluginNode(node: PluginLike): Promise<RestApiNodeData> {
  const children: RestApiNodeData[] = [];
  for (const child of node.children ?? []) {
    children.push(await snapshotPluginNode(child));
  }
  let componentId = node.componentId;
  if (!componentId && node.getMainComponentAsync) {
    componentId = (await node.getMainComponentAsync())?.id;
  }
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    children,
    fills: cloneList(node.fills),
    strokes: cloneList(node.strokes),
    effects: cloneList(node.effects),
    visible: node.visible,
    opacity: node.opacity,
    rotation: node.rotation,
    absoluteBoundingBox: {
      x: node.x ?? 0,
      y: node.y ?? 0,
      width: node.width ?? 0,
      height: node.height ?? 0,
    },
    layoutMode: node.layoutMode,
    layoutSizingHorizontal: node.layoutSizingHorizontal,
    layoutSizingVertical: node.layoutSizingVertical,
    primaryAxisAlignItems: node.primaryAxisAlignItems,
    counterAxisAlignItems: node.counterAxisAlignItems,
    locked: node.locked,
    itemReverseZIndex: node.itemReverseZIndex,
    constraints: node.constraints,
    paddingLeft: node.paddingLeft,
    paddingRight: node.paddingRight,
    paddingTop: node.paddingTop,
    paddingBottom: node.paddingBottom,
    itemSpacing: node.itemSpacing,
    layoutWrap: node.layoutWrap,
    layoutPositioning: node.layoutPositioning,
    characters: node.characters,
    style: textStyle(node),
    styles: publishedStyles(node),
    textTruncation: node.textTruncation,
    maxLines: node.maxLines ?? undefined,
    componentId,
    componentProperties: node.componentProperties,
    componentPropertyDefinitions: node.componentPropertyDefinitions,
    componentPropertyReferences: node.componentPropertyReferences,
    boundVariables: node.boundVariables,
    clipContent: node.clipsContent,
    strokeWeight: node.strokeWeight,
    strokeAlign: node.strokeAlign,
    strokeDashes: node.strokeDashes ?? node.dashPattern,
    minWidth: node.minWidth ?? undefined,
    maxWidth: node.maxWidth ?? undefined,
    minHeight: node.minHeight ?? undefined,
    maxHeight: node.maxHeight ?? undefined,
    counterAxisSpacing: node.counterAxisSpacing,
    counterAxisAlignContent: node.counterAxisAlignContent,
    targetAspectRatio: node.targetAspectRatio ?? undefined,
    cornerRadius: typeof node.cornerRadius === 'number' ? node.cornerRadius : undefined,
    rectangleCornerRadii: radii(node),
  };
}

function cloneList(value: unknown): never[] | undefined {
  if (!value || typeof value === 'symbol') return undefined;
  return JSON.parse(JSON.stringify(value)) as never[];
}

function textStyle(node: PluginLike): Record<string, unknown> | undefined {
  const style: Record<string, unknown> = {};
  if (typeof node.fontSize === 'number') style.fontSize = node.fontSize;
  else if (typeof node.fontSize === 'symbol') style.fontSize = 'mixed';
  if (node.fontName && typeof node.fontName === 'object') {
    style.fontFamily = node.fontName.family;
    style.fontStyle = node.fontName.style;
  }
  if (typeof node.letterSpacing === 'number') style.letterSpacing = node.letterSpacing;
  else if (node.letterSpacing && typeof node.letterSpacing === 'object') style.letterSpacing = node.letterSpacing;
  if (typeof node.lineHeight === 'number') style.lineHeightPx = node.lineHeight;
  else if (node.lineHeight && typeof node.lineHeight === 'object') {
    const height = node.lineHeight as { value: number; unit: string };
    if (height.unit === 'PIXELS') style.lineHeightPx = height.value;
    else if (height.unit === 'PERCENT') style.lineHeightPercentFontSize = height.value;
    else if (height.unit === 'AUTO') style.lineHeightUnit = 'INTRINSIC_%';
  }
  if (node.textAlignHorizontal) style.textAlignHorizontal = node.textAlignHorizontal;
  if (node.textAlignVertical) style.textAlignVertical = node.textAlignVertical;
  if (node.textCase) style.textCase = node.textCase;
  if (node.textDecoration) style.textDecoration = node.textDecoration;
  if (typeof node.paragraphIndent === 'number') style.paragraphIndent = node.paragraphIndent;
  if (typeof node.paragraphSpacing === 'number') style.paragraphSpacing = node.paragraphSpacing;
  if (node.textTruncation) style.textTruncation = node.textTruncation;
  if (typeof node.maxLines === 'number') style.maxLines = node.maxLines;
  return Object.keys(style).length > 0 ? style : undefined;
}

function publishedStyles(node: PluginLike): RestApiNodeData['styles'] | undefined {
  const styles: NonNullable<RestApiNodeData['styles']> = {};
  if (typeof node.fillStyleId === 'string') styles.fill = node.fillStyleId;
  if (typeof node.textStyleId === 'string') styles.text = node.textStyleId;
  if (typeof node.strokeStyleId === 'string') styles.stroke = node.strokeStyleId;
  if (typeof node.effectStyleId === 'string') styles.effect = node.effectStyleId;
  return Object.keys(styles).length > 0 ? styles : undefined;
}

function radii(node: PluginLike): number[] | undefined {
  if (
    typeof node.topLeftRadius === 'number'
    && typeof node.topRightRadius === 'number'
    && typeof node.bottomRightRadius === 'number'
    && typeof node.bottomLeftRadius === 'number'
  ) {
    return [node.topLeftRadius, node.topRightRadius, node.bottomRightRadius, node.bottomLeftRadius];
  }
  return undefined;
}
