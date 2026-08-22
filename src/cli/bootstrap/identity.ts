/**
 * Content-addressed observation identities and stable logical entity ids.
 */

import { digestCanonical } from './serialize.js';

export type ObservationId = string & { readonly __brand: 'ObservationId' };
export type LogicalId = string & { readonly __brand: 'LogicalId' };

export const IDENTITY_SCHEMA_VERSION = 1;

export type ObservationKind =
  | 'component'
  | 'usage'
  | 'style'
  | 'renderCase'
  | 'document'
  | 'figmaAsset';

export interface ObservationIdentityInput {
  kind: ObservationKind;
  sourceIdentity: string;
  sourceRevision: string;
  sourceLocator: string;
  normalizedPayload: unknown;
  extractorVersion: string;
}

export function observationId(input: ObservationIdentityInput): ObservationId {
  const digest = digestCanonical({
    schemaVersion: IDENTITY_SCHEMA_VERSION,
    kind: input.kind,
    sourceIdentity: input.sourceIdentity,
    sourceRevision: input.sourceRevision,
    sourceLocator: input.sourceLocator,
    normalizedPayload: input.normalizedPayload,
    extractorVersion: input.extractorVersion,
  });
  return `obs:${digest}` as ObservationId;
}

export type PlatformId = 'angular' | 'react' | 'vue' | 'swift' | 'kotlin' | 'figma';

export function logicalId(platform: PlatformId, packageOrModule: string, symbol: string): LogicalId {
  return `${platform}:${packageOrModule}:${symbol}` as LogicalId;
}

export function parseLogicalId(id: string): { platform: string; packageOrModule: string; symbol: string } | null {
  const parts = id.split(':');
  if (parts.length < 3) return null;
  const [platform, packageOrModule, ...rest] = parts;
  return { platform, packageOrModule, symbol: rest.join(':') };
}
