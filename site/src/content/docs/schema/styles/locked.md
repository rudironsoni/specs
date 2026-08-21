---
title: "locked"
description: "Whether an element is locked from editing in Figma"
---

Whether the element is locked from editing in Figma.

#### Type(s)

| Type | Example |
|---|---|
| `boolean` | `true` |
| [`TokenReference`](/schema/token-reference/) | `$token: ...`<br>`$type: boolean` |

#### Supported on

| Element | Figma Layer(s) |
|---|---|
| `container` | Component, Frame, Instance, Slot |
| `text` | Text |
| `glyph` | Glyph |
| `vectors` | Rectangle, Vector, Ellipse, Star, Polygon |
| `line` | Line |

#### Source

| Format | File |
|---|---|
| TypeScript | [`src/schema/Styles.ts`](https://github.com/rudironsoni/specs/blob/main/src/schema/Styles.ts) |
| JSON Schema | [`src/schema/schema/styles.schema.json`](https://github.com/rudironsoni/specs/blob/main/src/schema/schema/styles.schema.json) |
