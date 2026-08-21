import { RestBaseNode } from './RestBaseNode.js';
import { registerNodeWrapper, wrapNode } from './wrapNode.js';
import type { RestApiNodeData } from './types.js';

export class RestComponentNode extends RestBaseNode {
  get componentPropertyDefinitions(): Record<string, unknown> {
    return this._data.componentPropertyDefinitions ?? {};
  }

  get defaultVariant(): RestComponentNode | null {
    if (this.type !== 'COMPONENT_SET') return this;
    const expected = this.defaultVariantName();
    const children = this.children.filter((child): child is RestComponentNode => child instanceof RestComponentNode);
    if (expected) {
      const match = children.find((child) => child.name === expected);
      if (match) return match;
    }
    return children[0] ?? null;
  }

  private defaultVariantName(): string | null {
    const parts: string[] = [];
    for (const [rawName, definition] of Object.entries(this.componentPropertyDefinitions)) {
      const def = definition as { type?: string; defaultValue?: unknown };
      if (def.type !== 'VARIANT') continue;
      const name = rawName.split('#')[0] ?? rawName;
      parts.push(`${name}=${String(def.defaultValue ?? '')}`);
    }
    return parts.length > 0 ? parts.join(', ') : null;
  }

  protected override wrapChild(childData: RestApiNodeData): RestBaseNode {
    return wrapNode(childData, this);
  }
}

registerNodeWrapper('COMPONENT', (data, parent) => new RestComponentNode(data, parent));
registerNodeWrapper('COMPONENT_SET', (data, parent) => new RestComponentNode(data, parent));
