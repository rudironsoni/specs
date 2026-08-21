import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import { Style } from '../Styles/Style.js';
import { FigmaStyleReference } from '../Styles/References/FigmaStyleReference.js';
import { Effects } from './Effects.js';

export class EffectsProcessor {
  static async postProcess(style: Style | undefined, context?: ProcessingContext): Promise<void> {
    if (!style) return;
    if (style.value instanceof FigmaStyleReference) {
      await style.value.resolveName(context?.foundations);
      return;
    }
    if (style.value instanceof Effects) await style.value.resolve(context);
  }
}
