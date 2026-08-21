import type { Props as SchemaProps, ResolvedConfig, AnyProp } from '@rudironsoni/specs-schema';
import type { SpecableNode } from '../Nodes/types.js';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import { Utilities } from '../../Utilities/Utilities.js';

export type RawPropDefinition = {
  type?: string;
  defaultValue?: unknown;
  variantOptions?: string[];
  preferredValues?: Array<{ type?: string; key?: string }>;
};

export class Props {
  private _items = new Map<string, AnyProp>();
  private _definitions: Record<string, RawPropDefinition> = {};
  private config: ResolvedConfig;
  private _component: SpecableNode;

  constructor(component: SpecableNode, config: ResolvedConfig) {
    this._component = component;
    this.config = config;
    this._definitions = ((component as { componentPropertyDefinitions?: Record<string, RawPropDefinition> }).componentPropertyDefinitions) ?? {};
  }

  async process(context?: ProcessingContext): Promise<void> {
    for (const [rawName, definition] of Object.entries(this._definitions)) {
      const name = Utilities.formatKey(Props.propNameWithoutId(rawName), this.config.format.keys);
      const prop = await this.toProp(definition, context);
      if (prop) this._items.set(name, prop);
    }
  }

  private async toProp(definition: RawPropDefinition, context?: ProcessingContext): Promise<AnyProp | null> {
    switch (definition.type) {
      case 'VARIANT':
        return {
          type: 'string',
          default: String(definition.defaultValue ?? ''),
          enum: (definition.variantOptions ?? []).map(String),
          $extensions: { 'com.figma': { type: 'VARIANT' } },
        };
      case 'BOOLEAN':
        return {
          type: 'boolean',
          default: Boolean(definition.defaultValue),
          $extensions: { 'com.figma': { type: 'BOOLEAN' } },
        };
      case 'TEXT':
        return {
          type: 'string',
          default: definition.defaultValue == null ? null : String(definition.defaultValue),
          $extensions: { 'com.figma': { type: 'TEXT' } },
        };
      case 'INSTANCE_SWAP': {
        const id = typeof definition.defaultValue === 'string' ? definition.defaultValue : '';
        const resolved = id && context?.nodes
          ? await context.nodes.getComponentNameForInstanceSwap(id)
          : null;
        const examples = await resolvePreferredValues(definition.preferredValues, context);
        return {
          type: 'string',
          default: resolved ?? id ?? null,
          ...(examples.length > 0 ? { examples } : {}),
          $extensions: { 'com.figma': { type: 'INSTANCE_SWAP' } },
        };
      }
      case 'SLOT':
        return {
          type: 'slot',
          default: definition.defaultValue == null ? null : String(definition.defaultValue),
          $extensions: { 'com.figma': { type: 'SLOT' } },
        };
      default:
        return null;
    }
  }

  static isNumericValue(value: string): boolean {
    if (!value || /^0\d/.test(value)) return false;
    return Number.isFinite(Number(value));
  }

  static propNameWithoutId(key: string): string {
    return key.split('#')[0] ?? key;
  }

  set(name: string, prop: AnyProp): void {
    this._items.set(name, prop);
  }

  get(name: string): AnyProp | undefined {
    return this._items.get(name);
  }

  delete(name: string): void {
    this._items.delete(name);
  }

  entries(): IterableIterator<[string, AnyProp]> {
    return this._items.entries();
  }

  applyStates(): void {
    const states = this.config.processing.states;
    if (!states) return;
    for (const [concept, entry] of Object.entries(states)) {
      const name = Utilities.formatKey(entry.prop, this.config.format.keys);
      const prop = this._items.get(name);
      if (!prop) continue;
      if (prop.type !== 'number') {
        const extensions = prop.$extensions ?? {};
        const figma = { ...(extensions['com.figma'] ?? {}), state: concept };
        prop.$extensions = { ...extensions, 'com.figma': figma };
      }
      if (entry.contract === 'omit') this._items.delete(name);
    }
  }

  data(): SchemaProps | undefined {
    if (this._items.size === 0) return undefined;
    return Object.fromEntries(this._items);
  }

  get size(): number {
    return this._items.size;
  }

  isEmpty(): boolean {
    return this._items.size === 0;
  }
}

async function resolvePreferredValues(
  preferred: RawPropDefinition['preferredValues'],
  context?: ProcessingContext,
): Promise<string[]> {
  if (!preferred || preferred.length === 0) return [];
  const names: string[] = [];
  for (const entry of preferred) {
    if (!entry.key) continue;
    const resolved = context?.nodes
      ? await context.nodes.getComponentNameForInstanceSwap(entry.key)
      : null;
    names.push(resolved ?? entry.key);
  }
  return names;
}
