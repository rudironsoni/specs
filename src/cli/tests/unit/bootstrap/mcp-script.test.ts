import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { stringify as stringifyYaml } from 'yaml';
import { emitMcpPluginScript, mcpScriptTransport } from '../../../bootstrap/figma/transports/mcpScript.js';
import { runMaterialize, selectTransport } from '../../../bootstrap/figma/run.js';
import { BootstrapError } from '../../../bootstrap/errors.js';
import { mcpTransport } from '../../../bootstrap/figma/transports/http.js';
import type { FigmaPlan } from '../../../bootstrap/schema/types.js';

function plan(overrides: Partial<FigmaPlan> = {}): FigmaPlan {
  return {
    schemaVersion: 1,
    mode: 'STAGING',
    sourceContractDigest: 'abc',
    expectedTargetDigest: null,
    ownedNodeIdentities: ['specs:component:button'],
    variables: [{ name: 'color.brand.primary', token: { $type: 'color', $value: '#1a73e8' } }],
    components: [],
    componentSets: [],
    bindings: [],
    annotations: [],
    operations: {
      create: [
        { id: 'var:color.brand.primary', kind: 'createVariable', payload: { name: 'color.brand.primary', token: { $type: 'color', $value: '#1a73e8' } } },
        { id: 'set:component:button', kind: 'createComponentSet', payload: { id: 'component:button', title: 'Button', identity: 'specs:component:button' } },
      ],
      update: [],
      delete: [],
    },
    ...overrides,
  };
}

describe('MCP Plugin API script', () => {
  it('emits native create calls and refuses forbidden APIs', () => {
    const script = emitMcpPluginScript(plan());
    expect(script).toContain('use_figma');
    expect(script).not.toContain('generate_figma_design');
    expect(script).not.toContain('setPluginData');
    expect(script).not.toContain('loadAllPagesAsync');
    expect(script).not.toContain('createImageAsync');
    expect(script).not.toContain('figma.notify');
    expect(script).toContain('createVariable');
    expect(script).toContain('getLocalVariableCollectionsAsync');
    expect(script).toContain('getLocalVariablesAsync');
    expect(script).toContain('combineAsVariants([component], page)');
    expect(script).toContain('resizeWithoutConstraints');
    expect(script).toContain('nextSetX');
    expect(script).toContain('loadFontAsync({ family: "Inter", style: "Regular" })');
    expect(script).toContain('createdNodeIds');
    expect(script).toContain('specs:Button');
    expect(script).toContain('"a":1');
    expect(script).toContain('FRAME_FILL');
    expect(script).toContain('color/brand/primary');
    expect(script).not.toContain('createVariable("color.brand.primary"');
    expect(script).not.toContain('combineAsVariants([component], { x:');
  });

  it('is byte-identical across two emits', () => {
    expect(emitMcpPluginScript(plan())).toBe(emitMcpPluginScript(plan()));
  });

  it('refuses deletion', () => {
    expect(() => emitMcpPluginScript(plan({
      operations: {
        create: [],
        update: [],
        delete: [{ id: 'x', kind: 'delete', payload: {} }],
      },
    }))).toThrow(BootstrapError);
  });

  it('refuses updates', () => {
    expect(() => emitMcpPluginScript(plan({
      operations: {
        create: [],
        update: [{ id: 'x', kind: 'update', payload: {} }],
        delete: [],
      },
    }))).toThrow(BootstrapError);
  });

  it('refuses unmapped variables', () => {
    expect(() => emitMcpPluginScript(plan({
      operations: {
        create: [{ id: 'var:space', kind: 'createVariable', payload: { name: 'space.md', token: { $type: 'dimension', $value: 16 } } }],
        update: [],
        delete: [],
      },
    }))).toThrow(BootstrapError);
  });

  it('selectTransport mcp does not need FIGMA_MCP_SESSION', () => {
    const previous = process.env.FIGMA_MCP_SESSION;
    delete process.env.FIGMA_MCP_SESSION;
    try {
      expect(selectTransport('mcp').id).toBe('mcp');
      expect(mcpScriptTransport().exportRest()).toEqual({ tool: 'use_figma' });
      expect(() => mcpTransport().digest()).toThrow(BootstrapError);
    } finally {
      if (previous === undefined) delete process.env.FIGMA_MCP_SESSION;
      else process.env.FIGMA_MCP_SESSION = previous;
    }
  });

  it('runMaterialize writes the script and skips Node apply', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'specs-mcp-'));
    const planPath = path.join(tmp, 'plan.yaml');
    const scriptPath = path.join(tmp, 'use_figma.js');
    await fs.writeFile(planPath, stringifyYaml(plan()));
    const result = await runMaterialize({
      planPath,
      apply: false,
      transport: selectTransport('mcp'),
      emitScriptPath: scriptPath,
    });
    expect(result.diff.creates).toEqual(['var:color.brand.primary', 'set:component:button']);
    const written = await fs.readFile(scriptPath, 'utf8');
    expect(written).toBe(result.script);
    expect(written).toContain('combineAsVariants([component], page)');
    await expect(runMaterialize({
      planPath,
      apply: true,
      transport: selectTransport('mcp'),
    })).rejects.toBeInstanceOf(BootstrapError);
  });
});
