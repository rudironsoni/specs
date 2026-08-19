import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import { Style } from './Style.js';
import type { Styles } from './Styles.js';
import { STYLE_DEFAULTS } from './keys.js';
import { QuadComposite } from './Composites/QuadComposite.js';
import { BiaxialComposite } from './Composites/BiaxialComposite.js';
import { TypographyProcessor } from '../Typography/TypographyProcessor.js';
import { EffectsProcessor } from '../Effects/EffectsProcessor.js';
import { GradientProcessor } from '../Gradient/GradientProcessor.js';
import { Gradient } from '../Gradient/Gradient.js';

export class StylesProcessor {
  static postEvaluate(styles: Styles): void {
    StylesProcessor.relateLayoutSizingAndAutoLayout(styles);
    StylesProcessor.relateAutoVsAbsoluteLayout(styles);
    StylesProcessor.relateWrapAndWrapAlignment(styles);
  }

  static async postProcess(
    styles: Styles,
    removeDefaults: boolean,
    _fullStyles: Styles | undefined,
    context?: ProcessingContext,
  ): Promise<void> {
    for (const style of styles.values()) {
      await style.resolve(context);
    }
    await TypographyProcessor.postProcess(styles.get('typography'), context, removeDefaults);
    await EffectsProcessor.postProcess(styles.get('effects'), context);
    for (const key of ['backgroundColor', 'fillColor', 'textColor', 'strokes']) {
      const value = styles.get(key)?.value;
      if (value instanceof Gradient) await GradientProcessor.postProcess(value, context);
    }
    if (removeDefaults) StylesProcessor.removeDefaults(styles);
  }

  private static removeDefaults(styles: Styles): void {
    for (const [key, style] of [...styles.entries()]) {
      const fallback = STYLE_DEFAULTS[key];
      if (fallback === undefined) continue;
      if (style.value instanceof QuadComposite && typeof fallback === 'number' && style.value.isEqualToScalar(fallback)) {
        styles.remove(key);
        continue;
      }
      if (style.value === fallback) styles.remove(key);
    }
  }

  private static relateLayoutSizingAndAutoLayout(styles: Styles): void {
    const mode = styles.get('layoutMode')?.value;
    if (mode === 'NONE' || mode === undefined) {
      for (const key of ['mainAxisAlignment', 'crossAxisAlignment', 'wrap', 'wrapAlignment', 'itemSpacing', 'itemReverseZIndex', 'primaryAxisSizingMode']) {
        styles.remove(key);
      }
    }
  }

  private static relateAutoVsAbsoluteLayout(styles: Styles): void {
    const node = styles.node;
    const parent = node.parent;
    const isRoot = !parent || parent.type === 'COMPONENT' || parent.type === 'COMPONENT_SET' || parent.type === 'CANVAS' || parent.type === 'PAGE';
    if (isRoot) {
      styles.set('position', new Style('position', null));
      for (const key of ['top', 'bottom', 'start', 'end', 'centerHorizontalOffset', 'centerVerticalOffset']) {
        styles.remove(key);
      }
      return;
    }
    const parentMode = parent.layoutMode;
    const absolute = node.layoutPositioning === 'ABSOLUTE';
    if (parentMode && parentMode !== 'NONE' && !absolute) {
      styles.set('position', new Style('position', 'AUTO'));
      for (const key of ['top', 'bottom', 'start', 'end', 'centerHorizontalOffset', 'centerVerticalOffset']) {
        styles.remove(key);
      }
      return;
    }
    if (parentMode && parentMode !== 'NONE' && absolute) {
      styles.set('position', new Style('position', 'ABSOLUTE'));
    } else {
      styles.set('position', new Style('position', null));
    }
    StylesProcessor.mapAxisConstraint(styles, 'horizontal');
    StylesProcessor.mapAxisConstraint(styles, 'vertical');
  }

  private static mapAxisConstraint(styles: Styles, axis: 'horizontal' | 'vertical'): void {
    const node = styles.node;
    const parent = node.parent;
    if (!parent) return;
    const constraint = axis === 'horizontal' ? node.constraints.horizontal : node.constraints.vertical;
    const relX = node.x - parent.x;
    const relY = node.y - parent.y;
    if (axis === 'horizontal') {
      if (constraint === 'MIN' || constraint === 'STRETCH' || constraint === 'SCALE') {
        StylesProcessor.setOffsetStyle(styles, 'start', constraint === 'SCALE' ? percent(relX, parent.width) : relX);
      }
      if (constraint === 'MAX' || constraint === 'STRETCH') {
        StylesProcessor.setOffsetStyle(styles, 'end', parent.width - relX - node.width);
      }
      if (constraint === 'CENTER') {
        StylesProcessor.setOffsetStyle(styles, 'centerHorizontalOffset', relX + node.width / 2 - parent.width / 2);
      }
    } else {
      if (constraint === 'MIN' || constraint === 'STRETCH' || constraint === 'SCALE') {
        StylesProcessor.setOffsetStyle(styles, 'top', constraint === 'SCALE' ? percent(relY, parent.height) : relY);
      }
      if (constraint === 'MAX' || constraint === 'STRETCH') {
        StylesProcessor.setOffsetStyle(styles, 'bottom', parent.height - relY - node.height);
      }
      if (constraint === 'CENTER') {
        StylesProcessor.setOffsetStyle(styles, 'centerVerticalOffset', relY + node.height / 2 - parent.height / 2);
      }
    }
  }

  private static setOffsetStyle(styles: Styles, key: string, value: number | string | null): void {
    styles.set(key, new Style(key, value));
  }

  private static relateWrapAndWrapAlignment(styles: Styles): void {
    if (styles.get('wrap')?.value !== true) styles.remove('wrapAlignment');
    const spacing = styles.get('itemSpacing');
    const node = styles.node;
    if (styles.get('wrap')?.value === true && node.layoutMode !== 'NONE' && node.counterAxisSpacing) {
      styles.set('itemSpacing', new Style('itemSpacing', BiaxialComposite.fromNode(node, node.layoutMode === 'VERTICAL' ? 'VERTICAL' : 'HORIZONTAL')));
    } else if (spacing && typeof spacing.value === 'object') {
      // keep
    }
  }
}

function percent(value: number, total: number): string {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}
