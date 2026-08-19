import type { ResolvedConfig } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../../Nodes/types.js';
import type { ProcessingContext } from '../../../Runtime/Context/interfaces.js';
import { BaseElement } from '../BaseElement.js';
import { PropBinding } from '../../Props/PropBinding.js';

export class TextElement extends BaseElement {
  constructor(node: FigmaElementNode, name: string, config: ResolvedConfig) {
    super(node, name, config);
  }

  protected override async extendedEvaluate(): Promise<void> {
    const refs = this.node.componentPropertyReferences ?? {};
    this.content = this.node.characters || null;
    if (refs.characters) {
      this.contentBinding = PropBinding.create(this.content ?? '', refs.characters);
    }
  }

  protected override async extendedPostProcess(_context?: ProcessingContext): Promise<void> {}
}
