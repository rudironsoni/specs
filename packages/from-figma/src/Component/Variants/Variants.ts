import type { PropConfigurations, ResolvedConfig, Variants as SchemaVariants } from '@rudironsoni/specs-schema';
import type { SpecableNode } from '../Nodes/types.js';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import { Anatomy } from '../Anatomy/Anatomy.js';
import { RestComponentNode } from '../../Adapters/RestApi/RestComponentNode.js';
import { Utilities, type FigmaVariantProp } from '../../Utilities/Utilities.js';
import { PropPairings } from '../Props/PropPairings.js';
import { PHASE_NAMES } from '../../Progress/Progress.js';
import { Variant, parseVariantName, variantChildName, formatConfiguration, type VariantConfiguration } from './Variant.js';

export class Variants {
  private _items: Variant[] = [];
  _invalidVariants: VariantConfiguration[] = [];
  pairings: PropPairings = new PropPairings([]);
  private _node: SpecableNode;
  private _variantProps: FigmaVariantProp[];
  private config: ResolvedConfig;

  constructor(node: SpecableNode, _anatomy: Anatomy, config: ResolvedConfig) {
    this._node = node;
    this.config = config;
    this._variantProps = Utilities.variantProps(node);
  }

  async process(context?: ProcessingContext): Promise<void> {
    this.initialize();
    await this.evaluate(context);
    this.pairings = PropPairings.from([...this._items], this._node);
    for (const variant of this._items) {
      if (variant.invalid) continue;
      this.pairings.applyToElements(variant.full, this.config);
    }
    this.postEvaluate();
    this.setLayeredMatches();
    await this.layer(context);
    await this.resolve(context);
  }

  private initialize(): void {
    if (this._node.type !== 'COMPONENT_SET' || this._variantProps.length === 0) {
      this._items = [new Variant(this._node.name, rootOf(this._node), true, this._variantProps, this.config, {})];
      return;
    }

    const set = this._node as RestComponentNode;
    const defaultName = variantChildName(
      Object.fromEntries(this._variantProps.map((prop) => [prop.name, prop.defaultValue])),
      this._variantProps,
    );
    const children = set.children;

    const names = this.generateVariantNames();
    for (const name of names) {
      const configuration = parseVariantName(name, this._variantProps);
      const node = children.find((child) => child.name === name) ?? null;
      const isDefault = name === defaultName;
      const variant = new Variant(name, node, isDefault, this._variantProps, this.config, this.nonDefault(configuration));
      if (!node) {
        variant.invalid = true;
        this._invalidVariants.push(this.nonDefault(configuration));
      }
      this._items.push(variant);
    }

    this._items.sort((a, b) => {
      if (a.default) return -1;
      if (b.default) return 1;
      return Object.keys(a.configuration).length - Object.keys(b.configuration).length;
    });
  }

  private nonDefault(configuration: VariantConfiguration): VariantConfiguration {
    const out: VariantConfiguration = {};
    for (const prop of this._variantProps) {
      if (configuration[prop.name] !== prop.defaultValue) out[prop.name] = configuration[prop.name];
    }
    return out;
  }

  private setLayeredMatches(): void {
    for (const variant of this._items) {
      variant.layeredMatches = this._items.filter((other) => {
        if (other === variant) return false;
        if (other.default) return !variant.default;
        return (
          Object.keys(other.configuration).length < Object.keys(variant.configuration).length
          && isSubset(other.configuration, variant.configuration)
        );
      });
    }
  }

  private async evaluate(context?: ProcessingContext): Promise<void> {
    const run = async (items: Variant[]) => {
      for (const variant of items) await variant.evaluate(context);
    };
    if (context?.coordinator) {
      await context.coordinator.forEachChunk(this._items, PHASE_NAMES.EVALUATE_VARIANTS, run);
      return;
    }
    await run(this._items);
  }

  private postEvaluate(): void {
    for (const variant of this._items) variant.postEvaluate();
  }

  private async layer(context?: ProcessingContext): Promise<void> {
    const ordered = [...this._items].sort((a, b) => Object.keys(a.configuration).length - Object.keys(b.configuration).length);
    const run = async (items: Variant[]) => {
      for (const variant of items) await variant.layer(context);
    };
    if (context?.coordinator) {
      await context.coordinator.forEachChunk(ordered, PHASE_NAMES.LAYER_VARIANTS, run);
      return;
    }
    await run(ordered);
  }

  async resolve(context?: ProcessingContext): Promise<void> {
    for (const variant of this._items) {
      await variant.postProcess(context);
    }
  }

  data(subcomponentRefs?: Map<string, string>): SchemaVariants {
    return this._items
      .filter((variant) => !variant.default)
      .map((variant) => variant.data(subcomponentRefs))
      .filter((value): value is NonNullable<typeof value> => Boolean(value));
  }

  invalidCombinations(): PropConfigurations[] {
    const minimal = this._invalidVariants.filter((configuration) => (
      !this._invalidVariants.some((other) => (
        other !== configuration
        && Object.keys(other).length < Object.keys(configuration).length
        && isSubset(other, configuration)
      ))
    ));
    return minimal.map((configuration) => (
      formatConfiguration(configuration, this.config) as PropConfigurations
    ));
  }

  getDefault(): Variant | undefined {
    return this._items.find((variant) => variant.default) ?? this._items[0];
  }

  entries(): IterableIterator<Variant> {
    return this._items.values();
  }

  values(): IterableIterator<Variant> {
    return this._items.values();
  }

  [Symbol.iterator](): IterableIterator<Variant> {
    return this._items.values();
  }

  get size(): number {
    return this._items.length;
  }

  isEmpty(): boolean {
    return this._items.length === 0;
  }

  private generateVariantNames(): string[] {
    const depth = this.config.processing.variantDepth;
    const props = this._variantProps;
    const names: string[] = [];

    const walk = (index: number, current: VariantConfiguration) => {
      if (index >= props.length) {
        const differing = props.filter((prop) => current[prop.name] !== prop.defaultValue).length;
        if (differing <= depth) names.push(variantChildName(current, props));
        return;
      }
      const prop = props[index];
      const options = prop.options.length > 0 ? prop.options : [prop.defaultValue];
      for (const option of options) {
        walk(index + 1, { ...current, [prop.name]: option });
      }
    };

    walk(0, {});
    return names;
  }
}

function isSubset(smaller: VariantConfiguration, larger: VariantConfiguration): boolean {
  return Object.entries(smaller).every(([key, value]) => larger[key] === value);
}

function rootOf(node: SpecableNode): SpecableNode {
  if (node instanceof RestComponentNode && node.type === 'COMPONENT_SET') {
    return node.defaultVariant ?? node;
  }
  return node;
}
