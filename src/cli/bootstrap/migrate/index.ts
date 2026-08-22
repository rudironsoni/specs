import fs from 'fs-extra';
import path from 'node:path';
import { planAngularRewrite } from '../platforms/angular/rewrite.js';
import { planTextRewrite, applyRewritePlan } from '../platforms/rewriteText.js';
import { bindingPlatformForPack, rewriteExtensions } from '../platforms/names.js';
import { loadBindings, resolveWorkspace } from '../workspace.js';
import { stableStringifyYaml } from '../serialize.js';
import type { RewritePlan } from '../platforms/types.js';
import { BootstrapError } from '../errors.js';

export interface MigrateResult {
  plan: RewritePlan;
  noop: boolean;
  written?: number;
}

export async function runMigratePlan(workspace: string, sourceRoot: string, platform = 'angular'): Promise<MigrateResult> {
  const paths = resolveWorkspace(workspace);
  const bindings = await loadBindings(paths);
  const plan = platform === 'angular'
    ? await planAngularRewrite(sourceRoot, bindings)
    : await planTextRewrite({
      sourceRoot,
      bindings,
      platform: bindingPlatformForPack(platform),
      extensions: rewriteExtensions(platform),
    });
  await fs.ensureDir(path.join(paths.root, 'plans'));
  await fs.writeFile(path.join(paths.root, 'plans', 'migrate.yaml'), stableStringifyYaml(plan));
  return { plan, noop: plan.files.length === 0 };
}

export async function runMigrateApply(workspace: string, sourceRoot: string, options: { dryRun: boolean; platform?: string }): Promise<MigrateResult> {
  const result = await runMigratePlan(workspace, sourceRoot, options.platform ?? 'angular');
  if (options.dryRun) return result;
  const written = await applyRewritePlan(sourceRoot, result.plan);
  const second = await runMigratePlan(workspace, sourceRoot, options.platform ?? 'angular');
  return { plan: result.plan, noop: second.plan.files.length === 0, written };
}

export async function runMigrateVerify(workspace: string, sourceRoot: string, platform = 'angular'): Promise<MigrateResult> {
  const first = await runMigratePlan(workspace, sourceRoot, platform);
  const second = await runMigratePlan(workspace, sourceRoot, platform);
  const noop = JSON.stringify(first.plan) === JSON.stringify(second.plan);
  if (!noop) {
    throw new BootstrapError('TARGET_DRIFT_DETECTED', 'Second migrate plan differed from the first');
  }
  return { plan: second.plan, noop };
}
