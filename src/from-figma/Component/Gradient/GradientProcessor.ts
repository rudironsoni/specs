import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import { Gradient } from './Gradient.js';

export class GradientProcessor {
  static async postProcess(gradient: Gradient | null | undefined, context?: ProcessingContext): Promise<void> {
    if (!gradient) return;
    await gradient.resolve(context);
  }
}
