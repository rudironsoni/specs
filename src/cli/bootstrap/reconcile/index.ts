import type { Component } from '@rudironsoni/specs-schema';
import { BootstrapError } from '../errors.js';
import { digestCanonical } from '../serialize.js';

export interface ReconcileException {
  id: string;
  path: string;
  compiled?: unknown;
  extracted?: unknown;
}

export interface ReconcileReport {
  equivalent: boolean;
  exceptions: ReconcileException[];
  mismatches: ReconcileException[];
}

const IGNORE = new Set(['IGNORE_METADATA_TIMESTAMP', 'IGNORE_GENERATOR_STAMP', 'IGNORE_EXTRA_ANATOMY']);

export function reconcileContracts(compiled: Component, extracted: Component): ReconcileReport {
  const exceptions: ReconcileException[] = [];
  const mismatches: ReconcileException[] = [];

  if (compiled.title !== extracted.title) {
    mismatches.push({ id: 'TITLE', path: 'title', compiled: compiled.title, extracted: extracted.title });
  }

  const compiledAnatomy = Object.keys(compiled.anatomy).sort();
  const extractedAnatomy = Object.keys(extracted.anatomy ?? {}).sort();
  for (const key of compiledAnatomy) {
    if (!extractedAnatomy.includes(key)) {
      mismatches.push({ id: 'ANATOMY_MISSING', path: `anatomy.${key}` });
    } else if (compiled.anatomy[key].type !== extracted.anatomy[key].type) {
      mismatches.push({
        id: 'ANATOMY_TYPE',
        path: `anatomy.${key}.type`,
        compiled: compiled.anatomy[key].type,
        extracted: extracted.anatomy[key].type,
      });
    }
  }
  for (const key of extractedAnatomy) {
    if (!compiledAnatomy.includes(key)) {
      exceptions.push({ id: 'IGNORE_EXTRA_ANATOMY', path: `anatomy.${key}` });
    }
  }

  const compiledProps = Object.keys(compiled.props ?? {}).sort();
  const extractedProps = Object.keys(extracted.props ?? {}).sort();
  for (const key of compiledProps) {
    if (!extractedProps.includes(key)) {
      mismatches.push({ id: 'PROP_MISSING', path: `props.${key}` });
    }
  }

  if (extracted.metadata?.lastUpdated) {
    exceptions.push({ id: 'IGNORE_METADATA_TIMESTAMP', path: 'metadata.lastUpdated' });
  }
  if (extracted.metadata?.generator) {
    exceptions.push({ id: 'IGNORE_GENERATOR_STAMP', path: 'metadata.generator' });
  }

  return {
    equivalent: mismatches.length === 0,
    exceptions: exceptions.filter((e) => IGNORE.has(e.id)),
    mismatches,
  };
}

export function assertReconciled(report: ReconcileReport): void {
  if (!report.equivalent) {
    throw new BootstrapError(
      'ROUND_TRIP_MISMATCH',
      `Round-trip mismatch: ${report.mismatches.map((m) => m.id).join(', ')}`,
      { mismatches: report.mismatches, digest: digestCanonical(report.mismatches) },
    );
  }
}
