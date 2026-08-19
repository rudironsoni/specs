import type { Conditional, ResolvedConfig } from '@rudironsoni/specs-schema';
import type { PropPair } from '../../Props/PropPair.js';
import { Utilities } from '../../../Utilities/Utilities.js';

export class ConditionalStyle {
  private readonly _contentPropName: string;
  private readonly _booleanPropName: string;

  constructor(pair: PropPair) {
    this._contentPropName = pair.contentPropName;
    this._booleanPropName = pair.booleanPropName;
  }

  get booleanPropName(): string {
    return this._booleanPropName;
  }

  data(config: ResolvedConfig): Conditional {
    return {
      if: {
        condition: {
          operation: 'isNotNull',
          args: {
            value: { $binding: `#/props/${Utilities.formatKey(this._contentPropName, config.format.keys)}` },
          },
        },
        then: true,
        else: false,
      },
    };
  }

  clone(): ConditionalStyle {
    return new ConditionalStyle({
      elementName: '',
      booleanPropName: this._booleanPropName,
      contentKey: 'characters',
      contentPropName: this._contentPropName,
      contentType: 'string',
      booleanDefault: true,
    });
  }

  static difference(a: unknown, b: unknown): boolean {
    if (ConditionalStyle.is(a) && ConditionalStyle.is(b)) {
      return a._contentPropName !== b._contentPropName || a._booleanPropName !== b._booleanPropName;
    }
    return a !== b;
  }

  static is(value: unknown): value is ConditionalStyle {
    return value instanceof ConditionalStyle;
  }
}
