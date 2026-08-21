/**
 * Reads the root CHANGELOG.md and writes the Starlight releases page.
 * Run before `astro dev` or `astro build`.
 *
 * Usage:  node scripts/build-releases.mjs
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const repo = resolve(root, '..');

const changelog = readFileSync(resolve(repo, 'CHANGELOG.md'), 'utf-8');

/** Strip preamble and downshift headings so ## becomes ###, ### becomes #### */
function stripPreamble(md) {
  const lines = md.split('\n');
  const firstVersion = lines.findIndex(l => /^## \[/.test(l));
  const content = firstVersion >= 0 ? lines.slice(firstVersion).join('\n') : md;
  return content.replace(/^(#{2,}) /gm, '#$1 ');
}

function githubSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N} -]/gu, '')
    .replace(/ /g, '-');
}

function extractVersions(md) {
  const versions = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^## \[([^\]]+)\]\s*-?\s*(.*)/);
    if (m) {
      const ver = m[1];
      const suffix = m[2]?.trim();
      const label = suffix ? `${ver} — ${suffix}` : ver;
      const headingText = suffix ? `[${ver}] - ${suffix}` : `[${ver}]`;
      const slug = githubSlug(headingText);
      versions.push({ slug, label });
    }
  }
  return versions;
}

function buildTocNav(versions) {
  if (versions.length === 0) return '';
  const items = versions.map(v =>
    `<li><a href="#${v.slug}">${v.label}</a></li>`
  ).join('\n');
  return `<nav className="releases-toc" aria-label="Version navigation">
<p className="releases-toc-title">Versions</p>
<ul>
${items}
</ul>
</nav>`;
}

const body = stripPreamble(changelog);
const versions = extractVersions(changelog);
const toc = buildTocNav(versions);

const outDir = resolve(root, 'src/content/docs/overview');
mkdirSync(outDir, { recursive: true });

const page = `---
title: "Releases"
description: "Changelog for Specs (schema, from-figma, and CLI share one version)"
tableOfContents: false
---

Schema, from-figma, and CLI share one version. Each release follows [Semantic Versioning](https://semver.org/). Older per-package notes are in \`src/schema/CHANGELOG.md\` and \`src/cli/CHANGELOG.md\`.

<div className="releases-grid">
<div className="releases-body">

${body || '*No lockstep releases yet.*'}

</div>
${toc}
</div>
`;

writeFileSync(resolve(outDir, 'releases.mdx'), page);
console.log('✓ Built site/src/content/docs/overview/releases.mdx');
