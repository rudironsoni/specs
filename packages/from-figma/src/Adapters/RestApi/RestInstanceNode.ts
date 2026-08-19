import { RestBaseNode } from './RestBaseNode.js';
import { RestComponentNode } from './RestComponentNode.js';
import { registerNodeWrapper, wrapNode } from './wrapNode.js';
import type { RestApiNodeData } from './types.js';

export class RestInstanceNode extends RestBaseNode {
  get componentId(): string {
    return this._data.componentId ?? '';
  }

  get componentProperties(): Record<string, unknown> {
    return this._data.componentProperties ?? {};
  }

  override get componentPropertyReferences(): Record<string, string> {
    return this._data.componentPropertyReferences ?? {};
  }

  override async getMainComponentAsync(): Promise<RestBaseNode | null> {
    if (!this._indexer || !this.componentId) return null;
    const raw = this._indexer.getComponentById(this.componentId);
    if (!raw) return null;
    const wrapped = wrapNode(raw as RestApiNodeData, null);
    wrapped.setIndexer(this._indexer);
    return wrapped;
  }

  get instanceOf(): string | null {
    if (!this._indexer || !this.componentId) return null;
    return this._indexer.getComponentName(this.componentId);
  }

  get mainComponent(): Promise<RestBaseNode | null> {
    return this.getMainComponentAsync();
  }

  protected override wrapChild(childData: RestApiNodeData): RestBaseNode {
    return wrapNode(childData, this);
  }
}

registerNodeWrapper('INSTANCE', (data, parent) => new RestInstanceNode(data, parent));

export function isRestComponentNode(node: RestBaseNode): node is RestComponentNode {
  return node instanceof RestComponentNode;
}
