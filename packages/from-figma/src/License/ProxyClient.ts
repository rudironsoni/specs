import type { LicenseRuntime } from './types.js';

export interface ProxyResponse {
  response: number;
  status: string;
  detail: string;
}

export interface LicenseProxy {
  validate(key: string, runtime: LicenseRuntime): Promise<ProxyResponse>;
}

let injected: LicenseProxy | undefined;

export function setLicenseProxy(proxy: LicenseProxy | undefined): void {
  injected = proxy;
}

export function getLicenseProxy(): LicenseProxy | undefined {
  return injected;
}

/**
 * Local in-process proxy. Known keys become PRO. Unknown keys stay FREE.
 * This is a local allow-list, not a remote store.
 */
export function createLocalLicenseProxy(knownKeys: Iterable<string> = []): LicenseProxy {
  const allowed = new Set(knownKeys);
  return {
    async validate(key: string, _runtime: LicenseRuntime): Promise<ProxyResponse> {
      if (!key) {
        return { response: 0, status: 'none', detail: 'No license key supplied. Free-tier output.' };
      }
      if (allowed.has(key)) {
        return { response: 1, status: 'active', detail: 'Local license accepted.' };
      }
      return { response: 0, status: 'invalid', detail: 'License key is not in the local allow-list.' };
    },
  };
}

/**
 * Optional HTTP proxy. POST `{ key, runtime }` to `SPECS_LICENSE_PROXY_URL`
 * or the supplied URL. This is a generic HTTP client.
 */
export function createHttpLicenseProxy(url: string, fetchImpl: typeof fetch = fetch): LicenseProxy {
  return {
    async validate(key: string, runtime: LicenseRuntime): Promise<ProxyResponse> {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key, runtime }),
      });
      if (!response.ok) {
        return { response: 0, status: 'network-error', detail: `License proxy HTTP ${response.status}` };
      }
      const body = await response.json() as Partial<ProxyResponse>;
      return {
        response: typeof body.response === 'number' ? body.response : 0,
        status: typeof body.status === 'string' ? body.status : 'error',
        detail: typeof body.detail === 'string' ? body.detail : 'Unexpected license proxy payload.',
      };
    },
  };
}

export async function callProxy(key: string, runtime: LicenseRuntime): Promise<ProxyResponse> {
  const proxy = injected ?? defaultProxy();
  return proxy.validate(key, runtime);
}

function defaultProxy(): LicenseProxy {
  const url = typeof process !== 'undefined' ? process.env?.SPECS_LICENSE_PROXY_URL : undefined;
  if (url) return createHttpLicenseProxy(url);
  const keys = typeof process !== 'undefined' ? process.env?.SPECS_LICENSE_KEYS : undefined;
  return createLocalLicenseProxy((keys ?? '').split(',').map((item) => item.trim()).filter(Boolean));
}
