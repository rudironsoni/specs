import fs from 'fs-extra';
import path from 'node:path';
import ts from 'typescript';
import { observationId, logicalId } from '../../identity.js';
import { makeProvenance, fileDigest, STATIC_ENVIRONMENT } from '../../provenance.js';
import { emptyInventory } from '../../workspace.js';
import type { CodeModelAdapter, ScanContext, ScanContribution } from '../types.js';
import type { ObservedComponent, ObservedProperty } from '../../schema/types.js';
import { collectFiles, readPackageName } from './files.js';
import { findNgContent } from './html.js';
import {
  ANGULAR_EXTRACTOR,
  ANGULAR_EXTRACTOR_VERSION,
  decoratorCall,
  callRootName,
  literalValue,
  objectLiteralToRecord,
  propertyName,
  unionLiterals,
} from './tsMeta.js';

async function loadTemplate(sourceFile: string, meta: Record<string, unknown>): Promise<string> {
  if (typeof meta.template === 'string') return meta.template;
  if (typeof meta.templateUrl === 'string') {
    const full = path.resolve(path.dirname(sourceFile), meta.templateUrl);
    if (await fs.pathExists(full)) return fs.readFile(full, 'utf8');
  }
  return '';
}

function inputOutputProps(member: ts.ClassElement): ObservedProperty[] {
  if (!ts.isPropertyDeclaration(member)) return [];
  const name = propertyName(member);
  if (!name) return [];
  const props: ObservedProperty[] = [];
  const inputDec = decoratorCall(member, 'Input');
  if (inputDec) {
    props.push({
      name,
      kind: 'input',
      enumeratedValues: unionLiterals(member.type),
      defaultValue: member.initializer ? literalValue(member.initializer) : undefined,
    });
  }
  const outputDec = decoratorCall(member, 'Output');
  if (outputDec) {
    props.push({ name, kind: 'output' });
  }
  if (member.initializer && ts.isCallExpression(member.initializer)) {
    const callName = callRootName(member.initializer.expression);
    if (callName === 'input') {
      const typeArg = member.initializer.typeArguments?.[0];
      props.push({
        name,
        kind: 'input',
        enumeratedValues: unionLiterals(typeArg),
        defaultValue: member.initializer.arguments[0]
          ? literalValue(member.initializer.arguments[0])
          : undefined,
      });
    }
    if (callName === 'output') {
      props.push({ name, kind: 'output' });
    }
  }
  return props;
}

export const angularCodeModel: CodeModelAdapter = {
  async extract(context: ScanContext): Promise<ScanContribution> {
    const packageName = context.packageName || await readPackageName(context.sourceRoot);
    const files = await collectFiles(context.sourceRoot, ['.ts']);
    const inventory = emptyInventory({ repository: context.repository, revision: context.revision });
    if (files.length === 0) {
      inventory.failures.push({
        code: 'PLATFORM_NOT_DETECTED',
        message: `No TypeScript files under ${context.sourceRoot}`,
        sourcePath: context.sourceRoot,
      });
      return { inventory };
    }

    for (const fileName of files) {
      const sourceText = await fs.readFile(fileName, 'utf8');
      const sourceFile = ts.createSourceFile(fileName, sourceText, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
      const digest = fileDigest(fileName);
      const rel = path.relative(context.sourceRoot, fileName);

      ts.forEachChild(sourceFile, (node) => {
        if (!ts.isClassDeclaration(node) || !node.name) return;
        const componentCall = decoratorCall(node, 'Component');
        if (!componentCall || componentCall.arguments.length === 0) return;
        const arg = componentCall.arguments[0];
        if (!ts.isObjectLiteralExpression(arg)) return;
        const meta = objectLiteralToRecord(arg);
        const selector = typeof meta.selector === 'string' ? meta.selector : node.name.text;
        const className = node.name.text;
        const jsDoc = ts.getJSDocCommentsAndTags(node).map((c) => c.getText(sourceFile)).join('\n');
        const deprecated = /@deprecated/.test(jsDoc);

        const properties: ObservedProperty[] = [];
        const events: ObservedProperty[] = [];
        for (const member of node.members) {
          for (const prop of inputOutputProps(member)) {
            if (prop.kind === 'output') events.push(prop);
            else properties.push(prop);
          }
        }

        inventory.components.push({
          id: logicalId('angular', packageName, selector),
          observationId: 'pending',
          title: className,
          provenance: makeProvenance({
            sourceRevision: context.revision,
            sourceFileDigest: digest,
            locator: className,
            sourcePath: rel,
            rawValue: { selector, className, meta },
            normalizedValue: { selector, className, standalone: Boolean(meta.standalone) },
            extractorName: ANGULAR_EXTRACTOR,
            extractorVersion: ANGULAR_EXTRACTOR_VERSION,
            environmentFingerprint: STATIC_ENVIRONMENT,
          }),
          properties,
          events,
          slots: [],
          deprecations: deprecated ? [className] : [],
          extensions: {
            angular: {
              selector,
              standalone: Boolean(meta.standalone),
              className,
              templateUrl: meta.templateUrl,
              styleUrls: meta.styleUrls,
            },
          },
        });
      });
    }

    for (const component of inventory.components) {
      const ext = component.extensions.angular as { templateUrl?: string; className: string; selector: string };
      const abs = path.join(context.sourceRoot, component.provenance.sourcePath);
      const source = await fs.readFile(abs, 'utf8');
      const sourceFile = ts.createSourceFile(abs, source, ts.ScriptTarget.ES2022, true);
      let template = '';
      ts.forEachChild(sourceFile, (node) => {
        if (!ts.isClassDeclaration(node) || node.name?.text !== ext.className) return;
        const call = decoratorCall(node, 'Component');
        const arg = call?.arguments[0];
        if (arg && ts.isObjectLiteralExpression(arg)) {
          const meta = objectLiteralToRecord(arg);
          if (typeof meta.template === 'string') template = meta.template;
        }
      });
      if (!template && typeof ext.templateUrl === 'string') {
        template = await loadTemplate(abs, { templateUrl: ext.templateUrl });
      }
      if (findNgContent(template)) {
        component.slots.push({ name: 'content', kind: 'slot' });
      }
      component.observationId = observationId({
        kind: 'component',
        sourceIdentity: component.id,
        sourceRevision: context.revision,
        sourceLocator: component.provenance.locator,
        normalizedPayload: {
          selector: ext.selector,
          properties: component.properties,
          events: component.events,
          slots: component.slots,
          deprecations: component.deprecations,
        },
        extractorVersion: ANGULAR_EXTRACTOR_VERSION,
      });
    }

    inventory.sources.push({
      kind: 'code',
      platform: 'angular',
      extractor: ANGULAR_EXTRACTOR,
      extractorVersion: ANGULAR_EXTRACTOR_VERSION,
      revision: context.revision,
      digest: observationId({
        kind: 'component',
        sourceIdentity: context.sourceRoot,
        sourceRevision: context.revision,
        sourceLocator: 'source-set',
        normalizedPayload: files.map((f) => path.relative(context.sourceRoot, f)).sort(),
        extractorVersion: ANGULAR_EXTRACTOR_VERSION,
      }),
    });

    return { inventory };
  },
};
