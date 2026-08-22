import { BootstrapError } from '../errors.js';
import { stylesAreExact, stylesAreNear } from '../model/styles.js';
import type { Candidate, CandidateFile, Inventory } from '../schema/types.js';
import { SIDECAR_SCHEMA_VERSION } from '../schema/types.js';
import { loadInventory, resolveWorkspace, saveCandidateFile } from '../workspace.js';

export interface AnalyzeOptions {
  workspace: string;
  variantSetLimit: number;
}

function propertyNames(inventory: Inventory, id: string): string[] {
  const component = inventory.components.find((c) => c.id === id);
  return [...(component?.properties ?? []), ...(component?.events ?? [])].map((p) => p.name).sort();
}

export function analyzeInventory(inventory: Inventory, variantSetLimit: number): CandidateFile {
  const candidates: Candidate[] = [];

  const byCanonical = new Map<string, Inventory['styles']>();
  for (const style of inventory.styles) {
    const list = byCanonical.get(style.normalized.canonical) ?? [];
    list.push(style);
    byCanonical.set(style.normalized.canonical, list);
  }
  for (const [canonical, styles] of [...byCanonical.entries()].sort()) {
    if (styles.length < 2) continue;
    candidates.push({
      id: `candidate:token:${canonical}`,
      kind: 'TOKEN',
      status: 'CANDIDATE',
      members: styles.map((s) => s.observationId).sort(),
      evidence: { occurrenceCount: styles.length, canonical },
      conflicts: [],
      unresolved: ['Semantic name requires a human decision'],
      observationRefs: styles.map((s) => s.observationId).sort(),
      origin: 'deterministic',
    });
  }

  const nearPairs: Array<[string, string]> = [];
  for (let i = 0; i < inventory.styles.length; i += 1) {
    for (let j = i + 1; j < inventory.styles.length; j += 1) {
      const a = inventory.styles[i];
      const b = inventory.styles[j];
      if (stylesAreNear(a.normalized, b.normalized) && !stylesAreExact(a.normalized, b.normalized)) {
        nearPairs.push([a.observationId, b.observationId]);
      }
    }
  }
  if (nearPairs.length > 0) {
    candidates.push({
      id: 'candidate:token:near-colors',
      kind: 'TOKEN',
      status: 'CANDIDATE',
      members: [...new Set(nearPairs.flat())].sort(),
      evidence: { nearPairCount: nearPairs.length },
      conflicts: [{ kind: 'NEAR_TOKEN', values: nearPairs }],
      unresolved: ['Near-equivalent colors must not merge automatically'],
      observationRefs: [...new Set(nearPairs.flat())].sort(),
      origin: 'deterministic',
    });
  }

  const buttons = inventory.components.filter((c) => {
    const selector = (c.extensions.angular as { selector?: string } | undefined)?.selector ?? c.id;
    return selector.includes('button') || c.title.toLowerCase().includes('button');
  });
  if (buttons.length >= 2) {
    const propSets = buttons.map((c) => propertyNames(inventory, c.id));
    const observedValues = [...new Set(buttons.flatMap((c) =>
      (c.properties.find((p) => p.name === 'appearance')?.enumeratedValues ?? []),
    ))];
    const usageCounts: Record<string, number> = {};
    for (const button of buttons) {
      usageCounts[button.id] = inventory.usages.filter((u) => u.componentId === button.id).length;
    }
    const eventNames = [...new Set(buttons.flatMap((c) => c.events.map((e) => e.name)))];
    const conflicts = [];
    if (eventNames.length > 1) {
      conflicts.push({ kind: 'INCONSISTENT_EVENT_NAME', values: eventNames });
    }
    if (observedValues.includes('tertiary')) {
      conflicts.push({ kind: 'CODE_ONLY_STATE', value: 'tertiary' });
    }
    candidates.push({
      id: 'candidate:component:button-family',
      kind: 'COMPONENT',
      status: 'CANDIDATE',
      members: buttons.map((b) => b.id).sort(),
      evidence: {
        usageCounts,
        similarApi: propSets,
        stories: inventory.renderCases.filter((r) => buttons.some((b) => b.id === r.componentId)).length,
      },
      candidateProperties: {
        appearance: { observedValues },
      },
      conflicts,
      unresolved: observedValues.includes('tertiary') ? ['Should tertiary remain supported?'] : [],
      observationRefs: buttons.map((b) => b.observationId).sort(),
      origin: 'deterministic',
    });
  }

  const composites = inventory.components.filter((c) =>
    inventory.usages.some((u) => u.fromId === c.id && u.kind === 'composed'),
  );
  if (composites.length > 0 && buttons.length > 0) {
    candidates.push({
      id: 'candidate:component:card-family',
      kind: 'COMPONENT',
      status: 'CANDIDATE',
      members: composites.map((c) => c.id).sort(),
      evidence: { dependsOn: buttons.map((b) => b.id) },
      conflicts: [],
      unresolved: [],
      observationRefs: composites.map((c) => c.observationId).sort(),
      origin: 'deterministic',
    });
  }

  const combinations = new Set(
    inventory.usages
      .filter((u) => u.propertyValues)
      .map((u) => JSON.stringify(u.propertyValues)),
  );
  if (combinations.size > variantSetLimit) {
    throw new BootstrapError(
      'VARIANT_SET_TOO_LARGE',
      `Observed ${combinations.size} combinations; limit is ${variantSetLimit}`,
      { count: combinations.size, variantSetLimit },
    );
  }

  candidates.sort((a, b) => a.id.localeCompare(b.id));
  return { schemaVersion: SIDECAR_SCHEMA_VERSION, candidates };
}

export async function runAnalyze(options: AnalyzeOptions): Promise<CandidateFile> {
  const paths = resolveWorkspace(options.workspace);
  const inventory = await loadInventory(paths);
  const file = analyzeInventory(inventory, options.variantSetLimit);
  await saveCandidateFile(paths.deterministicCandidates, file);
  return file;
}
