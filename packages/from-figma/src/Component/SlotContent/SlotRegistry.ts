import type { SlotContent as SchemaSlotContent } from '@rudironsoni/specs-schema';
import type { SlotCandidate } from './SlotCandidate.js';
import { Utilities } from '../../Utilities/Utilities.js';

export class SlotRegistry {
  private _items = new Map<string, SchemaSlotContent>();
  private _fingerprintIndex = new Map<string, string>();
  private _topLevelWiring = new Map<string, string>();
  private _nestedWiring = new Map<string, string>();
  private _referenced = new Set<string>();

  add(candidate: SlotCandidate): string {
    const fingerprint = candidate.fullKey();
    const existing = this._fingerprintIndex.get(fingerprint);
    const finalKey = existing ?? this._resolveCollision(candidate.keyCandidate);
    if (!existing) {
      this._items.set(finalKey, candidate.item.data());
      this._fingerprintIndex.set(fingerprint, finalKey);
    }
    const wiring = `${candidate.elementName}|${candidate.variantKey}`;
    if (candidate.nested) this._nestedWiring.set(wiring, finalKey);
    else this._topLevelWiring.set(wiring, finalKey);
    this._nestedWiring.set(candidate.slotNodeId, finalKey);
    this._topLevelWiring.set(candidate.slotNodeId, finalKey);
    return finalKey;
  }

  markReferenced(finalKey: string): void {
    this._referenced.add(finalKey);
  }

  entry(finalKey: string): SchemaSlotContent | undefined {
    return this._items.get(finalKey);
  }

  topLevelKey(wiringKey: string): string | undefined {
    return this._topLevelWiring.get(wiringKey);
  }

  nestedKey(wiringKey: string): string | undefined {
    return this._nestedWiring.get(wiringKey);
  }

  data(): {
    slotContentExamples: Record<string, SchemaSlotContent>;
    topLevelWiring: Map<string, string>;
    nestedWiring: Map<string, string>;
  } {
    const slotContentExamples: Record<string, SchemaSlotContent> = {};
    for (const [key, value] of this._items) {
      if (this._referenced.has(key)) slotContentExamples[key] = value;
    }
    return {
      slotContentExamples,
      topLevelWiring: this._topLevelWiring,
      nestedWiring: this._nestedWiring,
    };
  }

  get isEmpty(): boolean {
    return this._items.size === 0;
  }

  get hasReferences(): boolean {
    return this._referenced.size > 0;
  }

  private _resolveCollision(base: string): string {
    return Utilities.disambiguateKey(base, (candidate) => this._items.has(candidate));
  }
}
