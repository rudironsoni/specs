import type { Children as SchemaChildren, PropBinding as SchemaPropBinding, ResolvedConfig } from '@rudironsoni/specs-schema';
import { Utilities } from '../../Utilities/Utilities.js';

export class Children {
  private _items: string[] = [];
  private _binding: string | null = null;
  private _examples: Array<{ $slotContent: string }> = [];
  private config: ResolvedConfig;

  constructor(config: ResolvedConfig) {
    this.config = config;
  }

  set(value: string[] | SchemaPropBinding): void {
    if (Array.isArray(value)) {
      this._items = [...value];
      this._binding = null;
      return;
    }
    this._items = [];
    this._binding = value.$binding.replace(/^#\/props\//, '');
  }

  setExample(pointer: string): void {
    this._examples = [{ $slotContent: pointer }];
  }

  isBound(): boolean {
    return this._binding !== null;
  }

  empty(): boolean {
    return this._items.length === 0 && this._binding === null && this._examples.length === 0;
  }

  merge(layer: Children): Children {
    const merged = this.clone();
    if (layer.isBound()) {
      merged._binding = layer._binding;
      merged._items = [];
    } else if (layer._items.length > 0) {
      merged._items = [...layer._items];
      merged._binding = null;
    }
    if (layer._examples.length > 0) merged._examples = layer._examples.map((example) => ({ ...example }));
    return merged;
  }

  compare(baseline: Children): Children {
    const diff = new Children(this.config);
    if (this._binding !== baseline._binding) diff._binding = this._binding;
    if (JSON.stringify(this._items) !== JSON.stringify(baseline._items)) diff._items = [...this._items];
    if (JSON.stringify(this._examples) !== JSON.stringify(baseline._examples)) {
      diff._examples = this._examples.map((example) => ({ ...example }));
    }
    return diff;
  }

  data(): SchemaChildren | undefined {
    if (this._binding) {
      return {
        $binding: this._binding.startsWith('#/') ? this._binding : `#/props/${this._binding}`,
        ...(this._examples.length > 0 ? { examples: this._examples } : {}),
      };
    }
    if (this._items.length === 0) return undefined;
    return this._items.map((name) => Utilities.formatKey(name, this.config.format.keys));
  }

  get(): string[] | SchemaPropBinding | null {
    if (this._binding) return { $binding: `#/props/${this._binding}` };
    return this._items.length > 0 ? [...this._items] : null;
  }

  values(): IterableIterator<string> {
    return this._items.values();
  }

  [Symbol.iterator](): IterableIterator<string> {
    return this._items.values();
  }

  get size(): number {
    return this._items.length;
  }

  isEmpty(): boolean {
    return this.empty();
  }

  clone(): Children {
    const copy = new Children(this.config);
    copy._items = [...this._items];
    copy._binding = this._binding;
    copy._examples = this._examples.map((example) => ({ ...example }));
    return copy;
  }
}

export function stampChildren(elements: { get(name: string): { children: Children } | undefined }, tree: { name: string; children: Array<{ name: string; children: unknown[] }> }): void {
  const visit = (node: { name: string; children: Array<{ name: string; children: unknown[] }> }) => {
    const element = elements.get(node.name);
    if (element && node.children.length > 0 && !element.children.isBound()) {
      element.children.set(node.children.map((child) => child.name));
    }
    for (const child of node.children) visit(child as { name: string; children: Array<{ name: string; children: unknown[] }> });
  };
  visit(tree);
}
