---
title: "textAlignHorizontal"
description: "Horizontal text alignment using logical inline-axis directions"
---

Horizontal text alignment using logical inline-axis directions. `START` resolves to left in LTR and right in RTL; `END` is the inverse.

#### Type(s)

| Type | Example |
|---|---|
| `TextAlignHorizontal` | `"START"`, `"CENTER"`, `"END"`, `"JUSTIFY"` |
| `null` | `null` |

Not token-bindable — structural property, not a design value.

#### Supported on

| Element | Figma Layer(s) |
|---|---|
| `text` | Text |

#### Figma key

Reads from `textAlignHorizontal`, remapped to logical directions (`LEFT`→`START`, `RIGHT`→`END`, `JUSTIFIED`→`JUSTIFY`). See [ADR 064 — Text Align Horizontal](https://github.com/rudironsoni/specs/blob/main/adr/064-text-align-horizontal.md).

#### Source

| Format | File |
|---|---|
| TypeScript | [`src/schema/Styles.ts`](https://github.com/rudironsoni/specs/blob/main/src/schema/Styles.ts) |
| JSON Schema | [`src/schema/schema/styles.schema.json`](https://github.com/rudironsoni/specs/blob/main/src/schema/schema/styles.schema.json) |

