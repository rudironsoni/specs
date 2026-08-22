import path from 'node:path';
import { BootstrapError } from '../errors.js';
import { mergeInventory } from '../model/merge.js';
import { getPlatformPack } from '../platforms/index.js';
import { loadInventory, resolveWorkspace, saveInventory } from '../workspace.js';
import { readPackageName } from '../platforms/angular/files.js';
import type { ScanContext } from '../platforms/types.js';

export async function runCapture(options: {
  workspace: string;
  sourceRoot: string;
  platform: string;
  harness?: string;
}): Promise<void> {
  const pack = getPlatformPack(options.platform);
  if (!pack.renderer) {
    throw new BootstrapError('MISSING_RUNTIME_PROVIDER', `No renderer for ${options.platform}`);
  }
  const paths = resolveWorkspace(options.workspace);
  const inventory = await loadInventory(paths);
  const context: ScanContext & { harness?: string } = {
    sourceRoot: path.resolve(options.sourceRoot),
    repository: inventory.workspace.repository,
    revision: inventory.workspace.revision,
    packageName: await readPackageName(options.sourceRoot),
    workspaceRoot: paths.root,
    harness: options.harness,
  };
  const contrib = await pack.renderer.capture(context, inventory);
  await saveInventory(paths, mergeInventory(inventory, contrib.inventory));
}
