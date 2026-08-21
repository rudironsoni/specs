---
title: "maxLines"
description: "Line limit before text truncates with ellipsis"
---

Maximum number of lines before `textOverflow: "ELLIPSIS"` applies.

#### Type(s)

| Type | Example |
|---|---|
| `number` | `3` |
| [`TokenReference`](/schema/token-reference/) | `$token: ...`<br>`$type: number` |
| `null` | `null` (no limit) |

#### Supported on

| Element | Figma Layer(s) |
|---|---|
| `text` | Text |

#### Source

| Format | File |
|---|---|
| TypeScript | [`src/schema/Styles.ts`](https://github.com/rudironsoni/specs/blob/main/src/schema/Styles.ts) |
| JSON Schema | [`src/schema/schema/styles.schema.json`](https://github.com/rudironsoni/specs/blob/main/src/schema/schema/styles.schema.json) |
