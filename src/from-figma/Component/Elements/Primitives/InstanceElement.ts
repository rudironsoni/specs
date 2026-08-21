import type { NestedPropConfiguration, PropConfigurations as SchemaPropConfigurations, ResolvedConfig } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../../Nodes/types.js';
import type { ProcessingContext } from '../../../Runtime/Context/interfaces.js';
import { BaseElement } from '../BaseElement.js';
import { RestInstanceNode } from '../../../Adapters/RestApi/RestInstanceNode.js';
import { PropBinding } from '../../Props/PropBinding.js';
import { PropConfigurations } from '../../PropConfigurations/PropConfigurations.js';
import { Utilities } from '../../../Utilities/Utilities.js';

export class InstanceElement extends BaseElement {
  resolvedInstanceName?: string;
  private _props?: PropConfigurations;
  private _nested: NestedPropConfiguration[] = [];

  constructor(node: FigmaElementNode, name: string, config: ResolvedConfig) {
    super(node, name, config);
  }

  protected override async extendedEvaluate(): Promise<void> {
    if (this.node instanceof RestInstanceNode) {
      this.instanceOf = this.node.instanceOf;
      this.resolvedInstanceName = this.node.instanceOf ?? undefined;
      this._props = new PropConfigurations(this.node, this.config);
      this._props.evaluate();
      this._nested = collectNestedConfigurations(this.node, [], this.config);
      this.propConfigurations = mergeNested(this._props.data(), this._nested);
    }
    const refs = this.node.componentPropertyReferences ?? {};
    if (refs.mainComponent) {
      this.instanceOfBinding = PropBinding.create(
        typeof this.instanceOf === 'string' ? this.instanceOf : '',
        refs.mainComponent,
      );
    }
  }

  static async resolveMainComponentName(node: FigmaElementNode): Promise<string> {
    if (node instanceof RestInstanceNode) return node.instanceOf ?? node.name;
    return node.name;
  }

  protected override async extendedPostProcess(context?: ProcessingContext): Promise<void> {
    if (!this._props) return;
    await this._props.postProcess(context);
    this.propConfigurations = mergeNested(this._props.data(), this._nested);
  }
}

function mergeNested(
  own: SchemaPropConfigurations | undefined,
  nested: NestedPropConfiguration[],
): SchemaPropConfigurations | undefined {
  if (nested.length === 0) return own;
  return { ...(own ?? {}), $nested: [...(own?.$nested ?? []), ...nested] };
}

function collectNestedConfigurations(
  node: FigmaElementNode,
  path: string[],
  config: ResolvedConfig,
): NestedPropConfiguration[] {
  const out: NestedPropConfiguration[] = [];
  for (const child of node.children) {
    if (child.type === 'SLOT') continue;
    if (child instanceof RestInstanceNode) {
      const segment = Utilities.formatKey(
        Utilities.normalizeName(child.instanceOf ?? child.name),
        config.format.keys,
      );
      const next = [...path, segment];
      const props = readInstanceConfigurations(child, config);
      if (props) out.push({ path: next, ...props } as NestedPropConfiguration);
      out.push(...collectNestedConfigurations(child, next, config));
      continue;
    }
    out.push(...collectNestedConfigurations(child, path, config));
  }
  return out;
}

function readInstanceConfigurations(node: RestInstanceNode, config: ResolvedConfig) {
  const props = new PropConfigurations(node, config);
  props.evaluate();
  return props.data();
}
