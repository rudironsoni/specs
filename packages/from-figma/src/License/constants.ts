export const FREE = 'FREE';
export const PRO = 'PRO';
export const _E = 'ENTERPRISE';
export const _P = 'PARTNER';

export const TIERS: Record<string, number> = {
  FREE: 0,
  PRO: 1,
  ENTERPRISE: 2,
  PARTNER: 3,
};

export function tierForLevel(level: string): number {
  return TIERS[level] ?? 0;
}

export const LICENSING = {
  get ENVIRONMENT(): 'SANDBOX' | 'PRODUCTION' {
    return process.env.SPECS_LICENSE_ENV === 'SANDBOX' ? 'SANDBOX' : 'PRODUCTION';
  },
  get PROXY_URL(): string {
    return process.env.SPECS_LICENSE_PROXY_URL ?? '';
  },
  get STORE_URL(): string {
    return process.env.SPECS_LICENSE_STORE_URL ?? '';
  },
};
