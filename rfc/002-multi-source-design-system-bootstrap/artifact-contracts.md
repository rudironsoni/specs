# Artifact contracts

Companion to [RFC 002](README.md). Sidecar contracts live in `@rudironsoni/specs-cli` at `src/cli/bootstrap/schema/`. They are not published from `@rudironsoni/specs-schema`.

JSON Schema Draft 07. TypeScript types stay in parity with the schemas. `schemaVersion` is `1` on every document.

Only run records may contain wall-clock timestamps or random UUIDs.

---

## Workspace layout

Default path: `.specs/bootstrap/` (override with `--workspace` or `bootstrap.workspace` in CLI config).

```text
.specs/bootstrap/
├── observed/inventory.json
├── candidates/deterministic.yaml
├── candidates/agent.yaml
├── decisions/decisions.yaml
├── contracts/components/
├── contracts/tokens/
├── bindings/bindings.yaml
├── plans/figma-staging.yaml
├── plans/figma-approved.yaml
├── evidence/renders/
├── evidence/accessibility/
├── evidence/structures/
├── reports/index.html
└── runs/<run-id>.json
```

`scan` and `analyze` never overwrite `decisions/decisions.yaml` or `candidates/agent.yaml`. Large screenshots, traces, and DOM snapshots stay uncommitted.

---

## Identity

### Observation identity

Content-addressed SHA-256 of canonical JSON over:

```text
schemaVersion
observationKind
sourceIdentity
sourceRevision
sourceLocator
normalizedPayload
extractorVersion
```

A changed fact creates a new observation identity.

### Logical entity identity

Stable platform identity:

```text
angular:<package>:<selector>
react:<package>:<export>
vue:<package>:<component>
swift:<module>:<symbol>
kotlin:<package>:<symbol>
figma:<file-key>:<component-key>
```

Renames create alias records. Source line numbers are locators, not identities.

### Provenance (required on every observation)

```text
sourceRevision
sourceFileDigest
locator
sourcePath
rawValue
normalizedValue
extractorName
extractorVersion
environmentFingerprint
relatedObservations
```

Runtime observations also record capture environment (browser or simulator, version, OS, font set, scale, locale, timezone, theme, viewport, fixture id).

---

## Inventory

`inventory.schema.json`. Observed facts only. No approved semantic decisions.

Top-level:

- `schemaVersion`
- `workspace.repository`
- `workspace.revision`
- `sources[]` (`kind`, `platform`, `extractor`, `extractorVersion`, `revision`, `digest`)
- `components[]`
- `usages[]`
- `styles[]`
- `renderCases[]`
- `documents[]`
- `figmaAssets[]`
- `failures[]`
- `aliases[]`

Shared component facts (platform details under `extensions`):

```text
id, properties, events, slots, defaults, enumerated values,
composition, dependencies, documentation, deprecations, source locations
```

Example Angular extension: `{ selector, standalone }`.

A failed extractor may return partial evidence plus a failure record. It must not invent output.

---

## Candidate

`candidate.schema.json`. Possible tokens, families, properties, variants, and mappings.

Files:

- `candidates/deterministic.yaml` (script output)
- `candidates/agent.yaml` (agent output)

Every candidate references observation ids. Evidence is counts and lists, not a single confidence number.

Conflict kinds include `CODE_ONLY_STATE`, `INCONSISTENT_EVENT_NAME`, `NEAR_TOKEN`, `FIGMA_CODE_MISMATCH`.

Agent entries also record `agentIdentity`, `modelIdentity`, `promptVersion`.

---

## Decision

`decision.schema.json`. Human decisions. Stored as a list in `decisions.yaml`.

Fields: `candidate`, `decision`, `acceptedIdentity`, `include`, `exclude`, `properties`, `unresolved`, `approvedBy`, `rationale`.

Decision enum:

```text
ACCEPT
ACCEPT_WITH_CHANGES
REJECT
MERGE
SPLIT
DEPRECATE
EXCEPTION
NEEDS_EVIDENCE
APPROVE_FOR_STAGING
```

Merge rule: regeneration upserts by `candidate`. Existing decisions are never deleted.

---

## Binding

`binding.schema.json`. Maps a Specs component id to Figma and platform implementations.

Fields: `component`, `figma` (`fileKey`, `componentKey`), `implementations` (per platform: `symbol`, plus platform fields such as `selector`), `propertyMappings[]`, `targets`.

`targets` holds per-target lifecycle:

```yaml
targets:
  figma:
    status: VERIFIED
    revision: "<figma-version>"
  angular:
    status: MATERIALIZED
    revision: "<git-sha>"
  ios:
    status: NOT_STARTED
```

Status values: `NOT_STARTED`, `MATERIALIZED`, `VERIFIED`.

Platform APIs do not need identical names. Bindings translate them.

---

## Figma plan

`figma-plan.schema.json`. Native Figma operations. Independent of REST, MCP, and Plugin payloads.

- `mode`: `STAGING` | `APPROVED`
- `sourceContractDigest`
- `expectedTargetDigest` (null on first write)
- `variables[]`, `components[]`, `componentSets[]`, `bindings[]`, `annotations[]`
- `operations.create|update|delete`

Deletion is empty unless `--allow-delete`. Staging and approved plans are separate files.

---

## Run record

`run.schema.json`. Execution state.

- `runId` (UUID)
- `workflow`
- `startedAt`
- `inputDigests`
- `outputDigests`
- `completedNodes[]`
- `failedNodes[]`
- `artifacts[]`

---

## Stale evidence

Compile and `bootstrap validate` fail with `STALE_OBSERVATION` when:

- an observation's `sourceFileDigest` no longer matches the file
- an observation's `sourceRevision` no longer matches `workspace.revision` for that source
- a decision references a missing observation or candidate

Missing evidence is a failure record, not a guessed fill.

---

## Deterministic serialization

- Sorted object keys
- Stable array order unless order is semantic (then preserve source order and record it)
- POSIX relative paths
- Recorded extractor versions and source digests
- No wall-clock timestamps in inventory, candidates, decisions, contracts, bindings, or plans
- Content-derived identifiers except in run records

Two clean runs with the same inputs produce byte-identical deterministic files.
