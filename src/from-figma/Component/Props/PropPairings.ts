import type { AnyProp, ResolvedConfig } from '@rudironsoni/specs-schema';
import type { FigmaElementNode, SpecableNode } from '../Nodes/types.js';
import type { PropPair, PropPairCandidate } from './PropPair.js';
import { Props } from './Props.js';
import { PropBinding } from './PropBinding.js';
import { Style } from '../Styles/Style.js';
import { ConditionalStyle } from '../Styles/Primitives/ConditionalStyle.js';
import type { Elements } from '../Elements/Elements.js';
import { Utilities } from '../../Utilities/Utilities.js';

const CONTENT_KEYS = ['characters', 'mainComponent', 'slotContentId'] as const;

interface PairableVariant {
  invalid: boolean;
  bindingPairCandidates: PropPairCandidate[];
  full: {
    get(name: string): { node: FigmaElementNode } | undefined;
    entries(): IterableIterator<[string, { node: FigmaElementNode }]>;
  };
}

export class PropPairings {
  constructor(private _items: PropPair[]) {}

  static scan(nodes: FigmaElementNode[], names: string[]): PropPairCandidate[] {
    const candidates: PropPairCandidate[] = [];
    nodes.forEach((node, index) => {
      const refs = node.componentPropertyReferences ?? {};
      if (!refs.visible) return;
      const elementName = names[index] ?? node.name;
      const visiblePropName = Props.propNameWithoutId(refs.visible);
      for (const contentKey of CONTENT_KEYS) {
        const raw = refs[contentKey];
        if (!raw) continue;
        candidates.push({
          elementName,
          visiblePropName,
          contentKey,
          contentPropName: Props.propNameWithoutId(raw),
        });
      }
    });
    return candidates;
  }

  static from(variants: PairableVariant[], node: SpecableNode): PropPairings {
    const valid = variants.filter((variant) => !variant.invalid);
    const groups = PropPairings.groupCandidatesByBoolean(valid);
    const visibleUses = new Map<string, Set<string>>();
    const contentOnly = PropPairings.trackContentOnlyBindings(valid, visibleUses);
    const items: PropPair[] = [];

    for (const group of groups.values()) {
      const first = group[0];
      if (!first) continue;
      const consistent = group.every((candidate) => (
        candidate.elementName === first.elementName
        && candidate.contentPropName === first.contentPropName
        && candidate.contentKey === first.contentKey
      ));
      if (!consistent) continue;

      const uses = visibleUses.get(first.visiblePropName) ?? new Set<string>();
      if (uses.size !== 1 || !uses.has(first.elementName)) continue;
      if (contentOnly.has(first.contentPropName)) continue;
      if (!pairPresentOnEveryHost(valid, first)) continue;

      items.push({
        elementName: first.elementName,
        booleanPropName: first.visiblePropName,
        contentKey: first.contentKey,
        contentPropName: first.contentPropName,
        contentType: first.contentKey === 'characters'
          ? 'string'
          : first.contentKey === 'slotContentId'
            ? 'slot'
            : 'glyph',
        booleanDefault: resolveBooleanDefault(node, first.visiblePropName),
      });
    }

    return new PropPairings(items);
  }

  applyToElements(elements: Elements, config: ResolvedConfig): void {
    for (const pair of this._items) {
      const element = elements.get(pair.elementName);
      if (!element) continue;
      element.styles.set('visible', new Style('visible', new ConditionalStyle(pair)));
      const binding = PropBinding.create(
        pair.contentKey === 'characters'
          ? (element.content ?? '')
          : (typeof element.instanceOf === 'string' ? element.instanceOf : ''),
        pair.contentPropName,
      );
      if (pair.contentKey === 'characters') {
        element.contentBinding = binding;
      } else if (pair.contentKey === 'mainComponent') {
        element.instanceOfBinding = binding;
      }
    }
    void config;
  }

  applyToProps(props: Props, config: ResolvedConfig): void {
    for (const pair of this._items) {
      props.delete(Utilities.formatKey(pair.booleanPropName, config.format.keys));
      const contentName = Utilities.formatKey(pair.contentPropName, config.format.keys);
      const item = props.get(contentName);
      if (item) PropPairings.apply(item, pair, config.format.keys);
    }
  }

  static apply(item: AnyProp, pair: PropPair, _keyFormat?: ResolvedConfig['format']['keys']): void {
    if (item.type !== 'string' && item.type !== 'slot' && item.type !== 'number') return;
    item.nullable = true;
    if (!pair.booleanDefault && (item.type === 'string' || item.type === 'slot')) {
      item.default = null;
    }
  }

  pairedBooleans(): Set<string> {
    return new Set(this._items.map((pair) => pair.booleanPropName));
  }

  pairsByProp(): Map<string, PropPair> {
    return new Map(this._items.map((pair) => [pair.contentPropName, pair]));
  }

  get items(): readonly PropPair[] {
    return this._items;
  }

  get size(): number {
    return this._items.length;
  }

  isEmpty(): boolean {
    return this._items.length === 0;
  }

  private static groupCandidatesByBoolean(variants: PairableVariant[]): Map<string, PropPairCandidate[]> {
    const groups = new Map<string, PropPairCandidate[]>();
    for (const variant of variants) {
      for (const candidate of variant.bindingPairCandidates) {
        const list = groups.get(candidate.visiblePropName) ?? [];
        list.push(candidate);
        groups.set(candidate.visiblePropName, list);
      }
    }
    return groups;
  }

  private static trackContentOnlyBindings(
    variants: PairableVariant[],
    visibleUses: Map<string, Set<string>>,
  ): Set<string> {
    const contentOnly = new Set<string>();
    for (const variant of variants) {
      for (const [elementName, element] of variant.full.entries()) {
        const refs = element.node.componentPropertyReferences ?? {};
        if (refs.visible) {
          const booleanName = Props.propNameWithoutId(refs.visible);
          const uses = visibleUses.get(booleanName) ?? new Set<string>();
          uses.add(elementName);
          visibleUses.set(booleanName, uses);
        }
        for (const contentKey of CONTENT_KEYS) {
          const raw = refs[contentKey];
          if (raw && !refs.visible) contentOnly.add(Props.propNameWithoutId(raw));
        }
      }
    }
    return contentOnly;
  }
}

function pairPresentOnEveryHost(variants: PairableVariant[], pair: PropPairCandidate): boolean {
  for (const variant of variants) {
    const element = variant.full.get(pair.elementName);
    if (!element) continue;
    const refs = element.node.componentPropertyReferences ?? {};
    const visible = refs.visible ? Props.propNameWithoutId(refs.visible) : null;
    const content = refs[pair.contentKey] ? Props.propNameWithoutId(refs[pair.contentKey] as string) : null;
    if (visible !== pair.visiblePropName || content !== pair.contentPropName) return false;
  }
  return true;
}

function resolveBooleanDefault(node: SpecableNode, propName: string): boolean {
  const definitions = (node as { componentPropertyDefinitions?: Record<string, { type?: string; defaultValue?: unknown }> }).componentPropertyDefinitions ?? {};
  for (const [raw, definition] of Object.entries(definitions)) {
    if (Props.propNameWithoutId(raw) !== propName) continue;
    return Boolean(definition.defaultValue);
  }
  return true;
}
