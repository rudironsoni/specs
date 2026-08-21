import type { NodeIndexer } from './NodeIndexer.js';
import type { RestApiNodeData, RestPaint } from './types.js';
import { wrapNode } from './wrapNode.js';

export const FIGMA_MIXED = Symbol('figma.mixed');
const MIXED = FIGMA_MIXED;

function mapConstraint(value: string | undefined, axis: 'horizontal' | 'vertical'): string {
  if (!value) return axis === 'horizontal' ? 'MIN' : 'MIN';
  switch (value) {
    case 'LEFT':
    case 'TOP':
      return 'MIN';
    case 'RIGHT':
    case 'BOTTOM':
      return 'MAX';
    case 'LEFT_RIGHT':
    case 'TOP_BOTTOM':
      return 'STRETCH';
    default:
      return value;
  }
}

export class RestBaseNode {
  protected _data: RestApiNodeData;
  protected _parent: RestBaseNode | null;
  protected _indexer: NodeIndexer | null = null;
  protected _childrenCache: RestBaseNode[] | null = null;

  constructor(data: RestApiNodeData, parent: RestBaseNode | null = null) {
    this._data = data;
    this._parent = parent;
  }

  setIndexer(indexer: NodeIndexer): void {
    this._indexer = indexer;
    for (const child of this.children) child.setIndexer(indexer);
  }

  get raw(): RestApiNodeData {
    return this._data;
  }

  get indexer(): NodeIndexer | null {
    return this._indexer;
  }

  get id(): string {
    return this._data.id;
  }

  get name(): string {
    return this._data.name;
  }

  get type(): string {
    return this._data.type;
  }

  get parent(): RestBaseNode | null {
    return this._parent;
  }

  get removed(): boolean {
    return false;
  }

  get styles(): RestApiNodeData['styles'] {
    return this._data.styles;
  }

  get style(): Record<string, unknown> | undefined {
    return this._data.style;
  }

  findChild(callback: (node: RestBaseNode) => boolean): RestBaseNode | null {
    return this.children.find(callback) ?? null;
  }

  findAll(callback?: (node: RestBaseNode) => boolean): RestBaseNode[] {
    const matches: RestBaseNode[] = [];
    const visit = (node: RestBaseNode) => {
      if (!callback || callback(node)) matches.push(node);
      for (const child of node.children) visit(child);
    };
    for (const child of this.children) visit(child);
    return matches;
  }

  protected wrapChild(childData: RestApiNodeData): RestBaseNode {
    return wrapNode(childData, this);
  }

  setPluginData(_key: string, _value: string): void {}

  getPluginData(_key: string): string {
    return '';
  }

  get fills(): readonly RestPaint[] {
    return (this._data.fills ?? []).map((paint) => RestBaseNode.adaptPaint(paint));
  }

  get strokes(): readonly RestPaint[] {
    return (this._data.strokes ?? []).map((paint) => RestBaseNode.adaptPaint(paint));
  }

  get effects(): readonly unknown[] {
    return this._data.effects ?? [];
  }

  get boundVariables(): Record<string, unknown> | undefined {
    const fromPaints: Record<string, unknown> = {};
    const collect = (paints: readonly RestPaint[] | undefined, key: string) => {
      if (!paints) return;
      const bindings = paints
        .map((paint) => paint.boundVariables)
        .filter((value): value is Record<string, unknown> => Boolean(value));
      if (bindings.length > 0) fromPaints[key] = bindings;
    };
    collect(this._data.fills, 'fills');
    collect(this._data.strokes, 'strokes');
    collect(this._data.effects as RestPaint[] | undefined, 'effects');

    const raw = { ...(this._data.boundVariables ?? {}), ...fromPaints } as Record<string, unknown>;
    const size = raw.size as { x?: unknown; y?: unknown } | undefined;
    if (size) {
      if (size.x !== undefined) raw.width = size.x;
      if (size.y !== undefined) raw.height = size.y;
    }
    const radii = raw.rectangleCornerRadii as Record<string, unknown> | undefined;
    if (radii) {
      if (radii.RECTANGLE_TOP_LEFT_CORNER_RADIUS) raw.topLeftRadius = radii.RECTANGLE_TOP_LEFT_CORNER_RADIUS;
      if (radii.RECTANGLE_TOP_RIGHT_CORNER_RADIUS) raw.topRightRadius = radii.RECTANGLE_TOP_RIGHT_CORNER_RADIUS;
      if (radii.RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS) raw.bottomRightRadius = radii.RECTANGLE_BOTTOM_RIGHT_CORNER_RADIUS;
      if (radii.RECTANGLE_BOTTOM_LEFT_CORNER_RADIUS) raw.bottomLeftRadius = radii.RECTANGLE_BOTTOM_LEFT_CORNER_RADIUS;
    }
    return Object.keys(raw).length > 0 ? raw : undefined;
  }

  get fillStyleId(): string | typeof MIXED {
    return this._data.styles?.fill ?? '';
  }

  get strokeStyleId(): string {
    return this._data.styles?.stroke ?? '';
  }

  get textStyleId(): string | typeof MIXED {
    return this._data.styles?.text ?? '';
  }

  get effectStyleId(): string {
    return this._data.styles?.effect ?? '';
  }

  get gridStyleId(): string {
    return this._data.styles?.grid ?? '';
  }

  get layoutMode(): string {
    return this._data.layoutMode ?? 'NONE';
  }

  get primaryAxisSizingMode(): string {
    return this._data.primaryAxisSizingMode ?? 'AUTO';
  }

  get counterAxisSizingMode(): string {
    return this._data.counterAxisSizingMode ?? 'AUTO';
  }

  get primaryAxisAlignItems(): string {
    return this._data.primaryAxisAlignItems ?? 'MIN';
  }

  get counterAxisAlignItems(): string {
    return this._data.counterAxisAlignItems ?? 'MIN';
  }

  get paddingLeft(): number {
    return this._data.paddingLeft ?? 0;
  }

  get paddingRight(): number {
    return this._data.paddingRight ?? 0;
  }

  get paddingTop(): number {
    return this._data.paddingTop ?? 0;
  }

  get paddingBottom(): number {
    return this._data.paddingBottom ?? 0;
  }

  get itemSpacing(): number {
    return this._data.itemSpacing ?? 0;
  }

  get layoutWrap(): string {
    return this._data.layoutWrap ?? 'NO_WRAP';
  }

  get layoutPositioning(): string {
    return this._data.layoutPositioning ?? 'AUTO';
  }

  get layoutSizingHorizontal(): string {
    return this._data.layoutSizingHorizontal ?? 'FIXED';
  }

  get layoutSizingVertical(): string {
    return this._data.layoutSizingVertical ?? 'FIXED';
  }

  get itemReverseZIndex(): boolean {
    return Boolean(this._data.itemReverseZIndex);
  }

  get counterAxisAlignContent(): string {
    return this._data.counterAxisAlignContent ?? 'AUTO';
  }

  get counterAxisSpacing(): number {
    return this._data.counterAxisSpacing ?? 0;
  }

  get constraints(): { horizontal: string; vertical: string } {
    return {
      horizontal: mapConstraint(this._data.constraints?.horizontal, 'horizontal'),
      vertical: mapConstraint(this._data.constraints?.vertical, 'vertical'),
    };
  }

  get minWidth(): number | null {
    return this._data.minWidth ?? null;
  }

  get maxWidth(): number | null {
    return this._data.maxWidth ?? null;
  }

  get minHeight(): number | null {
    return this._data.minHeight ?? null;
  }

  get maxHeight(): number | null {
    return this._data.maxHeight ?? null;
  }

  get clipContent(): boolean {
    return Boolean(this._data.clipContent ?? this._data.clipsContent);
  }

  get locked(): boolean {
    return Boolean(this._data.locked);
  }

  get opacity(): number {
    return this._data.opacity ?? 1;
  }

  get cornerSmoothing(): number {
    return 0;
  }

  get rotation(): number {
    return this._data.rotation ?? 0;
  }

  get strokeWeight(): number {
    return this._data.strokeWeight ?? 0;
  }

  get strokeAlign(): string {
    return this._data.strokeAlign ?? 'INSIDE';
  }

  get strokeDashes(): number[] | undefined {
    const dashes = this._data.strokeDashes ?? this._data.dashPattern;
    return Array.isArray(dashes) ? dashes as number[] : undefined;
  }

  get strokeCap(): string {
    return this._data.strokeCap ?? 'NONE';
  }

  get strokeJoin(): string {
    return this._data.strokeJoin ?? 'MITER';
  }

  get strokeTopWeight(): number {
    return this._data.individualStrokeWeights?.top ?? this.strokeWeight;
  }

  get strokeBottomWeight(): number {
    return this._data.individualStrokeWeights?.bottom ?? this.strokeWeight;
  }

  get strokeLeftWeight(): number {
    return this._data.individualStrokeWeights?.left ?? this.strokeWeight;
  }

  get strokeRightWeight(): number {
    return this._data.individualStrokeWeights?.right ?? this.strokeWeight;
  }

  get cornerRadius(): number | typeof MIXED {
    if (this._data.rectangleCornerRadii && this._data.rectangleCornerRadii.length === 4) {
      const [a, b, c, d] = this._data.rectangleCornerRadii;
      if (a === b && b === c && c === d) return a;
      return MIXED;
    }
    return this._data.cornerRadius ?? 0;
  }

  get topLeftRadius(): number {
    return this._data.rectangleCornerRadii?.[0] ?? this._data.cornerRadius ?? 0;
  }

  get topRightRadius(): number {
    return this._data.rectangleCornerRadii?.[1] ?? this._data.cornerRadius ?? 0;
  }

  get bottomRightRadius(): number {
    return this._data.rectangleCornerRadii?.[2] ?? this._data.cornerRadius ?? 0;
  }

  get bottomLeftRadius(): number {
    return this._data.rectangleCornerRadii?.[3] ?? this._data.cornerRadius ?? 0;
  }

  get textAlignHorizontal(): string {
    return String(this._data.style?.textAlignHorizontal ?? 'LEFT');
  }

  get textAlignVertical(): string {
    return String(this._data.style?.textAlignVertical ?? 'TOP');
  }

  get textTruncation(): string | undefined {
    return (this._data.style?.textTruncation as string | undefined)
      ?? (this._data.textTruncation as string | undefined);
  }

  get targetAspectRatio(): { x: number; y: number } | null {
    const value = this._data.targetAspectRatio as { x?: number; y?: number } | undefined;
    if (!value || typeof value.x !== 'number' || typeof value.y !== 'number') return null;
    return { x: value.x, y: value.y };
  }

  get maxLines(): number | null {
    const value = this._data.style?.maxLines ?? this._data.maxLines;
    return typeof value === 'number' ? value : null;
  }

  get characters(): string {
    return this._data.characters ?? '';
  }

  get characterStyleOverrides(): number[] | undefined {
    return this._data.characterStyleOverrides as number[] | undefined;
  }

  get styleOverrideTable(): Record<string, Record<string, unknown>> | undefined {
    return this._data.styleOverrideTable as Record<string, Record<string, unknown>> | undefined;
  }

  get componentPropertyReferences(): Record<string, string> | null {
    return this._data.componentPropertyReferences ?? null;
  }

  get width(): number {
    return this._data.absoluteBoundingBox?.width ?? this._data.size?.x ?? 0;
  }

  get height(): number {
    return this._data.absoluteBoundingBox?.height ?? this._data.size?.y ?? 0;
  }

  get x(): number {
    return this._data.absoluteBoundingBox?.x ?? 0;
  }

  get y(): number {
    return this._data.absoluteBoundingBox?.y ?? 0;
  }

  get absoluteBoundingBox(): RestApiNodeData['absoluteBoundingBox'] | null {
    return this._data.absoluteBoundingBox ?? null;
  }

  get visible(): boolean {
    return this._data.visible !== false;
  }

  async getMainComponentAsync(): Promise<RestBaseNode | null> {
    return null;
  }

  get children(): RestBaseNode[] {
    if (!this._childrenCache) this._childrenCache = this._buildChildren();
    return this._childrenCache;
  }

  protected _buildChildren(): RestBaseNode[] {
    return (this._data.children ?? []).map((child) => this.wrapChild(child));
  }

  private static adaptPaint(paint: RestPaint): RestPaint {
    const adapted: RestPaint = { ...paint, visible: paint.visible !== false };
    if (paint.gradientHandlePositions && !paint.gradientTransform) {
      adapted.gradientTransform = RestBaseNode.handlePositionsToTransform(
        paint.gradientHandlePositions,
        paint.type,
      );
    }
    return adapted;
  }

  private static handlePositionsToTransform(
    handles: Array<{ x: number; y: number }>,
    type: string | undefined,
  ): number[][] {
    const [p0, p1, p2] = handles;
    if (!p0 || !p1 || !p2) return [[1, 0, 0], [0, 1, 0]];
    if (type === 'GRADIENT_LINEAR') {
      return [
        [p1.x - p0.x, 2 * (p0.x - p2.x), p2.x],
        [p1.y - p0.y, 2 * (p0.y - p2.y), p2.y],
      ];
    }
    return [
      [p1.x - p0.x, p2.x - p0.x, p0.x],
      [p1.y - p0.y, p2.y - p0.y, p0.y],
    ];
  }

  toString(): string {
    return `${this.type}(${this.id} ${this.name})`;
  }
}
