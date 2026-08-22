---
title: "bootstrap"
---

Bootstrap a design system from product code, usages, documentation, runtime evidence, and optional Figma. Output converges on the existing Specs contract. See [RFC 002](https://github.com/rudironsoni/specs/tree/main/rfc/002-multi-source-design-system-bootstrap).

## Usage

```bash
specs bootstrap scan --source ./app --platform angular --workspace .specs/bootstrap
specs bootstrap capture --source ./app --harness ./app/harness
specs bootstrap analyze --workspace .specs/bootstrap
specs bootstrap report --workspace .specs/bootstrap
specs bootstrap validate --workspace .specs/bootstrap --source ./app
specs bootstrap compile --workspace .specs/bootstrap
specs bootstrap plan figma --mode staging
specs bootstrap materialize figma --plan .specs/bootstrap/plans/figma-staging.yaml
specs bootstrap materialize figma --plan .specs/bootstrap/plans/figma-staging.yaml --apply
specs bootstrap reconcile --workspace .specs/bootstrap
```

`--apply` is required for Figma writes. The default materialize path is a dry run. `--transport` accepts `memory` (default), `plugin`, `mcp`, or `variables-rest`. Live transports need `FIGMA_PLUGIN_SESSION`, `FIGMA_MCP_SESSION`, or `FIGMA_TOKEN` plus `FIGMA_FILE_KEY`. They are `[UNVERIFIED]` against a real Figma file until those credentials exist.
