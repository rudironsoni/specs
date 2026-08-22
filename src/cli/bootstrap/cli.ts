import { BootstrapError, formatFailure } from './errors.js';

export const BOOTSTRAP_ERROR = 2;

export async function withBootstrap(example: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    if (error instanceof BootstrapError) {
      console.error(formatFailure(error, example));
      process.exit(BOOTSTRAP_ERROR);
    }
    throw error;
  }
}
