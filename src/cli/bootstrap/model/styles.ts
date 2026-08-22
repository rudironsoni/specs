import type { NormalizedStyleValue } from '../schema/types.js';

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
const RGB = /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*([0-9.]+))?\s*\)$/i;
const PX = /^(-?[0-9.]+)px$/i;

function roundChannel(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function hexToRgb(hex: string): { r: number; g: number; b: number; a: number } {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  let a = 1;
  if (h.length === 8) {
    a = parseInt(h.slice(6, 8), 16) / 255;
    h = h.slice(0, 6);
  }
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
    a,
  };
}

export function normalizeStyleValue(authored: string): NormalizedStyleValue {
  const trimmed = authored.trim();
  const hex = HEX.exec(trimmed);
  if (hex) {
    const rgb = hexToRgb(trimmed);
    const components = [roundChannel(rgb.r), roundChannel(rgb.g), roundChannel(rgb.b)];
    return {
      type: 'color',
      colorSpace: 'srgb',
      components,
      alpha: roundChannel(rgb.a),
      canonical: `color:srgb:${components.join(',')}:${roundChannel(rgb.a)}`,
    };
  }
  const rgb = RGB.exec(trimmed);
  if (rgb) {
    const components = [1, 2, 3].map((i) => roundChannel(Number(rgb[i]) / 255));
    const alpha = rgb[4] === undefined ? 1 : roundChannel(Number(rgb[4]));
    return {
      type: 'color',
      colorSpace: 'srgb',
      components,
      alpha,
      canonical: `color:srgb:${components.join(',')}:${alpha}`,
    };
  }
  const px = PX.exec(trimmed);
  if (px) {
    const value = Number(px[1]);
    return { type: 'dimension', value, unit: 'px', canonical: `dimension:${value}px` };
  }
  return { type: 'other', canonical: `other:${trimmed}` };
}

export function stylesAreExact(a: NormalizedStyleValue, b: NormalizedStyleValue): boolean {
  return a.canonical === b.canonical;
}

export function stylesAreNear(a: NormalizedStyleValue, b: NormalizedStyleValue): boolean {
  if (a.type !== 'color' || b.type !== 'color') return false;
  if (a.canonical === b.canonical) return false;
  const ac = a.components ?? [];
  const bc = b.components ?? [];
  if (ac.length !== 3 || bc.length !== 3) return false;
  const delta = Math.max(
    Math.abs(ac[0] - bc[0]),
    Math.abs(ac[1] - bc[1]),
    Math.abs(ac[2] - bc[2]),
    Math.abs((a.alpha ?? 1) - (b.alpha ?? 1)),
  );
  return delta > 0 && delta <= 2 / 255 + 1e-9;
}
