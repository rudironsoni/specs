import { RestBaseNode } from './RestBaseNode.js';
import type { RestApiNodeData } from './types.js';

type Wrapper = (data: RestApiNodeData, parent: RestBaseNode | null) => RestBaseNode;

const wrappers = new Map<string, Wrapper>();

export function registerNodeWrapper(type: string, wrapper: Wrapper): void {
  wrappers.set(type, wrapper);
}

export function wrapNode(data: RestApiNodeData, parent: RestBaseNode | null = null): RestBaseNode {
  const wrapper = wrappers.get(data.type);
  return wrapper ? wrapper(data, parent) : new RestBaseNode(data, parent);
}
