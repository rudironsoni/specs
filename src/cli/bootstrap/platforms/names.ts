import type { Inventory, ObservedComponent } from '../schema/types.js';
import type { PlatformPackId } from './types.js';

export function titleFromIdentity(id: string): string {
  const last = id.split(':').pop() ?? id;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

export function kebab(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export function bindingPlatformForPack(packId: string): string {
  if (packId === 'swiftui') return 'ios';
  if (packId === 'compose') return 'android';
  return packId;
}

export function packIdFromBindingPlatform(platform: string): PlatformPackId {
  if (platform === 'ios') return 'swiftui';
  if (platform === 'android') return 'compose';
  return platform as PlatformPackId;
}

export function packIdFromInventory(inventory: Inventory): PlatformPackId {
  const platform = inventory.sources.find((source) => source.kind === 'code')?.platform;
  if (platform === 'android') return 'compose';
  if (platform === 'ios') return 'swiftui';
  if (platform === 'react' || platform === 'vue' || platform === 'swiftui' || platform === 'compose') {
    return platform;
  }
  return 'angular';
}

export function bindingPlatformFromInventory(inventory: Inventory): string {
  return bindingPlatformForPack(packIdFromInventory(inventory));
}

export function memberPlatformProperty(member: ObservedComponent, platform: string): string {
  if (platform === 'angular') {
    return (member.extensions.angular as { selector?: string } | undefined)?.selector ?? member.id;
  }
  if (platform === 'react') {
    return (member.extensions.react as { exportName?: string } | undefined)?.exportName ?? member.title;
  }
  if (platform === 'vue') {
    return (member.extensions.vue as { component?: string } | undefined)?.component ?? member.title;
  }
  if (platform === 'ios') {
    return (member.extensions.swiftui as { symbol?: string } | undefined)?.symbol ?? member.title;
  }
  if (platform === 'android') {
    return (member.extensions.compose as { symbol?: string } | undefined)?.symbol ?? member.title;
  }
  return member.title;
}

export function rewriteExtensions(packId: string): string[] {
  switch (packId) {
    case 'react':
      return ['.tsx', '.ts', '.jsx', '.js'];
    case 'vue':
      return ['.vue', '.ts'];
    case 'swiftui':
      return ['.swift'];
    case 'compose':
      return ['.kt'];
    default:
      return ['.ts', '.html'];
  }
}
