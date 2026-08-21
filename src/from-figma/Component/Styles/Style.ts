import type { AspectRatioValue, Conditional, ImageValue, ResolvedConfig, Style as SchemaStyle } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../Nodes/types.js';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import { Color } from '../Color/Color.js';
import { Effects } from '../Effects/Effects.js';
import { Gradient } from '../Gradient/Gradient.js';
import { Typography } from '../Typography/Typography.js';
import { FigmaVariableReference } from './References/FigmaVariableReference.js';
import { FigmaStyleReference } from './References/FigmaStyleReference.js';
import { PropBinding } from '../Props/PropBinding.js';
import { QuadComposite } from './Composites/QuadComposite.js';
import { BiaxialComposite } from './Composites/BiaxialComposite.js';
import { ConditionalStyle } from './Primitives/ConditionalStyle.js';
import { IconFillStyle } from './Primitives/IconFillStyle.js';
import { TypographyStyle } from './Primitives/TypographyStyle.js';
import { EffectsStyle } from './Primitives/EffectsStyle.js';
import { StrokeStyle } from './Primitives/StrokeStyle.js';
import { ColorStyle } from './Primitives/ColorStyle.js';
import { PaddingStyle } from './Primitives/PaddingStyle.js';
import { CornerStyle } from './Primitives/CornerStyle.js';
import { BooleanStyle } from './Primitives/BooleanStyle.js';
import { NumberStyle } from './Primitives/NumberStyle.js';
import { StringStyle } from './Primitives/StringStyle.js';
import { AspectRatioStyle } from './Primitives/AspectRatioStyle.js';

export type StyleValue =
  | FigmaVariableReference
  | FigmaStyleReference
  | PropBinding
  | ConditionalStyle
  | Conditional
  | Color
  | Effects
  | Gradient
  | QuadComposite
  | BiaxialComposite
  | Typography
  | AspectRatioValue
  | ImageValue
  | { dash: number; gap: number }
  | string
  | number
  | boolean
  | null;

export class Style {
  type: 'VARIABLE' | 'STYLE' | 'REFERENCE' | 'RAW' = 'RAW';
  value: StyleValue = null;

  constructor(
    readonly key: string,
    value?: StyleValue,
  ) {
    if (value !== undefined) this.setValue(value);
  }

  static fromNode(node: FigmaElementNode, key: string, context?: ProcessingContext): Style {
    const style = new Style(key);
    if (key === 'fillColor') {
      style.setValue(IconFillStyle.evaluate(node));
      return style;
    }
    if (key === 'typography') {
      style.setValue(TypographyStyle.value(node, context));
      return style;
    }
    if (key === 'effects') {
      style.setValue(EffectsStyle.value(node, context));
      return style;
    }
    if ((key === 'strokes' || key === 'strokeWeight' || key === 'strokeAlign' || key === 'strokeDashPattern')
      && !StrokeStyle.hasVisibleStrokes(node)) {
      return style;
    }
    if (key === 'backgroundColor' && hasImageFill(node)) {
      return style;
    }
    style.setValue(readStyleValue(node, key));
    const variable = FigmaVariableReference.evaluate(node, key, () => {
      const raw = style.value;
      if (raw instanceof Color || typeof raw === 'string' || typeof raw === 'number' || typeof raw === 'boolean') {
        return raw;
      }
      return 0;
    });
    if (variable && !(style.value instanceof QuadComposite) && !(style.value instanceof BiaxialComposite)) {
      style.setValue(variable);
    } else {
      const published = FigmaStyleReference.evaluate(node, key, tokenTypeForStyleKey(key));
      if (published) style.setValue(published);
    }
    if (key === 'visible') {
      const ref = node.componentPropertyReferences?.visible;
      if (ref) style.setValue(PropBinding.create(Boolean(node.visible), ref));
    }
    return style;
  }

  setValue(value: StyleValue): void {
    this.value = value;
    this.type = value instanceof FigmaVariableReference
      ? 'VARIABLE'
      : value instanceof FigmaStyleReference
        ? 'STYLE'
        : value instanceof PropBinding
          ? 'REFERENCE'
          : 'RAW';
  }

  difference(base: Style): Style | null {
    const quad = this.value instanceof QuadComposite
      ? this.value.difference(base.value instanceof QuadComposite || typeof base.value === 'number' || base.value instanceof FigmaVariableReference ? base.value : 0)
      : undefined;
    if (this.value instanceof QuadComposite) {
      if (quad === null) return null;
      return new Style(this.key, quad);
    }
    if (this.value instanceof BiaxialComposite && (base.value instanceof BiaxialComposite || typeof base.value === 'number')) {
      const diff = this.value.difference(base.value);
      if (diff === null) return null;
      return new Style(this.key, diff);
    }
    if (this.value instanceof Color && base.value instanceof Color) {
      return this.value.difference(base.value) ? this.clone() : null;
    }
    if (this.value instanceof Effects && base.value instanceof Effects) {
      return this.value.difference(base.value) ? this.clone() : null;
    }
    if (this.value instanceof Gradient && base.value instanceof Gradient) {
      return this.value.difference(base.value) ? this.clone() : null;
    }
    if (this.value instanceof FigmaVariableReference && base.value instanceof FigmaVariableReference) {
      return this.value.difference(base.value) ? this.clone() : null;
    }
    if (this.value instanceof FigmaStyleReference && base.value instanceof FigmaStyleReference) {
      return this.value.difference(base.value) ? this.clone() : null;
    }
    if (this.value instanceof PropBinding && base.value instanceof PropBinding) {
      return this.value.difference(base.value) ? this.clone() : null;
    }
    if (this.value instanceof Typography && base.value instanceof Typography) {
      return this.value.difference(base.value) ? this.clone() : null;
    }
    if (ConditionalStyle.is(this.value) || ConditionalStyle.is(base.value)) {
      return ConditionalStyle.difference(this.value, base.value) ? this.clone() : null;
    }
    if (JSON.stringify(plain(this.value)) === JSON.stringify(plain(base.value))) return null;
    return this.clone();
  }

  data(config: ResolvedConfig): unknown {
    if (this.value instanceof FigmaVariableReference) return this.value.data(config);
    if (this.value instanceof FigmaStyleReference) return this.value.data(config);
    if (this.value instanceof PropBinding) return this.value.data(config.format.keys);
    if (this.value instanceof ConditionalStyle) return this.value.data(config);
    if (this.value instanceof Typography) return this.value.data(config);
    if (this.value instanceof Color) return this.value.data(config.format.color);
    if (this.value instanceof Effects) return this.value.data(config);
    if (this.value instanceof Gradient) return this.value.data(config);
    if (this.value instanceof QuadComposite) return this.value.data(config);
    if (this.value instanceof BiaxialComposite) return this.value.data(config);
    return this.value as SchemaStyle;
  }

  rawValue(): unknown {
    if (this.value instanceof FigmaVariableReference) return this.value.rawValue;
    if (this.value instanceof Color) return this.value.toHex();
    return this.value;
  }

  clone(valueOverride?: StyleValue): Style {
    const copy = new Style(this.key);
    const source = valueOverride !== undefined ? valueOverride : this.value;
    if (source instanceof Color) copy.setValue(source.clone());
    else if (source instanceof Effects) copy.setValue(source.clone());
    else if (source instanceof Gradient) copy.setValue(source.clone());
    else if (source instanceof FigmaVariableReference) copy.setValue(source.clone());
    else if (source instanceof FigmaStyleReference) copy.setValue(source.clone());
    else if (source instanceof PropBinding) copy.setValue(source.clone());
    else if (source instanceof ConditionalStyle) copy.setValue(source.clone());
    else if (source instanceof Typography) copy.setValue(source.clone());
    else if (source instanceof QuadComposite) copy.setValue(source.clone());
    else if (source instanceof BiaxialComposite) copy.setValue(source.clone());
    else if (source && typeof source === 'object') copy.setValue({ ...source });
    else copy.setValue(source);
    return copy;
  }

  async resolve(context?: ProcessingContext): Promise<void> {
    if (this.value instanceof FigmaVariableReference) {
      await this.value.resolveName(context?.foundations, true);
    }
    if (this.value instanceof FigmaStyleReference) {
      await this.value.resolveName(context?.foundations);
    }
    if (this.value instanceof QuadComposite) {
      await this.value.resolveVariables(context?.foundations);
    }
  }
}

function readStyleValue(node: FigmaElementNode, key: string): StyleValue {
  switch (key) {
    case 'visible':
    case 'locked':
    case 'clipContent':
    case 'itemReverseZIndex':
    case 'wrap':
      return BooleanStyle.value(node, key);
    case 'opacity':
    case 'rotation':
    case 'width':
    case 'height':
    case 'minWidth':
    case 'minHeight':
    case 'maxWidth':
    case 'maxHeight':
    case 'cornerSmoothing':
      return NumberStyle.value(node, key);
    case 'layoutSizingHorizontal':
    case 'layoutSizingVertical':
    case 'strokeAlign':
    case 'layoutMode':
    case 'wrapAlignment':
    case 'mainAxisAlignment':
    case 'crossAxisAlignment':
    case 'primaryAxisSizingMode':
    case 'textAlignHorizontal':
    case 'textAlignVertical':
      return StringStyle.value(node, key);
    case 'strokeWeight':
      return StrokeStyle.value(node);
    case 'strokeDashPattern':
      return readDash(node);
    case 'cornerRadius':
      return CornerStyle.value(node);
    case 'padding':
      return PaddingStyle.value(node);
    case 'itemSpacing':
      return node.itemSpacing;
    case 'backgroundColor':
    case 'fillColor':
    case 'textColor':
      return ColorStyle.value(node, key);
    case 'strokes':
      return ColorStyle.value(node, 'strokes');
    case 'effects':
      return Effects.fromNode(node.effects);
    case 'textOverflow':
      return mapTextOverflow(node);
    case 'maxLines':
      return readMaxLines(node);
    case 'typography':
      return Typography.evaluate(node);
    case 'aspectRatio':
      return AspectRatioStyle.value(node);
    default:
      return null;
  }
}

function hasImageFill(node: FigmaElementNode): boolean {
  for (const paint of node.fills ?? []) {
    const record = paint as { type?: string; visible?: boolean };
    if (record.visible === false) continue;
    if (record.type === 'IMAGE') return true;
  }
  return false;
}

function firstFillValue(paints: readonly unknown[] | undefined): Color | Gradient | null {
  if (!paints) return null;
  for (const paint of paints) {
    const record = paint as { type?: string; visible?: boolean };
    if (record.visible === false) continue;
    if (Gradient.isGradientPaint(record)) return Gradient.fromPaint(record);
    const color = firstSolidColor([paint]);
    if (color) return color;
  }
  return null;
}

function firstSolidColor(paints: readonly unknown[] | undefined): Color | null {
  if (!paints) return null;
  for (const paint of paints) {
    const record = paint as { type?: string; visible?: boolean; color?: { r: number; g: number; b: number; a?: number }; opacity?: number };
    if (record.visible === false) continue;
    if (record.type === 'SOLID' && record.color) {
      const alpha = record.color.a ?? record.opacity ?? 1;
      return Color.fromFigma({ ...record.color, a: alpha });
    }
  }
  return null;
}

function readDash(node: FigmaElementNode): { dash: number; gap: number } | null {
  const dashes = node.strokeDashes
    ?? (node.raw as { strokeDashes?: number[]; dashPattern?: number[] }).strokeDashes
    ?? (node.raw as { dashPattern?: number[] }).dashPattern;
  if (!dashes || dashes.length < 2) return null;
  return { dash: dashes[0], gap: dashes[1] };
}

function tokenTypeForStyleKey(key: string): 'color' | 'typography' | 'effects' {
  if (key === 'typography') return 'typography';
  if (key === 'effects') return 'effects';
  return 'color';
}

function readAspectRatio(node: FigmaElementNode): { x: number; y: number } | null {
  const value = node.targetAspectRatio
    ?? (node.raw as { targetAspectRatio?: { x: number; y: number } | null }).targetAspectRatio;
  if (!value || typeof value.x !== 'number' || typeof value.y !== 'number') return null;
  return { x: value.x, y: value.y };
}

function mapTextOverflow(node: FigmaElementNode): 'CLIP' | 'ELLIPSIS' | null {
  const raw = node.textTruncation
    ?? (node.style?.textTruncation as string | undefined)
    ?? (node.raw as { textTruncation?: string }).textTruncation
    ?? (node.raw as { style?: { textTruncation?: string } }).style?.textTruncation;
  if (raw === 'ENDING') return 'ELLIPSIS';
  if (raw === 'DISABLED' || raw === undefined) return 'CLIP';
  return null;
}

function readMaxLines(node: FigmaElementNode): number | null {
  const value = node.maxLines
    ?? (node.style?.maxLines as number | undefined)
    ?? (node.raw as { maxLines?: number }).maxLines
    ?? (node.raw as { style?: { maxLines?: number } }).style?.maxLines;
  return typeof value === 'number' ? value : null;
}

function plain(value: StyleValue): unknown {
  if (value instanceof Color) return value.toHex();
  if (value instanceof Effects || value instanceof Gradient) return value.data({} as ResolvedConfig);
  if (value instanceof Typography) return value.data({} as ResolvedConfig);
  if (value instanceof FigmaVariableReference) return value.id;
  if (value instanceof QuadComposite || value instanceof BiaxialComposite) return value.data({} as ResolvedConfig);
  return value;
}
