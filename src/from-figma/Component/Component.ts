import { stringify as stringifyYaml } from 'yaml';
import type { Component as SchemaComponent, ResolvedConfig } from '@rudironsoni/specs-schema';
import type { ProcessingContext } from '../Runtime/Context/interfaces.js';
import type { StylesMap, VariablesMap, CollectionsMap } from '../Runtime/Foundations/FigmaRESTMaps.js';
import { RestLibraryFile } from '../Adapters/RestApi/RestLibraryFile.js';
import { RestComponentNode } from '../Adapters/RestApi/RestComponentNode.js';
import { wrapNode } from '../Adapters/RestApi/wrapNode.js';
import { snapshotPluginNode } from '../Adapters/Plugin/snapshotPluginNode.js';
import { FigmaRESTDataResolver } from '../Runtime/Foundations/FigmaRESTFoundations.js';
import { FigmaRestNodes } from '../Runtime/Nodes/FigmaRestNodes.js';
import { FigmaPluginFoundations } from '../Runtime/Foundations/FigmaPluginFoundations.js';
import { FigmaPluginNodes } from '../Runtime/Nodes/FigmaPluginNodes.js';
import type { SpecableNode } from './Nodes/types.js';
import { Anatomy } from './Anatomy/Anatomy.js';
import { Layout } from './Layout/Layout.js';
import { Metadata } from './Metadata/Metadata.js';
import { Props } from './Props/Props.js';
import { Variants } from './Variants/Variants.js';
import { SlotFills } from './SlotContent/SlotFills.js';
import { InstanceExamples } from './InstanceExamples/InstanceExamples.js';
import { ImageRegistry, retypeImageProps } from './Images/ImageRegistry.js';
import type { ProgressCoordinator } from '../Progress/ProgressCoordinator.js';
import { PHASE_NAMES } from '../Progress/Progress.js';
import { CodeOnlyProps } from './Props/CodeOnlyProps.js';
import { SlotConstraints } from './Props/SlotConstraints.js';
import { canCollapse, collapseAnatomy, collapseElements, collapsedLayout } from './WrapperCollapse.js';
import { Utilities } from '../Utilities/Utilities.js';
import type { SlotContent as SchemaSlotContent, InstanceExamples as SchemaInstanceExamples, Images } from '@rudironsoni/specs-schema';

interface RestOptions {
  styles: StylesMap;
  variables: VariablesMap;
  collections: CollectionsMap;
  author?: string;
  generator?: {
    name: string;
    version: string;
    url: string;
  };
  coordinator?: ProgressCoordinator;
}

export class Component {
  private _anatomy: Anatomy;
  private props: Props;
  private variants: Variants;
  protected config: ResolvedConfig;
  private context?: ProcessingContext;
  private node: SpecableNode;
  private _name: string;
  private _layout?: Layout;
  private _subcomponents?: { data(): SchemaComponent['subcomponents'] };
  private _slotContentExamples?: Record<string, SchemaSlotContent>;
  private _instanceExamples?: SchemaInstanceExamples;
  private _exampleCollector?: InstanceExamples;
  private _images?: Images;

  constructor(node: SpecableNode, config: ResolvedConfig) {
    this.node = node;
    this.config = config;
    this._anatomy = new Anatomy(config);
    this.props = new Props(node, config);
    this.variants = new Variants(node, this._anatomy, config);
    this._name = node.name;
  }

  get name(): string {
    return this._name;
  }

  protected get anatomy(): Anatomy {
    return this._anatomy;
  }

  protected _slotBasePath(): string {
    return '#';
  }

  static async fromRestApi(
    libraryJson: unknown,
    componentId: string,
    config: ResolvedConfig,
    options: RestOptions,
  ): Promise<Component> {
    const file = new RestLibraryFile(libraryJson);
    const found = file.findComponent(componentId);
    if (!found) {
      throw new Error(`Component not found: ${componentId}`);
    }
    const component = new Component(found, config);
    const context: ProcessingContext = {
      foundations: new FigmaRESTDataResolver(options.variables, options.collections, options.styles),
      nodes: new FigmaRestNodes(file.getIndexer()),
      runtime: 'REST',
      author: options.author,
      generator: options.generator,
      coordinator: options.coordinator,
    };
    await component._process(context);
    return component;
  }

  static async fromPlugin(
    node: unknown,
    config: ResolvedConfig,
    options?: { author?: string },
  ): Promise<Component> {
    const data = await snapshotPluginNode(node as Parameters<typeof snapshotPluginNode>[0]);
    const wrapped = wrapNode(data);
    const component = new Component(wrapped, config);
    const context: ProcessingContext = {
      foundations: new FigmaPluginFoundations(),
      nodes: new FigmaPluginNodes(),
      runtime: 'PLUGIN',
      author: options?.author,
    };
    await component._process(context);
    return component;
  }

  static componentRootNode(node: SpecableNode): SpecableNode {
    if (node instanceof RestComponentNode && node.type === 'COMPONENT_SET') {
      return node.defaultVariant ?? node;
    }
    return node;
  }

  async process(context?: ProcessingContext): Promise<void> {
    await this._process(context);
  }

  protected async _process(context?: ProcessingContext): Promise<void> {
    this.context = context;
    const root = Component.componentRootNode(this.node);
    const exclusions = Anatomy.exclusions(root, this.config.processing.codeOnlyPropsPattern);
    const skip = new Set(exclusions.excludeNames ?? []);
    if (exclusions.container) skip.add(exclusions.container.name);
    const { nodes, names, tree } = Anatomy.traverse(root, skip.size > 0 ? skip : undefined);
    this._anatomy.populateFromTraverse(nodes, names, null);
    this._layout = new Layout(this.config, tree);
    await this.props.process(context);
    if (exclusions.container) {
      await CodeOnlyProps.process(exclusions.container, this.props, this.config.processing, this.config.format.keys);
    }
    if (this.config.processing.slotConstraints) {
      SlotConstraints.postProcess(this.props);
    }
    if (this.config.processing.images) retypeImageProps(this.props, this.config);
    this.props.applyStates();
    await context?.coordinator?.notifyPhase(PHASE_NAMES.SETUP_VARIANTS);
    await this.variants.process(context);
    this.variants.pairings.applyToProps(this.props, this.config);
    const ordered = [...this.variants].sort((left, right) => Number(left.default) - Number(right.default));
    for (const variant of ordered) this._anatomy.addNewElementsFromVariant(variant, skip);
    const defaultVariant = this.variants.getDefault();
    if (defaultVariant?.layout) this._layout = defaultVariant.layout;

    if (this.config.processing.images) {
      const images = new ImageRegistry();
      images.applyHostDefault(this.node, this.props, this.config);
      for (const variant of this.variants) {
        await images.applyTo(variant.full, this.config, this.props, context);
        await images.applyTo(variant.layered, this.config, this.props, context);
      }
      this._images = images.data();
    }

    let exampleHosts: Array<{ node: import('./Nodes/types.js').FigmaElementNode; key: string }> = [];
    if (this.config.processing.instanceExamples && context) {
      const examples = new InstanceExamples(this.config);
      await examples.evaluate(
        this._name,
        this.acceptableComponentIds(),
        context,
        this.node.id,
      );
      exampleHosts = examples.hosts();
      this._instanceExamples = examples.data();
      this._exampleCollector = examples;
    }

    this._slotContentExamples = await SlotFills.process(
      [...this.variants],
      this._name,
      this.config,
      context,
      this.config.include.defaultSlotContent,
      exampleHosts,
      this._slotBasePath(),
    );
    this._exampleCollector?.attachSlotFills(this._slotContentExamples);

    if (this.config.processing.subcomponents) {
      const { Subcomponents } = await import('./Subcomponents/Subcomponents.js');
      const subcomponents = new Subcomponents(this.config);
      await subcomponents.evaluate(this._name, this._anatomy, context, this.node.id);
      this._subcomponents = subcomponents;
      rewriteInstanceRefs(this.variants, subcomponents.refMap());
    }

    if (this.config.processing.collapsePrimitiveWrapper) {
      this.applyWrapperCollapse();
    }

    await context?.coordinator?.notifyPhase(PHASE_NAMES.OUTPUT_DATA);
    await context?.coordinator?.notifyPhase(PHASE_NAMES.OUTPUT_ANATOMY);
    if (!this.props.isEmpty()) await context?.coordinator?.notifyPhase(PHASE_NAMES.OUTPUT_PROPS);
    await context?.coordinator?.notifyPhase(PHASE_NAMES.OUTPUT_LAYOUT);
    await context?.coordinator?.notifyPhase(PHASE_NAMES.OUTPUT_STYLING);
  }

  protected data(): SchemaComponent {
    const defaultVariant = this.variants.getDefault();
    const variants = this.variants.data();
    const invalidCombinations = this.variants.invalidCombinations();
    return {
      title: this._name,
      anatomy: this._anatomy.data(),
      ...(this.props.data() ? { props: this.props.data() } : {}),
      default: defaultVariant?.data() ?? {
        layout: this._layout?.data(),
      },
      ...(variants.length > 0 ? { variants } : {}),
      ...(this.config.include.invalidCombinations && invalidCombinations.length > 0
        ? { invalidVariantCombinations: invalidCombinations }
        : {}),
      ...(this._subcomponents?.data() ? { subcomponents: this._subcomponents.data() } : {}),
      ...(this._slotContentExamples && Object.keys(this._slotContentExamples).length > 0
        ? { slotContentExamples: this._slotContentExamples }
        : {}),
      ...(this._instanceExamples ? { instanceExamples: this._instanceExamples } : {}),
      ...(this._images ? { images: this._images } : {}),
      metadata: Metadata.create(this.node, this.config, this.context),
    };
  }

  private acceptableComponentIds(): Set<string> {
    const ids = new Set<string>([this.node.id]);
    if (this.node.type === 'COMPONENT_SET') {
      for (const child of this.node.children) {
        if (child.type === 'COMPONENT') ids.add(child.id);
      }
    }
    return ids;
  }

  private applyWrapperCollapse(): void {
    const defaultVariant = this.variants.getDefault();
    const eligible = canCollapse(this._anatomy, defaultVariant?.full);
    if (!eligible) return;
    for (const variant of this.variants) {
      if (variant.node && !canCollapse(this._anatomy, variant.full)) return;
    }
    collapseAnatomy(this._anatomy, eligible.leaf, eligible.leafName);
    for (const variant of this.variants) {
      collapseElements(variant.full, eligible.leafName);
      collapseElements(variant.layered, eligible.leafName);
      variant.layout = collapsedLayout(this.config);
      variant.layeredLayout = undefined;
    }
    this._layout = collapsedLayout(this.config);
  }

  yaml(): string {
    return stringifyYaml(this.data());
  }

  json(): SchemaComponent {
    return this.data();
  }
}

function rewriteInstanceRefs(variants: Variants, refs: Map<string, string>): void {
  for (const variant of variants) {
    for (const collection of [variant.full, variant.layered]) {
      for (const element of collection.values()) {
        if (typeof element.instanceOf !== 'string') continue;
        const key = refs.get(Utilities.normalizeName(element.instanceOf));
        if (key) element.instanceOf = { $ref: `#/subcomponents/${key}` };
      }
    }
  }
}


