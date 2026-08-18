import type { FigmaFoundations } from '../Foundations/interfaces.js';
import type { FigmaNodes } from '../Nodes/interfaces.js';
import type { LicenseResult } from '../../License/types.js';
import type { ProgressCoordinator } from '../../Progress/ProgressCoordinator.js';

export type RuntimeEnvironment = 'PLUGIN' | 'REST';

export interface ProcessingContext {
  foundations?: FigmaFoundations;
  nodes?: FigmaNodes;
  runtime?: RuntimeEnvironment;
  author?: string;
  license?: LicenseResult;
  coordinator?: ProgressCoordinator;
  generator?: {
    name: string;
    version: string;
    url: string;
  };
}

export const PRO = 1;
export const ENTERPRISE = 2;
export const PARTNER = 3;

export function entitled(context: ProcessingContext | undefined, requiredTier: number): boolean {
  const tier = context?.license?.tier ?? 0;
  return tier >= requiredTier;
}
