import { BootstrapError } from '../../errors.js';
import { digestCanonical } from '../../serialize.js';
import type { FigmaPlan } from '../../schema/types.js';
import type { FigmaTransport, MaterializeDiff } from './types.js';
import { SPECS_PLUGIN_NAMESPACE } from './types.js';

export interface MemoryNode {
  id: string;
  name: string;
  type: 'DOCUMENT' | 'CANVAS' | 'COMPONENT' | 'COMPONENT_SET' | 'FRAME' | 'TEXT' | 'RECTANGLE';
  specsIdentity?: string;
  pluginData: Record<string, string>;
  children: MemoryNode[];
  layoutMode?: string;
  itemSpacing?: number;
  characters?: string;
  key?: string;
}

function cloneNode(node: MemoryNode): MemoryNode {
  return {
    ...node,
    pluginData: { ...node.pluginData },
    children: node.children.map(cloneNode),
  };
}

export class MemoryFigmaTransport implements FigmaTransport {
  readonly id = 'memory';
  private root: MemoryNode;
  private nextId = 10;

  constructor(seed?: MemoryNode) {
    this.root = seed ?? {
      id: '0:0',
      name: 'Document',
      type: 'DOCUMENT',
      pluginData: {},
      children: [
        {
          id: '0:1',
          name: 'Page 1',
          type: 'CANVAS',
          pluginData: {},
          children: [
            {
              id: '9:9',
              name: 'DesignerFrame',
              type: 'FRAME',
              pluginData: {},
              children: [],
            },
          ],
        },
      ],
    };
  }

  digest(): string {
    return digestCanonical(this.exportRest());
  }

  dryRun(plan: FigmaPlan): MaterializeDiff {
    const clone = new MemoryFigmaTransport(cloneNode(this.root));
    clone.nextId = this.nextId;
    return clone.applyInternal(plan, true);
  }

  apply(plan: FigmaPlan): MaterializeDiff {
    return this.applyInternal(plan, false);
  }

  private applyInternal(plan: FigmaPlan, preview: boolean): MaterializeDiff {
    if (plan.expectedTargetDigest && plan.expectedTargetDigest !== this.digest()) {
      throw new BootstrapError(
        'PLAN_PRECONDITION_FAILED',
        'Target digest does not match the plan',
        { expected: plan.expectedTargetDigest, actual: this.digest() },
      );
    }
    const diff: MaterializeDiff = { creates: [], updates: [], deletes: [] };
    const page = this.root.children[0];
    for (const op of [...plan.operations.create, ...plan.operations.update].sort((a, b) => a.id.localeCompare(b.id))) {
      if (op.kind === 'createComponentSet' || op.kind === 'createComponent') {
        const identity = String(op.payload.identity);
        const payloadDigest = digestCanonical(op.payload);
        const existing = findOwned(page, identity);
        if (existing && existing.pluginData.payloadDigest === payloadDigest) {
          continue;
        }
        if (existing) {
          existing.name = String(op.payload.title ?? existing.name);
          existing.pluginData[SPECS_PLUGIN_NAMESPACE] = identity;
          existing.pluginData.payloadDigest = payloadDigest;
          diff.updates.push(identity);
        } else {
          const spec = op.payload.component as { title?: string; props?: { appearance?: { enum?: string[] } } } | undefined;
          const variants = spec?.props?.appearance?.enum ?? ['default'];
          const setId = `${this.nextId}:1`;
          const node: MemoryNode = {
            id: setId,
            name: String(op.payload.title ?? identity),
            type: 'COMPONENT_SET',
            specsIdentity: identity,
            pluginData: { [SPECS_PLUGIN_NAMESPACE]: identity, payloadDigest },
            key: identity,
            layoutMode: 'HORIZONTAL',
            itemSpacing: 8,
            children: variants.map((value, index) => ({
              id: `${this.nextId}:${index + 2}`,
              name: `appearance=${value}`,
              type: 'COMPONENT',
              specsIdentity: identity,
              pluginData: { [SPECS_PLUGIN_NAMESPACE]: identity },
              key: `${identity}:${value}`,
              layoutMode: 'HORIZONTAL',
              itemSpacing: 8,
              children: [
                {
                  id: `${this.nextId}:${index + 20}`,
                  name: 'label',
                  type: 'TEXT',
                  pluginData: {},
                  characters: String(op.payload.title ?? 'Label'),
                  children: [],
                },
              ],
            })),
          };
          node.pluginData.componentPropertyDefinitions = JSON.stringify({
            appearance: { type: 'VARIANT', defaultValue: variants[0], variantOptions: variants },
          });
          this.nextId += 1;
          if (!preview) page.children.push(node);
          else page.children.push(cloneNode(node));
          diff.creates.push(identity);
        }
      }
    }
    if (plan.operations.delete.length > 0) {
      throw new BootstrapError('PLAN_PRECONDITION_FAILED', 'Deletion is disabled by default');
    }
    return diff;
  }

  exportRest(): unknown {
    const components: Record<string, { id: string; name: string; type: string; key: string }> = {};
    walk(this.root, (node) => {
      if (node.type === 'COMPONENT') {
        components[node.id] = {
          id: node.id,
          name: node.name,
          type: node.type,
          key: node.key ?? node.id,
        };
      }
    });
    const componentSets: Record<string, { id: string; name: string; type: string; key: string }> = {};
    walk(this.root, (node) => {
      if (node.type === 'COMPONENT_SET') {
        componentSets[node.id] = { id: node.id, name: node.name, type: node.type, key: node.key ?? node.id };
      }
    });
    return {
      name: 'Specs Bootstrap',
      document: toRest(this.root),
      components,
      componentSets,
    };
  }
}

function findOwned(node: MemoryNode, identity: string): MemoryNode | undefined {
  if (node.specsIdentity === identity) return node;
  for (const child of node.children) {
    const found = findOwned(child, identity);
    if (found) return found;
  }
  return undefined;
}

function walk(node: MemoryNode, visit: (node: MemoryNode) => void): void {
  visit(node);
  for (const child of node.children) walk(child, visit);
}

function toRest(node: MemoryNode): Record<string, unknown> {
  return {
    id: node.id,
    name: node.name,
    type: node.type,
    layoutMode: node.layoutMode,
    itemSpacing: node.itemSpacing,
    characters: node.characters,
    pluginData: node.pluginData,
    children: node.children.map(toRest),
    componentPropertyDefinitions: node.type === 'COMPONENT_SET'
      ? {
          appearance: {
            type: 'VARIANT',
            defaultValue: node.children[0]?.name.split('=')[1] ?? 'default',
            variantOptions: node.children.map((child) => child.name.split('=')[1] ?? child.name),
          },
        }
      : undefined,
  };
}
