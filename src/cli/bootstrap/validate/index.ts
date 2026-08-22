import { assertFreshInventory } from '../decisions/stale.js';
import { loadCandidateFile, loadDecisions, loadInventory, resolveWorkspace } from '../workspace.js';
import { validateBindingFile, validateCandidateFile, validateDecisionFile, validateInventory } from '../schema/validate.js';
import { BootstrapError } from '../errors.js';
import fs from 'fs-extra';
import { parse as parseYaml } from 'yaml';

export async function runValidate(workspace: string, sourceRoot?: string): Promise<void> {
  const paths = resolveWorkspace(workspace);
  const inventory = validateInventory(await loadInventory(paths));
  validateCandidateFile(await loadCandidateFile(paths.deterministicCandidates));
  const decisions = validateDecisionFile(await loadDecisions(paths));
  if (await fs.pathExists(paths.bindings)) {
    const raw = parseYaml(await fs.readFile(paths.bindings, 'utf8'));
    validateBindingFile(raw);
  }
  if (sourceRoot) {
    assertFreshInventory(inventory, sourceRoot, inventory.workspace.revision);
  }
  const candidateIds = new Set(
    (await loadCandidateFile(paths.deterministicCandidates)).candidates.map((c) => c.id),
  );
  for (const decision of decisions.decisions) {
    if (!candidateIds.has(decision.candidate)) {
      throw new BootstrapError('DECISION_REFERENCE_MISSING', `Decision ${decision.candidate} has no candidate`);
    }
  }
}
