---
title: "CLI Overview"
---

The Specs command-line interface (CLI) generates design system specifications from Figma REST API data without requiring the Figma Plugin UI. It enables automation, batch processing, and CI/CD integration.

## Commands

| Command | Purpose | Output |
|---------|---------|--------|
| [`init`](/cli/commands/init/) | Initialize config file with defaults | `specs.config.yaml` |
| [`fetch`](/cli/commands/fetch/) | Download raw REST payloads from Figma | JSON files in `dataDirectory` |
| [`scan`](/cli/commands/scan/) | List all components in file | Markdown manifest |
| [`generate`](/cli/commands/generate/) | Generate specs from a manifest or single component | YAML/JSON spec file(s) |
| [`applyCustomTokens`](/cli/commands/apply-custom-tokens/) | Inject `$custom` objects into fetched data | Modified variables/styles JSON |
| [`bootstrap`](/cli/commands/bootstrap/) | Multi-source ingest from code into Specs | `.specs/bootstrap/` workspace |
| [`bindings`](/cli/commands/bindings/) | Code Connect templates from bindings | `.figma.ts` files |
| [`migrate`](/cli/commands/migrate/) | Plan and apply syntax-aware rewrites | Migration plan YAML and optional source writes |

### Global Options

These options work with all commands:

- `--verbose` - Enable detailed logging
- `--help` - Show command help
- `--version` - Show CLI version

## Output

Generate includes the full spec: anatomy, props, variants, token references, variable bindings, instance examples, and slot-content examples. No license key is required.

## Output Format

The CLI generates the same specification format as the Figma Plugin:

```yaml
components:
  dsButton:
    title: DS Button
    props:
      size:
        type: variant
        values: [small, medium, large]
      variant:
        type: variant
        values: [primary, secondary]
    anatomy:
      - id: container
        name: Container
        type: FRAME
      - id: label
        name: Label
        type: TEXT
    variants:
      - props:
          size: small
          variant: primary
        anatomy:
          container:
            styles:
              paddingLeft: { value: 12, type: ABSOLUTE }
```

## File Outputs

`specs fetch` writes deterministic filenames based on your config aliases.

Example (with `dataDirectory: ./data`):

```
data/
├── library.file.json
├── library.variables.json
├── library.styles.json
├── foundations.variables.json
└── foundations.styles.json
```

`generate` uses these files by default when your `specs.config.yaml` declares the corresponding aliases and data types.

## Requirements

- **Node.js** 18 or higher
- **Figma access token** (for `fetch`) via `FIGMA_TOKEN`
- **Figma REST API data** (JSON files from Figma API endpoints, produced by `fetch`):
  - `file` — any Figma plan with REST API access
  - `variables` / `styles` — Figma restricts these REST endpoints to organizations on an **Enterprise** plan
- **Figma token** via `FIGMA_TOKEN` for fetch

See [Getting Started](/cli/getting-started/) for installation instructions.

## See Also

- [Getting Started](/cli/getting-started/) - Installation and quick start
- [Workflows](/cli/workflows/) - Real-world usage patterns and CI/CD
- [Configuration](/settings/) - Config file reference
