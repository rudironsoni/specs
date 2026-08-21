---
title: "aspectRatio"
description: "Locked width-to-height ratio for an element"
---

Locked aspect ratio. Present only when the node has a locked ratio.

#### Type(s)

| Type | Example |
|---|---|
| `AspectRatioValue` | `x: 16`<br>`y: 9` |
| `null` | `null` (unconstrained) |

`TokenReference` is intentionally excluded — aspect ratio is a structural lock of literal numbers in the Figma API, not a token-driven value.

#### Supported on

| Element | Figma Layer(s) |
|---|---|
| `container` | Component, Frame, Instance, Slot |
| `text` | Text |
| `glyph` | Glyph |
| `vectors` | Rectangle, Vector, Ellipse, Star, Polygon |

#### Source

| Format | File |
|---|---|
| TypeScript | [`src/schema/Styles.ts`](https://github.com/rudironsoni/specs/blob/main/src/schema/Styles.ts) |
| JSON Schema | [`src/schema/schema/styles.schema.json`](https://github.com/rudironsoni/specs/blob/main/src/schema/schema/styles.schema.json) |
