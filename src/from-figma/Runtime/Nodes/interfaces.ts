import type { FigmaElementNode } from '../../Component/Nodes/types.js';

export interface PageScanResult {
  id: string;
  name: string;
  type: string;
  parentName: string | null;
  node: FigmaElementNode;
  mainComponentId: string | null;
}

export interface FigmaNodes {
  getNodeById(id: string): Promise<FigmaElementNode | null>;
  getComponentNameForInstanceSwap(componentId: string): Promise<string | null>;
  getPageSiblings(nodeId: string, types: string[]): Promise<PageScanResult[]>;
  getAllPagesNodes(types: string[]): Promise<PageScanResult[]>;
}
