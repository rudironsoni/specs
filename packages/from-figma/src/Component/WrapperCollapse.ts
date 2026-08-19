import type { Anatomy as SchemaAnatomy } from '@rudironsoni/specs-schema';
import { Anatomy } from './Anatomy/Anatomy.js';
import type { AnatomyElement } from './Anatomy/AnatomyElement.js';
import type { Elements } from './Elements/Elements.js';
import { Layout } from './Layout/Layout.js';
import { STYLE_DEFAULTS } from './Styles/keys.js';
import { QuadComposite } from './Styles/Composites/QuadComposite.js';

const DISQUALIFYING = new Set([
  'clipContent', 'cornerRadius', 'strokes', 'strokeAlign', 'strokeWeight',
  'itemSpacing', 'padding', 'effects', 'backgroundColor', 'cornerSmoothing',
]);

export function canCollapse(anatomy: Anatomy, elements: Elements | undefined): { leaf: AnatomyElement; leafName: string } | null {
  const root = anatomy.get('root');
  if (!root || root.type !== 'container') return null;
  const names = [...anatomy.keys()].filter((name) => name !== 'root');
  if (names.length !== 1) return null;
  const leafName = names[0];
  const leaf = anatomy.get(leafName);
  if (!leaf || (leaf.type !== 'text' && leaf.type !== 'glyph')) return null;
  if (leaf.node.children.length > 0) return null;
  if (leaf.node.type === 'SLOT' || root.node.children.some((child) => child.type === 'SLOT')) return null;
  const rootElement = elements?.get('root');
  if (rootElement) {
    for (const [key, style] of rootElement.styles.entries()) {
      if (!DISQUALIFYING.has(key)) continue;
      if (isDefaultish(key, style.value)) continue;
      return null;
    }
  }
  return { leaf, leafName };
}

export function collapseAnatomy(anatomy: Anatomy, leaf: AnatomyElement, leafName: string): void {
  leaf.originalName = leafName;
  leaf.type = leaf.type;
  anatomy.replaceWithRoot(leaf);
}

export function collapseElements(elements: Elements, leafName: string): void {
  const leaf = elements.get(leafName);
  const root = elements.get('root');
  if (!leaf || !root) return;
  leaf.name = 'root';
  elements.delete(leafName);
  elements.set('root', leaf);
}

export function collapsedLayout(config: ConstructorParameters<typeof Layout>[0]): Layout {
  return new Layout(config, { root: { name: 'root', children: [] } });
}

export function collapsedAnatomyData(leaf: AnatomyElement): SchemaAnatomy {
  return { root: leaf.data() };
}

function isDefaultish(key: string, value: unknown): boolean {
  const fallback = STYLE_DEFAULTS[key];
  if (value === fallback) return true;
  if (value instanceof QuadComposite && typeof fallback === 'number' && value.isEqualToScalar(fallback)) return true;
  if (value === false || value === 0 || value === null) return true;
  return false;
}
