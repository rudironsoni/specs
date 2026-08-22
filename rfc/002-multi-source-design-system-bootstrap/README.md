# RFC 002: Multi-source design-system bootstrap

| | |
|---|---|
| **Status** | Accepted |
| **Authors** | Rudimar Ronsoni |
| **Date** | 2026-08-22 |
| **Index** | [RFCs](../README.md) |

---

## Contents

- [Summary](#summary)
- [Motivation](#motivation)
- [Required end state](#required-end-state)
- [Authority model](#authority-model)
- [Lifecycle](#lifecycle)
- [Core principles](#core-principles)
- [Architecture](#architecture)
- [Deterministic and agent boundaries](#deterministic-and-agent-boundaries)
- [Human approval rules](#human-approval-rules)
- [Relationship to RFC 001](#relationship-to-rfc-001)
- [Relationship to the existing Specs schema](#relationship-to-the-existing-specs-schema)
- [Relationship to existing tools](#relationship-to-existing-tools)
- [Alternatives considered](#alternatives-considered)
- [Drawbacks](#drawbacks)
- [Unresolved questions](#unresolved-questions)
- [Future work](#future-work)
- [Companion documents](#companion-documents)

---

## Summary

This RFC proposes a second ingest path into the existing Specs contract. Path A stays as it is: approved Figma through `specs-from-figma` into a schema-valid `Component`. Path B starts from product code, usages, documentation, runtime evidence, and optional Figma. It records observed facts, proposes candidates, waits for human decisions, then compiles those decisions into the same Specs contract. It does not add a second canonical component schema.

Existing code records the current implementation. It does not automatically define the future design system. Facts, proposals, decisions, materialized outputs, and verified outputs stay separate.

The first implementation lives inside `@rudironsoni/specs-cli`. Angular is the first end-to-end platform. React, Vue, SwiftUI, and Jetpack Compose ship extractors, rewrite, and Code Connect templates in the same CLI. Live Figma Plugin, MCP, and Variables REST transports exist and fail closed without credentials. They are `[UNVERIFIED]` against a real Figma file until credentials are present.

---

## Motivation

Many product teams already have UI in code and only a partial, outdated, or missing Figma library. Specs today can ingest approved Figma. It cannot bootstrap a design system from that product code without pretending Figma is complete.

A team in that state needs:

- a reproducible inventory of what the product actually implements
- a way to group near-duplicates without silently renaming them
- a human decision step before anything becomes canonical
- a compile step into the Specs contract already consumed by `generate`, `transform`, and `analyze`
- a Figma writer that creates native objects, not screenshot stamps
- a round-trip check that re-extracts Figma with `specs-from-figma` instead of trusting the writer

Without that path, teams either redraw everything in Figma by hand, or they treat whatever the code happens to export as the design system. Both fail. The first is too slow. The second freezes accidents into policy.

---

## Required end state

`specs` supports two ingest paths that converge on one contract.

```text
PATH A

approved Figma
      |
      v
specs-from-figma
      |
      v
canonical Specs contract
      |
      v
Component Dictionary and other projections
```

```text
PATH B

code + usages + documentation + runtime evidence + optional Figma
      |
      v
observed inventory
      |
      v
candidate analysis
      |
      v
human decisions
      |
      v
canonical Specs contract
      |
      v
Figma materialization + platform bindings
      |
      v
re-extraction and verification
      |
      v
migration and conformance
```

The path must work when Figma is complete, partial, outdated, or absent.

Target platforms:

- Angular (first complete vertical slice)
- React (extractor, rewrite, Code Connect templates)
- Vue (extractor, rewrite, Code Connect templates)
- iOS with SwiftUI first (extractor, rewrite, Code Connect templates)
- Android with Jetpack Compose first (extractor, rewrite, Code Connect templates)

A component can be `VERIFIED` in Figma and Angular and `NOT_STARTED` on iOS. Status is per target.

---

## Authority model

No single source owns all truth during bootstrap.

| Artifact | Authority |
|---|---|
| Observed inventory | Facts from an exact source revision |
| Candidate files | Possible consolidation, naming, or mapping |
| Decision record | Accepted semantic decisions and exceptions |
| Specs contract | Canonical machine contract |
| Approved Figma | Reviewed visual implementation |
| Platform code | Runtime behavior and platform API |
| Binding file | Translation between contract, Figma, and code |
| Verification report | Deterministic comparison against policy |

When sources disagree, record both, show evidence, request a decision, then regenerate affected plans. Scripts do not pick a winner.

---

## Lifecycle

```text
OBSERVED
   |
   v
CANDIDATE
   |
   v
ACCEPTED
   |
   v
MATERIALIZED[target]
   |
   v
VERIFIED[target]
```

`MATERIALIZED` and `VERIFIED` are target-specific. They live on the binding record, not on the Specs `Component`.

Candidate decisions:

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

`APPROVE_FOR_STAGING` permits native staging Figma output. It is not final acceptance. Staging content cannot publish into the approved library automatically.

---

## Core principles

1. Scripts collect facts and run deterministic normalization.
2. Agents may propose names, groupings, mappings, and variants.
3. Agents may not approve their own proposals.
4. Human decisions compile into the existing Specs contract.
5. Candidate data cannot enter the approved Figma library.
6. Generated files must not overwrite authored decisions.
7. Deterministic commands must not call an LLM.
8. A second identical run produces no semantic change.
9. A second identical write produces no target change.
10. The system must not invent missing values.
11. Missing evidence stays visible.
12. Screenshots are evidence only. Final Figma libraries use native Figma objects.
13. Do not generate the full Cartesian product of variant values.
14. Do not use opaque confidence scores.
15. Do not force atom, molecule, or organism labels.
16. Reconciliation reports differences. It does not choose authority.
17. Private source and authenticated application data stay local by default.
18. Deletion of Figma nodes stays disabled by default.
19. Approved Figma changes require explicit `--apply` authorization.

---

## Architecture

Bootstrap stays inside `@rudironsoni/specs-cli` until a second published consumer needs the API. Dependency direction does not change:

```text
@rudironsoni/specs-schema
        |
        v
@rudironsoni/specs-from-figma
        |
        v
@rudironsoni/specs-cli
```

`src/from-figma` does not move. Path A commands stay as they are.

Internal sidecar contracts (not published, not in `specs-schema`):

1. Inventory
2. Candidate
3. Decision
4. Binding
5. Figma plan
6. Run record

Default workspace:

```text
.specs/bootstrap/
```

The path is configurable (`--workspace` or CLI config `bootstrap.workspace`).

Platform packs compose focused adapters:

```text
PlatformPack
  ├── CodeModelAdapter
  ├── UsageAdapter
  ├── StyleAdapter
  ├── RenderCaseAdapter
  ├── RendererAdapter
  ├── RewriteAdapter
  └── CodeConnectAdapter
```

Each pack publishes a capability manifest with `SUPPORTED`, `CONDITIONAL`, or `UNSUPPORTED`. A command that needs a missing capability fails. It does not emit a silent incomplete result.

Figma plans are transport-independent. The default writer is an in-memory document that can export REST-shaped JSON for `Components.fromRestApi`. Plugin API, MCP `use_figma`, and Variables REST transports are implemented and fail closed without session or token environment variables. Vendor payloads are not the plan contract. Live writes against a real Figma file stay `[UNVERIFIED]` until credentials exist.

Verified vendor facts as of 2026-08-22 are in [figma-materialization.md](figma-materialization.md) and [platform-packs.md](platform-packs.md). The important ones:

- Code Connect v2.0.0 maintains template files only. Framework parsers remain for migrate and unpublish.
- Figma MCP remote `use_figma` can write native objects. It is beta, remote-only, and will become usage-based paid. `generate_figma_design` is code-to-canvas, not native component construction.
- Variables REST requires an Enterprise Full seat.
- DTCG Format Module 2025.10 is the first stable Community Group spec. Do not implement the preview draft at `designtokens.org/tr/drafts/format/`.
- Style Dictionary v4 has DTCG support. It does not yet fully cover 2025.10.

---

## Deterministic and agent boundaries

Deterministic commands: `bootstrap scan`, `capture`, `analyze`, `report`, `validate`, `compile`, `plan`, `materialize`, `reconcile`, `bindings generate`, `migrate plan`, `migrate apply --dry-run`, `migrate verify`.

These commands never call an LLM. `analyze` groups exact duplicates, equivalent normalized values, identical selectors or exports, and identical token references. It does not invent semantic names.

Agent skills write `candidates/agent.yaml` only. They cite observation ids, list unresolved questions, and leave decisions, contracts, and live Figma untouched.

Agent candidates are not byte-deterministic. They stay out of golden outputs.

---

## Human approval rules

- Decisions live in `decisions/decisions.yaml`.
- Regeneration merges by candidate id. It never deletes a decision.
- Compile fails on missing required decisions, stale observations, identity collisions, unmappable values, or schema-invalid output.
- `APPROVE_FOR_STAGING` is required before a staging plan may create native objects.
- Approved-mode materialize requires `--apply`.
- A designer edit in staging Figma becomes new evidence after re-extraction. It is not an accepted decision by itself.

---

## Relationship to RFC 001

RFC 001 defines the Component Dictionary: deterministic projections *from* a validated Specs contract. RFC 002 defines a second ingest *into* that same contract.

RFC 001 already treated Figma as one ingest among possible others and left multi-origin reconciliation out of scope. This RFC takes that work.

`specs transform` and `specs analyze` remain Path A / post-contract tools. They consume canonical specs. They are not Path B scanners.

Script versus inference stays aligned with RFC 001: scripts own facts and projections. Agents own proposals. Humans own acceptance.

---

## Relationship to the existing Specs schema

The canonical component type remains `Component` in `@rudironsoni/specs-schema`. Bootstrap does not add `accepted-system.schema.json`.

Compiled Path B contracts omit `metadata`. `Metadata.source` is Figma-shaped and `Metadata.lastUpdated` is a timestamp. Putting either on a code-compiled contract would either invent Figma ids or violate determinism.

Platform-specific facts stay in observation `extensions` and in bindings, following ADR-026 `$extensions` reverse-domain keys when they later enter the public contract.

If compile cannot express an accepted shared concept in the current schema:

1. stop compile
2. document the missing concept
3. draft an ADR
4. update TypeScript and JSON Schema together
5. pass constitution gates
6. resume

This RFC does not change `specs-schema` in the first implementation.

---

## Relationship to existing tools

| Tool | Relationship |
|---|---|
| `specs fetch` / `scan` / `generate` | Unchanged Path A |
| `specs-from-figma` | Independent verifier after Figma writes. Also the Path A engine |
| `specs transform` / `analyze` | Consume compiled contracts. Not bootstrap scan |
| Compodoc | Optional extra source when a `documentation.json` is supplied |
| TypeScript compiler API | Default Angular/React static model |
| Storybook `/index.json` and CSF | Render-case discovery. A running Storybook is not required |
| Playwright `ariaSnapshot()` | Accessibility evidence format when a renderer exists |
| Figma Code Connect templates | Generated from bindings. Not published in this change |
| Style Dictionary | Not a dependency. DTCG JSON is emitted directly |
| Commercial code-to-Figma services | Opt-in only. Off by default |

---

## Alternatives considered

**Treat code as the canonical contract.** Rejected. Code records the current implementation, including accidents, wrappers, and product-specific forks.

**Add `accepted-system.schema.json` as a second canonical model.** Rejected. Every downstream consumer already compiles against `Component`. A second spine recreates the multi-consumer mismatch RFC 001 removed.

**Publish `@rudironsoni/specs-bootstrap` now.** Rejected. There is one consumer: the CLI. A package wait until a second consumer exists.

**Put bootstrap types in `specs-schema`.** Rejected. Constitution III forbids downstream-only details in the public contract.

**One fat platform adapter with optional methods.** Rejected. Optional methods hide missing capabilities. Capability manifests fail closed.

**Use MCP `generate_figma_design` as the materializer.** Rejected. That tool sends live UI as design layers. Final libraries must be native Figma objects.

**Make Variables REST mandatory.** Rejected. It is Enterprise Full seat only.

**Cartesian variant generation.** Rejected. Five booleans become 32 combinations, many invalid. Observed plus accepted combinations are the default.

---

## Drawbacks

- Path B compile produces a thinner visual `Component` than Path A until Figma materialization and re-extraction fill layout and style.
- Angular template rewrite quality depends on `@angular/compiler` being present in the scanned repo.
- In-memory Figma is not live Figma. Round-trip tests prove plan and REST export shape, not Plugin or MCP behavior.
- Native SwiftUI and Compose extractors are regex-based. They are weaker than the TypeScript compiler path used for Angular, React, and Vue.
- Human decision load is real. The report exists to make that load reviewable, not to remove it.

---

## Unresolved questions

1. Default `bootstrap.variantSetLimit` is 64. Change it if production inventories show a better cap.
2. Where target status is stored: this RFC puts it on the binding record. A dedicated status file is possible later if bindings become too large.
3. Whether a later ADR should make `Metadata.source` ingest-agnostic so Path B contracts can carry code provenance in the public schema.
4. Whether the Specs Figma plugin (separate repository) should host the first live writer. That source is not in this repo.

---

## Future work

- Code Connect publish to Figma. This change writes maintained template files only.
- Live Plugin / MCP / Variables REST writes against a real Figma file. Transports exist. They are `[UNVERIFIED]` without credentials.
- A Figma plugin host for the plugin transport. That source is not in this repo.
- A production migration wave on feverzoneclient after a human picks one base family, one composite, and one token family from the Ignite inventory.
- Schema ADR for ingest-agnostic metadata if Path B contracts need public provenance.

---

## Companion documents

- [artifact-contracts.md](artifact-contracts.md)
- [platform-packs.md](platform-packs.md)
- [figma-materialization.md](figma-materialization.md)
- [delivery-plan.md](delivery-plan.md)
