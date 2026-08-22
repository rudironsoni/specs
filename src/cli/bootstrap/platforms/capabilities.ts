import { BootstrapError } from '../errors.js';
import type { CapabilityManifest, CommandCapability, PlatformPack } from './types.js';

export const COMMAND_CAPABILITIES: Record<string, CommandCapability[]> = {
  scan: ['api', 'usage', 'styles', 'renderCases'],
  capture: ['rendering'],
  migrate: ['rewrite'],
  'bindings.generate': ['codeConnect'],
};

function isAvailable(level: CapabilityManifest['capabilities'][CommandCapability]): boolean {
  return level === 'SUPPORTED' || level === 'TEMPLATE' || level === 'CONDITIONAL';
}

export function assertCommandCapabilities(pack: PlatformPack, command: string): void {
  const required = COMMAND_CAPABILITIES[command] ?? [];
  for (const capability of required) {
    const level = pack.manifest.capabilities[capability];
    if (command === 'capture' && capability === 'rendering' && level === 'CONDITIONAL') {
      continue;
    }
    if (command === 'bindings.generate' && level === 'TEMPLATE') continue;
    if (level === 'UNSUPPORTED' || !isAvailable(level)) {
      throw new BootstrapError(
        'CAPABILITY_UNAVAILABLE',
        `Platform ${pack.manifest.platform.id} does not support ${capability} for ${command}`,
        { platform: pack.manifest.platform.id, capability, command, level },
      );
    }
  }
}

export function adapterPresent(pack: PlatformPack, capability: CommandCapability): boolean {
  switch (capability) {
    case 'api': return Boolean(pack.codeModel);
    case 'usage': return Boolean(pack.usage);
    case 'styles': return Boolean(pack.styles);
    case 'renderCases': return Boolean(pack.renderCases);
    case 'rendering': return Boolean(pack.renderer);
    case 'rewrite': return Boolean(pack.rewrite);
    case 'codeConnect': return Boolean(pack.codeConnect);
    default: {
      const _exhaustive: never = capability;
      return _exhaustive;
    }
  }
}
