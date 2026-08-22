const SENSITIVE_KEY = /^(authorization|cookie|set-cookie|token|access_token|refresh_token|session|sessionid|password|secret|api[_-]?key)$/i;
const SENSITIVE_VALUE = /(bearer\s+[a-z0-9._-]+|eyJ[a-z0-9_-]{10,}\.[a-z0-9._-]+)/i;

export const REDACTED = '[REDACTED]';

export function redact(value: unknown): unknown {
  if (typeof value === 'string') {
    return SENSITIVE_VALUE.test(value) ? REDACTED : value;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(entry);
    }
    return out;
  }
  return value;
}
