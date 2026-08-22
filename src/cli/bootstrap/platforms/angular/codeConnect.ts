import type { Binding } from '../../schema/types.js';

export function angularCodeConnectTemplate(binding: Binding): { fileName: string; content: string } {
  const impl = binding.implementations.angular;
  const symbol = impl?.symbol ?? 'Component';
  const selector = impl?.selector ?? symbol;
  const mappings = binding.propertyMappings.filter((m) => m.platform === 'angular');
  const props = mappings
    .map((mapping) => {
      return `    ${mapping.platformProperty}={${'${'}instance.getProperties()['${mapping.contractProperty}']}}`;
    })
    .join('\n');
  const content = `// url=https://www.figma.com/file/${binding.figma?.fileKey ?? 'FILE'}/${binding.component}?node-id=${binding.figma?.componentKey ?? 'NODE'}
import figma from 'figma'

const instance = figma.selectedInstance

export default {
  example: figma.code\`
<${selector}
${props || '    '}
>
</${selector}>
\`,
}
`;
  return { fileName: `${binding.component.split(':').pop() ?? symbol}.figma.ts`, content };
}
