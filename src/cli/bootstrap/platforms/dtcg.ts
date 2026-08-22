const DTCG_SCHEMA = 'https://tr.designtokens.org/format/';

export interface DtcgToken {
  $type: string;
  $value: unknown;
  $description?: string;
}

export function nestDtcgTokens(tokens: Record<string, DtcgToken>): Record<string, unknown> {
  const root: Record<string, unknown> = { $schema: DTCG_SCHEMA };
  for (const [id, token] of Object.entries(tokens).sort(([a], [b]) => a.localeCompare(b))) {
    const parts = id.split('.').filter(Boolean);
    if (parts.length === 0) continue;
    let cursor = root;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i];
      const next = cursor[part];
      if (!next || typeof next !== 'object' || Array.isArray(next) || '$value' in (next as object)) {
        cursor[part] = {};
      }
      cursor = cursor[part] as Record<string, unknown>;
    }
    cursor[parts[parts.length - 1]] = token;
  }
  return root;
}

export { DTCG_SCHEMA };
