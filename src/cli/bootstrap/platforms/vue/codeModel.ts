import fs from 'fs-extra';
import path from 'node:path';
import ts from 'typescript';
import { logicalId, observationId } from '../../identity.js';
import { fileDigest, makeProvenance, STATIC_ENVIRONMENT } from '../../provenance.js';
import { emptyInventory } from '../../workspace.js';
import { collectFiles, readPackageName } from '../angular/files.js';
import { findStartTags } from '../angular/html.js';
import { unionLiterals } from '../angular/tsMeta.js';
import type { CodeModelAdapter, ScanContext, ScanContribution } from '../types.js';
import type { ObservedProperty } from '../../schema/types.js';
import { parseSfc } from './sfc.js';

export const VUE_EXTRACTOR = 'specs-vue-sfc';
export const VUE_EXTRACTOR_VERSION = '1';

function propsFromScript(script: string): { properties: ObservedProperty[]; events: ObservedProperty[] } {
  const properties: ObservedProperty[] = [];
  const events: ObservedProperty[] = [];
  const sourceFile = ts.createSourceFile('script.ts', script, ts.ScriptTarget.ES2022, true);
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === 'defineProps' && node.typeArguments?.[0] && ts.isTypeLiteralNode(node.typeArguments[0])) {
        for (const member of node.typeArguments[0].members) {
          if (!ts.isPropertySignature(member) || !member.name || !ts.isIdentifier(member.name)) continue;
          properties.push({
            name: member.name.text,
            kind: 'input',
            enumeratedValues: unionLiterals(member.type),
          });
        }
      }
      if (node.expression.text === 'defineEmits' && node.typeArguments?.[0] && ts.isTypeLiteralNode(node.typeArguments[0])) {
        for (const member of node.typeArguments[0].members) {
          if (!ts.isCallSignatureDeclaration(member) && !ts.isPropertySignature(member)) continue;
          const nameNode = ts.isPropertySignature(member) ? member.name : undefined;
          const name = nameNode && ts.isIdentifier(nameNode)
            ? nameNode.text
            : ts.isCallSignatureDeclaration(member) && member.parameters[0] && ts.isIdentifier(member.parameters[0].name)
              ? undefined
              : undefined;
          if (ts.isCallSignatureDeclaration(member) && member.parameters[0]?.type && ts.isLiteralTypeNode(member.parameters[0].type) && ts.isStringLiteral(member.parameters[0].type.literal)) {
            events.push({ name: member.parameters[0].type.literal.text, kind: 'output' });
          } else if (name) {
            events.push({ name, kind: 'output' });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return { properties, events };
}

export const vueCodeModel: CodeModelAdapter = {
  async extract(context: ScanContext): Promise<ScanContribution> {
    const packageName = context.packageName || await readPackageName(context.sourceRoot);
    const files = await collectFiles(context.sourceRoot, ['.vue']);
    const inventory = emptyInventory({ repository: context.repository, revision: context.revision });
    for (const fileName of files) {
      const text = await fs.readFile(fileName, 'utf8');
      const sfc = parseSfc(text);
      const name = path.basename(fileName, '.vue');
      const { properties, events } = propsFromScript(sfc.script);
      const slots = sfc.template.includes('<slot')
        ? [{ name: 'default', kind: 'slot' as const }]
        : [];
      const id = logicalId('vue', packageName, name);
      inventory.components.push({
        id,
        observationId: observationId({
          kind: 'component',
          sourceIdentity: id,
          sourceRevision: context.revision,
          sourceLocator: name,
          normalizedPayload: { name, properties, events },
          extractorVersion: VUE_EXTRACTOR_VERSION,
        }),
        title: name,
        provenance: makeProvenance({
          sourceRevision: context.revision,
          sourceFileDigest: fileDigest(fileName),
          locator: name,
          sourcePath: path.relative(context.sourceRoot, fileName),
          rawValue: { name },
          normalizedValue: { component: name },
          extractorName: VUE_EXTRACTOR,
          extractorVersion: VUE_EXTRACTOR_VERSION,
          environmentFingerprint: STATIC_ENVIRONMENT,
        }),
        properties,
        events,
        slots,
        deprecations: /@deprecated/.test(text) ? [name] : [],
        extensions: { vue: { component: name, tags: findStartTags(sfc.template).map((t) => t.tag) } },
      });
    }
    inventory.sources.push({
      kind: 'code',
      platform: 'vue',
      extractor: VUE_EXTRACTOR,
      extractorVersion: VUE_EXTRACTOR_VERSION,
      revision: context.revision,
      digest: context.revision,
    });
    return { inventory };
  },
};
