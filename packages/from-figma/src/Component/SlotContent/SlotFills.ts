import type { ResolvedConfig, SlotContent as SchemaSlotContent } from '@rudironsoni/specs-schema';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import type { Variant } from '../Variants/Variant.js';
import { SlotContent } from './SlotContent.js';

export class SlotFills {
  static async process(
    variants: Variant[],
    hostComponentName: string,
    config: ResolvedConfig,
    context?: ProcessingContext,
    stampReferences = false,
    extraNodes: Array<{ node: import('../Nodes/types.js').FigmaElementNode; key: string }> = [],
    slotBasePath = '#',
  ): Promise<Record<string, SchemaSlotContent>> {
    const slots = new SlotContent({
      hostComponentName,
      basePath: slotBasePath,
      outputKey: 'slotContentExamples',
      config,
      stampReferences,
    });
    await slots.process(variants, context);
    if (extraNodes.length > 0) await slots.processExtras(extraNodes, context);
    return slots.data();
  }
}
