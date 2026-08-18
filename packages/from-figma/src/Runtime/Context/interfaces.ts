import type { FigmaFoundations } from '../Foundations/interfaces.js';
import type { FigmaNodes } from '../Nodes/interfaces.js';
import type { ProgressCoordinator } from '../../Progress/ProgressCoordinator.js';

export type RuntimeEnvironment = 'PLUGIN' | 'REST';

export interface ProcessingContext {
  foundations?: FigmaFoundations;
  nodes?: FigmaNodes;
  runtime?: RuntimeEnvironment;
  author?: string;
  coordinator?: ProgressCoordinator;
  generator?: {
    name: string;
    version: string;
    url: string;
  };
}
