import type { Element as SchemaElement, PropConfigurations, ResolvedConfig, SubcomponentRef } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../Nodes/types.js';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import { Styles } from '../Styles/Styles.js';
import { styleKeysForNodeType } from '../Styles/keys.js';
import { AnatomyElement } from '../Anatomy/AnatomyElement.js';
import { PropBinding } from '../Props/PropBinding.js';
import { Children } from '../Children/Children.js';
import { createElement } from './ElementFactoryRegistry.js';

export class BaseElement {
  node: FigmaElementNode;
  styles: Styles;
  type: ReturnType<typeof AnatomyElement.getElementType>;
  instanceOf: string | SubcomponentRef | null = null;
  content: string | null = null;
  contentBinding: PropBinding | null = null;
  instanceOfBinding: PropBinding | null = null;
  slotContentRef: string | null = null;
  children: Children;
  propConfigurations: PropConfigurations | undefined;
  config: ResolvedConfig;
  name: string;

  constructor(node: FigmaElementNode, name: string, config: ResolvedConfig) {
    this.node = node;
    this.name = name;
    this.config = config;
    this.type = AnatomyElement.getElementType(node, config.processing.glyphNamePattern);
    this.slotContentRef = null;
    this.children = new Children(config);
    this.styles = new Styles(node);
  }

  async evaluate(context?: ProcessingContext): Promise<void> {
    const keys = this.type === 'glyph' ? styleKeysForNodeType('glyph') : styleKeysForNodeType(this.node.type);
    this.styles.evaluate(context, keys);
    await this.extendedEvaluate();
  }

  protected async extendedEvaluate(): Promise<void> {}

  postEvaluate(): void {
    this.styles.postEvaluate();
  }

  async postProcess(removeDefaults: boolean, fullElement?: BaseElement, context?: ProcessingContext): Promise<void> {
    await this.styles.postProcess(removeDefaults, fullElement?.styles, context);
    await this.extendedPostProcess(context);
  }

  protected async extendedPostProcess(_context?: ProcessingContext): Promise<void> {}

  data(config: ResolvedConfig): SchemaElement {
    const out: SchemaElement = {};
    const styles = this.styles.data(config);
    if (styles) out.styles = styles;
    if (this.instanceOfBinding) {
      const value = this.instanceOfBinding.data(config.format.keys);
      if (typeof value !== 'number' && typeof value !== 'boolean') out.instanceOf = value;
    } else if (this.instanceOf) {
      out.instanceOf = this.instanceOf;
    }
    if (this.contentBinding) {
      const value = this.contentBinding.data(config.format.keys);
      if (typeof value !== 'number' && typeof value !== 'boolean') out.content = value;
    } else if (this.content !== null) {
      out.content = this.content;
    }
    if (this.propConfigurations && Object.keys(this.propConfigurations).length > 0) {
      out.propConfigurations = this.propConfigurations;
    }
    const children = this.children.data();
    const emitChildren = this.children.isBound()
      || this.config.format.layout === 'PARENT_CHILDREN'
      || this.config.format.layout === 'BOTH';
    if (emitChildren && children) out.children = children;
    else if (this.slotContentRef) {
      out.children = {
        $binding: `#/props/${this.name}`,
        examples: [{ $slotContent: this.slotContentRef }],
      };
    }
    return out;
  }

  clone(): BaseElement {
    const copy = createElement(this.node, this.name, this.config);
    copy.type = this.type;
    copy.instanceOf = this.instanceOf;
    copy.content = this.content;
    copy.contentBinding = this.contentBinding;
    copy.instanceOfBinding = this.instanceOfBinding;
    copy.slotContentRef = this.slotContentRef;
    copy.children = this.children.clone();
    copy.propConfigurations = this.propConfigurations ? { ...this.propConfigurations } : undefined;
    copy.styles = this.styles.clone();
    return copy;
  }

  merge(layer: BaseElement): BaseElement {
    const merged = this.clone();
    merged.styles = this.styles.merge(layer.styles);
    if (layer.instanceOf !== null) merged.instanceOf = layer.instanceOf;
    if (layer.content !== null) merged.content = layer.content;
    if (layer.contentBinding) merged.contentBinding = layer.contentBinding;
    if (layer.instanceOfBinding) merged.instanceOfBinding = layer.instanceOfBinding;
    merged.children = this.children.merge(layer.children);
    return merged;
  }

  compare(baseline: BaseElement | undefined): BaseElement | undefined {
    if (!baseline) return this.clone();
    const diff = createElement(this.node, this.name, this.config);
    diff.type = this.type;
    diff.styles = this.styles.compare(baseline.styles);
    if (JSON.stringify(this.instanceOf) !== JSON.stringify(baseline.instanceOf)) {
      diff.instanceOf = this.instanceOf;
    }
    if (this.content !== baseline.content) diff.content = this.content;
    if (bindingChanged(this.contentBinding, baseline.contentBinding)) {
      diff.contentBinding = this.contentBinding;
    }
    if (bindingChanged(this.instanceOfBinding, baseline.instanceOfBinding)) {
      diff.instanceOfBinding = this.instanceOfBinding;
    }
    if (JSON.stringify(this.propConfigurations ?? {}) !== JSON.stringify(baseline.propConfigurations ?? {})) {
      diff.propConfigurations = this.propConfigurations;
    }
    diff.children = this.children.compare(baseline.children);
    if (
      diff.styles.isEmpty()
      && diff.instanceOf === null
      && diff.content === null
      && !diff.contentBinding
      && !diff.instanceOfBinding
      && !diff.propConfigurations
      && diff.children.empty()
    ) return undefined;
    return diff;
  }

  empty(): boolean {
    return this.styles.isEmpty()
      && this.instanceOf === null
      && this.content === null
      && !this.contentBinding
      && !this.instanceOfBinding
      && !this.propConfigurations
      && this.children.empty();
  }
}

function bindingChanged(current: PropBinding | null, baseline: PropBinding | null): boolean {
  if (!current && !baseline) return false;
  if (!current || !baseline) return true;
  return current.difference(baseline);
}


