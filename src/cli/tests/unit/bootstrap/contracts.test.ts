import { describe, expect, it } from 'vitest';
import { FAILURE_CODES } from '../../../bootstrap/errors.js';
import { observationId, logicalId } from '../../../bootstrap/identity.js';
import { redact, REDACTED } from '../../../bootstrap/redact.js';
import { canonicalize, stableStringifyJson, digestCanonical } from '../../../bootstrap/serialize.js';
import { normalizeStyleValue, stylesAreExact, stylesAreNear } from '../../../bootstrap/model/styles.js';
import { validateInventory, validateCandidateFile, validateDecisionFile, validateFigmaPlan, validateBindingFile, validateRunRecord } from '../../../bootstrap/schema/validate.js';
import { emptyInventory, emptyCandidateFile, emptyDecisionFile, emptyBindingFile } from '../../../bootstrap/workspace.js';
import { SIDECAR_SCHEMA_VERSION } from '../../../bootstrap/schema/types.js';
import { BootstrapError } from '../../../bootstrap/errors.js';
import { allPlatformPacks } from '../../../bootstrap/platforms/index.js';
import { pickObservedComponent } from '../../../bootstrap/compile/index.js';
import type { Inventory, ObservedComponent } from '../../../bootstrap/schema/types.js';

describe('bootstrap contracts', () => {
  it('prefers a real component over a mock with the same logical id', () => {
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
    const mock: ObservedComponent = {
      id: 'angular:ignite:ignt-button',
      observationId: 'obs:mock',
      title: 'Mock',
      provenance: { ...provenance, locator: 'MockAlertActionButtonComponent' },
      properties: [{ name: 'label', kind: 'input' }],
      events: [],
      slots: [],
      deprecations: [],
      extensions: { angular: { className: 'MockAlertActionButtonComponent', selector: 'ignt-button' } },
    };
    const real: ObservedComponent = {
      id: 'angular:ignite:ignt-button',
      observationId: 'obs:real',
      title: 'IgntButtonComponent',
      provenance,
      properties: [
        { name: 'label', kind: 'input' },
        { name: 'disabled', kind: 'input' },
        { name: 'sentiment', kind: 'input' },
      ],
      events: [],
      slots: [],
      deprecations: [],
      extensions: { angular: { className: 'IgntButtonComponent', selector: 'ignt-button' } },
    };
    const inventory: Inventory = {
      ...emptyInventory({ repository: 'r', revision: 'sha' }),
      components: [mock, real],
    };
    expect(pickObservedComponent(inventory, 'angular:ignite:ignt-button')?.observationId).toBe('obs:real');
  });

  it('exposes stable failure codes', () => {
    expect(FAILURE_CODES).toContain('STALE_OBSERVATION');
    expect(FAILURE_CODES).toContain('ROUND_TRIP_MISMATCH');
    expect(FAILURE_CODES).toContain('VARIANT_SET_TOO_LARGE');
  });

  it('hashes observation identity from canonical payload', () => {
    const a = observationId({
      kind: 'component',
      sourceIdentity: 'angular:kit:button',
      sourceRevision: 'abc',
      sourceLocator: 'Button',
      normalizedPayload: { selector: 'x' },
      extractorVersion: '1',
    });
    const b = observationId({
      kind: 'component',
      sourceIdentity: 'angular:kit:button',
      sourceRevision: 'abc',
      sourceLocator: 'Button',
      normalizedPayload: { selector: 'x' },
      extractorVersion: '1',
    });
    const c = observationId({
      kind: 'component',
      sourceIdentity: 'angular:kit:button',
      sourceRevision: 'abc',
      sourceLocator: 'Button',
      normalizedPayload: { selector: 'y' },
      extractorVersion: '1',
    });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a.startsWith('obs:')).toBe(true);
  });

  it('builds logical ids', () => {
    expect(logicalId('angular', 'kit', 'legacy-button')).toBe('angular:kit:legacy-button');
  });

  it('serializes with sorted keys', () => {
    const json = stableStringifyJson({ b: 1, a: { d: 2, c: 3 } });
    expect(json).toBe('{\n  "a": {\n    "c": 3,\n    "d": 2\n  },\n  "b": 1\n}\n');
    expect(digestCanonical({ z: 1, a: 2 })).toBe(digestCanonical({ a: 2, z: 1 }));
    expect(canonicalize({ b: 1, a: 2 })).toEqual({ a: 2, b: 1 });
  });

  it('normalizes exact colors and keeps near colors apart', () => {
    const a = normalizeStyleValue('#1a73e8');
    const b = normalizeStyleValue('rgb(26, 115, 232)');
    const c = normalizeStyleValue('#1a74e8');
    expect(stylesAreExact(a, b)).toBe(true);
    expect(stylesAreNear(a, c)).toBe(true);
    expect(stylesAreExact(a, c)).toBe(false);
  });

  it('redacts secrets', () => {
    const out = redact({ authorization: 'Bearer abc', nested: { cookie: 'sid=1' }, ok: 'hello' }) as Record<string, unknown>;
    expect(out.authorization).toBe(REDACTED);
    expect((out.nested as Record<string, unknown>).cookie).toBe(REDACTED);
    expect(out.ok).toBe('hello');
  });

  it('validates empty sidecar documents', () => {
    expect(validateInventory(emptyInventory({ repository: 'r', revision: 'sha' })).schemaVersion).toBe(1);
    expect(validateCandidateFile(emptyCandidateFile()).candidates).toEqual([]);
    expect(validateDecisionFile(emptyDecisionFile()).decisions).toEqual([]);
    expect(validateBindingFile(emptyBindingFile()).bindings).toEqual([]);
    expect(() => validateInventory({ schemaVersion: 1 })).toThrow(BootstrapError);
  });

  it('validates a figma plan and run record', () => {
    const plan = validateFigmaPlan({
      schemaVersion: SIDECAR_SCHEMA_VERSION,
      mode: 'STAGING',
      sourceContractDigest: 'abc',
      expectedTargetDigest: null,
      ownedNodeIdentities: [],
      variables: [],
      components: [],
      componentSets: [],
      bindings: [],
      annotations: [],
      operations: { create: [], update: [], delete: [] },
    });
    expect(plan.mode).toBe('STAGING');
    const run = validateRunRecord({
      schemaVersion: 1,
      runId: '00000000-0000-0000-0000-000000000000',
      workflow: 'bootstrap',
      startedAt: '2026-01-01T00:00:00.000Z',
      inputDigests: {},
      outputDigests: {},
      completedNodes: [],
      failedNodes: [],
      artifacts: [],
    });
    expect(run.workflow).toBe('bootstrap');
  });

  it('publishes honest capability manifests for five platforms', () => {
    const packs = allPlatformPacks();
    expect(packs.map((p) => p.manifest.platform.id).sort()).toEqual([
      'angular',
      'compose',
      'react',
      'swiftui',
      'vue',
    ]);
    const angular = packs.find((p) => p.manifest.platform.id === 'angular')!;
    expect(angular.manifest.capabilities.api).toBe('SUPPORTED');
    const react = packs.find((p) => p.manifest.platform.id === 'react')!;
    expect(react.manifest.capabilities.api).toBe('SUPPORTED');
    expect(react.codeModel).toBeTruthy();
    expect(react.manifest.capabilities.rendering).toBe('CONDITIONAL');
  });
});
