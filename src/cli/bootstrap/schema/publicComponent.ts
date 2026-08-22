import fs from 'fs-extra';
import path from 'node:path';
import { createRequire } from 'node:module';
import Ajv, { type ValidateFunction } from 'ajv';
import type { Component } from '@rudironsoni/specs-schema';
import { BootstrapError } from '../errors.js';

const require = createRequire(import.meta.url);

function schemaDir(): string {
  const componentFile = require.resolve('@rudironsoni/specs-schema/schema/component');
  return path.dirname(componentFile);
}

let validator: ValidateFunction | undefined;

export function publicComponentValidator(): ValidateFunction {
  if (validator) return validator;
  const dir = schemaDir();
  const ajv = new Ajv({ allErrors: true, strict: false });
  for (const name of ['workspace.schema.json', 'styles.schema.json', 'components.schema.json', 'root.schema.json', 'component.schema.json']) {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) continue;
    ajv.addSchema(fs.readJsonSync(file), name);
  }
  const compiled = ajv.getSchema('component.schema.json')
    ?? ajv.compile(fs.readJsonSync(path.join(dir, 'component.schema.json')));
  validator = compiled;
  return compiled;
}

export function assertPublicComponent(component: Component): void {
  const validate = publicComponentValidator();
  if (validate(component)) return;
  throw new BootstrapError(
    'CONTRACT_VALIDATION_FAILED',
    `Public Component schema rejected the compiled contract: ${(validate.errors ?? []).map((e) => `${e.instancePath} ${e.message}`).join('; ')}`,
    { errors: validate.errors ?? [] },
  );
}
