import fs from 'fs-extra';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { stableStringifyJson, stableStringifyYaml } from './serialize.js';
import {
  validateBindingFile,
  validateCandidateFile,
  validateDecisionFile,
  validateFigmaPlan,
  validateInventory,
  validateRunRecord,
} from './schema/validate.js';
import type {
  BindingFile,
  CandidateFile,
  DecisionFile,
  FigmaPlan,
  Inventory,
  RunRecord,
} from './schema/types.js';
import { SIDECAR_SCHEMA_VERSION } from './schema/types.js';

export const DEFAULT_WORKSPACE = '.specs/bootstrap';
export const DEFAULT_VARIANT_SET_LIMIT = 64;

export interface BootstrapWorkspacePaths {
  root: string;
  inventory: string;
  deterministicCandidates: string;
  agentCandidates: string;
  decisions: string;
  contracts: string;
  tokens: string;
  bindings: string;
  stagingPlan: string;
  approvedPlan: string;
  evidence: string;
  reports: string;
  runs: string;
}

export function resolveWorkspace(root: string): BootstrapWorkspacePaths {
  const resolved = path.resolve(root);
  return {
    root: resolved,
    inventory: path.join(resolved, 'observed', 'inventory.json'),
    deterministicCandidates: path.join(resolved, 'candidates', 'deterministic.yaml'),
    agentCandidates: path.join(resolved, 'candidates', 'agent.yaml'),
    decisions: path.join(resolved, 'decisions', 'decisions.yaml'),
    contracts: path.join(resolved, 'contracts', 'components'),
    tokens: path.join(resolved, 'contracts', 'tokens'),
    bindings: path.join(resolved, 'bindings', 'bindings.yaml'),
    stagingPlan: path.join(resolved, 'plans', 'figma-staging.yaml'),
    approvedPlan: path.join(resolved, 'plans', 'figma-approved.yaml'),
    evidence: path.join(resolved, 'evidence'),
    reports: path.join(resolved, 'reports'),
    runs: path.join(resolved, 'runs'),
  };
}

export async function ensureWorkspace(paths: BootstrapWorkspacePaths): Promise<void> {
  await fs.ensureDir(path.dirname(paths.inventory));
  await fs.ensureDir(path.dirname(paths.deterministicCandidates));
  await fs.ensureDir(path.dirname(paths.decisions));
  await fs.ensureDir(paths.contracts);
  await fs.ensureDir(paths.tokens);
  await fs.ensureDir(path.dirname(paths.bindings));
  await fs.ensureDir(path.dirname(paths.stagingPlan));
  await fs.ensureDir(path.join(paths.evidence, 'renders'));
  await fs.ensureDir(path.join(paths.evidence, 'accessibility'));
  await fs.ensureDir(path.join(paths.evidence, 'structures'));
  await fs.ensureDir(paths.reports);
  await fs.ensureDir(paths.runs);
}

export function emptyInventory(workspace: { repository: string; revision: string }): Inventory {
  return {
    schemaVersion: SIDECAR_SCHEMA_VERSION,
    workspace,
    sources: [],
    components: [],
    usages: [],
    styles: [],
    renderCases: [],
    documents: [],
    figmaAssets: [],
    failures: [],
    aliases: [],
  };
}

export function emptyCandidateFile(): CandidateFile {
  return { schemaVersion: SIDECAR_SCHEMA_VERSION, candidates: [] };
}

export function emptyDecisionFile(): DecisionFile {
  return { schemaVersion: SIDECAR_SCHEMA_VERSION, decisions: [] };
}

export function emptyBindingFile(): BindingFile {
  return { schemaVersion: SIDECAR_SCHEMA_VERSION, bindings: [] };
}

async function readYamlOrJson(filePath: string): Promise<unknown> {
  const raw = await fs.readFile(filePath, 'utf8');
  if (filePath.endsWith('.json')) return JSON.parse(raw);
  return parseYaml(raw);
}

export async function loadInventory(paths: BootstrapWorkspacePaths): Promise<Inventory> {
  return validateInventory(await readYamlOrJson(paths.inventory));
}

export async function saveInventory(paths: BootstrapWorkspacePaths, inventory: Inventory): Promise<void> {
  await fs.outputFile(paths.inventory, stableStringifyJson(validateInventory(inventory)));
}

export async function loadCandidateFile(filePath: string): Promise<CandidateFile> {
  if (!(await fs.pathExists(filePath))) return emptyCandidateFile();
  return validateCandidateFile(await readYamlOrJson(filePath));
}

export async function saveCandidateFile(filePath: string, file: CandidateFile): Promise<void> {
  await fs.outputFile(filePath, stableStringifyYaml(validateCandidateFile(file)));
}

export async function loadDecisions(paths: BootstrapWorkspacePaths): Promise<DecisionFile> {
  if (!(await fs.pathExists(paths.decisions))) return emptyDecisionFile();
  return validateDecisionFile(await readYamlOrJson(paths.decisions));
}

export async function saveDecisions(paths: BootstrapWorkspacePaths, file: DecisionFile): Promise<void> {
  const existing = await loadDecisions(paths);
  const byCandidate = new Map(existing.decisions.map((d) => [d.candidate, d]));
  for (const decision of file.decisions) {
    if (!byCandidate.has(decision.candidate)) byCandidate.set(decision.candidate, decision);
  }
  const merged: DecisionFile = {
    schemaVersion: SIDECAR_SCHEMA_VERSION,
    decisions: [...byCandidate.values()].sort((a, b) => a.candidate.localeCompare(b.candidate)),
  };
  await fs.outputFile(paths.decisions, stableStringifyYaml(validateDecisionFile(merged)));
}

export async function loadBindings(paths: BootstrapWorkspacePaths): Promise<BindingFile> {
  if (!(await fs.pathExists(paths.bindings))) return emptyBindingFile();
  return validateBindingFile(await readYamlOrJson(paths.bindings));
}

export async function saveBindings(paths: BootstrapWorkspacePaths, file: BindingFile): Promise<void> {
  await fs.outputFile(paths.bindings, stableStringifyYaml(validateBindingFile(file)));
}

export async function saveFigmaPlan(filePath: string, plan: FigmaPlan): Promise<void> {
  await fs.outputFile(filePath, stableStringifyYaml(validateFigmaPlan(plan)));
}

export async function loadFigmaPlan(filePath: string): Promise<FigmaPlan> {
  return validateFigmaPlan(await readYamlOrJson(filePath));
}

export async function saveRun(paths: BootstrapWorkspacePaths, run: RunRecord): Promise<void> {
  await fs.outputFile(path.join(paths.runs, `${run.runId}.json`), stableStringifyJson(validateRunRecord(run)));
}
