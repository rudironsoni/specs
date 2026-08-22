/**
 * Ajv validation for internal bootstrap sidecar contracts.
 */

import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import { BootstrapError } from '../errors.js';
import type {
  BindingFile,
  CandidateFile,
  DecisionFile,
  FigmaPlan,
  Inventory,
  RunRecord,
} from './types.js';
import inventorySchema from './inventory.schema.json';
import candidateSchema from './candidate.schema.json';
import decisionSchema from './decision.schema.json';
import bindingSchema from './binding.schema.json';
import figmaPlanSchema from './figma-plan.schema.json';
import runSchema from './run.schema.json';

const ajv = new Ajv({ allErrors: true, strict: false });

const validators = {
  inventory: ajv.compile(inventorySchema) as ValidateFunction<Inventory>,
  candidate: ajv.compile(candidateSchema) as ValidateFunction<CandidateFile>,
  decision: ajv.compile(decisionSchema) as ValidateFunction<DecisionFile>,
  binding: ajv.compile(bindingSchema) as ValidateFunction<BindingFile>,
  figmaPlan: ajv.compile(figmaPlanSchema) as ValidateFunction<FigmaPlan>,
  run: ajv.compile(runSchema) as ValidateFunction<RunRecord>,
};

export type SidecarKind = keyof typeof validators;

function formatAjvErrors(errors: ErrorObject[] | null | undefined): string {
  if (!errors || errors.length === 0) return 'unknown schema error';
  return errors
    .map((error) => `${error.instancePath || '/'} ${error.message ?? ''}`.trim())
    .join('; ');
}

function assertValid<T>(kind: SidecarKind, value: unknown, validate: ValidateFunction<T>): T {
  if (validate(value)) return value;
  throw new BootstrapError(
    'CONTRACT_VALIDATION_FAILED',
    `${kind} contract failed validation: ${formatAjvErrors(validate.errors)}`,
    { kind, errors: validate.errors ?? [] },
  );
}

export function validateInventory(value: unknown): Inventory {
  return assertValid('inventory', value, validators.inventory);
}

export function validateCandidateFile(value: unknown): CandidateFile {
  return assertValid('candidate', value, validators.candidate);
}

export function validateDecisionFile(value: unknown): DecisionFile {
  return assertValid('decision', value, validators.decision);
}

export function validateBindingFile(value: unknown): BindingFile {
  return assertValid('binding', value, validators.binding);
}

export function validateFigmaPlan(value: unknown): FigmaPlan {
  return assertValid('figmaPlan', value, validators.figmaPlan);
}

export function validateRunRecord(value: unknown): RunRecord {
  return assertValid('run', value, validators.run);
}

export const SIDECAR_SCHEMA_FILES = {
  inventory: inventorySchema,
  candidate: candidateSchema,
  decision: decisionSchema,
  binding: bindingSchema,
  figmaPlan: figmaPlanSchema,
  run: runSchema,
} as const;
