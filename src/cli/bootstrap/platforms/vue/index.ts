import type { BindingFile } from '../../schema/types.js';
import { emptyBindingFile } from '../../workspace.js';
import { codeConnectTemplate } from '../codeConnect.js';
import { createStyleAdapter } from '../harvestStyles.js';
import { createHarnessRenderer } from '../harnessRenderer.js';
import { planTextRewrite } from '../rewriteText.js';
import type { PlatformPack, RewriteAdapter } from '../types.js';
import { vueCodeModel, VUE_EXTRACTOR, VUE_EXTRACTOR_VERSION } from './codeModel.js';
import { vueRenderCases } from './renderCases.js';
import { vueUsage } from './usage.js';

function rewrite(bindings: BindingFile): RewriteAdapter {
  return {
    async plan(context) {
      return planTextRewrite({
        sourceRoot: context.sourceRoot,
        bindings,
        platform: 'vue',
        extensions: ['.vue', '.ts'],
      });
    },
  };
}

export const vuePack: PlatformPack = {
  manifest: {
    platform: { id: 'vue', version: 1 },
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
  codeModel: vueCodeModel,
  usage: vueUsage,
  styles: createStyleAdapter({
    platform: 'vue',
    extractor: VUE_EXTRACTOR,
    version: VUE_EXTRACTOR_VERSION,
    extensions: ['.vue', '.css'],
  }),
  renderCases: vueRenderCases,
  renderer: createHarnessRenderer(VUE_EXTRACTOR, VUE_EXTRACTOR_VERSION),
  rewrite: rewrite(emptyBindingFile()),
  codeConnect: { template: (binding) => codeConnectTemplate(binding, 'vue') },
};
