import fs from 'fs-extra';
import path from 'node:path';
import ts from 'typescript';
import { observationId } from '../../identity.js';
import { fileDigest, makeProvenance, STATIC_ENVIRONMENT } from '../../provenance.js';
import { emptyInventory } from '../../workspace.js';
import { collectFiles } from '../angular/files.js';
import { objectLiteralToRecord } from '../angular/tsMeta.js';
import type { RenderCaseAdapter, ScanContext, ScanContribution } from '../types.js';
import { REACT_EXTRACTOR, REACT_EXTRACTOR_VERSION } from './codeModel.js';

export const reactRenderCases: RenderCaseAdapter = {
  async extract(context: ScanContext, inventory): Promise<ScanContribution> {
    const contrib = emptyInventory(inventory.workspace);
    const files = (await collectFiles(context.sourceRoot, ['.ts', '.tsx'])).filter((f) => f.includes('.stories.'));
    for (const file of files) {
      const text = await fs.readFile(file, 'utf8');
      const digest = fileDigest(file);
      const rel = path.relative(context.sourceRoot, file);
      const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
      let componentName: string | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isExportAssignment(node) && ts.isObjectLiteralExpression(node.expression)) {
          const meta = objectLiteralToRecord(node.expression);
          if (typeof meta.component === 'string') componentName = meta.component;
        }
        if (ts.isVariableStatement(node) && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
          for (const decl of node.declarationList.declarations) {
            if (!ts.isIdentifier(decl.name) || !decl.initializer || !ts.isObjectLiteralExpression(decl.initializer)) continue;
            const record = objectLiteralToRecord(decl.initializer);
            const owner = inventory.components.find((c) => c.title === componentName)
              ?? inventory.components.find((c) => rel.includes(c.title));
            if (!owner || decl.name.text === 'default') continue;
            const inputs = record.args && typeof record.args === 'object' ? record.args as Record<string, unknown> : {};
            contrib.renderCases.push({
              observationId: observationId({
                kind: 'renderCase',
                sourceIdentity: owner.id,
                sourceRevision: context.revision,
                sourceLocator: `${rel}:${decl.name.text}`,
                normalizedPayload: { name: decl.name.text, inputs },
                extractorVersion: REACT_EXTRACTOR_VERSION,
              }),
              componentId: owner.id,
              name: decl.name.text,
              inputs,
              states: Object.keys(inputs).filter((key) => inputs[key] === true),
              provenance: makeProvenance({
                sourceRevision: context.revision,
                sourceFileDigest: digest,
                locator: decl.name.text,
                sourcePath: rel,
                rawValue: decl.initializer.getText(sourceFile),
                normalizedValue: { name: decl.name.text, inputs },
                extractorName: REACT_EXTRACTOR,
                extractorVersion: REACT_EXTRACTOR_VERSION,
                environmentFingerprint: STATIC_ENVIRONMENT,
                relatedObservations: [owner.observationId],
              }),
            });
          }
        }
      });
    }
    contrib.sources.push({
      kind: 'renderCase',
      platform: 'react',
      extractor: REACT_EXTRACTOR,
      extractorVersion: REACT_EXTRACTOR_VERSION,
      revision: context.revision,
      digest: context.revision,
    });
    return { inventory: contrib };
  },
};
