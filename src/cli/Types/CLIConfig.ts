/**
 * CLI configuration structure
 */

import type { ResolvedConfig } from '@rudironsoni/specs-schema';
import type { OutputConfig } from './OutputConfig.js';

export type CliSourceDataKind = 'file' | 'variables' | 'styles';

export interface CliSourceConfig {
  key: string;
  data: CliSourceDataKind[];
}

export interface BootstrapCliConfig {
  workspace?: string;
  variantSetLimit?: number;
  captureHarness?: string;
}

export interface CLIConfig {
  dataDirectory?: string;
  outputDirectory?: string;
  author?: string;
  config: ResolvedConfig;
  output?: OutputConfig;
  sources?: Record<string, CliSourceConfig>;
  bootstrap?: BootstrapCliConfig;
}
