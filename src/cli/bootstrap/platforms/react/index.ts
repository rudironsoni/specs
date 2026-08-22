import type { BindingFile } from '../../schema/types.js';
import { emptyBindingFile } from '../../workspace.js';
import { codeConnectTemplate } from '../codeConnect.js';
import { createStyleAdapter } from '../harvestStyles.js';
import { createHarnessRenderer } from '../harnessRenderer.js';
import { planTextRewrite } from '../rewriteText.js';
import type { PlatformPack, RewriteAdapter } from '../types.js';
import { reactCodeModel, REACT_EXTRACTOR, REACT_EXTRACTOR_VERSION } from './codeModel.js';
import { reactRenderCases } from './renderCases.js';
import { reactUsage } from './usage.js';

function rewrite(bindings: BindingFile): RewriteAdapter {
  return {
    async plan(context) {
      return planTextRewrite({
        sourceRoot: context.sourceRoot,
        bindings,
        platform: 'react',
        extensions: ['.tsx', '.ts', '.jsx', '.js'],
      });
    },
  };
}

export const reactPack: PlatformPack = {
  manifest: {
    platform: { id: 'react', version: 1 },
    capabilities: {
      api: 'SUPPORTED',
      usage: 'SUPPORTED',
      styles: 'SUPPORTED',
      renderCases: 'SUPPORTED',
      rendering: 'CONDITIONAL',
      rewrite: 'SUPPORTED',
      codeConnect: 'TEMPLATE',
    },
  },
  codeModel: reactCodeModel,
  usage: reactUsage,
  styles: createStyleAdapter({
    platform: 'react',
    extractor: REACT_EXTRACTOR,
    version: REACT_EXTRACTOR_VERSION,
    extensions: ['.css', '.tsx', '.ts'],
  }),
  renderCases: reactRenderCases,
  renderer: createHarnessRenderer(REACT_EXTRACTOR, REACT_EXTRACTOR_VERSION),
  rewrite: rewrite(emptyBindingFile()),
  codeConnect: { template: (binding) => codeConnectTemplate(binding, 'react') },
};
