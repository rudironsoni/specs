/**
 * Map types for foundations data passed into Components.fromRestApi().
 */

export type StylesMap = Map<string, {
  id: string;
  name: string;
  type: 'FILL' | 'STROKE' | 'TEXT' | 'EFFECT' | 'GRID' | 'PAINT';
  description?: string;
  [key: string]: unknown;
}>;

export type VariablesMap = Map<string, {
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
}>;

export type CollectionsMap = Map<string, {
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
}>;
