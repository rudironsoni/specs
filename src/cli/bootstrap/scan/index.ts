import path from 'node:path';
import { execSync } from 'node:child_process';
import { assertCommandCapabilities, adapterPresent } from '../platforms/capabilities.js';
import { getPlatformPack } from '../platforms/index.js';
import { extractCompodoc } from '../platforms/compodoc.js';
import { mergeInventory, sortInventory } from '../model/merge.js';
import { emptyInventory, ensureWorkspace, resolveWorkspace, saveInventory } from '../workspace.js';
import type { Inventory } from '../schema/types.js';
import { BootstrapError } from '../errors.js';
import { readPackageName } from '../platforms/angular/files.js';
import type { ScanContext } from '../platforms/types.js';

export interface ScanOptions {
  sourceRoot: string;
  workspace: string;
  platform: string;
  repository?: string;
  revision?: string;
}

function git(command: string, cwd: string): string | undefined {
  try {
    return execSync(command, { cwd, encoding: 'utf8' }).trim();
  } catch {
    return undefined;
  }
}

export async function runScan(options: ScanOptions): Promise<Inventory> {
  const pack = getPlatformPack(options.platform);
  assertCommandCapabilities(pack, 'scan');
  for (const capability of ['api', 'usage', 'styles', 'renderCases'] as const) {
    if (!adapterPresent(pack, capability)) {
      throw new BootstrapError(
        'CAPABILITY_UNAVAILABLE',
        `Platform ${options.platform} has no ${capability} adapter`,
        { capability },
      );
    }
  }

  const sourceRoot = path.resolve(options.sourceRoot);
  const revision = options.revision ?? git('git rev-parse HEAD', sourceRoot) ?? 'unknown';
  const repository = options.repository ?? git('git remote get-url origin', sourceRoot) ?? path.basename(sourceRoot);
  const context: ScanContext = {
    sourceRoot,
    repository,
    revision,
    packageName: await readPackageName(sourceRoot),
    workspaceRoot: path.resolve(options.workspace),
  };

  let inventory = emptyInventory({ repository, revision });
  inventory = mergeInventory(inventory, (await pack.codeModel!.extract(context)).inventory);
  inventory = mergeInventory(inventory, (await pack.usage!.extract(context, inventory)).inventory);
  inventory = mergeInventory(inventory, (await pack.styles!.extract(context, inventory)).inventory);
  inventory = mergeInventory(inventory, (await pack.renderCases!.extract(context, inventory)).inventory);
  inventory = mergeInventory(inventory, (await extractCompodoc(context, inventory)).inventory);
  inventory = sortInventory(inventory);

  const paths = resolveWorkspace(options.workspace);
  await ensureWorkspace(paths);
  await saveInventory(paths, inventory);
  return inventory;
}
