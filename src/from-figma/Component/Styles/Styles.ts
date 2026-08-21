import type { ResolvedConfig, Styles as SchemaStyles } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../Nodes/types.js';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import { Style } from './Style.js';
import { styleKeysForNodeType } from './keys.js';
import { StylesProcessor } from './StylesProcessor.js';

export class Styles {
  private _items = new Map<string, Style>();
  private _node: FigmaElementNode;
  private _context?: ProcessingContext;

  constructor(node: FigmaElementNode, context?: ProcessingContext) {
    this._node = node;
    this._context = context;
  }

  get node(): FigmaElementNode {
    return this._node;
  }

  get context(): ProcessingContext | undefined {
    return this._context;
  }

  evaluate(context?: ProcessingContext, keys?: readonly string[]): void {
    this._context = context ?? this._context;
    const selected = keys ?? styleKeysForNodeType(this._node.type);
    for (const key of selected) {
      const style = Style.fromNode(this._node, key, this._context);
      if (style.value !== null && style.value !== undefined) {
        this._items.set(key, style);
      }
    }
  }

  merge(layer: Styles): Styles {
    const merged = this.clone();
    for (const [key, style] of layer._items) {
      merged._items.set(key, style.clone());
    }
    return merged;
  }

  compare(baseline: Styles): Styles {
    const diff = new Styles(this._node, this._context);
    for (const [key, style] of this._items) {
      const previous = baseline.get(key);
      if (!previous) {
        diff._items.set(key, style.clone());
        continue;
      }
      const change = style.difference(previous);
      if (change) diff._items.set(key, change);
    }
    return diff;
  }

  postEvaluate(): void {
    StylesProcessor.postEvaluate(this);
  }

  async postProcess(removeDefaults: boolean, fullStyles: Styles | undefined, context?: ProcessingContext): Promise<void> {
    await StylesProcessor.postProcess(this, removeDefaults, fullStyles, context);
  }

  data(config: ResolvedConfig): SchemaStyles | undefined {
    if (this._items.size === 0) return undefined;
    const out: Record<string, unknown> = {};
    for (const [key, style] of this._items) {
      if (style.value === null || style.value === undefined) continue;
      if (typeof style.value === 'object' && !(style.value instanceof Object && 'data' in style.value) && Object.keys(style.value as object).length === 0) continue;
      out[key] = style.data(config);
    }
    return out as SchemaStyles;
  }

  remove(key: string): void {
    this._items.delete(key);
  }

  clone(): Styles {
    const copy = new Styles(this._node, this._context);
    for (const [key, style] of this._items) copy._items.set(key, style.clone());
    return copy;
  }

  get(key: string): Style | undefined {
    return this._items.get(key);
  }

  set(key: string, style: Style): void {
    this._items.set(key, style);
  }

  has(key: string): boolean {
    return this._items.has(key);
  }

  entries(): IterableIterator<[string, Style]> {
    return this._items.entries();
  }

  values(): IterableIterator<Style> {
    return this._items.values();
  }

  keys(): IterableIterator<string> {
    return this._items.keys();
  }

  [Symbol.iterator](): IterableIterator<[string, Style]> {
    return this._items.entries();
  }

  get size(): number {
    return this._items.size;
  }

  isEmpty(): boolean {
    return this._items.size === 0;
  }
}
