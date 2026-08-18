import type { ResolvedConfig, Component as SchemaComponent } from '@rudironsoni/specs-schema';
import type { StylesMap, VariablesMap, CollectionsMap } from '../Runtime/Foundations/FigmaRESTMaps.js';
import { Component } from '../Component/Component.js';

export type ComponentsData = {
  name: string;
  component: SchemaComponent;
} | {
  name: string;
  error: string;
};

export type ProgressEvent = {
  component: string;
  index: number;
  total: number;
  status: 'processing' | 'success' | 'error';
  error?: string;
};

export interface RestFoundations {
  styles: StylesMap;
  variables: VariablesMap;
  collections: CollectionsMap;
  author?: string;
  generator?: {
    name: string;
    version: string;
    url: string;
  };
  coordinator?: import('../Progress/ProgressCoordinator.js').ProgressCoordinator;
}

export class Components {
  static async fromRestApi(
    componentIds: string[],
    figmaFileJson: unknown,
    config: ResolvedConfig,
    foundations: RestFoundations,
    onProgress: (event: ProgressEvent) => void,
  ): Promise<ComponentsData[]> {
    const results: ComponentsData[] = [];
    const total = componentIds.length;

    for (const [index, componentId] of componentIds.entries()) {
      onProgress({ component: componentId, index, total, status: 'processing' });
      try {
        const component = await Component.fromRestApi(
          figmaFileJson,
          componentId,
          config,
          foundations,
        );
        results.push({ name: componentId, component: component.json() });
        onProgress({ component: componentId, index, total, status: 'success' });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ name: componentId, error: message });
        onProgress({ component: componentId, index, total, status: 'error', error: message });
      }
    }

    return results;
  }

  static async fromPlugin(
    node: unknown,
    config: ResolvedConfig,
    options?: { author?: string },
  ): Promise<ComponentsData> {
    try {
      const component = await Component.fromPlugin(node, config, options);
      return { name: component.name, component: component.json() };
    } catch (error) {
      return { name: 'unknown', error: error instanceof Error ? error.message : String(error) };
    }
  }
}
