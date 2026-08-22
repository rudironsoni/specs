import fs from 'fs-extra';
import path from 'node:path';
import ts from 'typescript';
import { observationId } from '../../identity.js';
import { fileDigest, makeProvenance, STATIC_ENVIRONMENT } from '../../provenance.js';
import { emptyInventory } from '../../workspace.js';
import { collectFiles } from '../angular/files.js';
import type { ScanContext, ScanContribution, UsageAdapter } from '../types.js';
import { REACT_EXTRACTOR, REACT_EXTRACTOR_VERSION } from './codeModel.js';

export const reactUsage: UsageAdapter = {
  async extract(context: ScanContext, inventory): Promise<ScanContribution> {
    const contrib = emptyInventory(inventory.workspace);
    const byExport = new Map(inventory.components.map((c) => {
      const name = (c.extensions.react as { exportName?: string } | undefined)?.exportName ?? c.title;
      return [name, c] as const;
    }));
    const files = await collectFiles(context.sourceRoot, ['.tsx', '.ts', '.jsx', '.js']);
    for (const file of files) {
      const text = await fs.readFile(file, 'utf8');
      const digest = fileDigest(file);
      const rel = path.relative(context.sourceRoot, file);
      const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
      const from = inventory.components.find((c) => c.provenance.sourcePath === rel);
      const visit = (node: ts.Node) => {
        if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
          const tag = ts.isIdentifier(node.tagName) ? node.tagName.text : undefined;
          const used = tag ? byExport.get(tag) : undefined;
          if (used) {
            const propertyValues: Record<string, unknown> = {};
            for (const attr of node.attributes.properties) {
              if (!ts.isJsxAttribute(attr) || !ts.isIdentifier(attr.name)) continue;
              propertyValues[attr.name.text] = attr.initializer && ts.isStringLiteral(attr.initializer)
                ? attr.initializer.text
                : true;
            }
            contrib.usages.push({
              observationId: observationId({
                kind: 'usage',
                sourceIdentity: used.id,
                sourceRevision: context.revision,
                sourceLocator: `${rel}:${tag}`,
                normalizedPayload: { tag, propertyValues, from: from?.id },
                extractorVersion: REACT_EXTRACTOR_VERSION,
              }),
              componentId: used.id,
              kind: from && from.id !== used.id ? 'composed' : 'instantiated',
              fromId: from?.id,
              propertyValues,
              provenance: makeProvenance({
                sourceRevision: context.revision,
                sourceFileDigest: digest,
                locator: tag ?? '',
                sourcePath: rel,
                rawValue: tag,
                normalizedValue: { tag, propertyValues },
                extractorName: REACT_EXTRACTOR,
                extractorVersion: REACT_EXTRACTOR_VERSION,
                environmentFingerprint: STATIC_ENVIRONMENT,
                relatedObservations: [used.observationId],
              }),
            });
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }
    contrib.sources.push({
      kind: 'usage',
      platform: 'react',
      extractor: REACT_EXTRACTOR,
      extractorVersion: REACT_EXTRACTOR_VERSION,
      revision: context.revision,
      digest: context.revision,
    });
    return { inventory: contrib };
  },
};
