import { afterEach, describe, expect, it } from 'vitest';
import { pluginTransport, mcpTransport, variablesRestTransport } from '../../../bootstrap/figma/transports/http.js';
import { selectTransport } from '../../../bootstrap/figma/run.js';
import { BootstrapError } from '../../../bootstrap/errors.js';
import type { FigmaPlan } from '../../../bootstrap/schema/types.js';

const emptyPlan = (): FigmaPlan => ({
  schemaVersion: 1,
  mode: 'STAGING',
  sourceContractDigest: 'abc',
  expectedTargetDigest: null,
  ownedNodeIdentities: [],
  variables: [{ name: 'color.brand.primary' }],
  components: [],
  componentSets: [],
  bindings: [],
  annotations: [],
  operations: {
    create: [{ id: 'create-1', kind: 'COMPONENT_SET', payload: { name: 'Button' } }],
    update: [],
    delete: [],
  },
});

const ENV_KEYS = ['FIGMA_PLUGIN_SESSION', 'FIGMA_MCP_SESSION', 'FIGMA_TOKEN', 'FIGMA_FILE_KEY'] as const;

describe('live Figma transports', () => {
  const previous: Record<string, string | undefined> = {};

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
    for (const key of ENV_KEYS) delete previous[key];
  });

  function setEnv(key: (typeof ENV_KEYS)[number], value: string | undefined) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }

  it('fails closed without credentials', () => {
    setEnv('FIGMA_PLUGIN_SESSION', undefined);
    setEnv('FIGMA_MCP_SESSION', undefined);
    setEnv('FIGMA_TOKEN', undefined);
    expect(() => pluginTransport().digest()).toThrow(BootstrapError);
    expect(() => mcpTransport().digest()).toThrow(BootstrapError);
    expect(() => variablesRestTransport().digest()).toThrow(BootstrapError);
  });

  it('plugin transport maps the plan protocol', async () => {
    setEnv('FIGMA_PLUGIN_SESSION', 'session');
    const transport = pluginTransport();
    const diff = transport.dryRun(emptyPlan());
    expect(diff.creates).toEqual(['create-1']);
    await transport.apply(emptyPlan());
    const rest = transport.exportRest() as { protocol: string };
    expect(rest.protocol).toBe('specs.bootstrap.plugin.v1');
  });

  it('mcp transport uses use_figma, not generate_figma_design', async () => {
    setEnv('FIGMA_MCP_SESSION', 'session');
    const transport = mcpTransport();
    await transport.apply(emptyPlan());
    const rest = transport.exportRest() as { tool: string; note: string };
    expect(rest.tool).toBe('use_figma');
    expect(rest.note).toContain('Not generate_figma_design');
  });

  it('variables REST posts when FIGMA_TOKEN and FIGMA_FILE_KEY are set', async () => {
    setEnv('FIGMA_TOKEN', 'token');
    setEnv('FIGMA_FILE_KEY', 'file-key');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status: 'ok' }),
    })) as typeof fetch;
    try {
      const transport = variablesRestTransport();
      await transport.apply(emptyPlan());
      expect(transport.exportRest()).toEqual({ status: 'ok' });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('selectTransport rejects unknown ids', () => {
    expect(() => selectTransport('nope')).toThrow(BootstrapError);
  });
});
