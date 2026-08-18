import type { Metadata as SchemaMetadata, ResolvedConfig } from '@rudironsoni/specs-schema';
import type { SpecableNode } from '../Nodes/types.js';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import { METADATA } from './constants.js';

export class Metadata {
  private static findPageId(node: SpecableNode): string {
    let current: SpecableNode | null = node;
    while (current) {
      if (current.type === 'CANVAS' || current.type === 'PAGE') return current.id;
      current = current.parent;
    }
    return '';
  }

  static create(node: SpecableNode, config: ResolvedConfig, context?: ProcessingContext): SchemaMetadata {
    const generator = context?.generator ?? {
      name: METADATA.PLUGIN_NAME,
      version: METADATA.PLUGIN_VERSION,
      url: METADATA.PLUGIN_URL,
    };
    const nodeType = node.type === 'COMPONENT_SET' || node.type === 'COMPONENT' || node.type === 'FRAME'
      ? node.type
      : 'FRAME';
    return {
      author: context?.author ?? 'Unknown',
      lastUpdated: new Date().toISOString(),
      generator: {
        ...generator,
        license: context?.license
          ? { status: context.license.state.status.toUpperCase(), level: context.license.level }
          : undefined,
      },
      schema: {
        url: METADATA.SCHEMA_URL,
        version: METADATA.SCHEMA_VERSION,
        latest: METADATA.SCHEMA_LATEST_URL,
      },
      source: {
        pageId: Metadata.findPageId(node),
        nodeId: node.id,
        nodeType,
      },
      config,
    };
  }
}
