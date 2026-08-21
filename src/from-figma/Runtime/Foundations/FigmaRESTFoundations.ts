import type {
  FigmaFoundations,
  VariableDefinition,
  VariableCollection,
  StyleDefinition,
  CodeSyntaxPlatform,
} from './interfaces.js';

export interface RGB {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export class FigmaRESTDataResolver implements FigmaFoundations {
  constructor(
    private variableMap: Map<string, VariableDefinition>,
    private collectionMap: Map<string, VariableCollection>,
    private styleMap: Map<string, StyleDefinition>,
  ) {}

  async getVariableName(
    variableId: string,
    platform: CodeSyntaxPlatform | 'DEFAULT' = 'DEFAULT',
  ): Promise<string | null> {
    const variable = this.variableMap.get(variableId);
    if (!variable) return null;
    if (platform !== 'DEFAULT' && variable.codeSyntax) {
      const syntax = variable.codeSyntax[platform];
      if (syntax) return syntax;
    }
    return variable.name;
  }

  async getCollectionName(variableId: string): Promise<string | null> {
    const variable = this.variableMap.get(variableId);
    if (!variable) return null;
    return this.collectionMap.get(variable.variableCollectionId)?.name ?? null;
  }

  async getStyle(styleId: string): Promise<StyleDefinition | null> {
    return this.styleMap.get(styleId) ?? null;
  }

  async getVariable(variableId: string): Promise<VariableDefinition | null> {
    return this.variableMap.get(variableId) ?? null;
  }

  async getCollection(collectionId: string): Promise<VariableCollection | null> {
    return this.collectionMap.get(collectionId) ?? null;
  }

  static rgbToHex(color: RGB): string {
    const toHex = (channel: number) => {
      const value = Math.round(Math.min(1, Math.max(0, channel)) * 255);
      return value.toString(16).padStart(2, '0');
    };
    return `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  }

  async populateVariableStyle(
    variableStyle: {
      id: string;
      name?: string;
      collectionName?: string;
      collectionId?: string;
    },
    codeSyntaxPlatform: CodeSyntaxPlatform | 'DEFAULT' = 'DEFAULT',
    includeCollectionName = true,
  ): Promise<void> {
    const variable = await this.getVariable(variableStyle.id);
    if (!variable) return;
    variableStyle.name = (await this.getVariableName(variableStyle.id, codeSyntaxPlatform)) ?? variable.name;
    variableStyle.collectionId = variable.variableCollectionId;
    if (includeCollectionName) {
      variableStyle.collectionName = (await this.getCollectionName(variableStyle.id)) ?? undefined;
    }
  }
}
