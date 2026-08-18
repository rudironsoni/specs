export interface LayoutNode {
  name: string;
  children: LayoutNode[];
}

export interface LayoutTree {
  root: LayoutNode;
}

export type LayoutSerializedNode = string | {
  [nodeName: string]: LayoutSerializedNode[];
};

export type LayoutData = LayoutSerializedNode[];

export interface LayoutComparison {
  equal: boolean;
  added: string[];
  removed: string[];
  moved: Array<{
    name: string;
    fromPath: string[];
    toPath: string[];
  }>;
  orderChanges: Array<{
    parent: string;
    previousOrder: string[];
    currentOrder: string[];
  }>;
}
