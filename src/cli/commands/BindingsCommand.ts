import { Command } from 'commander';
import { DEFAULT_WORKSPACE } from '../bootstrap/workspace.js';
import { withBootstrap } from '../bootstrap/cli.js';
import { runBindingsGenerate } from '../bootstrap/bindings/index.js';

export const Bindings = new Command('bindings')
  .description('Generate platform bindings from compiled bootstrap contracts');

Bindings
  .command('generate')
  .description('Write Code Connect template files from bindings')
  .option('--workspace <path>', 'Bootstrap workspace', DEFAULT_WORKSPACE)
  .option('--output <path>', 'Directory for template files', './code-connect')
  .addHelpText('after', '\nExamples:\n  specs bindings generate --workspace .specs/bootstrap --output ./code-connect\n')
  .action(async (options) => {
    await withBootstrap('specs bindings generate --workspace .specs/bootstrap --output ./code-connect', async () => {
      const files = await runBindingsGenerate(options.workspace, options.output);
      console.log(`wrote ${files.length} Code Connect templates`);
    });
  });
