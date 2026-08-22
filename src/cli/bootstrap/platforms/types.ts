import type { Binding, CapabilityLevel, Inventory } from '../schema/types.js';

export type PlatformPackId = 'angular' | 'react' | 'vue' | 'swiftui' | 'compose';

export interface CapabilityManifest {
  platform: {
    id: PlatformPackId;
    version: number;
  };
  capabilities: {
    api: CapabilityLevel;
    usage: CapabilityLevel;
    styles: CapabilityLevel;
    renderCases: CapabilityLevel;
    rendering: CapabilityLevel;
    rewrite: CapabilityLevel;
    codeConnect: CapabilityLevel | 'TEMPLATE';
  };
}

export interface ScanContext {
  sourceRoot: string;
  repository: string;
  revision: string;
  packageName: string;
  workspaceRoot: string;
}

export interface ScanContribution {
  inventory: Inventory;
}

export interface CodeModelAdapter {
  extract(context: ScanContext): Promise<ScanContribution>;
}

export interface UsageAdapter {
  extract(context: ScanContext, inventory: Inventory): Promise<ScanContribution>;
}

export interface StyleAdapter {
  extract(context: ScanContext, inventory: Inventory): Promise<ScanContribution>;
}

export interface RenderCaseAdapter {
  extract(context: ScanContext, inventory: Inventory): Promise<ScanContribution>;
}

export interface CaptureContext extends ScanContext {
  harness?: string;
}

export interface RendererAdapter {
  capture(context: CaptureContext, inventory: Inventory): Promise<ScanContribution>;
}

export interface RewritePlan {
  files: Array<{
    path: string;
    description: string;
    warningCode?: string;
    hunks: Array<{ before: string; after: string }>;
  }>;
}

export interface RewriteAdapter {
  plan(context: ScanContext, inventory: Inventory): Promise<RewritePlan>;
}

export interface CodeConnectAdapter {
  template(binding: Binding): { fileName: string; content: string };
}

export interface PlatformPack {
  manifest: CapabilityManifest;
  codeModel?: CodeModelAdapter;
  usage?: UsageAdapter;
  styles?: StyleAdapter;
  renderCases?: RenderCaseAdapter;
  renderer?: RendererAdapter;
  rewrite?: RewriteAdapter;
  codeConnect?: CodeConnectAdapter;
}

export type CommandCapability = keyof CapabilityManifest['capabilities'];
