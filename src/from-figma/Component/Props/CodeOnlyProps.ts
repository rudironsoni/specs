import type { ResolvedConfig } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../Nodes/types.js';
import { RestInstanceNode } from '../../Adapters/RestApi/RestInstanceNode.js';
import { Props } from './Props.js';
import { Utilities } from '../../Utilities/Utilities.js';
import { TextCodeOnlyProp } from './CodeOnlyProps/TextCodeOnlyProp.js';
import { BooleanCodeOnlyProp } from './CodeOnlyProps/BooleanCodeOnlyProp.js';
import { InstanceCodeOnlyProp } from './CodeOnlyProps/InstanceCodeOnlyProp.js';

export class CodeOnlyProps {
  static async process(
    container: FigmaElementNode,
    native: Props,
    processing: ResolvedConfig['processing'],
    keys: ResolvedConfig['format']['keys'] = 'SAFE',
  ): Promise<void> {
    for (const node of descendants(container)) {
      if (TextCodeOnlyProp.canExtract(node)) {
        const extracted = TextCodeOnlyProp.extract(node, processing.inferNumberProps);
        native.set(Utilities.formatKey(extracted.name, keys), extracted.prop);
        continue;
      }
      if (BooleanCodeOnlyProp.canExtract(node)) {
        const extracted = BooleanCodeOnlyProp.extract(node);
        native.set(Utilities.formatKey(extracted.name, keys), extracted.prop);
        continue;
      }
      if (InstanceCodeOnlyProp.canExtract(node)) {
        const extracted = await InstanceCodeOnlyProp.extract(node);
        if (extracted) {
          native.set(Utilities.formatKey(extracted.name, keys), extracted.prop);
          continue;
        }
        if (node instanceof RestInstanceNode) {
          native.set(Utilities.formatKey(node.name, keys), {
            type: 'string',
            default: node.instanceOf ?? node.componentId ?? null,
            $extensions: {
              'com.figma': {
                type: 'INSTANCE_SWAP',
                source: { kind: 'codeOnlyProp', layer: node.name, instanceOf: node.instanceOf ?? undefined },
              },
            },
          });
        }
      }
    }
  }
}

function descendants(node: FigmaElementNode): FigmaElementNode[] {
  const out: FigmaElementNode[] = [];
  const visit = (current: FigmaElementNode) => {
    for (const child of current.children) {
      out.push(child);
      visit(child);
    }
  };
  visit(node);
  return out;
}
