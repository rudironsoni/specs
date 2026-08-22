import { Command } from 'commander';
import { DEFAULT_WORKSPACE } from '../bootstrap/workspace.js';
import { withBootstrap } from '../bootstrap/cli.js';
import { runMigrateApply, runMigratePlan, runMigrateVerify } from '../bootstrap/migrate/index.js';

export const Migrate = new Command('migrate')
  .description('Plan and apply syntax-aware migrations from accepted bindings');

Migrate
  .command('plan')
  .description('Write a dry-run migration plan')
  .option('--workspace <path>', 'Bootstrap workspace', DEFAULT_WORKSPACE)
  .requiredOption('--source <path>', 'Source tree to rewrite')
  .option('--platform <id>', 'Platform pack id', 'angular')
  .addHelpText('after', '\nExamples:\n  specs migrate plan --source ./app --platform angular --workspace .specs/bootstrap\n')
  .action(async (options) => {
    await withBootstrap('specs migrate plan --source <path>', async () => {
      const result = await runMigratePlan(options.workspace, options.source, options.platform);
      console.log(`planned ${result.plan.files.length} files`);
    });
  });

Migrate
  .command('apply')
  .description('Apply migration. Writes files unless --dry-run is set')
  .option('--workspace <path>', 'Bootstrap workspace', DEFAULT_WORKSPACE)
  .requiredOption('--source <path>', 'Source tree to rewrite')
  .option('--platform <id>', 'Platform pack id', 'angular')
  .option('--dry-run', 'Show diffs without writing', false)
  .addHelpText('after', '\nExamples:\n  specs migrate apply --dry-run --source ./app\n  specs migrate apply --source ./app --platform react\n')
  .action(async (options) => {
    await withBootstrap('specs migrate apply --source <path>', async () => {
      const result = await runMigrateApply(options.workspace, options.source, {
        dryRun: Boolean(options.dryRun),
        platform: options.platform,
      });
      if (options.dryRun) {
        console.log(`dry-run ${result.plan.files.length} files`);
        return;
      }
      console.log(`applied ${result.written ?? 0} files`);
    });
  });

Migrate
  .command('verify')
  .description('Confirm a second migration plan is a no-op against the same tree')
  .option('--workspace <path>', 'Bootstrap workspace', DEFAULT_WORKSPACE)
  .requiredOption('--source <path>', 'Source tree to rewrite')
  .option('--platform <id>', 'Platform pack id', 'angular')
  .addHelpText('after', '\nExamples:\n  specs migrate verify --source ./app\n')
  .action(async (options) => {
    await withBootstrap('specs migrate verify --source ./app', async () => {
      const result = await runMigrateVerify(options.workspace, options.source, options.platform);
      console.log(result.noop ? 'verify ok (plans match)' : 'verify found plan drift');
    });
  });
