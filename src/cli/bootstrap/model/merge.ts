import type { Inventory } from '../schema/types.js';
import { redact } from '../redact.js';

function byId<T extends { observationId?: string; id?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const left = a.observationId ?? a.id ?? '';
    const right = b.observationId ?? b.id ?? '';
    return left.localeCompare(right);
  });
}

export function mergeInventory(base: Inventory, extra: Inventory): Inventory {
  const merged: Inventory = {
    schemaVersion: 1,
    workspace: extra.workspace.revision ? extra.workspace : base.workspace,
    sources: [...base.sources, ...extra.sources].sort((a, b) =>
      `${a.platform}:${a.extractor}`.localeCompare(`${b.platform}:${b.extractor}`),
    ),
    components: byId([...base.components, ...extra.components]),
    usages: byId([...base.usages, ...extra.usages]),
    styles: byId([...base.styles, ...extra.styles]),
    renderCases: byId([...base.renderCases, ...extra.renderCases]),
    documents: byId([...base.documents, ...extra.documents]),
    figmaAssets: byId([...base.figmaAssets, ...extra.figmaAssets]),
    failures: [...base.failures, ...extra.failures].sort((a, b) => a.code.localeCompare(b.code) || a.message.localeCompare(b.message)),
    aliases: [...base.aliases, ...extra.aliases].sort((a, b) => a.from.localeCompare(b.from)),
  };
  return redact(merged) as Inventory;
}

export function sortInventory(inventory: Inventory): Inventory {
  return mergeInventory(
    {
      ...inventory,
      sources: [],
      components: [],
      usages: [],
      styles: [],
      renderCases: [],
      documents: [],
      figmaAssets: [],
      failures: [],
      aliases: [],
    },
    inventory,
  );
}
