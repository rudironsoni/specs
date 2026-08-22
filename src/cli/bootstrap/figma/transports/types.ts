import type { FigmaPlan } from '../../schema/types.js';

export interface MaterializeDiff {
  creates: string[];
  updates: string[];
  deletes: string[];
}

export interface FigmaTransport {
  id: string;
  digest(): string;
  dryRun(plan: FigmaPlan): MaterializeDiff;
  apply(plan: FigmaPlan): MaterializeDiff | Promise<MaterializeDiff>;
  exportRest(): unknown;
}

export const SPECS_PLUGIN_NAMESPACE = 'specs.bootstrap';
