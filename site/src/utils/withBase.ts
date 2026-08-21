/** Prefix a site-root path with Astro `base`. Leave absolute URLs unchanged. */
export function withBase(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  const base = import.meta.env.BASE_URL;
  const prefix = base.endsWith('/') ? base.slice(0, -1) : base;
  if (!prefix) return path;
  if (path === prefix || path.startsWith(`${prefix}/`)) return path;
  return `${prefix}${path}`;
}
