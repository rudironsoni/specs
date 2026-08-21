import type { ResolvedConfig } from '@rudironsoni/specs-schema';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import type { SpecableNode } from '../Nodes/types.js';
import { Component } from '../Component.js';
import type { Anatomy } from '../Anatomy/Anatomy.js';

export class Subcomponent extends Component {
  private _parentComponentName?: string;
  private _subcomponentKey?: string;

  constructor(node: SpecableNode, config: ResolvedConfig) {
    super(node, config);
  }

  setPathContext(parentComponentName: string, subcomponentKey: string): void {
    this._parentComponentName = parentComponentName;
    this._subcomponentKey = subcomponentKey;
  }

  override async process(context?: ProcessingContext): Promise<void> {
    await super.process(context);
  }

  protected override _slotBasePath(): string {
    return this._subcomponentKey ? `#/subcomponents/${this._subcomponentKey}` : '#';
  }

  getAnatomy(): Anatomy {
    return this.anatomy;
  }
}
