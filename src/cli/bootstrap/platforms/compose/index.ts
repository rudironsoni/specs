import type { BindingFile } from '../../schema/types.js';
import { emptyBindingFile } from '../../workspace.js';
import { codeConnectTemplate } from '../codeConnect.js';
import { createStyleAdapter } from '../harvestStyles.js';
import { createHarnessRenderer } from '../harnessRenderer.js';
import { planTextRewrite } from '../rewriteText.js';
import type { PlatformPack, RewriteAdapter } from '../types.js';
import { composeCodeModel, COMPOSE_EXTRACTOR, COMPOSE_EXTRACTOR_VERSION } from './codeModel.js';
import { composeRenderCases } from './renderCases.js';
import { composeUsage } from './usage.js';

function rewrite(bindings: BindingFile): RewriteAdapter {
  return {
    async plan(context) {
      return planTextRewrite({
        sourceRoot: context.sourceRoot,
        bindings,
        platform: 'android',
        extensions: ['.kt'],
      });
    },
  };
}

export const composePack: PlatformPack = {
  manifest: {
    platform: { id: 'compose', version: 1 },
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
  codeModel: composeCodeModel,
  usage: composeUsage,
  styles: createStyleAdapter({
    platform: 'android',
    extractor: COMPOSE_EXTRACTOR,
    version: COMPOSE_EXTRACTOR_VERSION,
    extensions: ['.kt'],
  }),
  renderCases: composeRenderCases,
  renderer: createHarnessRenderer(COMPOSE_EXTRACTOR, COMPOSE_EXTRACTOR_VERSION),
  rewrite: rewrite(emptyBindingFile()),
  codeConnect: { template: (binding) => codeConnectTemplate(binding, 'android') },
};
