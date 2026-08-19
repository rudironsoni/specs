import type { PropBinding as SchemaPropBinding, ResolvedConfig } from '@rudironsoni/specs-schema';
import { Props } from './Props.js';
import { Utilities } from '../../Utilities/Utilities.js';

export class PropBinding {
  constructor(
    readonly value: string | number | boolean,
    readonly ref: string | null = null,
  ) {}

  static create(value: string | number | boolean, refString?: string): PropBinding {
    const ref = refString ? Props.propNameWithoutId(refString) : null;
    return new PropBinding(value, ref);
  }

  static is(value: unknown): value is PropBinding {
    return value instanceof PropBinding;
  }

  isBound(): boolean {
    return this.ref !== null;
  }

  data(keyFormat: ResolvedConfig['format']['keys']): string | number | boolean | SchemaPropBinding {
    if (!this.ref) return this.value;
    return { $binding: `#/props/${Utilities.formatKey(this.ref, keyFormat)}` };
  }

  difference(other: PropBinding): boolean {
    return this.ref !== other.ref || this.value !== other.value;
  }

  clone(): PropBinding {
    return new PropBinding(this.value, this.ref);
  }
}
