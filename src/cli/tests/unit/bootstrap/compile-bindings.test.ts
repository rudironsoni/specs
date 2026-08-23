import { describe, expect, it } from 'vitest';
import { acceptedImplementation } from '../../../bootstrap/compile/index.js';
import type { ObservedComponent } from '../../../bootstrap/schema/types.js';

const provenance = {
  sourceRevision: 'sha',
  sourceFileDigest: 'abc',
  locator: 'Button',
  sourcePath: 'button.ts',
  rawValue: {},
  normalizedValue: {},
  extractorName: 'test',
  extractorVersion: '1',
  environmentFingerprint: 'test',
  relatedObservations: [],
};

function member(id: string, angular: { className: string; selector: string }): ObservedComponent {
  return {
    id,
    observationId: `obs:${id}`,
    title: angular.className,
    provenance,
    properties: [],
    events: [],
    slots: [],
    deprecations: [],
    extensions: { angular },
  };
}

describe('accepted Angular bindings', () => {
  it('copies an observed selector instead of rewriting a prefix', () => {
    const observed = member('angular:kit:ignt-button', {
      className: 'IgntButtonComponent',
      selector: 'ignt-button',
    });
    expect(acceptedImplementation('component:button', 'angular', [observed])).toEqual({
      symbol: 'IgntButtonComponent',
      selector: 'ignt-button',
    });
  });

  it('copies a legacy selector the same way', () => {
    const observed = member('angular:legacy-kit:legacy-primary-button', {
      className: 'PrimaryButtonComponent',
      selector: 'legacy-primary-button',
    });
    expect(acceptedImplementation('component:button', 'angular', [observed])).toEqual({
      symbol: 'PrimaryButtonComponent',
      selector: 'legacy-primary-button',
    });
  });
});
