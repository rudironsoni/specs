import { BootstrapError } from '../../errors.js';
import type { FigmaPlan, FigmaPlanOperation } from '../../schema/types.js';
import type { FigmaTransport } from './types.js';

const FORBIDDEN = ['generate_figma_design', 'setPluginData', 'loadAllPagesAsync', 'createImageAsync', 'figma.notify'];

function jsString(value: unknown): string {
  return JSON.stringify(value);
}

function figmaVariableName(name: string): string {
  return name.replace(/\./g, '/');
}

function hexToRgba(value: unknown): { r: number; g: number; b: number; a: number } | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return undefined;
  const n = Number.parseInt(match[1], 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255, a: 1 };
}

export function mcpScriptTransport(): FigmaTransport {
  return {
    id: 'mcp',
    digest() {
      return 'mcp-script';
    },
    dryRun(plan) {
      emitMcpPluginScript(plan);
      return {
        creates: plan.operations.create.map((op) => op.id),
        updates: plan.operations.update.map((op) => op.id),
        deletes: [],
      };
    },
    apply() {
      throw new BootstrapError(
        'AUTHENTICATION_REQUIRED',
        'MCP apply is not a Node writer. Emit a Plugin API script with --emit-script and run it through Figma use_figma.',
      );
    },
    exportRest() {
      return { tool: 'use_figma' };
    },
  };
}

export function emitMcpPluginScript(plan: FigmaPlan): string {
  if (plan.operations.delete.length > 0) {
    throw new BootstrapError('PLAN_PRECONDITION_FAILED', 'Deletion is disabled by default');
  }
  if (plan.operations.update.length > 0) {
    throw new BootstrapError('PLAN_PRECONDITION_FAILED', 'MCP script does not emit updates yet');
  }

  const creates = plan.operations.create;
  const hasComponents = creates.some((op) => op.kind === 'createComponentSet');
  const lines: string[] = [
    '// specs bootstrap MCP script. Run with Figma use_figma only.',
    'const page = figma.currentPage;',
    'const created = [];',
    'const createdNodeIds = [];',
    'const skipped = [];',
  ];
  if (hasComponents) {
    lines.push('await figma.loadFontAsync({ family: "Inter", style: "Regular" });');
  }
  lines.push('const collections = await figma.variables.getLocalVariableCollectionsAsync();');
  lines.push('let collection = collections.find((c) => c.name === "specs-bootstrap");');
  lines.push('if (!collection) {');
  lines.push('  collection = figma.variables.createVariableCollection("specs-bootstrap");');
  lines.push('  createdNodeIds.push(collection.id);');
  lines.push('}');
  lines.push('const existingVars = await figma.variables.getLocalVariablesAsync();');
  lines.push('const varByName = Object.fromEntries(existingVars.map((v) => [v.name, v]));');
  lines.push('function existingNode(name) {');
  lines.push('  return page.children.find((n) => n.name === name);');
  lines.push('}');
  lines.push('function nextSetX() {');
  lines.push('  const widths = page.children.map((n) => n.x + n.width);');
  lines.push('  return widths.length === 0 ? 80 : Math.max(80, ...widths) + 80;');
  lines.push('}');

  for (const op of creates) {
    emitOperation(lines, op, plan.mode);
  }

  lines.push('return { created, createdNodeIds, skipped, tool: "use_figma" };');
  const script = `${lines.join('\n')}\n`;
  for (const token of FORBIDDEN) {
    if (script.includes(token)) {
      throw new BootstrapError('PLAN_PRECONDITION_FAILED', `MCP script must not contain ${token}`);
    }
  }
  return script;
}

function emitOperation(lines: string[], op: FigmaPlanOperation, mode: string): void {
  if (op.kind === 'setAnnotation') return;
  if (op.kind === 'createVariable') {
    emitVariable(lines, op);
    return;
  }
  if (op.kind === 'createComponentSet') {
    emitComponentSet(lines, op, mode);
    return;
  }
  throw new BootstrapError('PLAN_PRECONDITION_FAILED', `MCP script cannot map operation ${op.kind}`);
}

function emitVariable(lines: string[], op: FigmaPlanOperation): void {
  const token = (op.payload.token ?? {}) as { $value?: unknown; $type?: string };
  const rgba = hexToRgba(token.$value);
  const name = String(op.payload.name ?? op.id);
  const figmaName = figmaVariableName(name);
  if (!rgba) {
    throw new BootstrapError('PLAN_PRECONDITION_FAILED', `MCP script cannot map variable ${name}`);
  }
  lines.push(`if (!varByName[${jsString(figmaName)}]) {`);
  lines.push(`  const variable = figma.variables.createVariable(${jsString(figmaName)}, collection, "COLOR");`);
  lines.push('  variable.scopes = ["FRAME_FILL", "SHAPE_FILL"];');
  lines.push(`  variable.setValueForMode(collection.defaultModeId, ${jsString(rgba)});`);
  lines.push(`  varByName[${jsString(figmaName)}] = variable;`);
  lines.push(`  created.push(${jsString(op.id)});`);
  lines.push('  createdNodeIds.push(variable.id);');
  lines.push('} else {');
  lines.push(`  skipped.push(${jsString(op.id)});`);
  lines.push('}');
}

function emitComponentSet(lines: string[], op: FigmaPlanOperation, mode: string): void {
  const title = String(op.payload.title ?? op.id);
  const identity = String(op.payload.identity ?? `specs:${op.id}`);
  const name = `specs:${title}`;
  const annotation = `${identity} ${mode}`;
  lines.push(`{`);
  lines.push(`  const name = ${jsString(name)};`);
  lines.push('  const existing = existingNode(name);');
  lines.push('  if (existing) {');
  lines.push(`    skipped.push(${jsString(op.id)});`);
  lines.push('  } else {');
  lines.push('    const component = figma.createComponent();');
  lines.push('    component.name = "State=Default";');
  lines.push('    component.layoutMode = "HORIZONTAL";');
  lines.push('    component.primaryAxisAlignItems = "CENTER";');
  lines.push('    component.counterAxisAlignItems = "CENTER";');
  lines.push('    component.paddingLeft = 12;');
  lines.push('    component.paddingRight = 12;');
  lines.push('    component.paddingTop = 8;');
  lines.push('    component.paddingBottom = 8;');
  lines.push('    component.resize(120, 40);');
  lines.push('    component.layoutSizingHorizontal = "HUG";');
  lines.push('    component.layoutSizingVertical = "HUG";');
  lines.push('    component.fills = [{ type: "SOLID", color: { r: 0.9, g: 0.9, b: 0.9 } }];');
  lines.push('    const label = figma.createText();');
  lines.push(`    label.characters = ${jsString(title)};`);
  lines.push('    component.appendChild(label);');
  lines.push('    const set = figma.combineAsVariants([component], page);');
  lines.push('    set.name = name;');
  lines.push(`    set.description = ${jsString(annotation)};`);
  lines.push('    set.children.forEach((child, i) => {');
  lines.push('      child.x = i * 150;');
  lines.push('      child.y = 0;');
  lines.push('    });');
  lines.push('    let maxX = 0;');
  lines.push('    let maxY = 0;');
  lines.push('    for (const child of set.children) {');
  lines.push('      maxX = Math.max(maxX, child.x + child.width);');
  lines.push('      maxY = Math.max(maxY, child.y + child.height);');
  lines.push('    }');
  lines.push('    set.resizeWithoutConstraints(maxX + 40, maxY + 40);');
  lines.push('    set.x = nextSetX();');
  lines.push('    set.y = 80;');
  lines.push('    const note = figma.createText();');
  lines.push(`    note.characters = ${jsString(annotation)};`);
  lines.push('    note.x = set.x;');
  lines.push('    note.y = set.y + set.height + 16;');
  lines.push(`    created.push(${jsString(op.id)});`);
  lines.push('    createdNodeIds.push(set.id, component.id, label.id, note.id);');
  lines.push('  }');
  lines.push('}');
}
