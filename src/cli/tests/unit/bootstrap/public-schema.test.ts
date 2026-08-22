import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv from 'ajv';
import { assertPublicComponent, publicComponentValidator } from '../../../bootstrap/schema/publicComponent.js';
import type { Component } from '@rudironsoni/specs-schema';

const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../../../');
const schemaPath = path.join(repoRoot, 'src/schema/schema/component.schema.json');

const button: Component = {
  title: 'Button',
  anatomy: { root: { type: 'container' } },
  props: { disabled: { type: 'boolean', default: false } },
  default: {
    configuration: { disabled: false },
    elements: { root: { children: [], parent: null } },
    layout: [{ root: [] }],
  },
};

describe('public Component schema', () => {
  it('validates Path B required fields with a $ref-free subset', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    const validate = ajv.compile({
      type: 'object',
      required: ['title', 'anatomy', 'default'],
      properties: {
        title: { type: 'string' },
        anatomy: { type: 'object' },
        default: { type: 'object' },
      },
    });
    expect(validate({
      title: 'Button',
      anatomy: { root: { type: 'container' } },
      default: { layout: [{ root: [] }] },
    })).toBe(true);
  });

  it('does not compile the published schema in isolation', () => {
    const script = `
      const fs = require('fs');
      const Ajv = require('ajv');
      const schema = JSON.parse(fs.readFileSync(${JSON.stringify(schemaPath)}, 'utf8'));
      const ajv = new Ajv({ allErrors: true, strict: false });
      ajv.compile(schema);
      process.stdout.write('COMPILED');
    `;
    try {
      execFileSync(process.execPath, ['-e', script], { timeout: 4000, encoding: 'utf8' });
      expect.fail('Ajv compiled component.schema.json without sibling schemas');
    } catch (error) {
      const err = error as { killed?: boolean; message?: string; stderr?: string };
      if (err.killed) {
        expect(err.killed).toBe(true);
        return;
      }
      const text = `${err.message ?? ''} ${err.stderr ?? ''}`;
      expect(text).toContain('workspace.schema.json');
    }
  });

  it('compiles when sibling schemas are loaded and accepts a Path B component', () => {
    const validate = publicComponentValidator();
    expect(validate(button)).toBe(true);
    expect(() => assertPublicComponent(button)).not.toThrow();
  });
});
