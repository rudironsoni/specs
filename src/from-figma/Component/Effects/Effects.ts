import type { Effects as SchemaEffects, ResolvedConfig } from '@rudironsoni/specs-schema';
import { Shadow, type RawShadow } from './Shadow.js';
import { Blur, type RawBlur } from './Blur.js';

export class Effects {
  shadows: Shadow[] = [];
  layerBlur?: Blur;
  backgroundBlur?: Blur;

  static fromNode(effects: readonly unknown[] | undefined): Effects | null {
    if (!effects || effects.length === 0) return null;
    const result = new Effects();
    for (const raw of effects) {
      const effect = raw as RawShadow & RawBlur;
      if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
        result.shadows.push(Shadow.fromEffect(effect));
      } else if (effect.type === 'LAYER_BLUR') {
        result.layerBlur = Blur.fromEffect(effect);
      } else if (effect.type === 'BACKGROUND_BLUR') {
        result.backgroundBlur = Blur.fromEffect(effect);
      }
    }
    return result.isEmpty() ? null : result;
  }

  isEmpty(): boolean {
    return this.shadows.length === 0 && !this.layerBlur && !this.backgroundBlur;
  }

  difference(base: Effects): boolean {
    if (this.shadows.length !== base.shadows.length) return true;
    if (this.shadows.some((shadow, index) => {
      const other = base.shadows[index];
      return !other || shadow.difference(other);
    })) return true;
    if (Boolean(this.layerBlur) !== Boolean(base.layerBlur)) return true;
    if (this.layerBlur && base.layerBlur && this.layerBlur.difference(base.layerBlur)) return true;
    if (Boolean(this.backgroundBlur) !== Boolean(base.backgroundBlur)) return true;
    if (this.backgroundBlur && base.backgroundBlur && this.backgroundBlur.difference(base.backgroundBlur)) return true;
    return false;
  }

  clone(): Effects {
    const copy = new Effects();
    copy.shadows = this.shadows.map((shadow) => shadow.clone());
    copy.layerBlur = this.layerBlur?.clone();
    copy.backgroundBlur = this.backgroundBlur?.clone();
    return copy;
  }

  data(config: ResolvedConfig): SchemaEffects {
    const out: SchemaEffects = {};
    if (this.shadows.length > 0) out.shadows = this.shadows.map((shadow) => shadow.data(config));
    if (this.layerBlur) out.layerBlur = this.layerBlur.data(config);
    if (this.backgroundBlur) out.backgroundBlur = this.backgroundBlur.data(config);
    return out;
  }

  async resolve(context?: Parameters<Shadow['resolve']>[0]): Promise<void> {
    for (const shadow of this.shadows) await shadow.resolve(context);
    await this.layerBlur?.resolve(context);
    await this.backgroundBlur?.resolve(context);
  }
}
