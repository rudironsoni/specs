import type { ResolvedConfig, Subcomponents as SchemaSubcomponents } from '@rudironsoni/specs-schema';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import type { Anatomy } from '../Anatomy/Anatomy.js';
import { RestInstanceNode } from '../../Adapters/RestApi/RestInstanceNode.js';
import { Utilities } from '../../Utilities/Utilities.js';
import { Subcomponent } from './Subcomponent.js';

export class Subcomponents {
  private _items = new Map<string, Subcomponent>();
  private _refMap = new Map<string, string>();

  constructor(private config: ResolvedConfig) {}

  private createSubcomponent(
    node: import('../Nodes/types.js').SpecableNode,
    childConfig: ResolvedConfig,
    parentComponentName: string,
    key: string,
  ): Subcomponent {
    const child = new Subcomponent(node, childConfig);
    child.setPathContext(parentComponentName, key);
    return child;
  }

  static matchesPatterns(name: string, patterns: string[], componentName: string): string | null {
    const normalized = Utilities.normalizeName(name);
    for (const pattern of patterns) {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(
        `^${escaped.replace(/\\\{C\\\}/g, escapeRegex(componentName)).replace(/\\\{S\\\}/g, '(.+)')}$`,
      );
      const match = normalized.match(regex);
      if (match?.[1]) return Utilities.normalizeName(match[1]);
    }
    return null;
  }

  async evaluate(
    componentName: string,
    anatomy: Anatomy,
    context?: ProcessingContext,
    rootNodeId?: string,
  ): Promise<void> {
    const settings = this.config.processing.subcomponents;
    if (!settings) return;

    const childConfig: ResolvedConfig = {
      ...this.config,
      processing: { ...this.config.processing, subcomponents: undefined },
    };

    await this.evaluateAnatomy(componentName, anatomy, context, childConfig);
    if (settings.scope === 'PAGE' && context?.nodes && rootNodeId) {
      await this.evaluatePage(componentName, context, childConfig, rootNodeId);
    }
  }

  private async evaluateAnatomy(
    componentName: string,
    anatomy: Anatomy,
    context: ProcessingContext | undefined,
    childConfig: ResolvedConfig,
  ): Promise<void> {
    const settings = this.config.processing.subcomponents;
    if (!settings) return;
    for (const [, element] of anatomy) {
      const node = (element as unknown as { node?: { name: string } }).node;
      const layerName = node?.name ?? '';
      const captured = Subcomponents.matchesPatterns(layerName, settings.match, componentName);
      if (!captured) continue;
      if (settings.exclude && Subcomponents.matchesPatterns(layerName, settings.exclude, componentName)) continue;

      const key = Utilities.formatKey(captured, this.config.format.keys);
      const instance = element as unknown as { node?: unknown };
      if (!(instance.node instanceof RestInstanceNode)) continue;
      const main = await instance.node.getMainComponentAsync();
      if (!main) continue;

      const child = this.createSubcomponent(main, childConfig, componentName, key);
      await child.process(context);
      this._items.set(key, child);
      this._refMap.set(Utilities.normalizeName(instance.node.instanceOf ?? layerName), key);
      element.instanceOf = { $ref: `#/subcomponents/${key}` };
    }
  }

  private async evaluatePage(
    componentName: string,
    context: ProcessingContext,
    childConfig: ResolvedConfig,
    rootNodeId: string,
  ): Promise<void> {
    const settings = this.config.processing.subcomponents;
    if (!settings || !context.nodes) return;
    const siblings = await context.nodes.getPageSiblings(rootNodeId, ['COMPONENT', 'COMPONENT_SET']);
    for (const sibling of siblings) {
      if (sibling.id === rootNodeId) continue;
      const captured = Subcomponents.matchesPatterns(sibling.name, settings.match, componentName);
      if (!captured) continue;
      if (settings.exclude && Subcomponents.matchesPatterns(sibling.name, settings.exclude, componentName)) continue;
      const key = Utilities.formatKey(captured, this.config.format.keys);
      if (this._items.has(key)) continue;
      const child = this.createSubcomponent(sibling.node, childConfig, componentName, key);
      await child.process(context);
      this._items.set(key, child);
      this._refMap.set(Utilities.normalizeName(sibling.name), key);
    }
  }

  data(): SchemaSubcomponents | undefined {
    if (this._items.size === 0) return undefined;
    const out: SchemaSubcomponents = {};
    for (const [key, component] of this._items) {
      const spec = component.json();
      const { metadata: _metadata, subcomponents: _sub, ...rest } = spec;
      out[key] = rest;
    }
    return out;
  }

  refMap(): Map<string, string> {
    return this._refMap;
  }

  get size(): number {
    return this._items.size;
  }

  isEmpty(): boolean {
    return this._items.size === 0;
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
