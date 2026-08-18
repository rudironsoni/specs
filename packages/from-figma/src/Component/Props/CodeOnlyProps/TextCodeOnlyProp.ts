import type { NumberProp, StringProp } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../../Nodes/types.js';
import { Props } from '../Props.js';

export class TextCodeOnlyProp {
  static canExtract(node: FigmaElementNode): boolean {
    return node.type === 'TEXT';
  }

  static extract(node: FigmaElementNode, inferNumber = false): { name: string; prop: StringProp | NumberProp } {
    const refs = node.componentPropertyReferences ?? {};
    const name = refs.characters ? Props.propNameWithoutId(refs.characters) : node.name;
    const text = node.characters;
    const source = { kind: 'codeOnlyProp' as const, layer: node.name };
    if (inferNumber && Props.isNumericValue(text)) {
      return { name, prop: { type: 'number', default: Number(text) } };
    }
    return {
      name,
      prop: {
        type: 'string',
        default: text || null,
        $extensions: { 'com.figma': { type: 'TEXT', source } },
      },
    };
  }
}
