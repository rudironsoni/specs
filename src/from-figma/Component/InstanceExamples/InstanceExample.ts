import type { InstanceExample as SchemaInstanceExample, ResolvedConfig, SlotContentRef } from '@rudironsoni/specs-schema';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import type { FigmaElementNode } from '../Nodes/types.js';
import { PropConfigurations } from '../PropConfigurations/PropConfigurations.js';

export class InstanceExample {
  private _node: FigmaElementNode;
  private _props: PropConfigurations;

  constructor(node: FigmaElementNode, config: ResolvedConfig) {
    this._node = node;
    this._props = new PropConfigurations(node, config);
    this._props.evaluate();
  }

  get title(): string {
    return this._node.name;
  }

  async resolve(context?: ProcessingContext): Promise<void> {
    await this._props.postProcess(context);
  }

  data(slotRefs: Record<string, SlotContentRef> = {}): SchemaInstanceExample {
    const propConfigurations: Record<string, string | number | boolean | SlotContentRef> = {};
    for (const [key, entry] of this._props.entries()) propConfigurations[key] = entry.value;
    Object.assign(propConfigurations, slotRefs);
    return {
      title: this.title,
      ...(Object.keys(propConfigurations).length > 0 ? { propConfigurations } : {}),
    };
  }
}
