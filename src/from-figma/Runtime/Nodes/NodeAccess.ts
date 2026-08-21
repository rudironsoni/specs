/**
 * Resolve an INSTANCE node's main-component id across runtimes.
 * REST nodes expose `componentId`. Plugin nodes expose getMainComponentAsync().
 */
export async function resolveComponentId(node: unknown): Promise<string | undefined> {
  if (!node || typeof node !== 'object') return undefined;
  const record = node as {
    componentId?: unknown;
    getMainComponentAsync?: () => Promise<{ id?: string } | null>;
  };
  if (typeof record.componentId === 'string' && record.componentId.length > 0) {
    return record.componentId;
  }
  if (typeof record.getMainComponentAsync === 'function') {
    const main = await record.getMainComponentAsync();
    return main?.id;
  }
  return undefined;
}
