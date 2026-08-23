# Platform packs

Companion to [RFC 002](README.md).

---

## Adapter interfaces

Do not create one adapter with many optional methods. A pack is a bundle of focused adapters plus a capability manifest.

```text
PlatformPack
  ├── CodeModelAdapter      # declarations, exports, public API
  ├── UsageAdapter          # call sites, wrappers, composition
  ├── StyleAdapter          # declared and authored style values
  ├── RenderCaseAdapter     # stories, previews, tests, fixtures
  ├── RendererAdapter       # screenshots, structure, computed styles, a11y
  ├── RewriteAdapter        # syntax-aware migration
  └── CodeConnectAdapter    # maintained template files
```

Each adapter returns facts plus failure records. It does not group candidates. It does not write decisions.

Capability values: `SUPPORTED`, `CONDITIONAL`, `UNSUPPORTED`.

`CONDITIONAL` means the consuming repository must supply a working build or render harness.

Commands declare required capabilities and fail with `CAPABILITY_UNAVAILABLE` when a required one is missing.

---

## Shared normalization

Every pack normalizes into:

```text
components
public properties
events
slots
defaults
enumerated values
composition
dependencies
documentation
deprecations
source locations
usage sites
usage values
```

Platform-specific facts live under `extensions`. Example:

```yaml
component:
  id: angular:kit:button
  properties: []
  events: []
  slots: []
  extensions:
    angular:
      selector: kit-button
      standalone: true
```

Do not add Angular-only fields to the shared root.

Usage graph edges:

```text
imported by
instantiated by
wrapped by
composed with
rendered inside
tested by
documented by
deprecated by
```

Metrics stay separate. Do not collapse them into one score. A ranking formula, if added, must be deterministic, versioned, and documented.

---

## Angular pack (first implementation)

| Capability | Value | Notes |
|---|---|---|
| api | SUPPORTED | TypeScript compiler API plus `@Component` metadata, `input()`, `output()`, signal inputs |
| usage | SUPPORTED | Template selector scan plus TypeScript references |
| styles | SUPPORTED | CSS custom properties, inline styles, style URLs |
| renderCases | SUPPORTED | CSF stories and explicit tests |
| rendering | CONDITIONAL | Fixture harness in tests. Playwright is not a hard dependency |
| rewrite | SUPPORTED | TypeScript AST. Template rewrite uses `@angular/compiler` from the target repo when present |
| codeConnect | TEMPLATE | Maintained `.figma.ts` templates |

Static scan works without Figma and without Storybook.

Inspect: `@Component` metadata, standalone imports, inputs, signal inputs, outputs, `output()`, templates, content projection, host bindings, directives, pipes, providers, style URLs, inline styles, template usage, TypeScript usage.

Compodoc: optional ingest of an existing `documentation.json`. Do not spawn Compodoc by default.

---

## React pack

| Capability | Value | Notes |
|---|---|---|
| api | SUPPORTED | TypeScript compiler API on function and const components that return JSX |
| usage | SUPPORTED | JSX opening elements |
| styles | SUPPORTED | CSS files plus hex literals in TSX |
| renderCases | SUPPORTED | CSF stories |
| rendering | CONDITIONAL | Fixture harness JSON |
| rewrite | SUPPORTED | Identifier rewrite from bindings |
| codeConnect | TEMPLATE | Maintained `.figma.ts` templates |

Logical id: `react:<package>:<export>`.

---

## Vue pack

| Capability | Value | Notes |
|---|---|---|
| api | SUPPORTED | Vue SFC `defineProps` / `defineEmits` |
| usage | SUPPORTED | Template start tags |
| styles | SUPPORTED | SFC style blocks and CSS |
| renderCases | SUPPORTED | CSF stories |
| rendering | CONDITIONAL | Fixture harness JSON |
| rewrite | SUPPORTED | Identifier rewrite from bindings |
| codeConnect | TEMPLATE | Maintained `.figma.ts` templates |

Logical id: `vue:<package>:<component>`.

---

## SwiftUI pack

| Capability | Value | Notes |
|---|---|---|
| api | SUPPORTED | Regex `struct Name: View` plus property declarations |
| usage | SUPPORTED | Call-site scan |
| styles | SUPPORTED | Hex literals and `Color(red:green:blue:)` |
| renderCases | SUPPORTED | `#Preview` and `PreviewProvider` |
| rendering | CONDITIONAL | Fixture harness JSON |
| rewrite | SUPPORTED | Identifier rewrite from bindings |
| codeConnect | TEMPLATE | Maintained `.figma.ts` templates |

Logical id: `swift:<module>:<symbol>`. UIKit is a later extension.

---

## Compose pack

| Capability | Value | Notes |
|---|---|---|
| api | SUPPORTED | Regex `@Composable fun Name` |
| usage | SUPPORTED | Call-site scan |
| styles | SUPPORTED | Hex literals in Kotlin |
| renderCases | SUPPORTED | `@Preview` |
| rendering | CONDITIONAL | Fixture harness JSON |
| rewrite | SUPPORTED | Identifier rewrite from bindings |
| codeConnect | TEMPLATE | Maintained `.figma.ts` templates |

Logical id: `kotlin:<package>:<symbol>`. Android Views are a later extension.

---

## Style and token extraction

Collect authored and normalized forms. Exact normalized equivalents may group in deterministic candidates. Near equivalents stay suggestions. Existing token names are evidence, not approved names.

Accepted tokens emit DTCG Format Module **2025.10** (`$type`, `$value`, `$description`). Do not implement the preview draft. Do not claim Style Dictionary 2025.10 coverage. Style Dictionary v4 has first-class DTCG. Official docs state 2025.10 is not fully supported yet (work in v5).

---

## Render requirements

Discovery order:

1. Explicit stories or native previews
2. Existing tests and fixtures
3. Observed production combinations
4. Required interaction states
5. Additional accepted combinations

Report observed, documented, tested, runtime, accepted, missing required, unobserved, and unsupported combinations. Unobserved is not unsupported.

Variant sets larger than `bootstrap.variantSetLimit` (default 64) fail `VARIANT_SET_TOO_LARGE`.

RendererAdapter is CONDITIONAL. A capture manifest lists routes or stories, locators, environment, interactions, and collect list. Uncontrolled environments are not a strict visual oracle.

Playwright `locator.ariaSnapshot()` YAML is the accessibility evidence format when Playwright runs. Automated checks are not approved accessibility policy.

---

## Rewrite requirements

Syntax-aware transforms. Dry-run. Per-file diffs. Stable warning codes. Idempotent. Second-run no-op. Manual review markers for ambiguous sites. No regular expressions for templates or language syntax.

Angular uses the TypeScript AST plus template identifier rewrite. React, Vue, SwiftUI, and Compose use bounded identifier rewrite from bindings. They do not parse templates with a language compiler.

---

## Code Connect requirements

Verified 2026-08-22: Code Connect v2.0.0 makes template files the only maintained authoring path. Framework-specific parsers remain for `figma connect migrate` and `unpublish`.

Generate one `.figma.ts` per accepted platform binding using `import figma from 'figma'`, `figma.selectedInstance`, and `figma.code`. Property mappings come from the binding. Do not infer mappings at publication. This change does not publish to Figma.
