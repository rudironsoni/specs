export interface FigmaLike {
  getNodeByIdAsync?: (id: string) => Promise<unknown>;
  getNodeById?: (id: string) => unknown;
  getStyleByIdAsync?: (id: string) => Promise<unknown>;
  getStyleById?: (id: string) => unknown;
  currentPage?: { findOne?: (fn: (node: { id: string }) => boolean) => unknown };
  variables?: {
    getVariableByIdAsync?: (id: string) => Promise<unknown>;
    getVariableById?: (id: string) => unknown;
    getVariableCollectionByIdAsync?: (id: string) => Promise<unknown>;
    getVariableCollectionById?: (id: string) => unknown;
  };
}

export function getFigma(): FigmaLike | undefined {
  const value = (globalThis as { figma?: FigmaLike }).figma;
  return value;
}
