import type { BooleanProp } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../../Nodes/types.js';
import { Props } from '../Props.js';

export class BooleanCodeOnlyProp {
  static canExtract(node: FigmaElementNode): boolean {
    return Boolean(node.componentPropertyReferences?.visible);
  }

  static extract(node: FigmaElementNode): { name: string; prop: BooleanProp } {
    const ref = node.componentPropertyReferences?.visible ?? node.name;
    return {
      name: Props.propNameWithoutId(ref),
      prop: {
        type: 'boolean',
        default: node.visible,
        $extensions: { 'com.figma': { type: 'BOOLEAN', source: { kind: 'codeOnlyProp', layer: node.name } } },
      },
    };
  }
}
