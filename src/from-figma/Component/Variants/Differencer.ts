import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import type { BaseElement } from '../Elements/BaseElement.js';
import type { Elements } from '../Elements/Elements.js';
import type { Variant } from './Variant.js';

export class Differencer {
  static async establishBaselineParity(
    baseline: Elements,
    currentVariant: Variant,
    layeredMatches: Variant[],
    context?: ProcessingContext,
  ): Promise<void> {
    for (const [name] of currentVariant.full.entries()) {
      if (baseline.has(name)) continue;
      const fallback = await Differencer.baseFallbackElement(currentVariant, name, layeredMatches, context);
      baseline.set(name, fallback);
    }
  }

  static async baseFallbackElement(
    currentVariant: Variant,
    elementName: string,
    layeredMatches: Variant[],
    context?: ProcessingContext,
  ): Promise<BaseElement> {
    for (const match of layeredMatches) {
      const found = match.full.get(elementName);
      if (found) return found.clone();
    }
    const defaultVariant = layeredMatches.find((variant) => variant.default) ?? layeredMatches[0];
    if (defaultVariant) {
      return Differencer.addElementToDefault(currentVariant, elementName, defaultVariant, context);
    }
    const current = currentVariant.full.get(elementName);
    if (!current) throw new Error(`Missing element ${elementName}`);
    return current.clone();
  }

  static async addElementToDefault(
    variant: Variant,
    elementName: string,
    defaultVariant: Variant,
    _context?: ProcessingContext,
  ): Promise<BaseElement> {
    const existing = defaultVariant.full.get(elementName);
    if (existing) return existing.clone();
    const source = variant.full.get(elementName);
    if (!source) throw new Error(`Missing element ${elementName}`);
    const copy = source.clone();
    defaultVariant.full.set(elementName, copy);
    return copy.clone();
  }
}
