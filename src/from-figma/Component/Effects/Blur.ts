import type { Blur as SchemaBlur, ResolvedConfig } from '@rudironsoni/specs-schema';
import { FigmaVariableReference } from '../Styles/References/FigmaVariableReference.js';

export type RawBlur = {
  type?: string;
  visible?: boolean;
  radius?: number;
  boundVariables?: Record<string, unknown>;
};

export class Blur {
  visible = true;
  radius: number | FigmaVariableReference = 0;

  static fromEffect(effect: RawBlur): Blur {
    const blur = new Blur();
    blur.evaluate(effect);
    return blur;
  }

  evaluate(effect: RawBlur): void {
    this.visible = effect.visible !== false;
    const fallback = effect.radius ?? 0;
    const bound = effect.boundVariables?.radius as { id?: string; type?: string } | undefined;
    this.radius = bound?.id
      ? new FigmaVariableReference(bound.id, fallback, 'dimension')
      : fallback;
  }

  difference(base: Blur): boolean {
    if (this.visible !== base.visible) return true;
    if (this.radius instanceof FigmaVariableReference && base.radius instanceof FigmaVariableReference) {
      return this.radius.difference(base.radius);
    }
    return this.radius !== base.radius;
  }

  clone(): Blur {
    const copy = new Blur();
    copy.visible = this.visible;
    copy.radius = this.radius instanceof FigmaVariableReference ? this.radius.clone() : this.radius;
    return copy;
  }

  data(config: ResolvedConfig): SchemaBlur {
    return {
      visible: this.visible,
      radius: this.radius instanceof FigmaVariableReference ? this.radius.data(config) as SchemaBlur['radius'] : this.radius,
    };
  }

  async resolve(context?: { foundations?: Parameters<FigmaVariableReference['resolveName']>[0] }): Promise<void> {
    if (this.radius instanceof FigmaVariableReference) {
      await this.radius.resolveName(context?.foundations, true);
    }
  }
}
