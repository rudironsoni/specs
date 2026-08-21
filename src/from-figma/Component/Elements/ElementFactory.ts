import type { ResolvedConfig } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../Nodes/types.js';
import { AnatomyElement } from '../Anatomy/AnatomyElement.js';
import { Utilities } from '../../Utilities/Utilities.js';
import { BaseElement } from './BaseElement.js';
import { registerElementFactory } from './ElementFactoryRegistry.js';
import { TextElement } from './Primitives/TextElement.js';
import { GlyphElement } from './Primitives/GlyphElement.js';
import { InstanceElement } from './Primitives/InstanceElement.js';
import { SlotElement } from './Primitives/SlotElement.js';
import { FrameElement } from './Primitives/FrameElement.js';
import { ComponentElement } from './Primitives/ComponentElement.js';
import { VectorElement } from './Primitives/VectorElement.js';
import { LineElement } from './Primitives/LineElement.js';
import { RectangleElement } from './Primitives/RectangleElement.js';
import { EllipseElement } from './Primitives/EllipseElement.js';
import { PolygonElement } from './Primitives/PolygonElement.js';
import { StarElement } from './Primitives/StarElement.js';

export class ElementFactory {
  static create(node: FigmaElementNode, name: string, config: ResolvedConfig): BaseElement {
    const type = AnatomyElement.getElementType(node, config.processing.glyphNamePattern);
    if (type === 'glyph') {
      const glyphName = config.processing.glyphNamePattern
        ? Utilities.glyphPatternMatch(node.name, config.processing.glyphNamePattern) ?? node.name
        : node.name;
      return new GlyphElement(node, name, config, glyphName);
    }
    switch (node.type) {
      case 'TEXT':
        return new TextElement(node, name, config);
      case 'INSTANCE':
        return new InstanceElement(node, name, config);
      case 'SLOT':
        return new SlotElement(node, name, config);
      case 'VECTOR':
      case 'BOOLEAN_OPERATION':
        return new VectorElement(node, name, config);
      case 'LINE':
        return new LineElement(node, name, config);
      case 'RECTANGLE':
        return new RectangleElement(node, name, config);
      case 'ELLIPSE':
        return new EllipseElement(node, name, config);
      case 'POLYGON':
        return new PolygonElement(node, name, config);
      case 'STAR':
        return new StarElement(node, name, config);
      case 'COMPONENT':
      case 'COMPONENT_SET':
        return new ComponentElement(node, name, config);
      default:
        return new FrameElement(node, name, config);
    }
  }

  static createFrom(element: BaseElement): BaseElement {
    return element.clone();
  }
}

registerElementFactory((node, name, config) => ElementFactory.create(node, name, config));
