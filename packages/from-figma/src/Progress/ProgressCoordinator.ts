import { CHUNK_SIZE, CHUNK_THRESHOLD, type ChunkInfo, type ProgressCallback, type ProgressState } from './Progress.js';
import type { PhaseConfiguration } from './PhaseConfiguration.js';

export class ProgressCoordinator {
  private currentStep = 0;
  private currentPhase = '';
  private totalSteps: number;
  private allowedPhases: Set<string> | null;
  private callback?: ProgressCallback;

  constructor(config: PhaseConfiguration | number = 4, callback?: ProgressCallback) {
    if (typeof config === 'number') {
      this.totalSteps = config;
      this.allowedPhases = null;
    } else {
      this.totalSteps = config.totalSteps;
      this.allowedPhases = new Set(config.phases);
    }
    this.callback = callback;
  }

  async notifyPhase(phase: string, chunkInfo?: ChunkInfo): Promise<void> {
    if (this.allowedPhases && !this.allowedPhases.has(phase)) return;
    if (phase !== this.currentPhase) {
      this.currentStep += 1;
      this.currentPhase = phase;
    }
    const state: ProgressState = {
      phase,
      currentStep: this.currentStep,
      totalSteps: this.totalSteps,
      ...(chunkInfo ? { chunkInfo } : {}),
    };
    this.callback?.(state);
  }

  async forEachChunk<T>(
    items: T[],
    phase: string,
    processor: (chunk: T[]) => Promise<void>,
  ): Promise<void> {
    if (items.length <= CHUNK_THRESHOLD) {
      await this.notifyPhase(phase);
      await processor(items);
      return;
    }
    for (let index = 0; index < items.length; index += CHUNK_SIZE) {
      const end = Math.min(index + CHUNK_SIZE, items.length);
      await this.notifyPhase(phase, { start: index + 1, end });
      await processor(items.slice(index, end));
    }
  }

  getCurrentStep(): number {
    return this.currentStep;
  }
}
