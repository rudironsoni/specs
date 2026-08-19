import type { ResolvedConfig } from '@rudironsoni/specs-schema';
import { SlotItem } from './SlotItem.js';
import { Utilities } from '../../Utilities/Utilities.js';

export class SlotCandidate {
  readonly keyCandidate: string;
  readonly item: SlotItem;
  readonly elementName: string;
  readonly variantKey: string;
  readonly nested: boolean;
  readonly slotNodeId: string;

  constructor(
    elementName: string,
    variantKey: string,
    hostComponentName: string,
    item: SlotItem,
    config: ResolvedConfig,
    nested = false,
    keyPrefix?: string,
    slotNodeId = '',
  ) {
    this.elementName = elementName;
    this.variantKey = variantKey;
    this.item = item;
    this.nested = nested;
    this.slotNodeId = slotNodeId;
    const base = Utilities.formatKey(Utilities.normalizeName(elementName), config.format.keys);
    const prefixed = keyPrefix ? `${keyPrefix}__${base}` : base;
    const withHost = hostComponentName && nested ? `${Utilities.identifierKey(hostComponentName)}__${prefixed}` : prefixed;
    this.keyCandidate = variantKey && variantKey !== 'default' ? `${withHost}__${Utilities.identifierKey(variantKey)}` : withHost;
  }

  layoutKey(): string {
    return this.item.layoutKey();
  }

  layoutAnatomyKey(): string {
    return this.item.layoutAnatomyKey();
  }

  fullKey(): string {
    return `${this.item.layoutAnatomyKey()}|${this.item.elementsKey()}`;
  }
}
