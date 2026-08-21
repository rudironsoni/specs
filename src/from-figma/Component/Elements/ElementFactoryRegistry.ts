import type { ResolvedConfig } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../Nodes/types.js';
import type { BaseElement } from './BaseElement.js';

type ElementFactoryFn = (node: FigmaElementNode, name: string, config: ResolvedConfig) => BaseElement;

let registered: ElementFactoryFn | undefined;

export function registerElementFactory(fn: ElementFactoryFn): void {
  registered = fn;
}

export function createElement(node: FigmaElementNode, name: string, config: ResolvedConfig): BaseElement {
  if (!registered) {
    throw new Error('ElementFactory is not registered');
  }
  return registered(node, name, config);
}
