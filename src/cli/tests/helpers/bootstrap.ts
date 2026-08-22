import fs from 'fs-extra';
import path from 'node:path';
import { runScan } from '../../bootstrap/scan/index.js';
import { runAnalyze } from '../../bootstrap/analyze/index.js';
import { runCompile } from '../../bootstrap/compile/index.js';
import { runValidate } from '../../bootstrap/validate/index.js';
import { resolveWorkspace } from '../../bootstrap/workspace.js';
import { stableStringifyYaml } from '../../bootstrap/serialize.js';
import type { CandidateFile } from '../../bootstrap/schema/types.js';

export function buttonFamilyDecisions(analyzed: CandidateFile) {
  const button = analyzed.candidates.find((c) => c.id === 'candidate:component:button-family');
  const token = analyzed.candidates.find((c) => c.kind === 'TOKEN' && c.conflicts.length === 0);
  const card = analyzed.candidates.find((c) => c.id === 'candidate:component:card-family');
  const decisions: Array<Record<string, unknown>> = [];
  if (button) {
    decisions.push({
      candidate: button.id,
      decision: 'ACCEPT_WITH_CHANGES',
      acceptedIdentity: 'component:button',
      include: button.members.filter((id) => !id.toLowerCase().includes('old')),
      properties: { appearance: { accepted: ['primary', 'secondary'] } },
      approvedBy: { role: 'design-system-owner', identity: 'test' },
      rationale: ['Shared button family'],
    });
    decisions.push({
      candidate: button.id,
      decision: 'APPROVE_FOR_STAGING',
      acceptedIdentity: 'component:button',
      approvedBy: { role: 'design-system-owner', identity: 'test' },
      rationale: ['Staging allowed'],
    });
  }
  if (token) {
    decisions.push({
      candidate: token.id,
      decision: 'ACCEPT',
      acceptedIdentity: 'color.brand.primary',
      approvedBy: { role: 'design-system-owner', identity: 'test' },
      rationale: ['Exact brand color'],
    });
  }
  if (card) {
    decisions.push({
      candidate: card.id,
      decision: 'ACCEPT',
      acceptedIdentity: 'component:card',
      include: card.members,
      approvedBy: { role: 'design-system-owner', identity: 'test' },
      rationale: ['Composite card'],
    });
  }
  return { schemaVersion: 1, decisions };
}

export async function compilePlatformFixture(options: {
  fixtureRoot: string;
  workspace: string;
  platform: string;
}) {
  const inventory = await runScan({
    sourceRoot: options.fixtureRoot,
    workspace: options.workspace,
    platform: options.platform,
    repository: 'legacy-kit',
    revision: 'test-sha',
  });
  const analyzed = await runAnalyze({ workspace: options.workspace, variantSetLimit: 64 });
  const paths = resolveWorkspace(options.workspace);
  await fs.outputFile(paths.decisions, stableStringifyYaml(buttonFamilyDecisions(analyzed)));
  await runValidate(options.workspace, options.fixtureRoot);
  const compiled = await runCompile(options.workspace);
  return { inventory, analyzed, compiled, paths };
}

export function fixturePath(...parts: string[]): string {
  return path.join(path.dirname(new URL(import.meta.url).pathname), '../fixtures/bootstrap', ...parts);
}
