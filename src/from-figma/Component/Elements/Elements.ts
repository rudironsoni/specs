import type { Elements as SchemaElements, ResolvedConfig } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../Nodes/types.js';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import { BaseElement } from './BaseElement.js';
import { ElementFactory } from './ElementFactory.js';

export class Elements {
  private _items = new Map<string, BaseElement>();
  private config: ResolvedConfig;

  constructor(config: ResolvedConfig, pairs: Array<{ name: string; node: FigmaElementNode }> = []) {
    this.config = config;
    for (const { name, node } of pairs) {
      this._items.set(name, ElementFactory.create(node, name, config));
    }
  }

  async detect(): Promise<void> {}

  async evaluate(context?: ProcessingContext): Promise<void> {
    for (const element of this._items.values()) {
      await element.evaluate(context);
    }
  }

  postEvaluate(): void {
    for (const element of this._items.values()) element.postEvaluate();
  }

  applyLayer(layer: Elements): Elements {
    const merged = new Elements(this.config);
    for (const [name, element] of this._items) merged._items.set(name, element.clone());
    for (const [name, element] of layer._items) {
      const existing = merged.get(name);
      merged._items.set(name, existing ? existing.merge(element) : element.clone());
    }
    return merged;
  }

  compare(baseline: Elements): Elements {
    const diff = new Elements(this.config);
    for (const [name, element] of this._items) {
      const change = element.compare(baseline.get(name));
      if (change && !change.empty()) diff._items.set(name, change);
    }
    return diff;
  }

  async postProcess(removeDefaults = true, fullElements?: Elements | null, context?: ProcessingContext): Promise<void> {
    for (const [name, element] of this._items) {
      await element.postProcess(removeDefaults, fullElements?.get(name), context);
    }
  }

  data(config: ResolvedConfig): SchemaElements | undefined {
    if (this._items.size === 0) return undefined;
    const out: SchemaElements = {};
    for (const [name, element] of this._items) {
      const data = element.data(config);
      if (Object.keys(data).length > 0) out[name] = data;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }

  get(name: string): BaseElement | undefined {
    return this._items.get(name);
  }

  set(name: string, el: BaseElement): void {
    this._items.set(name, el);
  }

  delete(name: string): void {
    this._items.delete(name);
  }

  has(name: string): boolean {
    return this._items.has(name);
  }

  [Symbol.iterator](): IterableIterator<[string, BaseElement]> {
    return this._items.entries();
  }

  entries(): IterableIterator<[string, BaseElement]> {
    return this._items.entries();
  }

  values(): IterableIterator<BaseElement> {
    return this._items.values();
  }

  keys(): IterableIterator<string> {
    return this._items.keys();
  }

  get size(): number {
    return this._items.size;
  }

  isEmpty(): boolean {
    return this._items.size === 0;
  }
}
