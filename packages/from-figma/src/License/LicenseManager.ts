import type { LicenseInput, LicenseResult, LicenseRuntime, LicenseState } from './types.js';
import { FREE, descriptionFor, freeLicense, maskKey, tierForLevel } from './types.js';
import { callProxy } from './ProxyClient.js';

const LEVEL_BY_TIER: Record<number, string> = {
  0: FREE,
  1: 'PRO',
  2: 'ENTERPRISE',
  3: 'PARTNER',
};

export async function resolve(input: LicenseInput | undefined, runtime: LicenseRuntime): Promise<LicenseResult> {
  try {
    if (runtime === 'plugin') {
      if (input && 'state' in input) return fromState(input.state);
      return freeLicense();
    }
    if (!input || !('key' in input) || !input.key) return freeLicense();
    const verdict = await callProxy(input.key, runtime);
    return fromProxy(verdict, input.key);
  } catch {
    const masked = input && 'key' in input ? maskKey(input.key) : undefined;
    return {
      state: { status: 'network-error' },
      isLicensed: false,
      description: descriptionFor({ status: 'network-error' }, masked),
      maskedKey: masked,
      level: FREE,
      tier: 0,
    };
  }
}

function fromProxy(verdict: { response: number; status: string; detail: string }, key: string): LicenseResult {
  const masked = maskKey(key);
  if (verdict.status === 'network-error') {
    return {
      state: { status: 'network-error' },
      isLicensed: false,
      description: verdict.detail,
      maskedKey: masked,
      level: FREE,
      tier: 0,
    };
  }
  if (verdict.response <= 0 || verdict.status === 'invalid' || verdict.status === 'none') {
    const state: LicenseState = verdict.status === 'none' ? { status: 'none' } : { status: 'invalid' };
    return {
      state,
      isLicensed: false,
      description: verdict.detail || descriptionFor(state, masked),
      maskedKey: masked,
      level: FREE,
      tier: 0,
    };
  }
  const level = LEVEL_BY_TIER[verdict.response] ?? 'PRO';
  return {
    state: { status: 'active', expiresAt: null },
    isLicensed: true,
    description: verdict.detail || descriptionFor({ status: 'active', expiresAt: null }, masked),
    maskedKey: masked,
    level,
    tier: tierForLevel(level),
  };
}

function fromState(state: LicenseState): LicenseResult {
  const isLicensed = state.status === 'active' || state.status === 'unlocked';
  const level = state.status === 'unlocked' ? 'ENTERPRISE' : isLicensed ? 'PRO' : FREE;
  return {
    state,
    isLicensed,
    description: descriptionFor(state),
    level,
    tier: tierForLevel(level),
  };
}

export { maskKey, descriptionFor };
