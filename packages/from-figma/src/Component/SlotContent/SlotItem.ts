import type { ResolvedConfig, SlotContent as SchemaSlotContent } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../Nodes/types.js';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import { Anatomy } from '../Anatomy/Anatomy.js';
import { Elements } from '../Elements/Elements.js';
import { Layout } from '../Layout/Layout.js';
import { Utilities } from '../../Utilities/Utilities.js';

export class SlotItem {
  private _elements: Elements;
  private _anatomy: Anatomy;
  private _layout: Layout;
  private _config: ResolvedConfig;
  readonly isEmpty: boolean;

  constructor(slotNode: FigmaElementNode, config: ResolvedConfig) {
    this._config = config;
    const { nodes, names, tree } = Anatomy.traverseSlotContent(slotNode);
    this.isEmpty = nodes.length === 0;
    this._anatomy = new Anatomy(config);
    this._anatomy.populateFromTraverse(nodes, names, null);
    this._elements = new Elements(
      config,
      nodes.map((node, index) => ({ name: names[index] ?? node.name, node })),
    );
    this._layout = new Layout(config, tree);
  }

  async evaluate(context?: ProcessingContext): Promise<void> {
    await this._elements.evaluate(context);
    this._elements.postEvaluate();
  }

  async postProcess(context?: ProcessingContext): Promise<void> {
    await this._elements.postProcess(true, this._elements, context);
  }

  data(): SchemaSlotContent {
    return {
      anatomy: this._anatomy.data(),
      elements: this._elements.data(this._config) ?? {},
      layout: this._fillLayout(),
    };
  }

  layoutKey(): string {
    return JSON.stringify(this._fillLayout());
  }

  anatomyKey(): string {
    return JSON.stringify(this._anatomy.data());
  }

  layoutAnatomyKey(): string {
    return `${this.layoutKey()}|${this.anatomyKey()}`;
  }

  elementsKey(): string {
    return Utilities.hashString(JSON.stringify(this.data().elements ?? {}));
  }

  private _fillLayout(): SchemaSlotContent['layout'] {
    const serialized = this._layout.data();
    const root = serialized[0];
    if (root && typeof root === 'object') {
      const values = Object.values(root)[0];
      if (Array.isArray(values)) return values;
    }
    return serialized;
  }
}
