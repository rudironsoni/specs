import type {
  FigmaFoundations,
  VariableDefinition,
  VariableCollection,
  StyleDefinition,
  CodeSyntaxPlatform,
} from './interfaces.js';
import { getFigma } from '../figmaGlobal.js';

export class FigmaPluginFoundations implements FigmaFoundations {
  async getStyle(styleId: string): Promise<StyleDefinition | null> {
    const figma = getFigma();
    if (!figma) return null;
    const style = figma.getStyleByIdAsync ? await figma.getStyleByIdAsync(styleId) : figma.getStyleById?.(styleId);
    if (!style || typeof style !== 'object') return null;
    const record = style as { id?: string; name?: string; type?: string; description?: string };
    return {
      id: record.id ?? styleId,
      name: record.name ?? styleId,
      type: (record.type as StyleDefinition['type']) ?? 'PAINT',
      description: record.description,
    };
  }

  async getVariable(variableId: string): Promise<VariableDefinition | null> {
    const figma = getFigma();
    const raw = await readVariable(figma, variableId);
    if (!raw) return null;
    return {
      id: raw.id ?? variableId,
      name: raw.name ?? variableId,
      key: raw.key ?? variableId,
      variableCollectionId: raw.variableCollectionId ?? '',
      resolvedType: raw.resolvedType ?? 'STRING',
      valuesByMode: raw.valuesByMode ?? {},
      remote: Boolean(raw.remote),
      description: raw.description,
      scopes: raw.scopes,
      codeSyntax: raw.codeSyntax,
    };
  }

  async getCollection(collectionId: string): Promise<VariableCollection | null> {
    const figma = getFigma();
    const raw = await readCollection(figma, collectionId);
    if (!raw) return null;
    return {
      id: raw.id ?? collectionId,
      name: raw.name ?? collectionId,
      key: raw.key ?? collectionId,
      modes: raw.modes ?? [],
      defaultModeId: raw.defaultModeId ?? raw.modes?.[0]?.modeId ?? '',
      variableIds: raw.variableIds ?? [],
      remote: Boolean(raw.remote),
    };
  }

  async getVariableName(variableId: string, platform: CodeSyntaxPlatform | 'DEFAULT' = 'DEFAULT'): Promise<string | null> {
    const variable = await this.getVariable(variableId);
    if (!variable) return null;
    if (platform !== 'DEFAULT' && variable.codeSyntax?.[platform]) return variable.codeSyntax[platform] ?? null;
    return variable.name;
  }

  async getCollectionName(variableId: string): Promise<string | null> {
    const variable = await this.getVariable(variableId);
    if (!variable) return null;
    return (await this.getCollection(variable.variableCollectionId))?.name ?? null;
  }
}

async function readVariable(figma: ReturnType<typeof getFigma>, id: string): Promise<{
  id?: string;
  name?: string;
  key?: string;
  variableCollectionId?: string;
  resolvedType?: VariableDefinition['resolvedType'];
  valuesByMode?: Record<string, unknown>;
  remote?: boolean;
  description?: string;
  scopes?: string[];
  codeSyntax?: { WEB?: string; ANDROID?: string; iOS?: string };
} | null> {
  const api = figma?.variables;
  if (!api) return null;
  const value = api.getVariableByIdAsync ? await api.getVariableByIdAsync(id) : api.getVariableById?.(id);
  return (value as never) ?? null;
}

async function readCollection(figma: ReturnType<typeof getFigma>, id: string): Promise<{
  id?: string;
  name?: string;
  key?: string;
  modes?: Array<{ modeId: string; name: string }>;
  defaultModeId?: string;
  variableIds?: string[];
  remote?: boolean;
} | null> {
  const api = figma?.variables;
  if (!api) return null;
  const value = api.getVariableCollectionByIdAsync
    ? await api.getVariableCollectionByIdAsync(id)
    : api.getVariableCollectionById?.(id);
  return (value as never) ?? null;
}
