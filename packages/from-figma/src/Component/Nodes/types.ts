import type { RestBaseNode } from '../../Adapters/RestApi/RestBaseNode.js';

/**
 * Runtime node shape used by the engine.
 * REST adapters implement the plugin-like surface the rest of the pipeline reads.
 */
export type SpecableNode = RestBaseNode;
export type FigmaElementNode = RestBaseNode;
export type FigmaContainerNode = RestBaseNode;
export type FigmaCorneredNode = RestBaseNode;
