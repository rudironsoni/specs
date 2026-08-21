import type { ColorObject, ColorFormat } from '@rudironsoni/specs-schema';

export class Color {
  readonly colorSpace: string;
  readonly components: (number | 'none')[];
  readonly alpha?: number;
  readonly hex: string;

  constructor(value: ColorObject) {
    this.colorSpace = value.colorSpace;
    this.components = value.components;
    this.alpha = value.alpha;
    this.hex = value.hex ?? Color.hexFromComponents(value.components);
  }

  static fromFigma(color: { r: number; g: number; b: number; a?: number }): Color {
    return new Color({
      colorSpace: 'srgb',
      components: [color.r, color.g, color.b],
      alpha: color.a,
      hex: Color.hexFromRgb(color.r, color.g, color.b),
    });
  }

  difference(base: Color): boolean {
    return this.hex !== base.hex || this.alphaValue() !== base.alphaValue();
  }

  clone(): Color {
    return new Color({
      colorSpace: this.colorSpace,
      components: [...this.components],
      alpha: this.alpha,
      hex: this.hex,
    });
  }

  data(format: ColorFormat = 'HEX'): ColorObject | string {
    switch (format) {
      case 'OBJECT':
        return {
          colorSpace: this.colorSpace,
          components: [...this.components],
          ...(this.alpha !== undefined ? { alpha: this.alpha } : {}),
          hex: this.hex,
        };
      case 'HEXA':
        return this.toHexa();
      case 'RGB':
        return this.toRgb();
      case 'RGBA':
        return this.toRgba();
      case 'HSLA':
        return this.toHsla();
      case 'HSB':
        return this.toHsb();
      case 'OKLCH':
        return this.toOklch();
      case 'OKLAB':
        return this.toOklab();
      default:
        return this.toHex();
    }
  }

  toHex(): string {
    return this.hex;
  }

  toHexa(): string {
    const alpha = Math.round(this.alphaValue() * 255).toString(16).padStart(2, '0');
    return `${this.hex}${alpha}`.toUpperCase().replace(/^#/, '#').toUpperCase();
  }

  toRgb(): string {
    const [r, g, b] = this.rgb255();
    return `rgb(${r}, ${g}, ${b})`;
  }

  toRgba(): string {
    const [r, g, b] = this.rgb255();
    return `rgba(${r}, ${g}, ${b}, ${this.alphaValue()})`;
  }

  toHsla(): string {
    const [h, s, l] = this.hsl();
    return `hsla(${h}, ${s}%, ${l}%, ${this.alphaValue()})`;
  }

  toHsb(): string {
    const [h, s, b] = this.hsb();
    return `hsb(${h}, ${s}%, ${b}%)`;
  }

  toOklch(): string {
    const [L, C, h] = this.oklch();
    return `oklch(${L} ${C} ${h} / ${this.alphaValue()})`;
  }

  toOklab(): string {
    const [L, a, b] = this.oklab();
    return `oklab(${L} ${a} ${b} / ${this.alphaValue()})`;
  }

  private alphaValue(): number {
    return this.alpha === undefined ? 1 : Number(this.alpha.toFixed(4));
  }

  private rgb255(): [number, number, number] {
    const [r, g, b] = this.srgbComponents();
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  private srgbComponents(): [number, number, number] {
    const n = (value: number | 'none') => (value === 'none' ? 0 : value);
    return [n(this.components[0] ?? 0), n(this.components[1] ?? 0), n(this.components[2] ?? 0)];
  }

  private hsl(): [number, number, number] {
    const [r, g, b] = this.srgbComponents();
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, Math.round(l * 100)];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)];
  }

  private hsb(): [number, number, number] {
    const [r, g, b] = this.srgbComponents();
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    const s = max === 0 ? 0 : d / max;
    let h = 0;
    if (d !== 0) {
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
    }
    return [Math.round(h * 60), Math.round(s * 100), Math.round(max * 100)];
  }

  private oklab(): [number, number, number] {
    const [r, g, b] = this.srgbComponents().map(Color.srgbToLinear) as [number, number, number];
    const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
    const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
    const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
    const l_ = Math.cbrt(l);
    const m_ = Math.cbrt(m);
    const s_ = Math.cbrt(s);
    return [
      Color.round4(0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_),
      Color.round4(1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_),
      Color.round4(0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_),
    ];
  }

  private oklch(): [number, number, number] {
    const [L, a, b] = this.oklab();
    const C = Color.round4(Math.sqrt(a * a + b * b));
    const h = Number(((Math.atan2(b, a) * 180) / Math.PI + 360).toFixed(2)) % 360;
    return [L, C, h];
  }

  private static srgbToLinear(channel: number): number {
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }

  private static round4(value: number): number {
    return Number(value.toFixed(4));
  }

  private static hexFromComponents(components: (number | 'none')[]): string {
    const n = (value: number | 'none' | undefined) => (value === 'none' || value === undefined ? 0 : value);
    return Color.hexFromRgb(n(components[0]), n(components[1]), n(components[2]));
  }

  private static hexFromRgb(r: number, g: number, b: number): string {
    const toHex = (channel: number) => Math.round(Math.min(1, Math.max(0, channel)) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }
}
