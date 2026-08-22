import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runScan } from '../../bootstrap/scan/index.js';
import { runAnalyze, analyzeInventory } from '../../bootstrap/analyze/index.js';
import { runCapture } from '../../bootstrap/capture/index.js';
import { runCompile } from '../../bootstrap/compile/index.js';
import { runValidate } from '../../bootstrap/validate/index.js';
import { runReport } from '../../bootstrap/report/index.js';
import { buildFigmaPlan } from '../../bootstrap/figma/plan.js';
import { MemoryFigmaTransport } from '../../bootstrap/figma/transports/memory.js';
import { reconcileContracts } from '../../bootstrap/reconcile/index.js';
import { runMigratePlan, runMigrateVerify } from '../../bootstrap/migrate/index.js';
import { runBindingsGenerate } from '../../bootstrap/bindings/index.js';
import { loadInventory, resolveWorkspace } from '../../bootstrap/workspace.js';
import { stableStringifyJson } from '../../bootstrap/serialize.js';
import { Components } from '@rudironsoni/specs-from-figma';
import { DEFAULT_CONFIG } from '@rudironsoni/specs-schema';
import { BootstrapError } from '../../bootstrap/errors.js';
import { assertFreshInventory } from '../../bootstrap/decisions/stale.js';

const fixtureRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/bootstrap/angular');

describe('angular bootstrap vertical slice', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'specs-bootstrap-'));
  });

  afterEach(async () => {
    await fs.remove(tmp);
  });

  it('runs scan through reconcile and migration dry-run', async () => {
    const workspace = path.join(tmp, 'workspace');
    const first = await runScan({
      sourceRoot: fixtureRoot,
      workspace,
      platform: 'angular',
      repository: 'legacy-kit',
      revision: 'test-sha',
    });
    expect(first.components.length).toBeGreaterThanOrEqual(4);
    expect(first.styles.some((s) => s.normalized.type === 'color')).toBe(true);
    expect(first.usages.some((u) => u.kind === 'wrapped' || u.kind === 'composed')).toBe(true);

    const second = await runScan({
      sourceRoot: fixtureRoot,
      workspace,
      platform: 'angular',
      repository: 'legacy-kit',
      revision: 'test-sha',
    });
    expect(stableStringifyJson(first)).toBe(stableStringifyJson(second));

    await runCapture({
      workspace,
      sourceRoot: fixtureRoot,
      platform: 'angular',
      harness: path.join(fixtureRoot, 'harness'),
    });

    const analyzed = await runAnalyze({ workspace, variantSetLimit: 64 });
    expect(analyzed.candidates.some((c) => c.id === 'candidate:component:button-family')).toBe(true);
    expect(analyzed.candidates.some((c) => c.conflicts.some((conflict) => conflict.kind === 'NEAR_TOKEN'))).toBe(true);
    expect(analyzed.candidates.some((c) => c.kind === 'TOKEN' && c.conflicts.length === 0)).toBe(true);
    expect(() => analyzeInventory(first, 1)).toThrow(BootstrapError);

    const paths = resolveWorkspace(workspace);
    const yaml = await fs.readFile(path.join(fixtureRoot, 'decisions.yaml'), 'utf8');
    const tokenCandidate = analyzed.candidates.find((c) => c.kind === 'TOKEN' && c.conflicts.length === 0);
    const decisionsText = tokenCandidate
      ? yaml.replace(/candidate:token:[^\n]+/, tokenCandidate.id)
      : yaml;
    await fs.outputFile(paths.decisions, decisionsText);
    await runValidate(workspace, fixtureRoot);

    const compiled = await runCompile(workspace);
    expect(compiled.components['component:button']).toBeTruthy();
    expect(compiled.components['component:button'].title).toBe('Button');
    expect(Object.keys(compiled.tokens).length).toBeGreaterThan(0);

    const report = await runReport(workspace);
    const html = await fs.readFile(report, 'utf8');
    expect(html).toContain('Component inventory');
    expect(html).toContain('obs:');

    const plan = buildFigmaPlan({
      mode: 'STAGING',
      components: compiled.components,
      tokens: compiled.tokens,
      bindings: compiled.bindings,
      expectedTargetDigest: null,
      stagingApproved: true,
    });
    const transport = new MemoryFigmaTransport();
    const firstWrite = transport.apply(plan);
    expect(firstWrite.creates.length).toBeGreaterThan(0);
    const secondWrite = transport.apply(plan);
    expect(secondWrite.creates).toEqual([]);
    expect(secondWrite.updates).toEqual([]);

    const rest = transport.exportRest() as { componentSets: Record<string, { name: string; id: string }> };
    const setIds = Object.values(rest.componentSets).map((s) => s.id);
    const extracted = await Components.fromRestApi(
      setIds.length > 0 ? setIds : ['Button'],
      rest,
      DEFAULT_CONFIG,
      { styles: new Map(), variables: new Map(), collections: new Map(), author: 'test' },
      () => {},
    );
    const success = extracted.filter((r) => 'component' in r);
    expect(success.length).toBeGreaterThan(0);
    if ('component' in success[0]) {
      const reportRound = reconcileContracts(compiled.components['component:button'], success[0].component);
      expect(reportRound.mismatches.filter((m) => m.id === 'TITLE')).toEqual([]);
    }

    const connect = await runBindingsGenerate(workspace, path.join(tmp, 'code-connect'));
    expect(connect.some((f) => f.endsWith('.figma.ts'))).toBe(true);
    const template = await fs.readFile(connect[0], 'utf8');
    expect(template).toContain("import figma from 'figma'");
    expect(template).toContain('figma.selectedInstance');

    const migrate = await runMigratePlan(workspace, fixtureRoot);
    expect(migrate.plan.files.length).toBeGreaterThan(0);
    const verify = await runMigrateVerify(workspace, fixtureRoot);
    expect(verify.noop).toBe(true);

    const mutated = path.join(tmp, 'mutated.ts');
    await fs.copy(path.join(fixtureRoot, 'src/primary-button.component.ts'), mutated);
    const inventory = await loadInventory(paths);
    inventory.components[0].provenance.sourcePath = mutated;
    inventory.components[0].provenance.sourceFileDigest = 'deadbeef';
    expect(() => assertFreshInventory(inventory, tmp, 'test-sha')).toThrow(BootstrapError);
  });
});
