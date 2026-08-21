import type { ResolvedConfig, Variant as SchemaVariant, PropConfigurations } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../Nodes/types.js';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import type { FigmaVariantProp } from '../../Utilities/Utilities.js';
import { Anatomy } from '../Anatomy/Anatomy.js';
import { Elements } from '../Elements/Elements.js';
import { Layout } from '../Layout/Layout.js';
import { Utilities } from '../../Utilities/Utilities.js';
import { PropPairings } from '../Props/PropPairings.js';
import type { PropPairCandidate } from '../Props/PropPair.js';
import { Differencer } from './Differencer.js';
import { stampChildren } from '../Children/Children.js';

export type VariantConfiguration = Record<string, string | number | boolean>;

export class Variant {
  name: string;
  node: FigmaElementNode | null;
  default: boolean;
  configuration: VariantConfiguration;
  invalid: boolean;
  layeredMatches: Variant[] = [];
  full: Elements;
  layered: Elements;
  layout?: Layout;
  layeredLayout?: Layout;
  bindingPairCandidates: PropPairCandidate[] = [];
  config: ResolvedConfig;

  constructor(
    name: string,
    node: FigmaElementNode | null,
    isDefault: boolean,
    variantProps: FigmaVariantProp[] | undefined,
    config: ResolvedConfig,
    configuration?: VariantConfiguration,
  ) {
    this.name = name;
    this.node = node;
    this.default = isDefault;
    this.config = config;
    this.invalid = node === null;
    this.configuration = formatConfiguration(configuration ?? parseVariantName(name, variantProps), config);
    this.full = new Elements(config);
    this.layered = new Elements(config);
  }

  async evaluate(context?: ProcessingContext): Promise<void> {
    if (!this.node) return;
    const { nodes, names, tree } = Anatomy.traverse(this.node);
    this.layout = new Layout(this.config, tree);
    this.full = new Elements(
      this.config,
      nodes.map((node, index) => ({ name: names[index] ?? node.name, node })),
    );
    this.bindingPairCandidates = PropPairings.scan(nodes, names);
    await this.full.evaluate(context);
    stampChildren(this.full, tree.root);
  }

  postEvaluate(): void {
    this.full.postEvaluate();
  }

  async layer(context?: ProcessingContext): Promise<void> {
    let baseline = new Elements(this.config);
    let baselineLayout: Layout | undefined;
    const matches = [...this.layeredMatches].sort((a, b) => Object.keys(a.configuration).length - Object.keys(b.configuration).length);
    for (const match of matches) {
      baseline = baseline.applyLayer(match.layered);
      if (match.layeredLayout) baselineLayout = match.layeredLayout;
    }
    await Differencer.establishBaselineParity(baseline, this, matches, context);
    this.layered = this.full.compare(baseline);
    this.layeredLayout = this.layout?.compare(baselineLayout);
  }

  async postProcess(context?: ProcessingContext): Promise<void> {
    await this.full.postProcess(false, this.full, context);
    await this.layered.postProcess(true, this.full, context);
  }

  data(_subcomponentRefs?: Map<string, string>): SchemaVariant | undefined {
    if (this.invalid && !this.config.include.invalidVariants) return undefined;
    const elements = this.elementDetails.data(this.config);
    const emitLayout = this.config.format.layout === 'LAYOUT' || this.config.format.layout === 'BOTH';
    const layout = emitLayout ? this.layoutDetails?.data() : undefined;
    const configuration = this.default ? undefined : toPropConfigurations(this.nonDefaultConfigurations());
    if (this.config.processing.details === 'LAYERED' && !this.default && this.layered.isEmpty() && !this.layeredLayout && !this.config.include.emptyVariants) {
      return configuration ? { configuration } : undefined;
    }
    return {
      ...(configuration ? { configuration } : {}),
      ...(this.invalid ? { invalid: true } : {}),
      ...(elements ? { elements } : {}),
      ...(layout ? { layout } : {}),
    };
  }

  get elementDetails(): Elements {
    return this.config.processing.details === 'FULL' || this.default ? this.full : this.layered;
  }

  get layoutDetails(): Layout | undefined {
    return this.config.processing.details === 'FULL' || this.default ? this.layout : this.layeredLayout;
  }

  private nonDefaultConfigurations(): VariantConfiguration {
    return this.configuration;
  }
}

export function parseVariantName(name: string, variantProps?: FigmaVariantProp[]): VariantConfiguration {
  const config: VariantConfiguration = {};
  const parts = name.split(',').map((part) => part.trim()).filter(Boolean);
  for (const part of parts) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    config[part.slice(0, index).trim()] = part.slice(index + 1).trim();
  }
  if (variantProps) {
    for (const prop of variantProps) {
      if (!(prop.name in config)) config[prop.name] = prop.defaultValue;
    }
  }
  return config;
}

export function variantChildName(config: VariantConfiguration, variantProps: FigmaVariantProp[]): string {
  return variantProps.map((prop) => `${prop.name}=${config[prop.name] ?? prop.defaultValue}`).join(', ');
}

function toPropConfigurations(config: VariantConfiguration): PropConfigurations {
  return { ...config };
}

export function formatConfiguration(config: VariantConfiguration, resolved: ResolvedConfig): VariantConfiguration {
  const out: VariantConfiguration = {};
  for (const [key, value] of Object.entries(config)) {
    out[Utilities.formatKey(key, resolved.format.keys)] = value;
  }
  return out;
}
