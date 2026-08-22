/**
 * Canonical JSON and YAML serialization for deterministic bootstrap artifacts.
 * Object keys are sorted. Array order is preserved (semantic unless a caller sorts).
 */

import { createHash } from 'node:crypto';
import { relative, sep, posix } from 'node:path';
import { stringify as yamlStringify } from 'yaml';

export function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && Object.is(value, -0)) return 0;
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  const record = value as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    const entry = record[key];
    if (entry === undefined) continue;
    sorted[key] = canonicalize(entry);
  }
  return sorted;
}

export function stableStringifyJson(value: unknown): string {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

export function stableStringifyYaml(value: unknown): string {
  return yamlStringify(canonicalize(value), {
    sortMapEntries: true,
    lineWidth: 0,
  });
}

export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

export function digestCanonical(value: unknown): string {
  return sha256Hex(JSON.stringify(canonicalize(value)));
}

export function posixRelative(from: string, to: string): string {
  const rel = relative(from, to);
  return rel.split(sep).join(posix.sep) || '.';
}
