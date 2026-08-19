# specs-from-figma (clean-room recreation)

This folder holds a clean-room Figma-to-spec engine by rudironsoni.

`src/` is a new engine written from public artifacts:

- `@rudironsoni/specs-schema` (MIT)
- public ADRs and the MIT CLI contract
- the leaked `0.22.0` npm type tree (method names and comments only)

See [ATTRIBUTION.md](ATTRIBUTION.md).

Current milestone: REST and plugin entry points, anatomy (`detectedIn`), layout (`LAYOUT` / `PARENT_CHILDREN` / `BOTH`), styles, glyph fill walk, mixed text runs, image fill styles, typography/effects/gradient processors, pairings, slots, `$nested`, code-only extractors, image routing, `processing.states`, progress coordinator, and `--get-images`. All generate output is ungated.

## Public API

```typescript
import { Components } from '@rudironsoni/specs-from-figma';
import { DEFAULT_CONFIG } from '@rudironsoni/specs-schema';

const results = await Components.fromRestApi(
  ['Button'],
  libraryJson,
  DEFAULT_CONFIG,
  { styles: new Map(), variables: new Map(), collections: new Map() },
  (event) => console.log(event.status, event.component),
);
```

## Overview

`@rudironsoni/specs-from-figma` provides:
- **Component Processing**: Transform Figma design components into structured specifications
- **Runtime Abstractions**: Platform-agnostic data loading and node resolution
- **Cross-Platform Support**: Works in both Node.js (CLI/MCP) and Browser (Figma Plugin) environments

## Installation

```bash
npm install @rudironsoni/specs-from-figma
```

## Usage

### Plugin environment

```typescript
import { Component } from '@rudironsoni/specs-from-figma';

const component = await Component.fromPlugin(figmaNode, config);
console.log(component.yaml());
```

An optional `coordinator` and `author` can be passed as a third argument.

### CLI / REST API environment

```typescript
import { Component } from '@rudironsoni/specs-from-figma';
import type { StylesMap, VariablesMap, CollectionsMap } from '@rudironsoni/specs-from-figma';

const component = await Component.fromRestApi(
  libraryJson,
  componentId,
  config,
  { styles, variables, collections }
);
console.log(component.yaml());
```

Both factory methods return a fully-processed `Component`. Call `.yaml()` for a YAML string or `.json()` for a plain object.

### Image bytes (`--get-images`)

Detection writes `figma:<hash>` placeholders. Resolve bytes later:

```bash
npx specs-from-figma --get-images --file spec.json --figma-file FILE_KEY --token "$FIGMA_TOKEN" --out-dir ./out
```

Or call `resolveComponentImages()` from the library.

## Public API

The public surface is intentionally minimal. All internal runtime and processing code is bundled and not re-exported.

### `Component`

Main transformation class. Use the static factory methods. Do not call `new Component()` directly.

| Method | Description |
|--------|-------------|
| `Component.fromPlugin(node, config, options?)` | Process a Figma Plugin API node |
| `Component.fromRestApi(json, id, config, options)` | Process a component from REST API JSON |
| `component.yaml()` | Returns a YAML string of the component specification |
| `component.json()` | Returns a plain JavaScript object |

### Foundations map types

Used as the `options` payload for `fromRestApi`:

- `StylesMap` — map of style IDs to style data
- `VariablesMap` — map of variable IDs to variable data
- `CollectionsMap` — map of collection IDs to collection data

Output schema types (e.g. `Component` from `@rudironsoni/specs-schema`) are provided by the `specs-schema` package.

## Development

### Building

```bash
npm install
npm run build
npm run build:types
npm run build:js
```

### Testing

```bash
npm test
```

## Version & Compatibility

- **Version**: 0.28.0 (Pre-1.0 — breaking changes may occur in minor versions)
- **Node.js**: 20+ required
- **Target**: ES2020
- **Module Format**: ESM only

## License

[PolyForm Internal Use License 1.0.0](LICENSE)

## Repository

https://github.com/rudironsoni/specs
