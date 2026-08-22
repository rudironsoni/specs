/**
 * Internal bootstrap sidecar contracts. Not part of @rudironsoni/specs-schema.
 */

import type { FailureCode } from '../errors.js';
import type { LogicalId, ObservationId } from '../identity.js';

export const SIDECAR_SCHEMA_VERSION = 1 as const;

export type CapabilityLevel = 'SUPPORTED' | 'CONDITIONAL' | 'UNSUPPORTED';

export type CandidateKind = 'TOKEN' | 'COMPONENT' | 'PROPERTY' | 'VARIANT' | 'MAPPING';

export type DecisionAction =
  | 'ACCEPT'
  | 'ACCEPT_WITH_CHANGES'
  | 'REJECT'
  | 'MERGE'
  | 'SPLIT'
  | 'DEPRECATE'
  | 'EXCEPTION'
  | 'NEEDS_EVIDENCE'
  | 'APPROVE_FOR_STAGING';

export type TargetStatus = 'NOT_STARTED' | 'MATERIALIZED' | 'VERIFIED';

export type FigmaPlanMode = 'STAGING' | 'APPROVED';

export type UsageKind =
  | 'imported'
  | 'instantiated'
  | 'wrapped'
  | 'composed'
  | 'rendered'
  | 'tested'
  | 'documented'
  | 'deprecated';

export type PropertyKind = 'input' | 'output' | 'slot' | 'other';

export type NormalizedStyleType =
  | 'color'
  | 'dimension'
  | 'duration'
  | 'font'
  | 'shadow'
  | 'other';

export interface Provenance {
  sourceRevision: string;
  sourceFileDigest: string;
  locator: string;
  sourcePath: string;
  rawValue: unknown;
  normalizedValue: unknown;
  extractorName: string;
  extractorVersion: string;
  environmentFingerprint: string;
  relatedObservations: string[];
}

export interface ObservedProperty {
  name: string;
  kind: PropertyKind;
  valueType?: string;
  enumeratedValues?: string[];
  defaultValue?: unknown;
  deprecated?: boolean;
}

export interface ObservedComponent {
  id: string;
  observationId: string;
  title: string;
  provenance: Provenance;
  properties: ObservedProperty[];
  events: ObservedProperty[];
  slots: ObservedProperty[];
  deprecations: string[];
  extensions: Record<string, unknown>;
}

export interface ObservedUsage {
  observationId: string;
  componentId: string;
  kind: UsageKind;
  fromId?: string;
  provenance: Provenance;
  propertyValues?: Record<string, unknown>;
}

export interface NormalizedStyleValue {
  type: NormalizedStyleType;
  colorSpace?: string;
  components?: number[];
  alpha?: number;
  value?: number;
  unit?: string;
  canonical: string;
}

export interface ObservedStyle {
  observationId: string;
  provenance: Provenance;
  authored: string;
  normalized: NormalizedStyleValue;
  propertyContext?: string;
  componentId?: string;
}

export interface ObservedRenderCase {
  observationId: string;
  componentId: string;
  name: string;
  provenance: Provenance;
  inputs?: Record<string, unknown>;
  states?: string[];
}

export interface ObservedDocument {
  observationId: string;
  provenance: Provenance;
  referencedComponent?: string;
  referencedProperty?: string;
}

export interface ObservedFigmaAsset {
  observationId: string;
  id: string;
  fileKey?: string;
  componentKey?: string;
  provenance: Provenance;
}

export interface FailureRecord {
  code: FailureCode;
  message: string;
  sourcePath?: string;
  relatedObservations?: string[];
}

export interface AliasRecord {
  from: string;
  to: string;
  reason: string;
}

export interface InventorySource {
  kind: string;
  platform: string;
  extractor: string;
  extractorVersion: string;
  revision: string;
  digest: string;
}

export interface Inventory {
  schemaVersion: typeof SIDECAR_SCHEMA_VERSION;
  workspace: {
    repository: string;
    revision: string;
  };
  sources: InventorySource[];
  components: ObservedComponent[];
  usages: ObservedUsage[];
  styles: ObservedStyle[];
  renderCases: ObservedRenderCase[];
  documents: ObservedDocument[];
  figmaAssets: ObservedFigmaAsset[];
  failures: FailureRecord[];
  aliases: AliasRecord[];
}

export interface CandidateConflict {
  kind: string;
  value?: unknown;
  values?: unknown[];
}

export interface Candidate {
  id: string;
  kind: CandidateKind;
  status: 'CANDIDATE';
  members: string[];
  evidence: Record<string, unknown>;
  candidateProperties?: Record<string, { observedValues: unknown[] }>;
  conflicts: CandidateConflict[];
  unresolved: string[];
  observationRefs: string[];
  origin: 'deterministic' | 'agent';
  agentIdentity?: string;
  modelIdentity?: string;
  promptVersion?: string;
}

export interface CandidateFile {
  schemaVersion: typeof SIDECAR_SCHEMA_VERSION;
  candidates: Candidate[];
}

export interface DecisionApprover {
  role: string;
  identity: string;
}

export interface Decision {
  candidate: string;
  decision: DecisionAction;
  acceptedIdentity?: string;
  include?: string[];
  exclude?: string[];
  properties?: Record<string, { accepted: unknown[] }>;
  unresolved?: string[];
  approvedBy: DecisionApprover;
  rationale: string[];
}

export interface DecisionFile {
  schemaVersion: typeof SIDECAR_SCHEMA_VERSION;
  decisions: Decision[];
}

export interface BindingImplementation {
  symbol: string;
  selector?: string;
  exportName?: string;
  module?: string;
}

export interface PropertyMapping {
  contractProperty: string;
  platform: string;
  platformProperty: string;
}

export interface TargetState {
  status: TargetStatus;
  revision?: string;
}

export interface Binding {
  component: string;
  figma?: {
    fileKey: string;
    componentKey: string;
  };
  implementations: Record<string, BindingImplementation>;
  propertyMappings: PropertyMapping[];
  targets: Record<string, TargetState>;
}

export interface BindingFile {
  schemaVersion: typeof SIDECAR_SCHEMA_VERSION;
  bindings: Binding[];
}

export interface FigmaPlanOperation {
  id: string;
  kind: string;
  target?: string;
  payload: Record<string, unknown>;
}

export interface FigmaPlan {
  schemaVersion: typeof SIDECAR_SCHEMA_VERSION;
  mode: FigmaPlanMode;
  sourceContractDigest: string;
  expectedTargetDigest: string | null;
  ownedNodeIdentities: string[];
  variables: Record<string, unknown>[];
  components: Record<string, unknown>[];
  componentSets: Record<string, unknown>[];
  bindings: Record<string, unknown>[];
  annotations: Record<string, unknown>[];
  operations: {
    create: FigmaPlanOperation[];
    update: FigmaPlanOperation[];
    delete: FigmaPlanOperation[];
  };
}

export interface RunRecord {
  schemaVersion: typeof SIDECAR_SCHEMA_VERSION;
  runId: string;
  workflow: string;
  startedAt: string;
  inputDigests: Record<string, string>;
  outputDigests: Record<string, string>;
  completedNodes: string[];
  failedNodes: string[];
  artifacts: string[];
}

export type { FailureCode, LogicalId, ObservationId };
