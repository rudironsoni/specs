import type { ImageData, Images, ImageValue, ObjectFit, ResolvedConfig } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../Nodes/types.js';
import type { ProcessingContext } from '../../Runtime/Context/interfaces.js';
import { Style } from '../Styles/Style.js';
import { FigmaStyleReference } from '../Styles/References/FigmaStyleReference.js';
import type { Elements } from '../Elements/Elements.js';
import type { BaseElement } from '../Elements/BaseElement.js';
import type { Props } from '../Props/Props.js';
import { Props as PropsUtil } from '../Props/Props.js';
import { Utilities } from '../../Utilities/Utilities.js';
import { RestInstanceNode } from '../../Adapters/RestApi/RestInstanceNode.js';

export class ImageRegistry {
  private items = new Map<string, ImageData>();

  absorb(node: FigmaElementNode): ImageValue | null {
    const paint = firstImagePaint(node);
    if (!paint) return null;
    const hash = paint.imageRef || paint.imageHash;
    if (!hash) return null;
    const key = Utilities.disambiguateKey(
      Utilities.identifierKey(hash).slice(0, 32) || 'image',
      (candidate) => this.items.has(candidate) && this.items.get(candidate)?.$extensions?.['com.figma']?.imageHash !== hash,
    );
    const existing = [...this.items.entries()].find(([, value]) => value.$extensions?.['com.figma']?.imageHash === hash);
    const id = existing?.[0] ?? key;
    if (!existing) {
      this.items.set(id, {
        src: `figma:${hash}`,
        $extensions: { 'com.figma': { imageHash: hash } },
      });
    }
    const objectFit = mapScaleMode(paint.scaleMode);
    return {
      $image: `#/images/${id}`,
      ...(objectFit !== 'COVER' ? { objectFit } : {}),
    };
  }

  async applyTo(elements: Elements, config: ResolvedConfig, props?: Props, context?: ProcessingContext): Promise<void> {
    const settings = config.processing.images;
    if (!settings) return;
    const sourceProp = settings.sourceProps[0];
    const formattedSource = sourceProp
      ? Utilities.formatKey(PropsUtil.propNameWithoutId(sourceProp), config.format.keys)
      : undefined;
    const hostHasImageProp = Boolean(formattedSource && props?.get(formattedSource)?.type === 'image');

    for (const element of elements.values()) {
      if (settings.imageComponent && isImageComponent(element, settings.imageComponent)) {
        const image = this.absorb(element.node);
        if (image && formattedSource) {
          const current = element.propConfigurations ?? {};
          element.propConfigurations = {
            ...current,
            [formattedSource]: hostHasImageProp
              ? { $binding: `#/props/${formattedSource}`, examples: [image] }
              : image.$image,
          };
        }
        continue;
      }
      if (!settings.backgroundImage) continue;
      const styleId = stringifyStyleId(element.node.fillStyleId);
      if (styleId && firstImagePaint(element.node)) {
        const reference = new FigmaStyleReference(styleId, 'image');
        await reference.resolveName(context?.foundations);
        element.styles.set('backgroundImage', new Style('backgroundImage', reference));
        continue;
      }
      const image = this.absorb(element.node);
      if (image) element.styles.set('backgroundImage', new Style('backgroundImage', image));
    }
  }

  applyHostDefault(node: FigmaElementNode, props: Props, config: ResolvedConfig): void {
    const settings = config.processing.images;
    if (!settings?.imageComponent || settings.sourceProps.length === 0) return;
    if (Utilities.normalizeName(node.name) !== Utilities.normalizeName(settings.imageComponent)) return;
    const image = this.absorb(node);
    if (!image) return;
    const name = Utilities.formatKey(PropsUtil.propNameWithoutId(settings.sourceProps[0] ?? ''), config.format.keys);
    const existing = props.get(name);
    if (existing?.type === 'image') existing.default = image.$image;
  }

  data(): Images | undefined {
    if (this.items.size === 0) return undefined;
    return Object.fromEntries(this.items);
  }
}

export function retypeImageProps(props: Props, config: ResolvedConfig): void {
  const names = config.processing.images?.sourceProps ?? [];
  for (const raw of names) {
    const name = Utilities.formatKey(PropsUtil.propNameWithoutId(raw), config.format.keys);
    const current = props.get(name);
    if (!current || current.type === 'image' || current.type === 'number') continue;
    props.set(name, {
      type: 'image',
      default: null,
      nullable: true,
      $extensions: current.$extensions,
    });
  }
}

function isImageComponent(element: BaseElement, imageComponent: string): boolean {
  const target = Utilities.normalizeName(imageComponent);
  if (element.node instanceof RestInstanceNode) {
    return Utilities.normalizeName(element.node.instanceOf ?? '') === target;
  }
  const instanceOf = typeof element.instanceOf === 'string' ? element.instanceOf : element.node.name;
  return Utilities.normalizeName(instanceOf) === target;
}

function stringifyStyleId(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function firstImagePaint(node: FigmaElementNode): { imageRef?: string; imageHash?: string; scaleMode?: string } | null {
  for (const paint of node.fills ?? []) {
    const record = paint as { type?: string; visible?: boolean; imageRef?: string; imageHash?: string; scaleMode?: string };
    if (record.visible === false) continue;
    if (record.type === 'IMAGE') return record;
  }
  return null;
}

function mapScaleMode(scaleMode: string | undefined): ObjectFit {
  if (scaleMode === 'FIT') return 'CONTAIN';
  return 'COVER';
}
