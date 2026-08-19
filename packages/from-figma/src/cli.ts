#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { Component as SchemaComponent } from '@rudironsoni/specs-schema';
import { resolveComponentImages } from './Images/resolveImages.js';

type SpecDocument = SchemaComponent | Array<{ name: string; component?: SchemaComponent }>;
type Flags = Record<string, string | boolean>;

async function main(): Promise<void> {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help || !flags['get-images']) {
    printHelp();
    process.exit(flags.help ? 0 : 1);
  }
  await runGetImages(flags);
}

async function runGetImages(flags: Flags): Promise<void> {
  const file = required(flags.file, '--file');
  const fileKey = required(flags['figma-file'], '--figma-file');
  const token = String(flags.token ?? process.env.FIGMA_TOKEN ?? '');
  if (!token) throw new Error('Pass --token or set FIGMA_TOKEN');
  const raw = await readFile(file, 'utf8');
  const document = file.endsWith('.yaml') || file.endsWith('.yml') ? parseYaml(raw) : JSON.parse(raw);
  const updated = await resolveDocument(document as SpecDocument, {
    fileKey,
    token,
    outDir: typeof flags['out-dir'] === 'string' ? flags['out-dir'] : undefined,
    inline: Boolean(flags.inline),
    deps: {
      fetch,
      writeFile: async (path, bytes) => { await writeFile(path, bytes); },
      mkdir: async (path) => { await mkdir(path, { recursive: true }); },
    },
  });
  const output = file.endsWith('.yaml') || file.endsWith('.yml')
    ? stringifyYaml(updated)
    : `${JSON.stringify(updated, null, 2)}\n`;
  const destination = typeof flags.out === 'string' ? flags.out : file;
  await writeFile(destination, output);
}

async function resolveDocument(
  document: SpecDocument,
  options: Parameters<typeof resolveComponentImages>[1],
): Promise<SpecDocument> {
  if (Array.isArray(document)) {
    const next = [];
    for (const entry of document) {
      if (entry.component) {
        next.push({ ...entry, component: await resolveComponentImages(entry.component, options) });
      } else {
        next.push(entry);
      }
    }
    return next;
  }
  return resolveComponentImages(document, options);
}

function parseArgs(argv: string[]): Flags {
  const flags: Flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) continue;
    if (token === '--help' || token === '-h') {
      flags.help = true;
      continue;
    }
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      flags[key] = true;
    } else {
      flags[key] = next;
      index += 1;
    }
  }
  return flags;
}

function required(value: string | boolean | undefined, flag: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`Missing ${flag}`);
  return value;
}

function printHelp(): void {
  process.stdout.write(`specs-from-figma

  --get-images --file <spec.json|yaml> --figma-file <key> [--token <token>] [--out-dir <dir>] [--inline] [--out <path>]
      Resolve figma:<hash> image registry entries via GET /v1/files/:key/images.

  --help
`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
