import type { Component } from '@rudironsoni/specs-schema';
import type { BindingFile, FigmaPlan, FigmaPlanMode } from '../schema/types.js';
import { SIDECAR_SCHEMA_VERSION } from '../schema/types.js';
import { digestCanonical } from '../serialize.js';
import { BootstrapError } from '../errors.js';

export function buildFigmaPlan(input: {
  mode: FigmaPlanMode;
  components: Record<string, Component>;
  tokens: Record<string, unknown>;
  bindings: BindingFile;
  expectedTargetDigest?: string | null;
  allowDelete?: boolean;
  stagingApproved?: boolean;
}): FigmaPlan {
  if (input.mode === 'STAGING' && input.stagingApproved === false) {
    throw new BootstrapError('DECISION_REQUIRED', 'Staging plan requires APPROVE_FOR_STAGING');
  }
  const create = [];
  const variables = [];
  for (const [name, token] of Object.entries(input.tokens).sort(([a], [b]) => a.localeCompare(b))) {
    variables.push({ name, token });
    create.push({
      id: `var:${name}`,
      kind: 'createVariable',
      payload: { name, token },
    });
  }
  const components = [];
  const componentSets = [];
  for (const [id, component] of Object.entries(input.components).sort(([a], [b]) => a.localeCompare(b))) {
    const identity = `specs:${id}`;
    componentSets.push({ id, title: component.title, identity });
    create.push({
      id: `set:${id}`,
      kind: 'createComponentSet',
      payload: { id, title: component.title, identity, component },
    });
    create.push({
      id: `ann:${id}`,
      kind: 'setAnnotation',
      payload: {
        identity,
        annotation: input.mode === 'STAGING' ? 'CANDIDATE' : 'APPROVED',
      },
    });
    components.push({ id, title: component.title, identity });
  }
  return {
    schemaVersion: SIDECAR_SCHEMA_VERSION,
    mode: input.mode,
    sourceContractDigest: digestCanonical(input.components),
    expectedTargetDigest: input.expectedTargetDigest ?? null,
    ownedNodeIdentities: components.map((c) => c.identity as string).sort(),
    variables,
    components,
    componentSets,
    bindings: input.bindings.bindings,
    annotations: create.filter((op) => op.kind === 'setAnnotation').map((op) => op.payload),
    operations: {
      create: create.sort((a, b) => a.id.localeCompare(b.id)),
      update: [],
      delete: input.allowDelete ? [] : [],
    },
  };
}
