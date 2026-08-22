import fs from 'fs-extra';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { Component } from '@rudironsoni/specs-schema';
import { compiledDigest, runCompile } from '../compile/index.js';
import { loadBindings, loadDecisions, resolveWorkspace, saveFigmaPlan } from '../workspace.js';
import { buildFigmaPlan } from './plan.js';
import { MemoryFigmaTransport } from './transports/memory.js';
import { pluginTransport, variablesRestTransport } from './transports/stubs.js';
import { emitMcpPluginScript, mcpScriptTransport } from './transports/mcpScript.js';
import type { FigmaTransport } from './transports/types.js';
import type { FigmaPlan, FigmaPlanMode } from '../schema/types.js';
import { BootstrapError } from '../errors.js';
import { stableStringifyJson } from '../serialize.js';

export function selectTransport(name: string): FigmaTransport {
  if (name === 'memory') return new MemoryFigmaTransport();
  if (name === 'plugin') return pluginTransport();
  if (name === 'mcp') return mcpScriptTransport();
  if (name === 'variables-rest') return variablesRestTransport();
  throw new BootstrapError('AUTHENTICATION_REQUIRED', `Unknown transport ${name}`);
}

export async function runPlanFigma(workspace: string, mode: FigmaPlanMode): Promise<FigmaPlan> {
  const paths = resolveWorkspace(workspace);
  const compiled = await runCompile(workspace);
  const decisions = await loadDecisions(paths);
  const stagingApproved = decisions.decisions.some((d) => d.decision === 'APPROVE_FOR_STAGING');
  const plan = buildFigmaPlan({
    mode,
    components: compiled.components,
    tokens: compiled.tokens,
    bindings: compiled.bindings,
    expectedTargetDigest: null,
    stagingApproved,
  });
  await saveFigmaPlan(mode === 'STAGING' ? paths.stagingPlan : paths.approvedPlan, plan);
  return plan;
}

export async function runMaterialize(options: {
  planPath: string;
  apply: boolean;
  transport: FigmaTransport;
  outputPath?: string;
  emitScriptPath?: string;
}): Promise<{ diff: ReturnType<FigmaTransport['dryRun']>; rest?: unknown; script?: string }> {
  const raw = parseYaml(await fs.readFile(options.planPath, 'utf8')) as FigmaPlan;
  const wantsScript = Boolean(options.emitScriptPath) || options.transport.id === 'mcp';
  const script = wantsScript ? emitMcpPluginScript(raw) : undefined;
  if (script && options.emitScriptPath) {
    await fs.outputFile(options.emitScriptPath, script);
  }
  if (options.transport.id === 'mcp') {
    if (options.apply && !options.emitScriptPath) {
      throw new BootstrapError(
        'AUTHENTICATION_REQUIRED',
        'MCP apply is not a Node writer. Emit a Plugin API script with --emit-script and run it through Figma use_figma.',
      );
    }
    return {
      diff: {
        creates: raw.operations.create.map((op) => op.id),
        updates: raw.operations.update.map((op) => op.id),
        deletes: [],
      },
      script,
    };
  }
  const diff = options.apply
    ? await Promise.resolve(options.transport.apply(raw))
    : options.transport.dryRun(raw);
  if (options.apply && options.outputPath) {
    await fs.outputFile(options.outputPath, stableStringifyJson(options.transport.exportRest()));
  }
  return { diff, rest: options.apply ? options.transport.exportRest() : undefined, script };
}

export { emitMcpPluginScript };

export async function loadCompiledComponents(workspace: string): Promise<Record<string, Component>> {
  const paths = resolveWorkspace(workspace);
  const dir = paths.contracts;
  const out: Record<string, Component> = {};
  if (!(await fs.pathExists(dir))) return out;
  for (const name of (await fs.readdir(dir)).sort()) {
    if (!name.endsWith('.yaml')) continue;
    out[name.replace(/\.yaml$/, '')] = parseYaml(await fs.readFile(path.join(dir, name), 'utf8')) as Component;
  }
  return out;
}

export { compiledDigest, loadBindings };
