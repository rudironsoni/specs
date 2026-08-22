import { BootstrapError } from '../../errors.js';
import { digestCanonical } from '../../serialize.js';
import type { FigmaPlan } from '../../schema/types.js';
import type { FigmaTransport, MaterializeDiff } from './types.js';

function emptyDiff(): MaterializeDiff {
  return { creates: [], updates: [], deletes: [] };
}

export function createAuthenticatedTransport(options: {
  id: string;
  tokenEnv: string;
  applyPlan: (plan: FigmaPlan, token: string) => Promise<unknown> | unknown;
}): FigmaTransport {
  const token = process.env[options.tokenEnv];
  const fail = () => {
    throw new BootstrapError(
      'AUTHENTICATION_REQUIRED',
      `${options.id} transport needs ${options.tokenEnv}`,
      { transport: options.id },
    );
  };
  if (!token) {
    return {
      id: options.id,
      digest: fail,
      dryRun: fail,
      apply: fail,
      exportRest: fail,
    };
  }
  let last: unknown = { name: 'Specs Bootstrap', document: { id: '0:0', type: 'DOCUMENT', children: [] }, components: {} };
  return {
    id: options.id,
    digest: () => digestCanonical(last),
    dryRun: (plan) => ({
      creates: plan.operations.create.map((op) => op.id),
      updates: plan.operations.update.map((op) => op.id),
      deletes: [],
    }),
    apply: async (plan) => {
      if (plan.operations.delete.length > 0) {
        throw new BootstrapError('PLAN_PRECONDITION_FAILED', 'Deletion is disabled by default');
      }
      last = await options.applyPlan(plan, token);
      return emptyDiff();
    },
    exportRest: () => last,
  };
}

export function pluginTransport() {
  return createAuthenticatedTransport({
    id: 'plugin',
    tokenEnv: 'FIGMA_PLUGIN_SESSION',
    applyPlan: (plan) => ({
      protocol: 'specs.bootstrap.plugin.v1',
      operations: plan.operations,
    }),
  });
}

export function mcpTransport() {
  return createAuthenticatedTransport({
    id: 'mcp',
    tokenEnv: 'FIGMA_MCP_SESSION',
    applyPlan: (plan) => ({
      tool: 'use_figma',
      note: 'Plan mapped to MCP use_figma. Not generate_figma_design.',
      operations: plan.operations.create.map((op) => ({
        kind: op.kind,
        payload: op.payload,
      })),
    }),
  });
}

export function variablesRestTransport() {
  return createAuthenticatedTransport({
    id: 'variables-rest',
    tokenEnv: 'FIGMA_TOKEN',
    applyPlan: async (plan, token) => {
      const fileKey = process.env.FIGMA_FILE_KEY;
      if (!fileKey) {
        throw new BootstrapError('AUTHENTICATION_REQUIRED', 'FIGMA_FILE_KEY is required for variables REST');
      }
      const variables = plan.variables.map((entry) => {
        const record = entry as { name?: string; token?: { $value?: string } };
        return {
          action: 'CREATE',
          name: record.name,
          resolvedType: 'COLOR',
        };
      });
      const response = await fetch(`https://api.figma.com/v1/files/${fileKey}/variables`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ variableCollections: [], variables }),
      });
      if (response.status === 403) {
        throw new BootstrapError('AUTHENTICATION_REQUIRED', 'Variables REST requires an Enterprise Full seat');
      }
      if (!response.ok) {
        throw new BootstrapError('PLAN_PRECONDITION_FAILED', `Variables REST failed: ${response.status}`);
      }
      return response.json();
    },
  });
}
