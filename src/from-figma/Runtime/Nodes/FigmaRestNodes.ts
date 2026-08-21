import type { FigmaNodes, PageScanResult } from './interfaces.js';
import type { NodeIndexer } from '../../Adapters/RestApi/NodeIndexer.js';
import { wrapNode } from '../../Adapters/RestApi/wrapNode.js';
import { RestInstanceNode } from '../../Adapters/RestApi/RestInstanceNode.js';
import type { RestApiNodeData } from '../../Adapters/RestApi/types.js';

export class FigmaRestNodes implements FigmaNodes {
  constructor(private indexer: NodeIndexer) {}

  async getNodeById(id: string): Promise<PageScanResult['node'] | null> {
    const raw = this.indexer.getById(id);
    if (!raw) return null;
    return this.wrap(raw as RestApiNodeData);
  }

  async getComponentNameForInstanceSwap(componentId: string): Promise<string | null> {
    return this.indexer.getComponentName(componentId)
      ?? this.indexer.getComponentNameByPublishedKey(componentId);
  }

  async getPageSiblings(nodeId: string, types: string[]): Promise<PageScanResult[]> {
    let current = this.indexer.getById(nodeId);
    if (!current) return [];
    while (current) {
      const parent = this.indexer.getParent(current.id);
      if (!parent || parent.type === 'CANVAS' || parent.type === 'PAGE' || parent.type === 'DOCUMENT') {
        break;
      }
      current = parent;
    }
    const page = this.pageOf(nodeId);
    if (!page) return [];
    return this.indexer.walkBoundary([page], types).map((entry) => this.toScanResult(entry.node, entry.parent));
  }

  async getAllPagesNodes(types: string[]): Promise<PageScanResult[]> {
    return this.indexer
      .walkBoundary(this.indexer.getPages(), types)
      .map((entry) => this.toScanResult(entry.node, entry.parent));
  }

  private pageOf(nodeId: string) {
    let current = this.indexer.getById(nodeId);
    while (current) {
      if (current.type === 'CANVAS' || current.type === 'PAGE') return current;
      current = this.indexer.getParent(current.id);
    }
    return this.indexer.getPages()[0] ?? null;
  }

  private wrap(raw: RestApiNodeData) {
    const node = wrapNode(raw, null);
    node.setIndexer(this.indexer);
    return node;
  }

  private toScanResult(raw: { id: string; name: string; type: string; componentId?: string }, parent: { name: string } | null): PageScanResult {
    const node = this.wrap(raw as RestApiNodeData);
    const mainComponentId = node instanceof RestInstanceNode
      ? node.componentId || null
      : raw.componentId ?? null;
    return {
      id: raw.id,
      name: raw.name,
      type: raw.type,
      parentName: parent?.name ?? null,
      node,
      mainComponentId,
    };
  }
}
