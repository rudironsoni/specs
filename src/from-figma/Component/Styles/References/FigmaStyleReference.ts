import type { ResolvedConfig, TokenReference } from '@rudironsoni/specs-schema';
import type { FigmaElementNode } from '../../Nodes/types.js';
import type { FigmaFoundations } from '../../../Runtime/Foundations/interfaces.js';

export class FigmaStyleReference {
  name?: string;

  constructor(
    readonly id: string,
    readonly tokenType: TokenReference['$type'],
  ) {}

  static evaluate(node: FigmaElementNode, key: string, tokenType: TokenReference['$type']): FigmaStyleReference | null {
    const id = styleIdForKey(node, key);
    if (!id) return null;
    return new FigmaStyleReference(id, tokenType);
  }

  static is(value: unknown): value is FigmaStyleReference {
    return value instanceof FigmaStyleReference;
  }

  difference(other: FigmaStyleReference): boolean {
    return this.id !== other.id;
  }

  clone(): FigmaStyleReference {
    const copy = new FigmaStyleReference(this.id, this.tokenType);
    copy.name = this.name;
    return copy;
  }

  data(_config: ResolvedConfig): TokenReference | string {
    return {
      $token: this.toTokenPath(),
      $type: this.tokenType,
      $extensions: {
        'com.figma': {
          id: this.id,
          name: this.name,
        },
      },
    };
  }

  private toTokenPath(): string {
    return this.name ?? this.id;
  }

  async resolveName(foundations: FigmaFoundations | undefined): Promise<void> {
    if (!foundations) return;
    const style = await foundations.getStyle(this.id);
    if (style?.name) this.name = style.name;
  }
}

function styleIdForKey(node: FigmaElementNode, key: string): string | null {
  const id = (() => {
    switch (key) {
      case 'backgroundColor':
      case 'fillColor':
      case 'textColor':
        return stringifyId(node.fillStyleId);
      case 'strokes':
        return stringifyId(node.strokeStyleId);
      case 'typography':
        return stringifyId(node.textStyleId);
      case 'effects':
        return stringifyId(node.effectStyleId);
      default:
        return null;
    }
  })();
  return id && id.length > 0 ? id : null;
}

function stringifyId(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  return null;
}
