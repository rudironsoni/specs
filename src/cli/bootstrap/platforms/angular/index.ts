import type { PlatformPack } from '../types.js';
import { angularCodeModel } from './codeModel.js';
import { angularUsage } from './usage.js';
import { angularStyles } from './styles.js';
import { angularRenderCases } from './renderCases.js';
import { fixtureRenderer } from './renderer.js';
import { createAngularRewrite } from './rewrite.js';
import { emptyBindingFile } from '../../workspace.js';
import { angularCodeConnectTemplate } from './codeConnect.js';

export const angularPack: PlatformPack = {
  manifest: {
    platform: { id: 'angular', version: 1 },
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
  codeModel: angularCodeModel,
  usage: angularUsage,
  styles: angularStyles,
  renderCases: angularRenderCases,
  renderer: fixtureRenderer,
  rewrite: createAngularRewrite(emptyBindingFile()),
  codeConnect: { template: angularCodeConnectTemplate },
};

export { angularCodeConnectTemplate } from './codeConnect.js';
export { planAngularRewrite } from './rewrite.js';
export { fixtureRenderer, playwrightRenderer, createPlaywrightRenderer } from './renderer.js';
