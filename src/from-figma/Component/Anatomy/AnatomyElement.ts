import type { AnatomyElement as SchemaAnatomyElement, ElementType, ResolvedConfig, SubcomponentRef } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../Nodes/types.js';
import { RestInstanceNode } from '../../Adapters/RestApi/RestInstanceNode.js';
import { Utilities } from '../../Utilities/Utilities.js';

export class AnatomyElement {
  type: ElementType;
  id: string;
  detectedIn?: string;
  instanceOf?: string | SubcomponentRef;
  originalName?: string;
  readonly node: FigmaElementNode;

  constructor(
    elementNode: FigmaElementNode,
    _elementName: string,
    variantName: string | null,
    config: ResolvedConfig,
  ) {
    this.node = elementNode;
    this.id = elementNode.id;
    this.type = AnatomyElement.getElementType(elementNode, config.processing.glyphNamePattern);
    this.detectedIn = variantName ?? undefined;
    if (elementNode instanceof RestInstanceNode) {
      this.instanceOf = elementNode.instanceOf ?? undefined;
    }
  }

  async postProcess(): Promise<void> {}

  data(): SchemaAnatomyElement {
    const data: SchemaAnatomyElement = { type: this.type };
    if (this.detectedIn) data.detectedIn = this.detectedIn;
    if (typeof this.instanceOf === 'string') data.instanceOf = Utilities.normalizeName(this.instanceOf);
    else if (this.instanceOf) data.instanceOf = this.instanceOf;
    if (this.originalName) {
      data.$extensions = { 'com.figma': { originalName: this.originalName } };
    }
    return data;
  }

  static getElementType(node: FigmaElementNode, glyphPattern?: string): ElementType {
    if (glyphPattern && (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION' || node.type === 'COMPONENT')) {
      if (Utilities.glyphPatternMatch(node.name, glyphPattern)) return 'glyph';
    }
    switch (node.type) {
      case 'TEXT':
        return 'text';
      case 'VECTOR':
      case 'BOOLEAN_OPERATION':
        return 'vector';
      case 'LINE':
        return 'line';
      case 'STAR':
        return 'star';
      case 'POLYGON':
        return 'polygon';
      case 'RECTANGLE':
        return 'rectangle';
      case 'ELLIPSE':
        return 'ellipse';
      case 'SLOT':
        return 'slot';
      case 'INSTANCE':
        return 'instance';
      default:
        return 'container';
    }
  }
}
