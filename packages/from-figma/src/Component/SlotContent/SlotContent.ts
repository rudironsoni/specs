import type { ResolvedConfig, SlotContent as SchemaSlotContent } from '@rudironsoni/specs-schema';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import type { Variant } from '../Variants/Variant.js';
import type { FigmaElementNode } from '../Nodes/types.js';
import { SlotDetector, type NestedSlotRelation } from './SlotDetector.js';
import { SlotRegistry } from './SlotRegistry.js';
import { Utilities } from '../../Utilities/Utilities.js';

export interface SlotContentOptions {
  hostComponentName: string;
  basePath: string;
  outputKey: 'slotContentExamples' | 'slotContent';
  config: ResolvedConfig;
  registry?: SlotRegistry;
  stampReferences?: boolean;
}

export class SlotContent {
  private _detector: SlotDetector;
  private _hostComponentName: string;
  private _basePath: string;
  private _outputKey: 'slotContentExamples' | 'slotContent';
  private _config: ResolvedConfig;
  private _registry: SlotRegistry;
  private _stampReferences: boolean;
  private _nestedRelations: NestedSlotRelation[] = [];

  constructor(options: SlotContentOptions) {
    this._detector = new SlotDetector(options.config);
    this._hostComponentName = options.hostComponentName;
    this._basePath = options.basePath;
    this._outputKey = options.outputKey;
    this._config = options.config;
    this._registry = options.registry ?? new SlotRegistry();
    this._stampReferences = Boolean(options.stampReferences);
  }

  get outputKey(): 'slotContentExamples' | 'slotContent' {
    return this._outputKey;
  }

  get isEmpty(): boolean {
    return !this._registry.hasReferences && this._registry.isEmpty;
  }

  async process(variants: Variant[], context?: ProcessingContext): Promise<void> {
    const { candidates, nestedRelations } = await this._detector.traverse(
      variants,
      this._hostComponentName,
      context,
    );
    for (const candidate of candidates) {
      const key = this._registry.add(candidate);
      if (!candidate.nested) this._registry.markReferenced(key);
    }
    this._nestedRelations.push(...nestedRelations);
    SlotContent.injectNestedPointers(
      this._nestedRelations,
      this._registry,
      this._basePath,
      this._outputKey,
      this._config,
    );
    if (this._stampReferences) this._wireExamples(variants);
  }

  async processExtras(
    extraNodes: Array<{ node: FigmaElementNode; key: string }>,
    context?: ProcessingContext,
  ): Promise<void> {
    for (const extra of extraNodes) {
      const extraResult = await this._detector.traverseNode(
        extra.node,
        extra.key,
        this._hostComponentName,
        context,
        extra.key,
      );
      for (const candidate of extraResult.candidates) {
        const key = this._registry.add(candidate);
        this._registry.markReferenced(key);
      }
      this._nestedRelations.push(...extraResult.nestedRelations);
    }
    SlotContent.injectNestedPointers(
      this._nestedRelations,
      this._registry,
      this._basePath,
      this._outputKey,
      this._config,
    );
  }

  data(): Record<string, SchemaSlotContent> {
    return this._registry.data().slotContentExamples;
  }

  private _wireExamples(variants: Variant[]): void {
    for (const variant of variants) {
      const suffix = variant.default ? 'default' : this._variantKey(variant);
      for (const [name, element] of variant.full.entries()) {
        const key = this._registry.topLevelKey(`${element.node.name}|${suffix}`)
          ?? this._registry.topLevelKey(`${name}|${suffix}`)
          ?? this._registry.topLevelKey(element.node.id);
        if (!key) continue;
        this._registry.markReferenced(key);
        const pointer = slotContentPointer(this._basePath, this._outputKey, key);
        element.slotContentRef = pointer;
        element.children.set({ $binding: `#/props/${name}` });
        element.children.setExample(pointer);
      }
    }
  }

  static injectNestedPointers(
    relations: NestedSlotRelation[],
    registry: SlotRegistry,
    basePath: string,
    outputKey: 'slotContentExamples' | 'slotContent',
    config: ResolvedConfig,
  ): void {
    for (const relation of relations) {
      const parentKey = registry.topLevelKey(relation.containingSlotId)
        ?? registry.topLevelKey(`${relation.containingSlotElementName}|${relation.containingVariantKey}`)
        ?? registry.nestedKey(relation.containingSlotId);
      const childKey = registry.nestedKey(relation.childSlotId)
        ?? registry.nestedKey(`${relation.childSlotElementName}|${relation.childVariantKey}`);
      if (!parentKey || !childKey) continue;
      const parent = registry.entry(parentKey);
      if (!parent?.elements) continue;
      const instanceName = Utilities.formatKey(
        Utilities.normalizeName(relation.instanceNodeName),
        config.format.keys,
      );
      const instance = parent.elements[instanceName] ?? parent.elements[relation.instanceNodeName];
      if (!instance) continue;
      const slotKey = Utilities.formatKey(
        Utilities.normalizeName(relation.childSlotElementName),
        config.format.keys,
      );
      const ref = { $slotContent: slotContentPointer(basePath, outputKey, childKey) };
      const props = instance.propConfigurations ?? {};
      if (relation.nestedInstancePath.length === 0) {
        instance.propConfigurations = { ...props, [slotKey]: ref };
      } else {
        const path = relation.nestedInstancePath.map((name) => (
          Utilities.formatKey(Utilities.normalizeName(name), config.format.keys)
        ));
        const nested = [...(props.$nested ?? []), { path, [slotKey]: ref }];
        instance.propConfigurations = { ...props, $nested: nested };
      }
      registry.markReferenced(parentKey);
      registry.markReferenced(childKey);
    }
  }

  private _variantKey(variant: Variant): string {
    const parts = Object.entries(variant.configuration).map(([key, value]) => `${key}=${value}`);
    return parts.join(',') || variant.name;
  }
}

function slotContentPointer(
  basePath: string,
  outputKey: 'slotContentExamples' | 'slotContent',
  key: string,
): string {
  const base = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath;
  return `${base}/${outputKey}/${key}`;
}
