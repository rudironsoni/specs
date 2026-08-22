import { angularPack } from './angular/index.js';
import { reactPack } from './react/index.js';
import { vuePack } from './vue/index.js';
import { swiftuiPack } from './swiftui/index.js';
import { composePack } from './compose/index.js';
import type { PlatformPack, PlatformPackId } from './types.js';
import { BootstrapError } from '../errors.js';

const PACKS: Record<PlatformPackId, PlatformPack> = {
  angular: angularPack,
  react: reactPack,
  vue: vuePack,
  swiftui: swiftuiPack,
  compose: composePack,
};

export function getPlatformPack(id: string): PlatformPack {
  const pack = PACKS[id as PlatformPackId];
  if (!pack) {
    throw new BootstrapError('PLATFORM_NOT_DETECTED', `Unknown platform pack: ${id}`, { id });
  }
  return pack;
}

export function allPlatformPacks(): PlatformPack[] {
  return Object.values(PACKS);
}

export { angularPack, reactPack, vuePack, swiftuiPack, composePack };
export type { PlatformPack, PlatformPackId, CapabilityManifest } from './types.js';
