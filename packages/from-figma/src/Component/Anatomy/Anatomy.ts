import type { Anatomy as SchemaAnatomy, ResolvedConfig } from '@rudironsoni/specs-schema';
import type { FigmaElementNode, FigmaContainerNode } from '../Nodes/types.js';
import type { LayoutTree, LayoutNode } from '../Layout/types.js';
import { FIGMA_ELEMENT_NODE_TYPES, ORGANIZATIONAL_TYPES } from '../../Constants/Nodes.js';
import { Utilities } from '../../Utilities/Utilities.js';
import { AnatomyElement } from './AnatomyElement.js';
import type { Variant } from '../Variants/Variant.js';

const ELEMENT_TYPES = new Set<string>(FIGMA_ELEMENT_NODE_TYPES);

export class Anatomy {
  private _items = new Map<string, AnatomyElement>();

  constructor(private config: ResolvedConfig) {}

  static getAnatomyElementName(node: FigmaElementNode, isRoot = false): string {
    return isRoot ? 'root' : Utilities.normalizeName(node.name);
  }

  addNewElementsFromVariant(variant: Variant, skipNames?: Set<string>): void {
    if (variant.invalid) return;
    const detectedIn = variant.default ? null : variant.name;
    for (const [name, element] of variant.full.entries()) {
      if (skipNames?.has(element.node.name)) continue;
      const key = Utilities.formatKey(name, this.config.format.keys);
      if (this.has(key)) continue;
      this.add(element.node, name, detectedIn);
    }
  }

  add(elementNode: FigmaElementNode, elementName: string, variantName: string | null): void {
    const key = Utilities.formatKey(elementName, this.config.format.keys);
    const unique = Utilities.disambiguateKey(key, (candidate) => this._items.has(candidate));
    this._items.set(unique, new AnatomyElement(elementNode, unique, variantName, this.config));
  }

  data(): SchemaAnatomy {
    const result: SchemaAnatomy = {};
    for (const [name, element] of this._items) {
      result[name] = element.data();
    }
    return result;
  }

  get(name: string): AnatomyElement | undefined {
    return this._items.get(name);
  }

  has(name: string): boolean {
    return this._items.has(name);
  }

  replaceWithRoot(element: AnatomyElement): void {
    this._items.clear();
    this._items.set('root', element);
  }

  entries(): IterableIterator<[string, AnatomyElement]> {
    return this._items.entries();
  }

  values(): IterableIterator<AnatomyElement> {
    return this._items.values();
  }

  keys(): IterableIterator<string> {
    return this._items.keys();
  }

  [Symbol.iterator](): IterableIterator<[string, AnatomyElement]> {
    return this._items.entries();
  }

  get size(): number {
    return this._items.size;
  }

  isEmpty(): boolean {
    return this._items.size === 0;
  }

  static exclusions(rootNode: FigmaElementNode, pattern?: string): {
    container?: FigmaElementNode;
    excludeNames?: Set<string>;
  } {
    if (!pattern) return {};
    const container = rootNode.children.find((child) => child.name.includes(pattern));
    if (!container) return {};
    return {
      container,
      excludeNames: new Set(container.children.map((child) => child.name)),
    };
  }

  static traverse(componentNode: FigmaContainerNode, excludeRootChildren?: Set<string>): {
    nodes: FigmaElementNode[];
    names: string[];
    tree: LayoutTree;
  } {
    const nodes: FigmaElementNode[] = [];
    const names: string[] = [];
    const usedNames = new Set<string>();

    const uniqueName = (node: FigmaElementNode, isRoot: boolean): string => {
      const base = Anatomy.getAnatomyElementName(node, isRoot);
      const name = Utilities.disambiguateKey(base, (candidate) => usedNames.has(candidate));
      usedNames.add(name);
      return name;
    };

    const visit = (node: FigmaElementNode, isRoot: boolean, skipNames?: Set<string>): LayoutNode => {
      const name = uniqueName(node, isRoot);
      nodes.push(node);
      names.push(name);
      const children: LayoutNode[] = [];
      const descend = node.type !== 'INSTANCE' && node.type !== 'SLOT' && node.type !== 'TEXT';
      if (descend) {
        for (const child of node.children) {
          if (skipNames?.has(child.name)) continue;
          if (ORGANIZATIONAL_TYPES.has(child.type) && !ELEMENT_TYPES.has(child.type)) {
            for (const nested of child.children) {
              if (ELEMENT_TYPES.has(nested.type)) children.push(visit(nested, false));
            }
            continue;
          }
          if (ELEMENT_TYPES.has(child.type)) {
            children.push(visit(child, false));
          }
        }
      }
      return { name, children };
    };

    const tree: LayoutTree = { root: visit(componentNode, true, excludeRootChildren) };
    return { nodes, names, tree };
  }

  static traverseSlotContent(slotNode: FigmaContainerNode): {
    nodes: FigmaElementNode[];
    names: string[];
    tree: LayoutTree;
  } {
    const nodes: FigmaElementNode[] = [];
    const names: string[] = [];
    const usedNames = new Set<string>();
    const children: LayoutNode[] = [];

    const visit = (node: FigmaElementNode): LayoutNode => {
      const name = Utilities.disambiguateKey(
        Utilities.normalizeName(node.name),
        (candidate) => usedNames.has(candidate),
      );
      usedNames.add(name);
      nodes.push(node);
      names.push(name);
      const nested: LayoutNode[] = [];
      if (node.type !== 'INSTANCE' && node.type !== 'SLOT') {
        for (const child of node.children) {
          if (ELEMENT_TYPES.has(child.type)) nested.push(visit(child));
        }
      }
      return { name, children: nested };
    };

    for (const child of slotNode.children) {
      if (ELEMENT_TYPES.has(child.type)) children.push(visit(child));
    }

    return {
      nodes,
      names,
      tree: { root: { name: Utilities.normalizeName(slotNode.name), children } },
    };
  }

  populateFromTraverse(
    nodes: FigmaElementNode[],
    names: string[],
    variantName: string | null,
  ): void {
    nodes.forEach((node, index) => {
      this.add(node, names[index] ?? node.name, variantName);
    });
  }
}
