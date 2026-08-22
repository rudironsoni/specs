import type { BindingFile } from '../../schema/types.js';
import { emptyBindingFile } from '../../workspace.js';
import { codeConnectTemplate } from '../codeConnect.js';
import { createStyleAdapter } from '../harvestStyles.js';
import { createHarnessRenderer } from '../harnessRenderer.js';
import { planTextRewrite } from '../rewriteText.js';
import type { PlatformPack, RewriteAdapter } from '../types.js';
import { swiftCodeModel, SWIFT_EXTRACTOR, SWIFT_EXTRACTOR_VERSION } from './codeModel.js';
import { swiftRenderCases } from './renderCases.js';
import { swiftUsage } from './usage.js';

function rewrite(bindings: BindingFile): RewriteAdapter {
  return {
    async plan(context) {
      return planTextRewrite({
        sourceRoot: context.sourceRoot,
        bindings,
        platform: 'ios',
        extensions: ['.swift'],
      });
    },
  };
}

export const swiftuiPack: PlatformPack = {
  manifest: {
    platform: { id: 'swiftui', version: 1 },
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
  codeModel: swiftCodeModel,
  usage: swiftUsage,
  styles: createStyleAdapter({
    platform: 'swiftui',
    extractor: SWIFT_EXTRACTOR,
    version: SWIFT_EXTRACTOR_VERSION,
    extensions: ['.swift'],
  }),
  renderCases: swiftRenderCases,
  renderer: createHarnessRenderer(SWIFT_EXTRACTOR, SWIFT_EXTRACTOR_VERSION),
  rewrite: rewrite(emptyBindingFile()),
  codeConnect: { template: (binding) => codeConnectTemplate(binding, 'ios') },
};
