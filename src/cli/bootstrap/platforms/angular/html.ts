import fs from 'fs-extra';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export interface HtmlStartTag {
  tag: string;
  attrs: Record<string, string>;
  selfClosing: boolean;
}

function isNameChar(ch: string): boolean {
  return /[A-Za-z0-9_:-]/.test(ch);
}

export function findStartTags(html: string): HtmlStartTag[] {
  const tags: HtmlStartTag[] = [];
  let i = 0;
  while (i < html.length) {
    if (html[i] !== '<') {
      i += 1;
      continue;
    }
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      i = end === -1 ? html.length : end + 3;
      continue;
    }
    if (html[i + 1] === '/' || html[i + 1] === '!' || html[i + 1] === '?') {
      const end = html.indexOf('>', i + 1);
      i = end === -1 ? html.length : end + 1;
      continue;
    }
    i += 1;
    let tag = '';
    while (i < html.length && isNameChar(html[i])) {
      tag += html[i];
      i += 1;
    }
    const attrs: Record<string, string> = {};
    while (i < html.length && html[i] !== '>') {
      if (html[i] === '/') {
        i += 1;
        continue;
      }
      if (/\s/.test(html[i])) {
        i += 1;
        continue;
      }
      let name = '';
      while (
        i < html.length
        && (isNameChar(html[i]) || html[i] === '[' || html[i] === ']' || html[i] === '(' || html[i] === ')' || html[i] === '*')
      ) {
        name += html[i];
        i += 1;
      }
      let value = '';
      if (html[i] === '=') {
        i += 1;
        const quote = html[i] === '"' || html[i] === "'" ? html[i] : '';
        if (quote) {
          i += 1;
          while (i < html.length && html[i] !== quote) {
            value += html[i];
            i += 1;
          }
          if (html[i] === quote) i += 1;
        } else {
          while (i < html.length && !/\s|>/.test(html[i])) {
            value += html[i];
            i += 1;
          }
        }
      }
      if (name) attrs[name] = value;
      else i += 1;
    }
    const selfClosing = html[i - 1] === '/';
    if (html[i] === '>') i += 1;
    if (tag) tags.push({ tag, attrs, selfClosing });
  }
  return tags;
}

export function findNgContent(html: string): boolean {
  return findStartTags(html).some((tag) => tag.tag === 'ng-content');
}

interface AngularCompilerModule {
  parseTemplate?: (html: string, url: string) => {
    nodes?: Array<{
      name?: string;
      attrs?: Array<{ name: string; value?: string }>;
      attributes?: Array<{ name: string; value?: string }>;
      inputs?: Array<{ name: string; value?: string }>;
      outputs?: Array<{ name: string }>;
    }>;
  };
}

async function loadAngularCompiler(sourceRoot: string): Promise<AngularCompilerModule | undefined> {
  let dir = sourceRoot;
  for (let i = 0; i < 8; i += 1) {
    const candidates = [
      path.join(dir, 'node_modules/@angular/compiler/fesm2022/compiler.mjs'),
      path.join(dir, 'node_modules/@angular/compiler/index.js'),
    ];
    for (const candidate of candidates) {
      if (await fs.pathExists(candidate)) {
        try {
          return await import(pathToFileURL(candidate).href) as AngularCompilerModule;
        } catch {
          return undefined;
        }
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return undefined;
}

export async function parseTemplateTags(html: string, sourceRoot?: string): Promise<HtmlStartTag[]> {
  if (sourceRoot) {
    const compiler = await loadAngularCompiler(sourceRoot);
    if (compiler?.parseTemplate) {
      try {
        const parsed = compiler.parseTemplate(html, 'inline.html');
        const tags: HtmlStartTag[] = [];
        for (const node of parsed.nodes ?? []) {
          if (!node.name) continue;
          const attrs: Record<string, string> = {};
          for (const attr of node.attributes ?? node.attrs ?? []) {
            attrs[attr.name] = attr.value ?? '';
          }
          for (const input of node.inputs ?? []) {
            attrs[`[${input.name}]`] = input.value ?? '';
          }
          for (const output of node.outputs ?? []) {
            attrs[`(${output.name})`] = '';
          }
          tags.push({ tag: node.name, attrs, selfClosing: false });
        }
        if (tags.length > 0) return tags;
      } catch {
        // Fall through to the local scanner.
      }
    }
  }
  return findStartTags(html);
}
