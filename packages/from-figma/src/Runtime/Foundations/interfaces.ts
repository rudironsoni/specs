export interface VariableDefinition {
  id: string;
  name: string;
  key: string;
  variableCollectionId: string;
  resolvedType: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR';
  valuesByMode: Record<string, unknown>;
  remote: boolean;
  description?: string;
  scopes?: string[];
  codeSyntax?: {
    WEB?: string;
    ANDROID?: string;
    iOS?: string;
  };
  $custom?: Record<string, unknown>;
}

export interface VariableCollection {
  id: string;
  name: string;
  key: string;
  modes: Array<{
    modeId: string;
    name: string;
  }>;
  defaultModeId: string;
  variableIds: string[];
  remote: boolean;
}

export interface StyleDefinition {
  id: string;
  name: string;
  type: 'FILL' | 'STROKE' | 'TEXT' | 'EFFECT' | 'GRID' | 'PAINT';
  description?: string;
  $custom?: Record<string, unknown>;
  [key: string]: unknown;
}

export type CodeSyntaxPlatform = 'WEB' | 'ANDROID' | 'iOS';

export interface FigmaFoundations {
  getStyle(styleId: string): Promise<StyleDefinition | null>;
  getVariable(variableId: string): Promise<VariableDefinition | null>;
  getCollection(collectionId: string): Promise<VariableCollection | null>;
  getVariableName(variableId: string, platform: CodeSyntaxPlatform | 'DEFAULT'): Promise<string | null>;
  getCollectionName(variableId: string): Promise<string | null>;
}
