import { BOUNDARY_TYPES, ORGANIZATIONAL_TYPES } from '../../Constants/Nodes.js';
import type { RestApiNode } from './types.js';

export class NodeIndexer {
  private nodeById = new Map<string, RestApiNode>();
  private parentById = new Map<string, RestApiNode>();
  private componentById = new Map<string, RestApiNode>();
  private componentByName = new Map<string, RestApiNode>();
  private nodesByType = new Map<string, RestApiNode[]>();
  private componentNameById = new Map<string, string>();
  private componentNameByPublishedKey = new Map<string, string>();
  private publishedKeyById = new Map<string, string>();
  private componentSetIdById = new Map<string, string>();
  private root: RestApiNode;

  constructor(
    rootNode: RestApiNode,
    components: Record<string, RestApiNode> = {},
    componentSets: Record<string, RestApiNode> = {},
  ) {
    this.root = rootNode;
    this.indexTree(rootNode, null);

    for (const [id, entry] of Object.entries(components)) {
      const node = this.nodeById.get(id) ?? { ...entry, id, type: entry.type || 'COMPONENT' };
      this.componentById.set(id, node);
      if (entry.name) {
        this.componentByName.set(entry.name, node);
        this.componentNameById.set(id, entry.name);
      }
      this.indexPublishedKey(id, entry.key, entry.name);
    }

    for (const [setId, entry] of Object.entries(componentSets)) {
      const setNode = this.nodeById.get(setId) ?? { ...entry, id: setId, type: entry.type || 'COMPONENT_SET' };
      this.componentById.set(setId, setNode);
      if (entry.name) {
        this.componentByName.set(entry.name, setNode);
        this.componentNameById.set(setId, entry.name);
      }
      this.indexPublishedKey(setId, entry.key, entry.name);
      const children = (this.nodeById.get(setId)?.children ?? []) as RestApiNode[];
      for (const child of children) {
        this.componentSetIdById.set(child.id, setId);
        if (entry.name) this.componentNameById.set(child.id, entry.name);
        if (entry.key) this.indexPublishedKey(child.id, entry.key, entry.name);
        if (!this.componentById.has(child.id)) this.componentById.set(child.id, child);
      }
    }
  }

  private indexTree(node: RestApiNode, parent: RestApiNode | null): void {
    this.nodeById.set(node.id, node);
    if (parent) this.parentById.set(node.id, parent);

    const list = this.nodesByType.get(node.type) ?? [];
    list.push(node);
    this.nodesByType.set(node.type, list);

    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      this.componentById.set(node.id, node);
      this.componentByName.set(node.name, node);
      this.componentNameById.set(node.id, node.name);
      if (node.type === 'COMPONENT' && parent?.type === 'COMPONENT_SET') {
        this.componentSetIdById.set(node.id, parent.id);
        this.componentNameById.set(node.id, parent.name);
      }
    }

    for (const child of node.children ?? []) {
      this.indexTree(child, node);
    }
  }

  getById(id: string): RestApiNode | null {
    return this.nodeById.get(id) ?? null;
  }

  getParent(id: string): RestApiNode | null {
    return this.parentById.get(id) ?? null;
  }

  getComponentById(id: string): RestApiNode | null {
    return this.componentById.get(id) ?? this.nodeById.get(id) ?? null;
  }

  getComponentByName(name: string): RestApiNode | null {
    return this.componentByName.get(name) ?? null;
  }

  getComponentName(componentId: string): string | null {
    return this.componentNameById.get(componentId)
      ?? this.componentNameByPublishedKey.get(componentId)
      ?? this.getComponentById(componentId)?.name
      ?? null;
  }

  getComponentNameByPublishedKey(key: string): string | null {
    return this.componentNameByPublishedKey.get(key) ?? null;
  }

  getPublishedKey(componentId: string): string | null {
    return this.publishedKeyById.get(componentId) ?? null;
  }

  private indexPublishedKey(id: string, key: string | undefined, name: string | undefined): void {
    if (!key) return;
    this.publishedKeyById.set(id, key);
    const resolved = name ?? this.componentNameById.get(id);
    if (resolved) this.componentNameByPublishedKey.set(key, resolved);
  }

  getComponentPropertyDefinitions(componentId: string): Record<string, unknown> {
    const node = this.getComponentById(componentId);
    return (node?.componentPropertyDefinitions as Record<string, unknown> | undefined) ?? {};
  }

  getComponentSetId(componentId: string): string | null {
    return this.componentSetIdById.get(componentId) ?? null;
  }

  getRoot(): RestApiNode {
    return this.root;
  }

  getPages(): RestApiNode[] {
    return [
      ...(this.nodesByType.get('CANVAS') ?? []),
      ...(this.nodesByType.get('PAGE') ?? []),
    ];
  }

  walkBoundary(roots: RestApiNode[], types: string[]): Array<{ node: RestApiNode; parent: RestApiNode | null }> {
    const wanted = new Set(types);
    const results: Array<{ node: RestApiNode; parent: RestApiNode | null }> = [];

    const visit = (node: RestApiNode, parent: RestApiNode | null) => {
      if (wanted.has(node.type)) {
        results.push({ node, parent });
      }
      if (BOUNDARY_TYPES.has(node.type)) return;
      const descend = ORGANIZATIONAL_TYPES.has(node.type) || node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'SECTION';
      if (!descend && node !== this.root) return;
      for (const child of node.children ?? []) {
        visit(child, node);
      }
    };

    for (const root of roots) visit(root, this.parentById.get(root.id) ?? null);
    return results;
  }

  findAllByType(...types: string[]): RestApiNode[] {
    return types.flatMap((type) => this.nodesByType.get(type) ?? []);
  }

  findByNameOrId(nameOrId: string, ...types: string[]): RestApiNode | null {
    const byId = this.nodeById.get(nameOrId);
    if (byId && (types.length === 0 || types.includes(byId.type))) return byId;

    const byName = this.componentByName.get(nameOrId);
    if (byName && (types.length === 0 || types.includes(byName.type))) return byName;

    for (const node of this.nodeById.values()) {
      if (node.name === nameOrId && (types.length === 0 || types.includes(node.type))) {
        return node;
      }
    }
    return null;
  }

  getStats(): { totalNodes: number; components: number; types: Record<string, number> } {
    const types: Record<string, number> = {};
    for (const [type, nodes] of this.nodesByType) types[type] = nodes.length;
    return {
      totalNodes: this.nodeById.size,
      components: this.componentById.size,
      types,
    };
  }
}
