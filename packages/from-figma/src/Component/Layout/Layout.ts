import type { ResolvedConfig } from '@rudironsoni/specs-schema';
import type { LayoutComparison, LayoutNode, LayoutTree, LayoutSerializedNode } from './types.js';

export class Layout {
  constructor(
    private _config: ResolvedConfig,
    private _tree: LayoutTree,
  ) {}

  get tree(): LayoutTree {
    return this._tree;
  }

  compare(baseline: Layout | undefined): Layout | undefined {
    if (!baseline) return this;
    return this.diff(baseline).equal ? undefined : this;
  }

  diff(baseline: Layout): LayoutComparison {
    const current = flatten(this._tree.root, []);
    const previous = flatten(baseline._tree.root, []);
    const added: string[] = [];
    const removed: string[] = [];
    const moved: LayoutComparison['moved'] = [];

    for (const [name, path] of current) {
      const prior = previous.get(name);
      if (!prior) added.push(name);
      else if (prior.join('/') !== path.join('/')) {
        moved.push({ name, fromPath: prior, toPath: path });
      }
    }
    for (const [name] of previous) {
      if (!current.has(name)) removed.push(name);
    }

    const orderChanges = collectOrderChanges(this._tree.root, baseline._tree.root);
    const equal = added.length === 0 && removed.length === 0 && moved.length === 0 && orderChanges.length === 0;
    return { equal, added, removed, moved, orderChanges };
  }

  data(): LayoutSerializedNode[] {
    return [this.serialize(this._tree.root)];
  }

  private serialize(node: LayoutTree['root']): LayoutSerializedNode {
    if (node.children.length === 0) return node.name;
    return {
      [node.name]: node.children.map((child) => this.serialize(child)),
    };
  }
}

function flatten(node: LayoutNode, path: string[], out = new Map<string, string[]>()): Map<string, string[]> {
  out.set(node.name, path);
  for (const child of node.children) flatten(child, [...path, node.name], out);
  return out;
}

function collectOrderChanges(current: LayoutNode, baseline: LayoutNode): LayoutComparison['orderChanges'] {
  const changes: LayoutComparison['orderChanges'] = [];
  const currentNames = current.children.map((child) => child.name);
  const previousNames = baseline.children.map((child) => child.name);
  if (currentNames.join('\0') !== previousNames.join('\0') && sameMembers(currentNames, previousNames)) {
    changes.push({ parent: current.name, previousOrder: previousNames, currentOrder: currentNames });
  }
  const baselineByName = new Map(baseline.children.map((child) => [child.name, child]));
  for (const child of current.children) {
    const prior = baselineByName.get(child.name);
    if (prior) changes.push(...collectOrderChanges(child, prior));
  }
  return changes;
}

function sameMembers(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const counts = new Map<string, number>();
  for (const name of left) counts.set(name, (counts.get(name) ?? 0) + 1);
  for (const name of right) {
    const next = (counts.get(name) ?? 0) - 1;
    if (next < 0) return false;
    counts.set(name, next);
  }
  return true;
}
