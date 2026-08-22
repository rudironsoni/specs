import path from 'node:path';
import fs from 'fs-extra';
import type { Component } from '@rudironsoni/specs-schema';
import { BootstrapError } from '../errors.js';
import { stableStringifyYaml, stableStringifyJson, digestCanonical } from '../serialize.js';
import type {
  BindingFile,
  BindingImplementation,
  CandidateFile,
  Decision,
  Inventory,
  ObservedComponent,
} from '../schema/types.js';
import { SIDECAR_SCHEMA_VERSION } from '../schema/types.js';
import {
  loadCandidateFile,
  loadDecisions,
  loadInventory,
  resolveWorkspace,
  saveBindings,
} from '../workspace.js';
import { validateInventory } from '../schema/validate.js';
import { assertPublicComponent } from '../schema/publicComponent.js';
import { nestDtcgTokens } from '../platforms/dtcg.js';
import {
  bindingPlatformFromInventory,
  kebab,
  memberPlatformProperty,
  titleFromIdentity,
} from '../platforms/names.js';

function assertComponentShape(component: Component): void {
  if (!component.title || !component.anatomy || !component.default) {
    throw new BootstrapError('CONTRACT_VALIDATION_FAILED', 'Compiled component is missing title, anatomy, or default');
  }
}

function isMockComponent(component: ObservedComponent): boolean {
  const angular = component.extensions.angular as { className?: string } | undefined;
  const className = angular?.className ?? component.provenance.locator;
  return /mock/i.test(className);
}

export function pickObservedComponent(inventory: Inventory, id: string): ObservedComponent | undefined {
  const matches = inventory.components.filter((component) => component.id === id);
  if (matches.length === 0) return undefined;
  return [...matches].sort((a, b) => {
    const mockDelta = Number(isMockComponent(a)) - Number(isMockComponent(b));
    if (mockDelta !== 0) return mockDelta;
    return b.properties.length - a.properties.length;
  })[0];
}

function compileComponent(
  decision: Decision,
  inventory: Inventory,
  candidates: CandidateFile,
): Component {
  if (!decision.acceptedIdentity) {
    throw new BootstrapError('DECISION_REQUIRED', `Decision ${decision.candidate} has no acceptedIdentity`);
  }
  const candidate = candidates.candidates.find((c) => c.id === decision.candidate);
  if (!candidate) {
    throw new BootstrapError('DECISION_REFERENCE_MISSING', `Missing candidate ${decision.candidate}`);
  }
  for (const ref of candidate.observationRefs) {
    const found = inventory.components.some((c) => c.observationId === ref)
      || inventory.styles.some((c) => c.observationId === ref)
      || inventory.usages.some((c) => c.observationId === ref);
    if (!found) {
      throw new BootstrapError('STALE_OBSERVATION', `Decision references missing observation ${ref}`);
    }
  }
  const include = [...new Set(decision.include ?? candidate.members)];
  const members: ObservedComponent[] = include
    .map((id) => pickObservedComponent(inventory, id))
    .filter((c): c is ObservedComponent => Boolean(c));
  const appearance = decision.properties?.appearance?.accepted?.map(String)
    ?? (candidate.candidateProperties?.appearance?.observedValues.map(String) ?? []);
  const defaultAppearance = appearance[0] ?? 'primary';

  const props: Component['props'] = {};
  if (appearance.length > 0) {
    props.appearance = { type: 'string', default: defaultAppearance, enum: appearance };
  }
  props.disabled = { type: 'boolean', default: false };
  const hasSlot = members.some((m) => m.slots.length > 0);
  if (hasSlot) {
    props.content = { type: 'slot', nullable: true };
  }

  const component: Component = {
    title: titleFromIdentity(decision.acceptedIdentity),
    anatomy: {
      root: { type: 'container' },
      ...(hasSlot ? { content: { type: 'slot' } } : {}),
    },
    props,
    default: {
      configuration: { appearance: defaultAppearance, disabled: false },
      elements: {
        root: { children: hasSlot ? ['content'] : [], parent: null },
        ...(hasSlot ? { content: { parent: 'root' } } : {}),
      },
      layout: [
        { root: hasSlot ? ['content'] : [] },
      ],
    },
    variants: appearance.slice(1).map((value) => ({
      configuration: { appearance: value },
    })),
    invalidVariantCombinations: [
      { disabled: true, loading: true },
    ],
  };

  assertComponentShape(component);
  assertPublicComponent(component);
  return component;
}

function acceptedImplementation(
  identity: string,
  platform: string,
  members: ObservedComponent[],
): BindingImplementation {
  const title = titleFromIdentity(identity);
  if (platform === 'angular') {
    const selectors = members
      .map((member) => (member.extensions.angular as { selector?: string } | undefined)?.selector)
      .filter((value): value is string => Boolean(value));
    if (selectors.some((selector) => selector.startsWith('ignt-'))) {
      return { symbol: `Ignt${title}Component`, selector: `ignt-${kebab(title)}` };
    }
    if (selectors.some((selector) => selector.startsWith('ignite-'))) {
      return { symbol: `Ignite${title}Component`, selector: `ignite-${kebab(title)}` };
    }
    return { symbol: `${title}Component`, selector: kebab(title) };
  }
  if (platform === 'react' || platform === 'vue') {
    return { symbol: title, exportName: title, selector: title };
  }
  if (platform === 'ios') {
    const moduleName = (members[0]?.extensions.swiftui as { module?: string } | undefined)?.module;
    return { symbol: title, module: moduleName };
  }
  if (platform === 'android') {
    const pkg = (members[0]?.extensions.compose as { package?: string } | undefined)?.package;
    return { symbol: title, module: pkg };
  }
  return { symbol: title };
}

export interface CompileResult {
  components: Record<string, Component>;
  tokens: Record<string, unknown>;
  bindings: BindingFile;
}

export async function runCompile(workspace: string): Promise<CompileResult> {
  const paths = resolveWorkspace(workspace);
  const inventory = validateInventory(await loadInventory(paths));
  const candidates = await loadCandidateFile(paths.deterministicCandidates);
  const decisions = await loadDecisions(paths);
  if (decisions.decisions.length === 0) {
    throw new BootstrapError('DECISION_REQUIRED', 'No decisions found');
  }

  const platform = bindingPlatformFromInventory(inventory);
  const components: Record<string, Component> = {};
  const tokens: Record<string, { $type: string; $value: unknown; $description?: string }> = {};
  const bindings: BindingFile = { schemaVersion: SIDECAR_SCHEMA_VERSION, bindings: [] };

  for (const decision of decisions.decisions) {
    if (decision.decision === 'REJECT' || decision.decision === 'NEEDS_EVIDENCE') continue;
    const candidate = candidates.candidates.find((c) => c.id === decision.candidate);
    if (!candidate) {
      throw new BootstrapError('DECISION_REFERENCE_MISSING', `Missing candidate ${decision.candidate}`);
    }
    if (candidate.kind === 'COMPONENT' && (decision.decision === 'ACCEPT' || decision.decision === 'ACCEPT_WITH_CHANGES' || decision.decision === 'APPROVE_FOR_STAGING')) {
      if (decision.acceptedIdentity) {
        if (!components[decision.acceptedIdentity]) {
          components[decision.acceptedIdentity] = compileComponent(decision, inventory, candidates);
        }
        const alreadyBound = bindings.bindings.some((binding) => binding.component === decision.acceptedIdentity);
        if (!alreadyBound && decision.decision !== 'APPROVE_FOR_STAGING') {
          const included = [...new Set(decision.include ?? candidate.members)]
            .map((id) => pickObservedComponent(inventory, id))
            .filter((c): c is ObservedComponent => Boolean(c));
          const impl = acceptedImplementation(decision.acceptedIdentity, platform, included);
          bindings.bindings.push({
            component: decision.acceptedIdentity,
            implementations: {
              [platform]: impl,
            },
            propertyMappings: [
              { contractProperty: 'appearance', platform, platformProperty: 'appearance' },
              { contractProperty: 'disabled', platform, platformProperty: 'disabled' },
              ...included.map((member) => ({
                contractProperty: 'selector',
                platform,
                platformProperty: memberPlatformProperty(member, platform),
              })),
            ],
            targets: {
              figma: { status: 'NOT_STARTED' },
              [platform]: { status: 'MATERIALIZED', revision: inventory.workspace.revision },
            },
          });
        }
      }
    }
    if (candidate.kind === 'TOKEN' && candidate.conflicts.every((c) => c.kind !== 'NEAR_TOKEN') && decision.acceptedIdentity) {
      const samples = inventory.styles.filter((style) => candidate.members.includes(style.observationId));
      const palette = samples.find((style) => (style.propertyContext ?? '').startsWith('$palette-'));
      const named = samples.find((style) => (style.propertyContext ?? '').startsWith('$'));
      const sample = palette ?? named ?? samples[0];
      const sassNames = [...new Set(samples.map((style) => style.propertyContext).filter((name): name is string => Boolean(name?.startsWith('$'))))].sort();
      if (sample?.authored || sample?.normalized.canonical) {
        tokens[decision.acceptedIdentity] = {
          $type: sample.normalized.type === 'color' ? 'color' : sample.normalized.type,
          $value: sample.authored,
          $description: [decision.rationale.join(' '), sassNames.length > 0 ? `Sass: ${sassNames.join(', ')}` : ''].filter(Boolean).join(' '),
        };
      }
    }
  }

  await fs.ensureDir(paths.contracts);
  await fs.ensureDir(paths.tokens);
  for (const [id, component] of Object.entries(components).sort(([a], [b]) => a.localeCompare(b))) {
    const fileName = `${id.replace(/[:/]/g, '-')}.yaml`;
    await fs.writeFile(path.join(paths.contracts, fileName), stableStringifyYaml(component));
  }
  if (Object.keys(tokens).length > 0) {
    await fs.writeFile(path.join(paths.tokens, 'color.json'), stableStringifyJson(nestDtcgTokens(tokens)));
  }
  await saveBindings(paths, bindings);
  return { components, tokens, bindings };
}

export function compiledDigest(result: CompileResult): string {
  return digestCanonical(result.components);
}
