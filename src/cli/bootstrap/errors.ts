/**
 * Stable bootstrap failure codes. Callers and tests match on `code`, not message text.
 */

export const FAILURE_CODES = [
  'PLATFORM_NOT_DETECTED',
  'CAPABILITY_UNAVAILABLE',
  'COMPONENT_PARSE_FAILED',
  'USAGE_PARSE_FAILED',
  'TEMPLATE_PARSE_FAILED',
  'STYLE_PARSE_FAILED',
  'STORY_RENDER_FAILED',
  'RUNTIME_CAPTURE_FAILED',
  'MISSING_RUNTIME_PROVIDER',
  'AUTHENTICATION_REQUIRED',
  'DYNAMIC_STATE_NOT_REACHED',
  'SOURCE_MAP_MISSING',
  'PROVENANCE_MISSING',
  'STALE_OBSERVATION',
  'AMBIGUOUS_MATCH',
  'TOKEN_SEMANTICS_UNKNOWN',
  'VARIANT_SET_TOO_LARGE',
  'DECISION_REQUIRED',
  'DECISION_REFERENCE_MISSING',
  'CONTRACT_VALIDATION_FAILED',
  'PLAN_PRECONDITION_FAILED',
  'SENSITIVE_DATA_BLOCKED',
  'ROUND_TRIP_MISMATCH',
  'TARGET_DRIFT_DETECTED',
] as const;

export type FailureCode = (typeof FAILURE_CODES)[number];

export class BootstrapError extends Error {
  readonly code: FailureCode;
  readonly details: Record<string, unknown>;

  constructor(code: FailureCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'BootstrapError';
    this.code = code;
    this.details = details;
  }
}

export function isFailureCode(value: string): value is FailureCode {
  return (FAILURE_CODES as readonly string[]).includes(value);
}

export function formatFailure(error: BootstrapError, example: string): string {
  return `Error: ${error.message}\ncode=${error.code}\n  ${example}`;
}
