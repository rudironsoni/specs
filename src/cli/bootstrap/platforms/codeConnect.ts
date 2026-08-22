import type { Binding } from '../schema/types.js';

export function codeConnectTemplate(binding: Binding, platform: string): { fileName: string; content: string } {
  const impl = binding.implementations[platform];
  const symbol = impl?.symbol ?? impl?.exportName ?? 'Component';
  const tag = impl?.selector ?? symbol;
  const mappings = binding.propertyMappings.filter((m) => m.platform === platform && m.contractProperty !== 'selector');
  const props = mappings
    .map((mapping) => `    ${mapping.platformProperty}={$\{instance.getProperties()['${mapping.contractProperty}']\}}`)
    .join('\n');
  const content = `// url=https://www.figma.com/file/${binding.figma?.fileKey ?? 'FILE'}/${binding.component}?node-id=${binding.figma?.componentKey ?? 'NODE'}
import figma from 'figma'

const instance = figma.selectedInstance

export default {
  example: figma.code\`
<${tag}
${props || '    '}
>
</${tag}>
\`,
}
`;
  return {
    fileName: `${binding.component.split(':').pop() ?? symbol}.${platform}.figma.ts`,
    content,
  };
}
