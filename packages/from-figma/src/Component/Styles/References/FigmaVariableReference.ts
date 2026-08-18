import type { ResolvedConfig, TokenReference } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../../Nodes/types.js';
import type { FigmaFoundations } from '../../../Runtime/Foundations/interfaces.js';
import { Color } from '../../Color/Color.js';
import { toFigmaKey } from '../keys.js';

export type RawStyle = string | number | boolean;

export class FigmaVariableReference {
  variableName?: string;
  collectionName?: string;
  collectionId?: string;
  codeSyntax?: { WEB?: string; ANDROID?: string; iOS?: string };

  constructor(
    readonly id: string,
    readonly rawValue: RawStyle | Color,
    readonly tokenType: TokenReference['$type'],
  ) {}

  static evaluate(
    node: FigmaElementNode,
    key: string,
    rawValueGetter: () => RawStyle | Color,
  ): FigmaVariableReference | null {
    const id = FigmaVariableReference.aliasId(node, key);
    if (!id) return null;
    return new FigmaVariableReference(id, rawValueGetter(), tokenTypeForKey(key));
  }

  static aliasId(node: FigmaElementNode, key: string): string | null {
    const bound = node.boundVariables;
    if (!bound) return null;
    const figmaKey = toFigmaKey(key);
    const direct = readAlias(bound[figmaKey] ?? bound[key]);
    if (direct) return direct;
    if (figmaKey === 'fills' || key === 'backgroundColor' || key === 'fillColor' || key === 'textColor') {
      const fills = node.fills?.[0] as { boundVariables?: Record<string, unknown> } | undefined;
      return readAlias(fills?.boundVariables?.color);
    }
    if (key === 'strokes') {
      const strokes = node.strokes?.[0] as { boundVariables?: Record<string, unknown> } | undefined;
      return readAlias(strokes?.boundVariables?.color);
    }
    return null;
  }

  static is(value: unknown): value is FigmaVariableReference {
    return value instanceof FigmaVariableReference;
  }

  difference(other: FigmaVariableReference): boolean {
    return this.id !== other.id;
  }

  clone(): FigmaVariableReference {
    const copy = new FigmaVariableReference(this.id, cloneRaw(this.rawValue), this.tokenType);
    copy.variableName = this.variableName;
    copy.collectionName = this.collectionName;
    copy.collectionId = this.collectionId;
    copy.codeSyntax = this.codeSyntax;
    return copy;
  }

  data(config: ResolvedConfig): string | TokenReference | Color | number | boolean {
    if (config.format.tokens === 'FIGMA_NAME' && this.variableName) {
      return this.variableName;
    }
    if (this.variableName && config.format.tokens !== 'CUSTOM') {
      return {
        $token: this.toTokenPath(),
        $type: this.tokenType,
        $extensions: {
          'com.figma': {
            id: this.id,
            name: this.variableName,
            collectionName: this.collectionName,
            rawValue: this.serializedRawValue(),
          },
        },
      };
    }
    return this.serializedRawValue();
  }

  private toTokenPath(): string {
    const name = this.variableName ?? this.id;
    const collection = this.collectionName;
    return collection ? `${collection}/${name}` : name;
  }

  private serializedRawValue(): string | number | boolean {
    if (this.rawValue instanceof Color) return this.rawValue.toHex();
    return this.rawValue;
  }

  async resolveName(foundations: FigmaFoundations | undefined, includeCollection: boolean): Promise<void> {
    if (!foundations) return;
    const variable = await foundations.getVariable(this.id);
    if (!variable) return;
    this.variableName = variable.name;
    this.collectionId = variable.variableCollectionId;
    this.codeSyntax = variable.codeSyntax;
    if (includeCollection) {
      this.collectionName = (await foundations.getCollectionName(this.id)) ?? undefined;
    }
  }
}

function readAlias(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as { type?: string; id?: string };
  if (record.id && (record.type === 'VARIABLE_ALIAS' || !record.type)) return record.id;
  return null;
}

function tokenTypeForKey(key: string): TokenReference['$type'] {
  if (['backgroundColor', 'fillColor', 'textColor', 'strokes'].includes(key)) return 'color';
  if ([
    'width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight',
    'padding', 'strokeWeight', 'cornerRadius', 'itemSpacing',
    'fontSize', 'lineHeight', 'letterSpacing', 'paragraphIndent', 'paragraphSpacing', 'listSpacing',
  ].includes(key)) {
    return 'dimension';
  }
  if (['opacity', 'rotation', 'cornerSmoothing'].includes(key)) return 'number';
  if (['visible', 'locked', 'clipContent', 'wrap', 'itemReverseZIndex', 'hangingPunctuation', 'hangingList'].includes(key)) {
    return 'boolean';
  }
  if (key === 'typography') return 'typography';
  return 'string';
}

function cloneRaw(value: RawStyle | Color): RawStyle | Color {
  return value instanceof Color ? value.clone() : value;
}
