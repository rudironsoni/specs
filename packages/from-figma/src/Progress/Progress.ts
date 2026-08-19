export interface ProgressState {
  phase: string;
  currentStep: number;
  totalSteps: number;
  chunkInfo?: ChunkInfo;
}

export interface ChunkInfo {
  start: number;
  end: number;
}

export type ProgressCallback = (state: ProgressState) => void;

export const PHASE_NAMES = {
  SETUP_VARIANTS: 'Setting up variants',
  EVALUATE_VARIANTS: 'Evaluating variants',
  LAYER_VARIANTS: 'Layering variants',
  OUTPUT_DATA: 'Outputting data',
  OUTPUT_ANATOMY: 'Outputting Anatomy',
  OUTPUT_PROPS: 'Outputting Props',
  OUTPUT_LAYOUT: 'Outputting Layout',
  OUTPUT_STYLING: 'Outputting Styling',
  OUTPUT_MODES: 'Outputting Modes',
} as const;

export const CHUNK_THRESHOLD = 10;
export const CHUNK_SIZE = 10;
