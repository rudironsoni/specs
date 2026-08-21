import type { ResolvedConfig } from '@rudironsoni/specs-schema';
import type { Settings } from '../Config/types.Settings.js';
import { isSettings } from '../Config/fromSettings.js';
import { PHASE_NAMES } from './Progress.js';

export interface PhaseConfiguration {
  phases: string[];
  totalSteps: number;
  chunkablePhases: Set<string>;
}

const CHUNKABLE = new Set<string>([PHASE_NAMES.EVALUATE_VARIANTS, PHASE_NAMES.LAYER_VARIANTS]);

export function buildPhaseConfiguration(settings: Settings | ResolvedConfig): PhaseConfiguration {
  const phases: string[] = [
    PHASE_NAMES.SETUP_VARIANTS,
    PHASE_NAMES.EVALUATE_VARIANTS,
    PHASE_NAMES.LAYER_VARIANTS,
  ];

  if (isSettings(settings)) {
    if (settings.OUTPUT_DATA) phases.push(PHASE_NAMES.OUTPUT_DATA);
    if (settings.OUTPUT_ANATOMY) phases.push(PHASE_NAMES.OUTPUT_ANATOMY);
    if (settings.OUTPUT_PROPS) phases.push(PHASE_NAMES.OUTPUT_PROPS);
    if (settings.OUTPUT_LAYOUT) phases.push(PHASE_NAMES.OUTPUT_LAYOUT);
    if (settings.OUTPUT_STYLING) phases.push(PHASE_NAMES.OUTPUT_STYLING);
    if (settings.OUTPUT_MODES) phases.push(PHASE_NAMES.OUTPUT_MODES);
  } else {
    phases.push(
      PHASE_NAMES.OUTPUT_DATA,
      PHASE_NAMES.OUTPUT_ANATOMY,
      PHASE_NAMES.OUTPUT_PROPS,
      PHASE_NAMES.OUTPUT_LAYOUT,
      PHASE_NAMES.OUTPUT_STYLING,
    );
  }

  return {
    phases,
    totalSteps: phases.length,
    chunkablePhases: CHUNKABLE,
  };
}
