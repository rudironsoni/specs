import type { ResolvedConfig } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../Nodes/types.js';
import type { Variant } from '../Variants/Variant.js';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import { RestInstanceNode } from '../../Adapters/RestApi/RestInstanceNode.js';
import { SlotItem } from './SlotItem.js';
import { SlotCandidate } from './SlotCandidate.js';
import { resolveComponentId } from '../../Runtime/Nodes/NodeAccess.js';

export interface NestedSlotRelation {
  containingSlotElementName: string;
  containingVariantKey: string;
  containingSlotId: string;
  instanceNodeName: string;
  childSlotElementName: string;
  childVariantKey: string;
  childSlotId: string;
  nestedInstancePath: string[];
}

interface VisitState {
  containingSlot: FigmaElementNode | null;
  anchorInstance: FigmaElementNode | null;
  pathBelowAnchor: string[];
  variantKey: string;
  visited: Set<string>;
}

export class SlotDetector {
  constructor(private config: ResolvedConfig) {}

  async traverse(
    variants: Variant[],
    hostComponentName: string,
    context?: ProcessingContext,
  ): Promise<{ candidates: SlotCandidate[]; nestedRelations: NestedSlotRelation[] }> {
    const candidates: SlotCandidate[] = [];
    const nestedRelations: NestedSlotRelation[] = [];
    for (const variant of variants) {
      if (!variant.node) continue;
      const result = await this.traverseNode(
        variant.node,
        variant.default ? 'default' : this._variantSuffix(variant),
        hostComponentName,
        context,
      );
      candidates.push(...result.candidates);
      nestedRelations.push(...result.nestedRelations);
    }
    return { candidates, nestedRelations };
  }

  async traverseNode(
    node: FigmaElementNode,
    variantSuffix: string,
    hostComponentName: string,
    context?: ProcessingContext,
    keyPrefix?: string,
  ): Promise<{ candidates: SlotCandidate[]; nestedRelations: NestedSlotRelation[] }> {
    const candidates: SlotCandidate[] = [];
    const nestedRelations: NestedSlotRelation[] = [];
    await this._visit(node, {
      containingSlot: null,
      anchorInstance: null,
      pathBelowAnchor: [],
      variantKey: variantSuffix,
      visited: new Set(),
    }, hostComponentName, keyPrefix, candidates, nestedRelations, context);
    return { candidates, nestedRelations };
  }

  private async _visit(
    node: FigmaElementNode,
    state: VisitState,
    hostComponentName: string,
    keyPrefix: string | undefined,
    candidates: SlotCandidate[],
    nestedRelations: NestedSlotRelation[],
    context?: ProcessingContext,
  ): Promise<void> {
    for (const child of node.children) {
      if (child.type === 'SLOT') {
        if (child.children.length > 0) {
          await this._processSlotNode(child, state, hostComponentName, keyPrefix, candidates, nestedRelations);
        }
        await this._visit(child, {
          containingSlot: child,
          anchorInstance: null,
          pathBelowAnchor: [],
          variantKey: state.variantKey,
          visited: state.visited,
        }, hostComponentName, keyPrefix, candidates, nestedRelations, context);
        continue;
      }

      if (child.type === 'INSTANCE' || child instanceof RestInstanceNode) {
        const componentId = await resolveComponentId(child);
        if (componentId && state.visited.has(componentId)) continue;
        const nextVisited = new Set(state.visited);
        if (componentId) nextVisited.add(componentId);
        const next: VisitState = state.containingSlot
          ? {
              containingSlot: state.containingSlot,
              anchorInstance: state.anchorInstance ?? child,
              pathBelowAnchor: state.anchorInstance
                ? [...state.pathBelowAnchor, child.name]
                : [],
              variantKey: state.variantKey,
              visited: nextVisited,
            }
          : { ...state, visited: nextVisited };
        await this._visit(child, next, hostComponentName, keyPrefix, candidates, nestedRelations, context);
        continue;
      }

      await this._visit(child, state, hostComponentName, keyPrefix, candidates, nestedRelations, context);
    }
  }

  private async _processSlotNode(
    slot: FigmaElementNode,
    state: VisitState,
    hostComponentName: string,
    keyPrefix: string | undefined,
    candidates: SlotCandidate[],
    nestedRelations: NestedSlotRelation[],
  ): Promise<void> {
    const item = new SlotItem(slot, this.config);
    if (item.isEmpty) return;
    await item.evaluate();
    await item.postProcess();
    const nested = Boolean(state.containingSlot && state.anchorInstance);
    candidates.push(new SlotCandidate(
      slot.name,
      state.variantKey,
      hostComponentName,
      item,
      this.config,
      nested,
      keyPrefix,
      slot.id,
    ));
    if (state.containingSlot && state.anchorInstance) {
      nestedRelations.push({
        containingSlotElementName: state.containingSlot.name,
        containingVariantKey: state.variantKey,
        containingSlotId: state.containingSlot.id,
        instanceNodeName: state.anchorInstance.name,
        childSlotElementName: slot.name,
        childVariantKey: state.variantKey,
        childSlotId: slot.id,
        nestedInstancePath: state.pathBelowAnchor,
      });
    }
  }

  private _variantSuffix(variant: Variant): string {
    const parts = Object.entries(variant.configuration).map(([key, value]) => `${key}=${value}`);
    return parts.join(',') || variant.name;
  }
}
