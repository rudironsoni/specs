---
title: "centerVerticalOffset"
description: "Vertical offset from center for a positioned child"
---

Vertical offset from center. Present when the vertical constraint is `CENTER`.

#### Type(s)

| Type | Example |
|---|---|
| `number` | `0` (pixels) |
| `null` | `null` |

Not token-bindable — structural property computed from Figma layout constraints, not a design value.

#### Supported on

| Element | Figma Layer(s) |
|---|---|
| `container` | Component, Frame, Instance, Slot |
| `text` | Text |
| `glyph` | Glyph |
| `vectors` | Rectangle, Vector, Ellipse, Star, Polygon |
| `line` | Line |

#### Figma key

Reads from `y` when the vertical constraint is `CENTER`. See [ADR 041 — Layout Positioning](https://github.com/rudironsoni/specs/blob/main/adr/041-layout-positioning.md).

#### Source

| Format | File |
|---|---|
| TypeScript | [`src/schema/Styles.ts`](https://github.com/rudironsoni/specs/blob/main/src/schema/Styles.ts) |
| JSON Schema | [`src/schema/schema/styles.schema.json`](https://github.com/rudironsoni/specs/blob/main/src/schema/schema/styles.schema.json) |
