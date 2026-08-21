---
title: "strokeDashPattern"
description: "Dash geometry for a dashed stroke"
---

Dash geometry for a dashed stroke. Presence signals a dashed stroke; null or absent signals solid.

#### Type(s)

| Type | Example |
|---|---|
| `StrokeDashPattern` | `dash: 8`<br>`gap: 4` |
| `null` | `null` (solid) |

Not token-bindable — structural property, not a design value.

#### Supported on

| Element | Figma Layer(s) |
|---|---|
| `container` | Component, Frame, Instance, Slot |
| `vectors` | Rectangle, Vector, Ellipse, Star, Polygon |
| `line` | Line |

#### Figma key

Reads from `strokeDashes`. See [ADR 059 — Border Style](https://github.com/rudironsoni/specs/blob/main/adr/059-border-style.md).

#### Source

| Format | File |
|---|---|
| TypeScript | [`src/schema/Styles.ts`](https://github.com/rudironsoni/specs/blob/main/src/schema/Styles.ts) |
| JSON Schema | [`src/schema/schema/styles.schema.json`](https://github.com/rudironsoni/specs/blob/main/src/schema/schema/styles.schema.json) |
