/**
 * License types for the clean-room engine.
 * Local license types. No remote checkout or paid-tier gate.
 */

export type LicenseState =
  | { status: 'none' }
  | { status: 'validating' }
  | { status: 'active'; expiresAt: string | null; organizationName?: string }
  | { status: 'usage-limit-reached'; usageCount: number; usageLimit: number }
  | { status: 'invalid' }
  | { status: 'wrong-runtime' }
  | { status: 'expired'; expiresAt: string }
  | { status: 'removed' }
  | { status: 'network-error' }
  | { status: 'error'; message: string }
  | { status: 'unlocked' };

export type LicenseStatusCode = LicenseState['status'];
export type LicenseRuntime = 'plugin' | 'cli';

export type PluginLicenseInput = {
  state: LicenseState;
};

export type RestLicenseInput = {
  key: string;
};

export type LicenseInput = PluginLicenseInput | RestLicenseInput;

export type LicenseResult = {
  state: LicenseState;
  isLicensed: boolean;
  description: string;
  maskedKey?: string;
  level: string;
  tier: number;
};

import { FREE } from './constants.js';

export { FREE, PRO, TIERS, tierForLevel } from './constants.js';

export function freeLicense(): LicenseResult {
  return {
    state: { status: 'none' },
    isLicensed: false,
    description: descriptionFor({ status: 'none' }),
    level: FREE,
    tier: 0,
  };
}

export function maskKey(key: string): string {
  if (key.length <= 3) return '***';
  return `***${key.slice(-3)}`;
}

export function descriptionFor(state: LicenseState, maskedKey?: string): string {
  const keyNote = maskedKey ? ` (${maskedKey})` : '';
  switch (state.status) {
    case 'none':
      return 'No license supplied. Free-tier output.';
    case 'validating':
      return 'License is validating.';
    case 'active':
      return `License is active${keyNote}.`;
    case 'usage-limit-reached':
      return `License usage limit reached (${state.usageCount}/${state.usageLimit}).`;
    case 'invalid':
      return `License key is invalid${keyNote}.`;
    case 'wrong-runtime':
      return `License does not cover this runtime${keyNote}.`;
    case 'expired':
      return `License expired at ${state.expiresAt}${keyNote}.`;
    case 'removed':
      return `License was removed${keyNote}.`;
    case 'network-error':
      return `License proxy network error${keyNote}.`;
    case 'error':
      return state.message;
    case 'unlocked':
      return 'License is unlocked.';
  }
}
