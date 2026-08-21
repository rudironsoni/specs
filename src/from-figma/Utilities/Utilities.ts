import type { ResolvedConfig } from '@rudironsoni/specs-schema';
import type { SpecableNode } from '../Component/Nodes/types.js';

type FormatKeys = ResolvedConfig['format']['keys'];

export type FigmaVariantProp = {
  name: string;
  defaultValue: string;
  options: string[];
};

export class Utilities {
  private static readonly WORD_SEPARATOR_REGEX = /[\s/_-]+/g;
  private static readonly NON_ALPHANUMERIC_REGEX = /[^A-Za-z0-9]+/g;

  static formatKey(str: string, format: FormatKeys = 'SAFE'): string {
    if (format === 'SAFE') return str;
    const words = str
      .replace(this.NON_ALPHANUMERIC_REGEX, ' ')
      .trim()
      .split(this.WORD_SEPARATOR_REGEX)
      .filter(Boolean)
      .map((word) => word.toLowerCase());
    if (words.length === 0) return str;
    const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);
    switch (format) {
      case 'CAMEL':
        return words[0] + words.slice(1).map(capitalize).join('');
      case 'PASCAL':
        return words.map(capitalize).join('');
      case 'SNAKE':
        return words.join('_');
      case 'KEBAB':
        return words.join('-');
      case 'TRAIN':
        return words.map(capitalize).join('-');
      default:
        return str;
    }
  }

  static normalizeName(value: string): string {
    return value.replace(/\s*\/\s*/g, ' / ').replace(/\s+/g, ' ').trim();
  }

  static disambiguateKey(base: string, isTaken: (key: string) => boolean): string {
    if (!isTaken(base)) return base;
    let index = 2;
    while (isTaken(`${base}__${index}`)) index += 1;
    return `${base}__${index}`;
  }

  static hashString(input: string): string {
    let h1 = 0xdeadbeef ^ input.length;
    let h2 = 0x41c6ce57 ^ input.length;
    for (let i = 0; i < input.length; i++) {
      const ch = input.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const digest = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return digest.toString(16);
  }

  static identifierKey(name: string): string {
    const slug = name.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
    return slug || 'example';
  }

  static glyphPatternMatch(name: string, pattern: string): string | null {
    const needle = pattern.replace(/\{i\}/g, '');
    if (!name.startsWith(needle) && !name.includes(pattern.replace(/\{i\}/g, '').trim())) {
      if (!name.startsWith(pattern) && !name.includes(pattern)) return null;
    }
    const prefix = pattern.replace(/\{i\}.*$/, '').trim();
    if (prefix && name.startsWith(prefix)) {
      return name.slice(prefix.length).replace(/^[\s/]+/, '') || null;
    }
    return name.includes(pattern) ? name : null;
  }

  static variantProps(node: SpecableNode): FigmaVariantProp[] {
    const definitions = (node as { componentPropertyDefinitions?: Record<string, unknown> }).componentPropertyDefinitions;
    if (!definitions) return [];
    const props: FigmaVariantProp[] = [];
    for (const [rawName, definition] of Object.entries(definitions)) {
      const def = definition as { type?: string; defaultValue?: unknown; variantOptions?: string[] };
      if (def.type !== 'VARIANT') continue;
      props.push({
        name: rawName.split('#')[0] ?? rawName,
        defaultValue: String(def.defaultValue ?? ''),
        options: Array.isArray(def.variantOptions) ? def.variantOptions.map(String) : [],
      });
    }
    return props;
  }
}
