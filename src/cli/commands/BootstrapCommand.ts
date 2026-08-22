import { Command } from 'commander';
import path from 'node:path';
import { DEFAULT_VARIANT_SET_LIMIT, DEFAULT_WORKSPACE } from '../bootstrap/workspace.js';
import { withBootstrap } from '../bootstrap/cli.js';
import { runScan } from '../bootstrap/scan/index.js';
import { runAnalyze } from '../bootstrap/analyze/index.js';
import { runCapture } from '../bootstrap/capture/index.js';
import { runReport } from '../bootstrap/report/index.js';
import { runValidate } from '../bootstrap/validate/index.js';
import { runCompile } from '../bootstrap/compile/index.js';
import { runPlanFigma, runMaterialize, selectTransport } from '../bootstrap/figma/run.js';
import { MemoryFigmaTransport } from '../bootstrap/figma/transports/memory.js';
import { Components } from '@rudironsoni/specs-from-figma';
import { DEFAULT_CONFIG } from '@rudironsoni/specs-schema';
import { loadCompiledComponents } from '../bootstrap/figma/run.js';
import { assertReconciled, reconcileContracts } from '../bootstrap/reconcile/index.js';
import { resolveWorkspace } from '../bootstrap/workspace.js';
import fs from 'fs-extra';

function workspaceOf(cmd: Command): string {
  const self = cmd.opts<{ workspace?: string }>().workspace;
  if (self) return self;
  let current: Command | null = cmd.parent;
  while (current) {
    const value = current.opts<{ workspace?: string }>().workspace;
    if (value) return value;
    current = current.parent;
  }
  return DEFAULT_WORKSPACE;
}

export const Bootstrap = new Command('bootstrap')
  .description('Bootstrap a design system from product sources')
  .option('--workspace <path>', 'Bootstrap workspace', DEFAULT_WORKSPACE);

const scan = new Command('scan')
  .description('Extract an observed inventory from a product source tree')
  .requiredOption('--source <path>', 'Path to the source repository or fixture')
  .option('--workspace <path>', 'Bootstrap workspace', DEFAULT_WORKSPACE)
  .option('--platform <id>', 'Platform pack id', 'angular')
  .addHelpText('after', '\nExamples:\n  specs bootstrap scan --source ./app --platform angular --workspace .specs/bootstrap\n')
  .action(async (options, cmd: Command) => {
    await withBootstrap('specs bootstrap scan --source <path> --platform angular', async () => {
      const inventory = await runScan({
        sourceRoot: options.source,
        workspace: workspaceOf(cmd),
        platform: options.platform,
      });
      console.log(`wrote inventory with ${inventory.components.length} components`);
    });
  });

const capture = new Command('capture')
  .description('Capture runtime evidence using a configured harness')
  .requiredOption('--source <path>', 'Path to the source repository or fixture')
  .option('--workspace <path>', 'Bootstrap workspace', DEFAULT_WORKSPACE)
  .option('--platform <id>', 'Platform pack id', 'angular')
  .option('--harness <path>', 'Capture harness directory')
  .addHelpText('after', '\nExamples:\n  specs bootstrap capture --source ./app --harness ./app/harness\n')
  .action(async (options, cmd: Command) => {
    await withBootstrap('specs bootstrap capture --source <path> --harness <path>', async () => {
      await runCapture({
        workspace: workspaceOf(cmd),
        sourceRoot: options.source,
        platform: options.platform,
        harness: options.harness,
      });
      console.log('capture complete');
    });
  });

const analyze = new Command('analyze')
  .description('Write deterministic candidates from the observed inventory')
  .option('--workspace <path>', 'Bootstrap workspace', DEFAULT_WORKSPACE)
  .option('--variant-set-limit <n>', 'Fail when observed combinations exceed this count', String(DEFAULT_VARIANT_SET_LIMIT))
  .addHelpText('after', '\nExamples:\n  specs bootstrap analyze --workspace .specs/bootstrap\n')
  .action(async (options, cmd: Command) => {
    await withBootstrap('specs bootstrap analyze --workspace .specs/bootstrap', async () => {
      const file = await runAnalyze({
        workspace: workspaceOf(cmd),
        variantSetLimit: Number(options.variantSetLimit),
      });
      console.log(`wrote ${file.candidates.length} deterministic candidates`);
    });
  });

const report = new Command('report')
  .description('Write the local HTML review report')
  .option('--workspace <path>', 'Bootstrap workspace', DEFAULT_WORKSPACE)
  .addHelpText('after', '\nExamples:\n  specs bootstrap report --workspace .specs/bootstrap\n')
  .action(async (_options, cmd: Command) => {
    await withBootstrap('specs bootstrap report --workspace .specs/bootstrap', async () => {
      const file = await runReport(workspaceOf(cmd));
      console.log(`wrote ${file}`);
    });
  });

const validate = new Command('validate')
  .description('Validate sidecar contracts and reject stale observations')
  .option('--workspace <path>', 'Bootstrap workspace', DEFAULT_WORKSPACE)
  .option('--source <path>', 'Source tree used to re-hash files')
  .addHelpText('after', '\nExamples:\n  specs bootstrap validate --workspace .specs/bootstrap --source ./app\n')
  .action(async (options, cmd: Command) => {
    await withBootstrap('specs bootstrap validate --workspace .specs/bootstrap --source <path>', async () => {
      await runValidate(workspaceOf(cmd), options.source);
      console.log('validate ok');
    });
  });

const compile = new Command('compile')
  .description('Compile accepted decisions into Specs contracts')
  .option('--workspace <path>', 'Bootstrap workspace', DEFAULT_WORKSPACE)
  .addHelpText('after', '\nExamples:\n  specs bootstrap compile --workspace .specs/bootstrap\n')
  .action(async (_options, cmd: Command) => {
    await withBootstrap('specs bootstrap compile --workspace .specs/bootstrap', async () => {
      const result = await runCompile(workspaceOf(cmd));
      console.log(`compiled ${Object.keys(result.components).length} components`);
    });
  });

const plan = new Command('plan');
plan
  .command('figma')
  .description('Write a transport-independent Figma plan')
  .option('--workspace <path>', 'Bootstrap workspace', DEFAULT_WORKSPACE)
  .requiredOption('--mode <mode>', 'STAGING or APPROVED')
  .addHelpText('after', '\nExamples:\n  specs bootstrap plan figma --mode staging --workspace .specs/bootstrap\n')
  .action(async (options, cmd: Command) => {
    await withBootstrap('specs bootstrap plan figma --mode staging', async () => {
      const mode = String(options.mode).toUpperCase();
      const planDoc = await runPlanFigma(workspaceOf(cmd), mode as 'STAGING' | 'APPROVED');
      console.log(`wrote ${planDoc.mode} plan with ${planDoc.operations.create.length} creates`);
    });
  });

const materialize = new Command('materialize');
materialize
  .command('figma')
  .description('Apply a Figma plan (dry-run unless --apply)')
  .option('--workspace <path>', 'Bootstrap workspace', DEFAULT_WORKSPACE)
  .requiredOption('--plan <path>', 'Path to figma-plan.yaml')
  .option('--apply', 'Apply writes', false)
  .option('--transport <id>', 'memory | plugin | mcp | variables-rest', 'memory')
  .option('--dry-run', 'Show the diff only', false)
  .option('--emit-script <path>', 'Write a Figma Plugin API script for MCP use_figma')
  .addHelpText('after', '\nExamples:\n  specs bootstrap materialize figma --plan .specs/bootstrap/plans/figma-staging.yaml\n  specs bootstrap materialize figma --plan .specs/bootstrap/plans/figma-staging.yaml --transport mcp --emit-script ./plans/use_figma.js\n  specs bootstrap materialize figma --plan .specs/bootstrap/plans/figma-staging.yaml --apply\n')
  .action(async (options, cmd: Command) => {
    await withBootstrap('specs bootstrap materialize figma --plan <path> --apply', async () => {
      const apply = Boolean(options.apply) && !options.dryRun;
      const transport = options.transport === 'memory'
        ? new MemoryFigmaTransport()
        : selectTransport(options.transport);
      const workspace = workspaceOf(cmd);
      const result = await runMaterialize({
        planPath: options.plan,
        apply,
        transport,
        outputPath: path.join(resolveWorkspace(workspace).root, 'plans', 'figma-memory.json'),
        emitScriptPath: options.emitScript,
      });
      if (options.emitScript) {
        console.log(`wrote MCP script ${options.emitScript}`);
      }
      const mcp = options.transport === 'mcp';
      console.log(
        apply && !mcp
          ? `applied ${result.diff.creates.length} creates`
          : `dry-run ${result.diff.creates.length} creates`,
      );
    });
  });

const reconcile = new Command('reconcile')
  .description('Re-extract Figma REST export and compare with compiled contracts')
  .option('--workspace <path>', 'Bootstrap workspace', DEFAULT_WORKSPACE)
  .option('--rest <path>', 'REST JSON produced by materialize')
  .addHelpText('after', '\nExamples:\n  specs bootstrap reconcile --workspace .specs/bootstrap --rest .specs/bootstrap/plans/figma-memory.json\n')
  .action(async (options, cmd: Command) => {
    await withBootstrap('specs bootstrap reconcile --workspace .specs/bootstrap --rest <path>', async () => {
      const workspace = workspaceOf(cmd);
      const compiled = await loadCompiledComponents(workspace);
      const restPath = options.rest ?? path.join(resolveWorkspace(workspace).root, 'plans', 'figma-memory.json');
      const rest = await fs.readJson(restPath);
      const titles = Object.values(compiled).map((c) => c.title);
      const results = await Components.fromRestApi(
        titles,
        rest,
        DEFAULT_CONFIG,
        { styles: new Map(), variables: new Map(), collections: new Map(), author: 'bootstrap' },
        () => {},
      );
      for (const result of results) {
        if (!('component' in result)) {
          console.error(result);
          continue;
        }
        const match = Object.values(compiled).find((c) => c.title === result.component.title);
        if (!match) continue;
        assertReconciled(reconcileContracts(match, result.component));
      }
      console.log('reconcile ok');
    });
  });

Bootstrap.addCommand(scan);
Bootstrap.addCommand(capture);
Bootstrap.addCommand(analyze);
Bootstrap.addCommand(report);
Bootstrap.addCommand(validate);
Bootstrap.addCommand(compile);
Bootstrap.addCommand(plan);
Bootstrap.addCommand(materialize);
Bootstrap.addCommand(reconcile);
