import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const experimental = { text: 'Experimental', variant: 'default' };

const SITE = 'https://github.rudironsoni.com';
const BASE = '/specs';

function rehypePrefixBase(base) {
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
  const isInternal = (value) =>
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    value !== prefix &&
    !value.startsWith(`${prefix}/`);

  const rewrite = (node) => {
    if (node?.properties) {
      for (const key of ['href', 'src']) {
        const value = node.properties[key];
        if (isInternal(value)) node.properties[key] = `${prefix}${value}`;
      }
    }
    if (Array.isArray(node?.children)) {
      for (const child of node.children) rewrite(child);
    }
  };

  return () => (tree) => rewrite(tree);
}

export default defineConfig({
  site: SITE,
  base: BASE,
  server: { port: 4323 },
  markdown: {
    rehypePlugins: [rehypePrefixBase(BASE)],
  },
  integrations: [
    starlight({
      title: 'Specs',
      description: 'Generate structured, machine-readable UI component specifications from Figma.',
      social: {
        github: 'https://github.com/rudironsoni/specs',
      },
      components: {
        SocialIcons: './src/components/SocialIcons.astro',
        ThemeSelect: './src/components/ThemeSelect.astro',
        Sidebar: './src/components/Sidebar.astro',
        Hero: './src/components/Hero.astro',
        Header: './src/components/Header.astro',
        Footer: './src/components/Footer.astro',
      },
      customCss: ['./src/custom.css'],
      head: [
        {
          tag: 'script',
          content: `
            // Exclusive accordion: only one top-level sidebar section open at a time.
            // Uses ul.top-level > li > details to target only top-level groups,
            // not nested subsections like Processing/Format/Include.
            document.addEventListener('DOMContentLoaded', () => {
              const tops = [...document.querySelectorAll('ul.top-level > li > details')];
              for (const d of tops) {
                d.querySelector(':scope > summary')?.addEventListener('click', () => {
                  requestAnimationFrame(() => {
                    if (!d.open) return;
                    for (const o of tops) {
                      if (o !== d && o.open) {
                        o.open = false;
                        const idx = o.querySelector('sl-sidebar-restore')?.dataset.index;
                        if (idx == null) continue;
                        try {
                          const k = 'sl-sidebar-state';
                          const s = JSON.parse(sessionStorage.getItem(k) || '{}');
                          if (Array.isArray(s.open)) {
                            s.open[parseInt(idx)] = false;
                            sessionStorage.setItem(k, JSON.stringify(s));
                          }
                        } catch {}
                      }
                    }
                  });
                });
              }
            });
          `,
        },
      ],
      sidebar: [
        { label: 'Introduction', slug: '' },
        { label: 'About Specs', slug: 'overview/aboutspecs' },
        { label: 'Getting Started', slug: 'cli/getting-started' },
        { label: 'Releases', slug: 'overview/releases' },
        { label: 'Licensing', slug: 'overview/licensing' },
        {
          label: 'Specs 2 Figma Plugin',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'plugin' },
            {
              label: 'Sections',
              items: [
                { label: 'Anatomy', slug: 'plugin/anatomy' },
                { label: 'Props', slug: 'plugin/props' },
                { label: 'Layout', slug: 'plugin/layout' },
                { label: 'Modes', slug: 'plugin/modes' },
                { label: 'Styling', slug: 'plugin/styling' },
                { label: 'Data', slug: 'plugin/data' },
              ],
            },
            {
              label: 'Formatting',
              items: [
                { label: 'Multi-Column Layout', slug: 'plugin/multi-column-layout' },
                { label: 'Color', slug: 'plugin/color' },
                { label: 'Dark Mode', slug: 'plugin/dark-mode' },
                { label: 'Spacing', slug: 'plugin/spacing' },
                { label: 'Text', slug: 'plugin/text' },
              ],
            },
          ],
        },
        {
          label: 'Command Line (CLI)',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'cli' },
            { label: 'Workflows', slug: 'cli/workflows' },
            { label: 'init', slug: 'cli/commands/init' },
            { label: 'fetch', slug: 'cli/commands/fetch' },
            { label: 'scan', slug: 'cli/commands/scan' },
            { label: 'applyCustomTokens', slug: 'cli/commands/apply-custom-tokens' },
            { label: 'generate', slug: 'cli/commands/generate' },
            { label: 'transform', slug: 'cli/commands/transform' },
            {
              label: 'Transforms',
              collapsed: true,
              badge: experimental,
              items: [
                { label: 'Overview', slug: 'cli/transforms' },
                { label: 'contract', slug: 'cli/transforms/contract' },
                { label: 'css', slug: 'cli/transforms/css' },
                { label: 'react', slug: 'cli/transforms/react' },
                { label: 'stories', slug: 'cli/transforms/stories' },
              ],
            },
            {
              label: 'Analyze',
              collapsed: true,
              badge: experimental,
              items: [
                { label: 'Overview', slug: 'cli/analyze' },
                { label: 'props', slug: 'cli/analyze/props' },
                { label: 'styling', slug: 'cli/analyze/styling' },
                { label: 'dependencies', slug: 'cli/analyze/dependencies' },
              ],
            },
          ],
        },
        {
          label: 'Schema',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'schema' },
            { label: 'Anatomy', slug: 'schema/anatomy' },
            { label: 'Children', slug: 'schema/children' },
            { label: 'Component', slug: 'schema/component' },
            { label: 'Composition', slug: 'schema/composition' },
            { label: 'Conditional', slug: 'schema/conditional' },
            { label: 'Config', slug: 'schema/config' },
            { label: 'Corners', slug: 'schema/corners' },
            { label: 'Effects', slug: 'schema/effects' },
            { label: 'Elements', slug: 'schema/elements' },
            { label: 'Gradient Value', slug: 'schema/gradient-value' },
            { label: 'Instance Examples', slug: 'schema/instance-examples' },
            { label: 'Layout', slug: 'schema/layout' },
            { label: 'Metadata', slug: 'schema/metadata' },
            { label: 'Prop Binding', slug: 'schema/prop-binding' },
            { label: 'Prop Configurations', slug: 'schema/prop-configurations' },
            { label: 'Props', slug: 'schema/props' },
            { label: 'Sides', slug: 'schema/sides' },
            { label: 'Slot Content', slug: 'schema/slot-content' },
            { label: 'Slot Content Reference', slug: 'schema/slot-content-ref' },
            { label: 'Styles', slug: 'schema/styles' },
            { label: 'Subcomponents', slug: 'schema/subcomponents' },
            { label: 'Token Reference', slug: 'schema/token-reference' },
            { label: 'Typography', slug: 'schema/typography' },
            { label: 'Variants', slug: 'schema/variants' },
          ],
        },
        {
          label: 'Settings',
          collapsed: true,
          items: [
            { label: 'Overview', slug: 'settings' },
            {
              label: 'Format',
              items: [
                { label: 'output', slug: 'settings/output-format' },
                { label: 'keys', slug: 'settings/keys' },
                { label: 'tokens', slug: 'settings/tokens' },
                { label: 'color', slug: 'settings/color' },
              ],
            },
            {
              label: 'Variants',
              items: [
                { label: 'variantDepth', slug: 'settings/variant-depth' },
                { label: 'emptyVariants', slug: 'settings/empty-variants' },
                { label: 'invalidVariants', slug: 'settings/invalid-variants' },
                { label: 'invalidCombinations', slug: 'settings/invalid-combinations' },
              ],
            },
            {
              label: 'Elements',
              items: [
                { label: 'glyphNamePattern', slug: 'settings/glyph-name-pattern' },
                { label: 'subcomponents', slug: 'settings/subcomponents' },
                { label: 'collapsePrimitiveWrapper', slug: 'settings/collapse-primitive-wrapper' },
                { label: 'defaultSlotContent', slug: 'settings/default-slot-content' },
                { label: 'instanceExamples', slug: 'settings/instance-examples' },
              ],
            },
            {
              label: 'Props',
              items: [
                { label: 'codeOnlyPropsPattern', slug: 'settings/code-only-props-pattern' },
                { label: 'slotConstraints', slug: 'settings/slot-constraints' },
                { label: 'inferNumberProps', slug: 'settings/infer-number-props' },
              ],
            },
            { label: 'Layout', slug: 'settings/layout' },
            { label: 'images', slug: 'settings/images' },
            { label: 'details', slug: 'settings/details' },
            { label: 'states', slug: 'settings/states', badge: experimental },
            { label: 'transformers', slug: 'settings/transform', badge: experimental },
            {
              label: 'Files and Folders',
              items: [
                { label: 'sources', slug: 'settings/data-sources' },
                { label: 'Folders', slug: 'settings/folders' },
                { label: 'Output', slug: 'settings/output' },
              ],
            },
          ],
        },
        {
          label: 'Guides',
          collapsed: true,
          items: [
            { label: 'Absolute Positioning', slug: 'guides/absolute-positioning' },
            { label: 'Code-Only Props', slug: 'guides/code-only-props' },
            { label: 'Consolidating Props', slug: 'guides/consolidating-props' },
            { label: 'Data Layout', slug: 'guides/data-layout' },
            { label: 'Default Slot Content', slug: 'guides/default-slot-content' },
            { label: 'Icon Glyphs', slug: 'guides/glyph-name-pattern' },
            { label: 'Images', slug: 'guides/images' },
            { label: 'Instance Examples', slug: 'guides/instance-examples' },
            { label: 'Invalid Combinations', slug: 'guides/invalid-variant-combinations' },
            { label: 'Key Formatting', slug: 'guides/key-formatting' },
            { label: 'Layout Positioning', slug: 'guides/layout-positioning' },
            { label: 'Number Inference', slug: 'guides/number-inference' },
            { label: 'Slot Constraints', slug: 'guides/slot-constraints' },
            { label: 'Subcomponents', slug: 'guides/subcomponent-scoping' },
            { label: 'Variant Depth', slug: 'guides/variant-depth' },
            { label: 'Variant Layering', slug: 'guides/variant-layering' },
          ],
        },
        { label: 'License (Legal)', slug: 'overview/license' },
        { label: 'Terms of Service', slug: 'overview/terms-of-service' },
      ],
    }),
  ],
});
