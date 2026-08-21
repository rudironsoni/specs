import type { ResolvedConfig } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../../Nodes/types.js';
import type { ProcessingContext } from '../../../Runtime/Context/interfaces.js';
import { BaseElement } from '../BaseElement.js';
import { Utilities } from '../../../Utilities/Utilities.js';

export class GlyphElement extends BaseElement {
  private _glyphName: string;

  constructor(node: FigmaElementNode, name: string, config: ResolvedConfig, glyphName: string) {
    super(node, name, config);
    this._glyphName = glyphName;
  }

  get glyphName(): string {
    return this._glyphName;
  }

  static patternMatch(resolvedName: string, pattern: string): string | null {
    return Utilities.glyphPatternMatch(resolvedName, pattern);
  }

  protected override async extendedEvaluate(): Promise<void> {
    this.content = this._glyphName;
  }

  protected override async extendedPostProcess(_context?: ProcessingContext): Promise<void> {}

  override clone(): BaseElement {
    const copy = super.clone();
    if (copy instanceof GlyphElement) copy._glyphName = this._glyphName;
    return copy;
  }
}
