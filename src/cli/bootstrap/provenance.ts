import { readFileSync } from 'node:fs';
import type { Provenance } from './schema/types.js';
import { sha256Hex } from './serialize.js';

export const STATIC_ENVIRONMENT = `node:${process.version}`;

export function fileDigest(filePath: string): string {
  return sha256Hex(readFileSync(filePath));
}

export function makeProvenance(input: {
  sourceRevision: string;
  sourceFileDigest: string;
  locator: string;
  sourcePath: string;
  rawValue: unknown;
  normalizedValue: unknown;
  extractorName: string;
  extractorVersion: string;
  environmentFingerprint?: string;
  relatedObservations?: string[];
}): Provenance {
  return {
    sourceRevision: input.sourceRevision,
    sourceFileDigest: input.sourceFileDigest,
    locator: input.locator,
    sourcePath: input.sourcePath,
    rawValue: input.rawValue,
    normalizedValue: input.normalizedValue,
    extractorName: input.extractorName,
    extractorVersion: input.extractorVersion,
    environmentFingerprint: input.environmentFingerprint ?? STATIC_ENVIRONMENT,
    relatedObservations: input.relatedObservations ?? [],
  };
}
