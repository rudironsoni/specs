import type { AnyProp, SlotProp } from '@rudironsoni/specs-schema';
import { Props } from './Props.js';

const SUFFIXES = ['minItems', 'maxItems', 'anyOf'] as const;

export class SlotConstraints {
  static postProcess(props: Props): void {
    const slots = new Map<string, string>();
    for (const [name, prop] of props.entries()) {
      if (prop.type === 'slot') slots.set(name, name);
    }
    if (slots.size === 0) return;

    for (const [name, prop] of [...props.entries()]) {
      const parsed = parseConstraintKey(name);
      if (!parsed) continue;
      const slotName = matchSlot(parsed.slotName, slots);
      if (!slotName) continue;
      const slot = props.get(slotName);
      if (!slot || slot.type !== 'slot') continue;
      if (promote(slot, parsed.kind, constraintValue(prop))) {
        props.delete(name);
      }
    }
  }
}

function parseConstraintKey(key: string): { slotName: string; kind: typeof SUFFIXES[number] } | null {
  for (const kind of SUFFIXES) {
    if (key.endsWith(` ${kind}`)) {
      return { slotName: key.slice(0, -(kind.length + 1)), kind };
    }
  }
  return null;
}

function matchSlot(slotName: string, slots: Map<string, string>): string | undefined {
  if (slots.has(slotName)) return slotName;
  const stripped = Props.propNameWithoutId(slotName);
  return slots.get(stripped) ?? [...slots.keys()].find((name) => name === stripped);
}

function constraintValue(prop: AnyProp): string | number | undefined {
  if (prop.type === 'number') return prop.default;
  if (prop.type === 'string') {
    const value = 'examples' in prop ? prop.examples?.[0] : undefined;
    return value ?? ('default' in prop ? prop.default ?? undefined : undefined);
  }
  return undefined;
}

function promote(slot: SlotProp, kind: typeof SUFFIXES[number], value: string | number | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (kind === 'minItems') {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) return false;
    slot.minChildren = number;
    return true;
  }
  if (kind === 'maxItems') {
    const number = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(number)) return false;
    slot.maxChildren = number;
    return true;
  }
  const list = String(value).split(',').map((item) => item.trim()).filter(Boolean);
  if (list.length === 0) return false;
  slot.anyOf = list;
  return true;
}
