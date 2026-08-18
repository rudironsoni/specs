import type { InstanceExample as SchemaInstanceExample, InstanceExamples as SchemaInstanceExamples, ResolvedConfig, SlotContent as SchemaSlotContent, SlotContentRef } from '@rudironsoni/specs-schema';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import { RestInstanceNode } from '../../Adapters/RestApi/RestInstanceNode.js';
import { Utilities } from '../../Utilities/Utilities.js';
import { InstanceExample } from './InstanceExample.js';

export class InstanceExamples {
  private _items = new Map<string, InstanceExample>();
  private _slotRefs = new Map<string, Record<string, SlotContentRef>>();
  private _hosts: Array<{ node: RestInstanceNode; key: string }> = [];

  constructor(private config: ResolvedConfig) {}

  static matchesExamplePattern(name: string, patterns: string[], componentName: string): boolean {
    const normalized = Utilities.normalizeName(name);
    return patterns.some((pattern) => {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(
        `^${escaped.replace(/\\\{C\\\}/g, escapeRegex(componentName)).replace(/\\\*/g, '.*')}$`,
      );
      return regex.test(normalized);
    });
  }

  async evaluate(
    componentName: string,
    acceptableComponentIds: Set<string>,
    context?: ProcessingContext,
    rootNodeId?: string,
  ): Promise<void> {
    const settings = this.config.processing.instanceExamples;
    if (!settings || !context?.nodes || !rootNodeId) return;

    const candidates = settings.scope === 'FILE'
      ? await context.nodes.getAllPagesNodes(['INSTANCE'])
      : await context.nodes.getPageSiblings(rootNodeId, ['INSTANCE']);

    const taken = new Set<string>();
    for (const candidate of candidates) {
      if (!candidate.mainComponentId || !acceptableComponentIds.has(candidate.mainComponentId)) continue;
      if (!(candidate.node instanceof RestInstanceNode)) continue;
      if (settings.match && !InstanceExamples.matchesExamplePattern(candidate.name, settings.match, componentName)) continue;
      if (settings.exclude && InstanceExamples.matchesExamplePattern(candidate.name, settings.exclude, componentName)) continue;
      if (settings.parentNames && settings.parentNames.length > 0) {
        const parent = candidate.parentName ?? '';
        if (!settings.parentNames.includes(parent)) continue;
      }

      const key = Utilities.disambiguateKey(Utilities.identifierKey(candidate.name), (value) => taken.has(value));
      taken.add(key);
      const example = new InstanceExample(candidate.node, this.config);
      await example.resolve(context);
      this._items.set(key, example);
      this._hosts.push({ node: candidate.node, key });
    }
  }

  hosts(): Array<{ node: RestInstanceNode; key: string }> {
    return this._hosts;
  }

  attachSlotFills(slotContentExamples: Record<string, SchemaSlotContent>): void {
    for (const exampleKey of this._items.keys()) {
      const prefix = `${exampleKey}__`;
      const refs: Record<string, SlotContentRef> = { ...(this._slotRefs.get(exampleKey) ?? {}) };
      for (const fillKey of Object.keys(slotContentExamples)) {
        if (!fillKey.startsWith(prefix)) continue;
        const slotName = fillKey.slice(prefix.length);
        refs[slotName] = { $slotContent: `#/slotContentExamples/${fillKey}` };
      }
      if (Object.keys(refs).length > 0) this._slotRefs.set(exampleKey, refs);
    }
  }

  data(): SchemaInstanceExamples | undefined {
    if (this._items.size === 0) return undefined;
    const out: Record<string, SchemaInstanceExample> = {};
    for (const [key, example] of [...this._items.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      out[key] = example.data(this._slotRefs.get(key) ?? {});
    }
    return out;
  }

  get size(): number {
    return this._items.size;
  }

  get isEmpty(): boolean {
    return this._items.size === 0;
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
