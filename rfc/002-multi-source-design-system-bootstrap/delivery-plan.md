# Delivery plan

Companion to [RFC 002](README.md). Plan by dependency, not by calendar.

---

## Dependency graph

```text
A  Accept RFC 002
|
v
B  Define lifecycle, identity, and sidecar schemas
|
+-----------------+
v                 v
C  Platform       D  Reports, decisions,
   pack contract     and contract compiler
|
+-----------------+----------------+----------------+
v                 v                v                v
E Angular         F React          G Vue            H Native fixtures
|
v
I Angular usage and style extraction
|
v
J Web runtime capture
|
v
K Deterministic candidate analysis
|
v
L Staging Figma materialization
|
v
M Decision compilation
|
v
N Approved Figma materialization
|
v
O Figma re-extraction and reconciliation
|
+-------------------------+
v                         v
P React and Vue           Q SwiftUI and Compose
  full parity               full parity
|                         |
+------------+------------+
             v
R Code Connect templates
             |
             v
S Migration harness
             |
             v
T Production pilot
```

This implementation ships A as Accepted, plus B, C, D, E, F, G, H, I, K, L, M, N, O on an in-memory Figma transport, Angular fixture capture (J via FixtureRenderer, Playwright when a harness and Playwright are present), Code Connect template emission without publish, fixture-level S with `specs migrate apply`, and an optional external-source scan for T when `SPECS_BOOTSTRAP_SOURCE` is set. Live Figma transports exist and remain `[UNVERIFIED]` against a real file.

---

## Milestones

### M0: RFC accepted

RFC 002 and companions exist. Authority, lifecycle, scope, and non-goals are explicit. Status is `Accepted`.

### M1: Shared bootstrap contracts

Pass when internal schemas validate, identities are stable, provenance rules exist, deterministic serialization tests pass, and all five targets have fixtures plus capability manifests.

### M2: Angular end to end

Pass when Angular reaches static extraction, runtime capture (harness), inventory, deterministic candidates, decision record, Specs compile, staging plan, approved plan, test materialization, re-extraction, and reconciliation.

Live Figma may remain `[UNVERIFIED]`.

### M3: Web parity

React and Vue use the same observation and candidate model. Framework fields stay in extensions.

### M4: Native parity

SwiftUI and Compose use the same lifecycle and binding rules.

### M5: Migration and production pilot

One real legacy repository completes a migration wave. General availability requires all five target packs.

---

## Vertical slice

Controlled Angular fixture:

- two related legacy buttons
- one dependent composite
- one exact duplicate style
- one near-duplicate style
- one explicit story
- one accessibility state
- one ambiguous variant
- one unsupported combination
- one wrapper
- one deprecated usage

The slice must run without an LLM.

---

## Test strategy

Unit tests for schemas, identity, stale detection, style normalization, exact versus near tokens, variant-product protection, decisions, compile, plans, write preconditions, unknown-node preservation, second-write no-op, failure codes, redaction, serialization.

Golden fixtures where bytes matter.

One Angular integration test for the full slice.

React, Vue, SwiftUI, Compose: fixture scan, compile, Code Connect, and migrate apply. Capability manifests must match implementation.

---

## Production pilot

The first product repository is a consuming Angular tree passed as `--source`. Do not hardcode a product path, selector prefix, or framework version in this RFC.

When access exists, record git revision, Angular version, Node version, lockfile digest, browser, fonts, themes, viewports, locales, source component identities, Figma identities, Storybook coverage, tests, and style technologies.

Do not mix a framework migration with the first evidence baseline.

Do not choose Button before inventory. Rank with visible metrics. The design-system owner picks one base family, one composite, and one shared token family.

Pilot success: reproducible inventory, current evidence on decisions, native Figma without manual reconstruction, re-extraction match, bindings for accepted properties, syntax-aware migration, second migration no-op, build and tests pass, visual and accessibility checks pass.

---

## Definition of done (this change)

See RFC 002 core principles plus:

- No second canonical component contract
- Internal contracts have validation and TypeScript types
- Angular vertical slice integration test passes
- Live Figma labeled `[UNVERIFIED]` when only the in-memory transport ran
- Honest capability manifests
- `npm run build` and `npm test` ran
