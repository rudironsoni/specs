import type { ResolvedConfig } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../../Nodes/types.js';
import type { ProcessingContext } from '../../../Runtime/Context/interfaces.js';
import { BaseElement } from '../BaseElement.js';

export class PolygonElement extends BaseElement {
  constructor(node: FigmaElementNode, name: string, config: ResolvedConfig) {
    super(node, name, config);
  }

  protected override async extendedEvaluate(): Promise<void> {}

  protected override async extendedPostProcess(_context?: ProcessingContext): Promise<void> {}
}
