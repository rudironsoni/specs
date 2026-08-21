---
title: "textOverflow"
description: "How overflowing text is handled"
---

How overflowing text is handled — cut off or trailing ellipsis.

#### Type(s)

| Type | Example |
|---|---|
| `TextOverflow` | `"CLIP"`, `"ELLIPSIS"` |
| `null` | `null` |

Not token-bindable — structural property, not a design value.

#### Supported on

| Element | Figma Layer(s) |
|---|---|
| `text` | Text |

#### Figma key

Reads from `textTruncation` (`DISABLED`→`CLIP`, `ENDING`→`ELLIPSIS`). See [ADR 062 — Text Truncation](https://github.com/rudironsoni/specs/blob/main/adr/062-text-truncation.md).

#### Source

| Format | File |
|---|---|
| TypeScript | [`src/schema/Styles.ts`](https://github.com/rudironsoni/specs/blob/main/src/schema/Styles.ts) |
| JSON Schema | [`src/schema/schema/styles.schema.json`](https://github.com/rudironsoni/specs/blob/main/src/schema/schema/styles.schema.json) |
