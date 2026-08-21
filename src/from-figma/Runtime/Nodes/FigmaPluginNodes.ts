import type { FigmaNodes, PageScanResult } from './interfaces.js';
import { getFigma } from '../figmaGlobal.js';
import { BOUNDARY_TYPES, ORGANIZATIONAL_TYPES } from '../../Constants/Nodes.js';

type PluginNode = {
  id: string;
  name: string;
  type: string;
  parent?: PluginNode | null;
  children?: readonly PluginNode[];
  componentId?: string;
  mainComponent?: { id: string; name?: string; parent?: { type: string; name: string } | null } | null;
  getMainComponentAsync?: () => Promise<{ id: string; name?: string; parent?: { type: string; name: string } | null } | null>;
};

export class FigmaPluginNodes implements FigmaNodes {
  async getNodeById(id: string): Promise<PageScanResult['node'] | null> {
    const figma = getFigma();
    if (!figma) return null;
    const node = figma.getNodeByIdAsync ? await figma.getNodeByIdAsync(id) : figma.getNodeById?.(id);
    return (node as PageScanResult['node'] | null) ?? null;
  }

  async getComponentNameForInstanceSwap(componentId: string): Promise<string | null> {
    const node = await this.getNodeById(componentId) as PluginNode | null;
    if (!node) return null;
    if (node.type === 'COMPONENT' && node.parent?.type === 'COMPONENT_SET') return node.parent.name;
    return node.name ?? null;
  }

  async getPageSiblings(nodeId: string, types: string[]): Promise<PageScanResult[]> {
    const start = await this.getNodeById(nodeId) as PluginNode | null;
    if (!start) return [];
    let page: PluginNode | null = start;
    while (page && page.type !== 'PAGE' && page.type !== 'CANVAS') {
      page = page.parent ?? null;
    }
    if (!page) return [];
    return this._collectFromPage(page, types);
  }

  async getAllPagesNodes(_types: string[]): Promise<PageScanResult[]> {
    throw new Error('FILE-scope discovery is not supported in the Figma plugin runtime');
  }

  private _collectFromPage(root: PluginNode, types: string[]): PageScanResult[] {
    const wanted = new Set(types);
    const results: PageScanResult[] = [];
    const visit = (node: PluginNode, parent: PluginNode | null) => {
      if (wanted.has(node.type)) {
        results.push({
          id: node.id,
          name: node.name,
          type: node.type,
          parentName: parent?.name ?? null,
          node: node as unknown as PageScanResult['node'],
          mainComponentId: node.componentId ?? node.mainComponent?.id ?? null,
        });
      }
      if (BOUNDARY_TYPES.has(node.type)) return;
      const descend = ORGANIZATIONAL_TYPES.has(node.type) || node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'SECTION';
      if (!descend && node !== root) return;
      for (const child of node.children ?? []) visit(child, node);
    };
    for (const child of root.children ?? []) visit(child, root);
    return results;
  }
}
