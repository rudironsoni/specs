import type { PropConfigurations as SchemaPropConfigurations, ResolvedConfig } from '@rudironsoni/specs-schema';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import type { FigmaElementNode } from '../Nodes/types.js';
import { RestInstanceNode } from '../../Adapters/RestApi/RestInstanceNode.js';
import { Props } from '../Props/Props.js';
import { Utilities } from '../../Utilities/Utilities.js';
import { PropConfiguration } from './PropConfiguration.js';

export type PropConfigurationValue = string | number | boolean;

export class PropConfigurations {
  private _items = new Map<string, PropConfigurationValue>();
  private _types = new Map<string, string>();
  private _node: FigmaElementNode;
  private config: ResolvedConfig;

  constructor(node: FigmaElementNode, config: ResolvedConfig) {
    this._node = node;
    this.config = config;
  }

  evaluate(): void {
    if (!(this._node instanceof RestInstanceNode)) return;
    for (const [rawName, raw] of Object.entries(this._node.componentProperties)) {
      const name = Utilities.formatKey(Props.propNameWithoutId(rawName), this.config.format.keys);
      const value = unwrap(raw);
      if (value === undefined) continue;
      this._items.set(name, value);
      const type = rawType(raw);
      if (type) this._types.set(name, type);
    }
  }

  merge(layer: PropConfigurations): PropConfigurations {
    const merged = this.clone();
    for (const [key, value] of layer._items) {
      merged._items.set(key, value);
      const type = layer._types.get(key);
      if (type) merged._types.set(key, type);
    }
    return merged;
  }

  compare(baseline: PropConfigurations): PropConfigurations {
    const diff = new PropConfigurations(this._node, this.config);
    for (const [key, value] of this._items) {
      if (baseline._items.get(key) !== value) {
        diff._items.set(key, value);
        const type = this._types.get(key);
        if (type) diff._types.set(key, type);
      }
    }
    return diff;
  }

  async postProcess(context?: ProcessingContext): Promise<void> {
    if (!context?.nodes) return;
    for (const [key, value] of this._items) {
      if (typeof value !== 'string') continue;
      if (this._types.get(key) !== 'INSTANCE_SWAP' && !isLikelyComponentId(value)) continue;
      const resolved = await context.nodes.getComponentNameForInstanceSwap(value);
      if (resolved) this._items.set(key, resolved);
    }
  }

  data(): SchemaPropConfigurations | undefined {
    if (this._items.size === 0) return undefined;
    return Object.fromEntries(this._items);
  }

  get(name: string): PropConfigurationValue | undefined {
    return this._items.get(name);
  }

  set(name: string, value: PropConfigurationValue | PropConfiguration): void {
    if (value instanceof PropConfiguration) {
      this._items.set(name, value.value);
      return;
    }
    this._items.set(name, value);
  }

  [Symbol.iterator](): IterableIterator<[string, PropConfiguration]> {
    return this.entries();
  }

  *entries(): IterableIterator<[string, PropConfiguration]> {
    for (const [key, value] of this._items) yield [key, new PropConfiguration(key, value)];
  }

  values(): IterableIterator<PropConfigurationValue> {
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

  copy(source: PropConfigurations, keys?: Set<string> | string[]): void {
    const allowed = keys ? new Set(keys) : null;
    for (const [key, value] of source._items) {
      if (allowed && !allowed.has(key)) continue;
      this._items.set(key, value);
      const type = source._types.get(key);
      if (type) this._types.set(key, type);
    }
  }

  clone(): PropConfigurations {
    const copy = new PropConfigurations(this._node, this.config);
    copy.copy(this);
    return copy;
  }
}

export function unwrapPropValue(raw: unknown): PropConfigurationValue | undefined {
  return unwrap(raw);
}

function unwrap(raw: unknown): PropConfigurationValue | undefined {
  if (typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') return raw;
  if (raw && typeof raw === 'object' && 'value' in raw) {
    const value = (raw as { value: unknown }).value;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  }
  return undefined;
}

function rawType(raw: unknown): string | undefined {
  if (raw && typeof raw === 'object' && 'type' in raw && typeof (raw as { type: unknown }).type === 'string') {
    return (raw as { type: string }).type;
  }
  return undefined;
}

function isLikelyComponentId(value: string): boolean {
  return /^\d+:\d+$/.test(value);
}
