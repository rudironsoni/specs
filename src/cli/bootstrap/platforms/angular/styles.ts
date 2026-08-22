import fs from 'fs-extra';
import path from 'node:path';
import { observationId } from '../../identity.js';
import { normalizeStyleValue } from '../../model/styles.js';
import { fileDigest, makeProvenance, STATIC_ENVIRONMENT } from '../../provenance.js';
import { emptyInventory } from '../../workspace.js';
import type { ScanContext, ScanContribution, StyleAdapter } from '../types.js';
import { collectFiles } from './files.js';
import { ANGULAR_EXTRACTOR, ANGULAR_EXTRACTOR_VERSION } from './tsMeta.js';
import type { ObservedStyle } from '../../schema/types.js';

const HEX_DECL = /\$([A-Za-z0-9_-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\b/g;
const ALIAS_DECL = /\$([A-Za-z0-9_-]+)\s*:\s*\$([A-Za-z0-9_-]+)\b/g;

export interface SassColorToken {
  name: string;
  hex: string;
  sourcePath: string;
  kind: 'hex' | 'alias';
  ref?: string;
}

function stripSassFlags(value: string): string {
  return value.replace(/\s*!default\s*$/i, '').trim();
}

export function extractSassColorTokens(files: Array<{ sourcePath: string; text: string }>): SassColorToken[] {
  const hexByName = new Map<string, { hex: string; sourcePath: string }>();
  const aliases: Array<{ name: string; ref: string; sourcePath: string }> = [];
  for (const file of files) {
    for (const match of file.text.matchAll(HEX_DECL)) {
      hexByName.set(match[1], { hex: match[2], sourcePath: file.sourcePath });
    }
    for (const match of file.text.matchAll(ALIAS_DECL)) {
      aliases.push({ name: match[1], ref: match[2], sourcePath: file.sourcePath });
    }
  }
  const tokens: SassColorToken[] = [];
  for (const [name, value] of [...hexByName.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    tokens.push({ name, hex: value.hex, sourcePath: value.sourcePath, kind: 'hex' });
  }
  for (const alias of aliases.sort((a, b) => a.name.localeCompare(b.name))) {
    let current = alias.ref;
    let hex: string | undefined;
    for (let depth = 0; depth < 8; depth += 1) {
      const direct = hexByName.get(current);
      if (direct) {
        hex = direct.hex;
        break;
      }
      const next = aliases.find((entry) => entry.name === current);
      if (!next) break;
      current = next.ref;
    }
    if (hex) tokens.push({ name: alias.name, hex, sourcePath: alias.sourcePath, kind: 'alias', ref: alias.ref });
  }
  return tokens;
}

function extractDeclarations(css: string): Array<{ property: string; value: string }> {
  const declarations: Array<{ property: string; value: string }> = [];
  let i = 0;
  while (i < css.length) {
    const colon = css.indexOf(':', i);
    if (colon === -1) break;
    const semi = css.indexOf(';', colon + 1);
    const end = semi === -1 ? css.length : semi;
    const property = css.slice(i, colon).trim().split(/[\s{]/).pop() ?? '';
    const value = stripSassFlags(css.slice(colon + 1, end).trim());
    if (property && value && !property.startsWith('@') && !property.includes('/*')) {
      declarations.push({ property, value });
    }
    i = end + 1;
  }
  return declarations;
}

function isSpecFile(file: string): boolean {
  return /\.spec\.ts$|\.test\.ts$|\.snap$/.test(file);
}

function observedStyle(input: {
  sourceIdentity: string;
  revision: string;
  locator: string;
  sourcePath: string;
  authored: string;
  digest: string;
  componentObservationId?: string;
  componentId?: string;
}): ObservedStyle | undefined {
  const normalized = normalizeStyleValue(input.authored.replace(/['"]/g, ''));
  if (normalized.type === 'other' && !input.authored.includes('#')) return undefined;
  return {
    observationId: observationId({
      kind: 'style',
      sourceIdentity: input.sourceIdentity,
      sourceRevision: input.revision,
      sourceLocator: input.locator,
      normalizedPayload: normalized,
      extractorVersion: ANGULAR_EXTRACTOR_VERSION,
    }),
    authored: input.authored,
    normalized,
    propertyContext: input.locator,
    componentId: input.componentId,
    provenance: makeProvenance({
      sourceRevision: input.revision,
      sourceFileDigest: input.digest,
      locator: input.locator,
      sourcePath: input.sourcePath,
      rawValue: input.authored,
      normalizedValue: normalized,
      extractorName: ANGULAR_EXTRACTOR,
      extractorVersion: ANGULAR_EXTRACTOR_VERSION,
      environmentFingerprint: STATIC_ENVIRONMENT,
      relatedObservations: input.componentObservationId ? [input.componentObservationId] : [],
    }),
  };
}

export const angularStyles: StyleAdapter = {
  async extract(context: ScanContext, inventory): Promise<ScanContribution> {
    const contrib = emptyInventory(inventory.workspace);
    const files = [
      ...(await collectFiles(context.sourceRoot, ['.scss'])),
      ...(await collectFiles(context.sourceRoot, ['.css'])),
      ...(await collectFiles(context.sourceRoot, ['.ts'])),
      ...(await collectFiles(context.sourceRoot, ['.html'])),
    ];

    const scss = files.filter((file) => file.endsWith('.scss'));
    const scssTexts = await Promise.all(scss.map(async (file) => ({
      sourcePath: path.relative(context.sourceRoot, file).replace(/\\/g, '/'),
      text: await fs.readFile(file, 'utf8'),
      digest: fileDigest(file),
    })));
    for (const token of extractSassColorTokens(scssTexts)) {
      const file = scssTexts.find((entry) => entry.sourcePath === token.sourcePath);
      const style = observedStyle({
        sourceIdentity: `sass:${token.name}`,
        revision: context.revision,
        locator: `$${token.name}`,
        sourcePath: token.sourcePath,
        authored: token.hex,
        digest: file?.digest ?? token.sourcePath,
      });
      if (style) contrib.styles.push(style);
    }

    for (const file of files) {
      if (file.endsWith('.scss')) continue;
      if (isSpecFile(file)) continue;
      const text = await fs.readFile(file, 'utf8');
      const digest = fileDigest(file);
      const rel = path.relative(context.sourceRoot, file).replace(/\\/g, '/');
      const owner = inventory.components.find((c) => c.provenance.sourcePath === rel
        || rel.startsWith(`${path.dirname(c.provenance.sourcePath).replace(/\\/g, '/')}/`));
      const declarations = extractDeclarations(text);
      if (!isSpecFile(file)) {
        const hexMatches = text.match(/#[0-9a-fA-F]{3,8}/g) ?? [];
        for (const hex of hexMatches) {
          declarations.push({ property: 'color', value: hex });
        }
      }
      for (const decl of declarations) {
        const style = observedStyle({
          sourceIdentity: owner?.id ?? rel,
          revision: context.revision,
          locator: `${rel}:${decl.property}`,
          sourcePath: rel,
          authored: decl.value,
          digest,
          componentObservationId: owner?.observationId,
          componentId: owner?.id,
        });
        if (style) contrib.styles.push(style);
      }
    }

    contrib.sources.push({
      kind: 'style',
      platform: 'angular',
      extractor: ANGULAR_EXTRACTOR,
      extractorVersion: ANGULAR_EXTRACTOR_VERSION,
      revision: context.revision,
      digest: inventory.workspace.revision,
    });
    return { inventory: contrib };
  },
};
