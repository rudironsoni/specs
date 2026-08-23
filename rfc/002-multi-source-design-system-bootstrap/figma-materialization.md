# Figma materialization

Companion to [RFC 002](README.md).

---

## Staging flow

```text
candidate
    |
    v
APPROVE_FOR_STAGING decision
    |
    v
staging Figma plan
    |
    v
native staging component
    |
    v
designer review and edits
    |
    v
Figma re-extraction
    |
    v
new observations
    |
    v
final decision
```

The staging file is separate from the approved library. Every staging object shows candidate status, source repository, source revision, source component, capture state, generator version, and unresolved conflicts.

Machine provenance uses plugin data when the transport supports it. Visible annotations are for human reviewers.

Staging content does not publish automatically. Staging output does not overwrite approved components.

A direct designer edit is new evidence after re-extraction. It is not an accepted decision by itself.

---

## Approved flow

Approved plans consume:

```text
canonical Specs contract
+
bindings
+
approved target policy
```

Materialize in dependency order: base tokens, semantic tokens, base components, composite components, patterns. Detect cycles and fail.

`--apply` is mandatory for writes. Default is dry-run.

---

## Native object requirements

Create native Figma objects, not raster stamps:

```text
variables
variable collections
modes
frames
auto layout
components
component sets
component properties
nested instances
slots where supported
descriptions
development resources
stable Specs identities
```

Screenshots remain references. Plugin API support (verified 2026-08-22): `createComponent`, `combineAsVariants`, component properties, variables, `setPluginData` / `setSharedPluginData`, `SlotNode` (Plugin API update 130, June 2026).

---

## Write ownership

Every owned node stores a stable Specs identity. Plugin MCP forbids `setPluginData`. The MCP script uses a `specs:` name prefix plus a visible annotation text. The in-memory transport still uses plugin data. The writer updates only owned nodes. Unknown nodes stay untouched. Deletion is disabled unless `--allow-delete`.

---

## Preconditions

Every plan contains `sourceContractDigest`, `expectedTargetDigest`, owned node identities, and create/update/delete operations.

The writer:

1. Validates target preconditions
2. Produces a dry-run diff
3. Requires `--apply`
4. Updates only owned nodes
5. Preserves unknown nodes
6. Keeps deletion disabled by default
7. Writes operations in stable order
8. Records created or changed identities
9. Supports resume after interruption
10. Produces no changes on a second identical run

A stale target fails `PLAN_PRECONDITION_FAILED` and stops.

---

## Dry runs, idempotence, transport independence

`figma-plan.yaml` never embeds Plugin API, MCP, or REST payloads.

Transport evaluation order:

1. Specs Figma plugin, if its source can host the writer (plugin source is not in this repository)
2. Figma MCP for controlled interactive writes
3. Variables REST API for supported variable sync

First implemented transport: in-memory document with REST JSON export for `Components.fromRestApi`.

MCP live path: `specs bootstrap materialize figma --transport mcp --emit-script` writes Plugin API JavaScript. An agent or human runs that script with Figma `use_figma` against a staging file. Node does not call Figma. The script must not contain `generate_figma_design`. Figma variable names cannot contain `.`, `{`, or `}`. The emitter maps token dots to slashes (`color.brand.primary` becomes `color/brand/primary`). Specs writes v2 Code Connect templates to `--output`. It does not overwrite authored files in the source tree.

### Vendor notes (2026-08-22)

**MCP.** Remote `use_figma` can create, edit, or delete native objects, including components, variants, and variables. It is beta, remote-only, and will become usage-based paid. `generate_figma_design` sends live UI as design layers. Do not use it as the materializer. Do not make MCP the plan contract.

**Variables REST.** GET and POST `/v1/files/:file_key/variables*` require an Enterprise org Full seat (`file_variables:read` / `file_variables:write`). Not mandatory for local bootstrap.

**Plugin API.** Full native create/update for components, component sets, variables, plugin data, and slots.

Live Plugin, MCP, and Variables REST writers in this change are stubs that fail `AUTHENTICATION_REQUIRED`. Live Figma execution is `[UNVERIFIED]`.

---

## Round-trip verification

```text
canonical Specs contract
        |
        v
Figma plan
        |
        v
target document (memory or live)
        |
        v
specs-from-figma
        |
        v
extracted Specs contract
        |
        v
reconciliation
```

Compare: component identity, anatomy, properties, variant axes, accepted combinations, token bindings, layout, styles, slots, dependencies, development resources.

Ignore only documented non-semantic differences, each with a stable exception id. First exceptions:

- `IGNORE_METADATA_TIMESTAMP`
- `IGNORE_GENERATOR_STAMP`

Semantic mismatch fails `ROUND_TRIP_MISMATCH`. The writer does not approve its own output. `Components.fromRestApi` is the independent verifier.

---

## Exception handling

| Code | When |
|---|---|
| `PLAN_PRECONDITION_FAILED` | Digest mismatch or missing owned identity |
| `ROUND_TRIP_MISMATCH` | Extracted contract is not semantically equivalent |
| `TARGET_DRIFT_DETECTED` | Re-extract of code or Figma disagrees with the contract |
| `AUTHENTICATION_REQUIRED` | Live transport selected without credentials |
| `DECISION_REQUIRED` | Staging or approved write lacks the matching decision |
