import type { ResolvedConfig, Shadow as SchemaShadow } from '@rudironsoni/specs-schema';
import { Color } from '../Color/Color.js';
import { FigmaVariableReference } from '../Styles/References/FigmaVariableReference.js';

export type RawShadow = {
  type?: string;
  visible?: boolean;
  radius?: number;
  spread?: number;
  offset?: { x?: number; y?: number };
  color?: { r: number; g: number; b: number; a?: number };
  boundVariables?: Record<string, unknown>;
};

export type ShadowField = number | Color | FigmaVariableReference;

export class Shadow {
  visible = true;
  inset?: boolean;
  offsetX: ShadowField = 0;
  offsetY: ShadowField = 0;
  blur: ShadowField = 0;
  spread: ShadowField = 0;
  color: Color | FigmaVariableReference = Color.fromFigma({ r: 0, g: 0, b: 0, a: 1 });

  static fromEffect(effect: RawShadow): Shadow {
    const shadow = new Shadow();
    shadow.evaluate(effect);
    return shadow;
  }

  evaluate(effect: RawShadow): void {
    this.visible = effect.visible !== false;
    this.inset = effect.type === 'INNER_SHADOW' ? true : undefined;
    this.offsetX = bindNumber(effect, 'offsetX', effect.offset?.x ?? 0);
    this.offsetY = bindNumber(effect, 'offsetY', effect.offset?.y ?? 0);
    this.blur = bindNumber(effect, 'radius', effect.radius ?? 0);
    this.spread = bindNumber(effect, 'spread', effect.spread ?? 0);
    this.color = bindColor(effect);
  }

  difference(base: Shadow): boolean {
    return this.visible !== base.visible
      || this.inset !== base.inset
      || fieldDiffers(this.offsetX, base.offsetX)
      || fieldDiffers(this.offsetY, base.offsetY)
      || fieldDiffers(this.blur, base.blur)
      || fieldDiffers(this.spread, base.spread)
      || fieldDiffers(this.color, base.color);
  }

  clone(): Shadow {
    const copy = new Shadow();
    copy.visible = this.visible;
    copy.inset = this.inset;
    copy.offsetX = cloneField(this.offsetX);
    copy.offsetY = cloneField(this.offsetY);
    copy.blur = cloneField(this.blur);
    copy.spread = cloneField(this.spread);
    copy.color = cloneField(this.color) as Color | FigmaVariableReference;
    return copy;
  }

  data(config: ResolvedConfig): SchemaShadow {
    return {
      visible: this.visible,
      ...(this.inset ? { inset: true } : {}),
      offsetX: serializeNumber(this.offsetX, config),
      offsetY: serializeNumber(this.offsetY, config),
      blur: serializeNumber(this.blur, config),
      spread: serializeNumber(this.spread, config),
      color: serializeColor(this.color, config),
    };
  }

  async resolve(context?: { foundations?: Parameters<FigmaVariableReference['resolveName']>[0] }): Promise<void> {
    for (const field of [this.offsetX, this.offsetY, this.blur, this.spread, this.color]) {
      if (field instanceof FigmaVariableReference) await field.resolveName(context?.foundations, true);
    }
  }
}

function bindNumber(effect: RawShadow, key: string, fallback: number): number | FigmaVariableReference {
  const id = aliasId(effect.boundVariables, key);
  if (id) return new FigmaVariableReference(id, fallback, 'dimension');
  return fallback;
}

function bindColor(effect: RawShadow): Color | FigmaVariableReference {
  const color = effect.color ? Color.fromFigma(effect.color) : Color.fromFigma({ r: 0, g: 0, b: 0, a: 1 });
  const id = aliasId(effect.boundVariables, 'color');
  if (id) return new FigmaVariableReference(id, color, 'color');
  return color;
}

function aliasId(bound: Record<string, unknown> | undefined, key: string): string | null {
  const value = bound?.[key];
  if (!value || typeof value !== 'object') return null;
  const record = value as { type?: string; id?: string };
  return record.id && (record.type === 'VARIABLE_ALIAS' || !record.type) ? record.id : null;
}

function fieldDiffers(a: ShadowField, b: ShadowField): boolean {
  if (a instanceof FigmaVariableReference && b instanceof FigmaVariableReference) return a.difference(b);
  if (a instanceof FigmaVariableReference || b instanceof FigmaVariableReference) return true;
  if (a instanceof Color && b instanceof Color) return a.difference(b);
  return a !== b;
}

function cloneField<T extends ShadowField>(value: T): T {
  if (value instanceof FigmaVariableReference) return value.clone() as T;
  if (value instanceof Color) return value.clone() as T;
  return value;
}

function serializeNumber(value: ShadowField, config: ResolvedConfig): SchemaShadow['offsetX'] {
  if (value instanceof FigmaVariableReference) {
    const serialized = value.data(config);
    if (typeof serialized === 'number' || (serialized && typeof serialized === 'object' && '$token' in serialized)) {
      return serialized as SchemaShadow['offsetX'];
    }
    return 0;
  }
  if (value instanceof Color) return 0;
  return value;
}

function serializeColor(value: Color | FigmaVariableReference, config: ResolvedConfig): SchemaShadow['color'] {
  if (value instanceof FigmaVariableReference) return value.data(config) as SchemaShadow['color'];
  return value.data(config.format.color);
}
