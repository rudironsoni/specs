import type { BooleanProp, EnumProp } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../../Nodes/types.js';
import { RestInstanceNode } from '../../../Adapters/RestApi/RestInstanceNode.js';
import { Props } from '../Props.js';

export class InstanceCodeOnlyProp {
  static canExtract(node: FigmaElementNode): boolean {
    return node instanceof RestInstanceNode || node.type === 'INSTANCE';
  }

  static async extract(node: FigmaElementNode): Promise<{ name: string; prop: BooleanProp | EnumProp } | null> {
    if (!(node instanceof RestInstanceNode)) return null;
    const main = await node.getMainComponentAsync();
    const definitions = (main as { componentPropertyDefinitions?: Record<string, { type?: string; defaultValue?: unknown; variantOptions?: string[] }> } | null)
      ?.componentPropertyDefinitions ?? {};
    const variants = Object.entries(definitions).filter(([, definition]) => definition.type === 'VARIANT');
    if (variants.length !== 1) return null;
    const [rawName, definition] = variants[0] ?? [];
    if (!rawName || !definition) return null;
    const name = Props.propNameWithoutId(rawName);
    const options = (definition.variantOptions ?? []).map(String);
    const defaultValue = String(definition.defaultValue ?? options[0] ?? '');
    const source = { kind: 'codeOnlyProp' as const, layer: node.name, instanceOf: node.instanceOf ?? undefined };
    if (isBooleanPair(options)) {
      return {
        name,
        prop: {
          type: 'boolean',
          default: /true/i.test(defaultValue),
          $extensions: { 'com.figma': { type: 'VARIANT', source } },
        },
      };
    }
    return {
      name,
      prop: {
        type: 'string',
        default: defaultValue,
        enum: options,
        $extensions: { 'com.figma': { type: 'VARIANT', source } },
      },
    };
  }
}

function isBooleanPair(options: string[]): boolean {
  if (options.length !== 2) return false;
  const normalized = options.map((option) => option.toLowerCase()).sort();
  return normalized[0] === 'false' && normalized[1] === 'true';
}
