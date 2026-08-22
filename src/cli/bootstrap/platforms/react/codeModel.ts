import fs from 'fs-extra';
import path from 'node:path';
import ts from 'typescript';
import { logicalId, observationId } from '../../identity.js';
import { fileDigest, makeProvenance, STATIC_ENVIRONMENT } from '../../provenance.js';
import { emptyInventory } from '../../workspace.js';
import { collectFiles, readPackageName } from '../angular/files.js';
import { literalValue, unionLiterals } from '../angular/tsMeta.js';
import type { CodeModelAdapter, ScanContribution, ScanContext } from '../types.js';
import type { ObservedProperty } from '../../schema/types.js';

export const REACT_EXTRACTOR = 'specs-react-ts';
export const REACT_EXTRACTOR_VERSION = '1';

function isJsx(node: ts.Node | undefined): boolean {
  if (!node) return false;
  return ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)
    || (ts.isParenthesizedExpression(node) && isJsx(node.expression))
    || (ts.isBlock(node) && node.statements.some((s) => ts.isReturnStatement(s) && isJsx(s.expression)));
}

function functionReturnsJsx(node: ts.FunctionDeclaration | ts.ArrowFunction | ts.FunctionExpression): boolean {
  if (ts.isArrowFunction(node) && node.body && !ts.isBlock(node.body)) return isJsx(node.body);
  const body = ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)
    ? node.body
    : undefined;
  if (!body || !ts.isBlock(body)) return false;
  return body.statements.some((s) => ts.isReturnStatement(s) && isJsx(s.expression));
}

function propsFromParams(params: ts.NodeArray<ts.ParameterDeclaration>): ObservedProperty[] {
  const first = params[0];
  if (!first) return [];
  const props: ObservedProperty[] = [];
  if (first.type && ts.isTypeLiteralNode(first.type)) {
    for (const member of first.type.members) {
      if (!ts.isPropertySignature(member) || !member.name || !ts.isIdentifier(member.name)) continue;
      props.push({
        name: member.name.text,
        kind: member.name.text.startsWith('on') ? 'output' : 'input',
        enumeratedValues: unionLiterals(member.type),
      });
    }
  }
  if (ts.isObjectBindingPattern(first.name)) {
    for (const el of first.name.elements) {
      if (!ts.isBindingElement(el) || !ts.isIdentifier(el.name)) continue;
      if (props.some((p) => p.name === el.name.text)) continue;
      props.push({
        name: el.name.text,
        kind: el.name.text.startsWith('on') ? 'output' : 'input',
        defaultValue: el.initializer ? literalValue(el.initializer) : undefined,
      });
    }
  }
  return props;
}

export const reactCodeModel: CodeModelAdapter = {
  async extract(context: ScanContext): Promise<ScanContribution> {
    const packageName = context.packageName || await readPackageName(context.sourceRoot);
    const files = await collectFiles(context.sourceRoot, ['.tsx', '.ts', '.jsx', '.js']);
    const inventory = emptyInventory({ repository: context.repository, revision: context.revision });
    for (const fileName of files) {
      if (fileName.endsWith('.stories.tsx') || fileName.endsWith('.stories.ts')) continue;
      const text = await fs.readFile(fileName, 'utf8');
      const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
      const digest = fileDigest(fileName);
      const rel = path.relative(context.sourceRoot, fileName);

      const add = (name: string, props: ObservedProperty[], deprecated: boolean) => {
        const events = props.filter((p) => p.kind === 'output');
        const inputs = props.filter((p) => p.kind !== 'output');
        const slots = inputs.some((p) => p.name === 'children') || text.includes('children')
          ? [{ name: 'children', kind: 'slot' as const }]
          : [];
        const id = logicalId('react', packageName, name);
        inventory.components.push({
          id,
          observationId: observationId({
            kind: 'component',
            sourceIdentity: id,
            sourceRevision: context.revision,
            sourceLocator: name,
            normalizedPayload: { name, inputs, events },
            extractorVersion: REACT_EXTRACTOR_VERSION,
          }),
          title: name,
          provenance: makeProvenance({
            sourceRevision: context.revision,
            sourceFileDigest: digest,
            locator: name,
            sourcePath: rel,
            rawValue: { name },
            normalizedValue: { exportName: name },
            extractorName: REACT_EXTRACTOR,
            extractorVersion: REACT_EXTRACTOR_VERSION,
            environmentFingerprint: STATIC_ENVIRONMENT,
          }),
          properties: inputs.filter((p) => p.name !== 'children'),
          events,
          slots,
          deprecations: deprecated ? [name] : [],
          extensions: { react: { exportName: name } },
        });
      };

      const visit = (node: ts.Node, deprecated: boolean) => {
        const jsDoc = ts.getJSDocCommentsAndTags(node).map((c) => c.getText(sourceFile)).join('\n');
        const dep = deprecated || /@deprecated/.test(jsDoc);
        if (ts.isFunctionDeclaration(node) && node.name && functionReturnsJsx(node)) {
          add(node.name.text, propsFromParams(node.parameters), dep);
        }
        if (ts.isVariableStatement(node)) {
          for (const decl of node.declarationList.declarations) {
            if (!ts.isIdentifier(decl.name) || !decl.initializer) continue;
            if ((ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))
              && functionReturnsJsx(decl.initializer)) {
              add(decl.name.text, propsFromParams(decl.initializer.parameters), dep);
            }
          }
        }
        ts.forEachChild(node, (child) => visit(child, dep));
      };
      visit(sourceFile, /@deprecated/.test(text));
    }
    inventory.sources.push({
      kind: 'code',
      platform: 'react',
      extractor: REACT_EXTRACTOR,
      extractorVersion: REACT_EXTRACTOR_VERSION,
      revision: context.revision,
      digest: context.revision,
    });
    return { inventory };
  },
};
