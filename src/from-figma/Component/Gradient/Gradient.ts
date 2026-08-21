import type { GradientStop, GradientValue, ResolvedConfig } from '@rudironsoni/specs-schema';
import { Color } from '../Color/Color.js';
import { FigmaVariableReference } from '../Styles/References/FigmaVariableReference.js';

type GradientPaint = {
  type?: string;
  gradientStops?: Array<{
    position?: number;
    color?: { r: number; g: number; b: number; a?: number };
    boundVariables?: Record<string, unknown>;
  }>;
  gradientHandlePositions?: Array<{ x: number; y: number }>;
  gradientTransform?: number[][];
};

type StopColor = Color | FigmaVariableReference | string;

export class Gradient {
  constructor(private _value: GradientValue, private _stopColors: StopColor[] = []) {
    if (this._stopColors.length === 0) {
      this._stopColors = _value.stops.map((stop) => (
        typeof stop.color === 'string' ? stop.color : Color.fromFigma({ r: 0, g: 0, b: 0 })
      ));
    }
  }

  get value(): GradientValue {
    return this._value;
  }

  static isGradientPaint(paint: { type?: string } | undefined): boolean {
    return Boolean(paint?.type?.startsWith('GRADIENT_'));
  }

  static fromPaint(paint: GradientPaint): Gradient | null {
    const stops = evaluateStops(paint.gradientStops);
    if (!stops) return null;
    const handles = paint.gradientHandlePositions;
    if (paint.type === 'GRADIENT_LINEAR') {
      return new Gradient(
        { type: 'LINEAR', angle: evaluateAngle(handles, paint.gradientTransform), stops: stops.serialized },
        stops.colors,
      );
    }
    if (paint.type === 'GRADIENT_RADIAL') {
      return new Gradient(
        { type: 'RADIAL', center: evaluateCenter(handles), stops: stops.serialized },
        stops.colors,
      );
    }
    if (paint.type === 'GRADIENT_ANGULAR') {
      return new Gradient(
        { type: 'ANGULAR', center: evaluateCenter(handles), stops: stops.serialized },
        stops.colors,
      );
    }
    return null;
  }

  difference(base: Gradient): boolean {
    if (this._value.type !== base._value.type) return true;
    if (this._stopColors.length !== base._stopColors.length) return true;
    return this._stopColors.some((color, index) => colorDiffers(color, base._stopColors[index]));
  }

  clone(): Gradient {
    return new Gradient(
      JSON.parse(JSON.stringify(this._value)) as GradientValue,
      this._stopColors.map((color) => (
        color instanceof FigmaVariableReference || color instanceof Color ? color.clone() : color
      )),
    );
  }

  data(config: ResolvedConfig): GradientValue {
    const stops = this._value.stops.map((stop, index) => ({
      position: stop.position,
      color: serializeStop(this._stopColors[index] ?? stop.color, config),
    }));
    if (this._value.type === 'LINEAR') return { ...this._value, stops };
    return { ...this._value, stops };
  }

  async resolve(context?: { foundations?: Parameters<FigmaVariableReference['resolveName']>[0] }): Promise<void> {
    for (const color of this._stopColors) {
      if (color instanceof FigmaVariableReference) await color.resolveName(context?.foundations, true);
    }
  }
}

function evaluateStops(stops: GradientPaint['gradientStops']): { serialized: GradientStop[]; colors: StopColor[] } | null {
  if (!stops || stops.length < 2) return null;
  const serialized: GradientStop[] = [];
  const colors: StopColor[] = [];
  for (const stop of stops) {
    const color = stop.color ? Color.fromFigma(stop.color) : Color.fromFigma({ r: 0, g: 0, b: 0, a: 1 });
    const bound = stop.boundVariables?.color as { id?: string; type?: string } | undefined;
    const value = bound?.id ? new FigmaVariableReference(bound.id, color, 'color') : color;
    colors.push(value);
    serialized.push({ position: stop.position ?? 0, color: color.toHex() });
  }
  return { serialized, colors };
}

function evaluateAngle(handles?: Array<{ x: number; y: number }>, transform?: number[][]): number {
  if (handles && handles.length >= 2) {
    const start = handles[0];
    const end = handles[1];
    if (!start || !end) return 180;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    return (Math.round(Math.atan2(dy, dx) * (180 / Math.PI) + 90) + 360) % 360;
  }
  if (transform && transform[0] && transform[1]) {
    const dx = transform[0][0] ?? 1;
    const dy = transform[1][0] ?? 0;
    return (Math.round(Math.atan2(dy, dx) * (180 / Math.PI) + 90) + 360) % 360;
  }
  return 180;
}

function evaluateCenter(handles?: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (handles && handles[0]) return { x: clamp01(handles[0].x), y: clamp01(handles[0].y) };
  return { x: 0.5, y: 0.5 };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function colorDiffers(a: StopColor | undefined, b: StopColor | undefined): boolean {
  if (a instanceof FigmaVariableReference && b instanceof FigmaVariableReference) return a.difference(b);
  if (a instanceof FigmaVariableReference || b instanceof FigmaVariableReference) return true;
  if (a instanceof Color && b instanceof Color) return a.difference(b);
  return a !== b;
}

function serializeStop(color: StopColor | GradientStop['color'], config: ResolvedConfig): GradientStop['color'] {
  if (color instanceof FigmaVariableReference) return color.data(config) as GradientStop['color'];
  if (color instanceof Color) return color.data(config.format.color);
  return color;
}
