import fs from 'fs-extra';
import path from 'node:path';
import ts from 'typescript';
import { observationId } from '../../identity.js';
import { fileDigest, makeProvenance, STATIC_ENVIRONMENT } from '../../provenance.js';
import { emptyInventory } from '../../workspace.js';
import type { RenderCaseAdapter, ScanContext, ScanContribution } from '../types.js';
import { collectFiles } from './files.js';
import { ANGULAR_EXTRACTOR, ANGULAR_EXTRACTOR_VERSION, literalValue, objectLiteralToRecord } from './tsMeta.js';

export const angularRenderCases: RenderCaseAdapter = {
  async extract(context: ScanContext, inventory): Promise<ScanContribution> {
    const contrib = emptyInventory(inventory.workspace);
    const files = (await collectFiles(context.sourceRoot, ['.ts'])).filter((f) => f.endsWith('.stories.ts'));

    for (const file of files) {
      const text = await fs.readFile(file, 'utf8');
      const digest = fileDigest(file);
      const rel = path.relative(context.sourceRoot, file);
      const sourceFile = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
      let componentName: string | undefined;
      ts.forEachChild(sourceFile, (node) => {
        if (ts.isExportAssignment(node) && ts.isObjectLiteralExpression(node.expression)) {
          const meta = objectLiteralToRecord(node.expression);
          if (typeof meta.component === 'string') componentName = meta.component;
        }
        if (ts.isExportAssignment(node) && ts.isIdentifier(node.expression)) {
          componentName = node.expression.text;
        }
        if (
          ts.isExportAssignment(node) === false
          && ts.isVariableStatement(node)
          && node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
        ) {
          for (const decl of node.declarationList.declarations) {
            if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
            if (decl.name.text === 'default' && ts.isObjectLiteralExpression(decl.initializer)) {
              const meta = objectLiteralToRecord(decl.initializer);
              if (typeof meta.component === 'string') componentName = meta.component;
            }
            const args = ts.isObjectLiteralExpression(decl.initializer)
              ? objectLiteralToRecord(decl.initializer).args
              : undefined;
            const owner = inventory.components.find((c) => c.title === componentName)
              ?? inventory.components.find((c) => rel.includes(c.provenance.sourcePath.replace(/\.ts$/, '')));
            if (!owner) continue;
            const inputs = args && typeof args === 'object' ? args as Record<string, unknown> : {};
            contrib.renderCases.push({
              observationId: observationId({
                kind: 'renderCase',
                sourceIdentity: owner.id,
                sourceRevision: context.revision,
                sourceLocator: `${rel}:${decl.name.text}`,
                normalizedPayload: { name: decl.name.text, inputs },
                extractorVersion: ANGULAR_EXTRACTOR_VERSION,
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
                extractorName: ANGULAR_EXTRACTOR,
                extractorVersion: ANGULAR_EXTRACTOR_VERSION,
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
      platform: 'angular',
      extractor: ANGULAR_EXTRACTOR,
      extractorVersion: ANGULAR_EXTRACTOR_VERSION,
      revision: context.revision,
      digest: inventory.workspace.revision,
    });
    return { inventory: contrib };
  },
};
