---
title: "visible"
description: "Whether an element is rendered"
---

Whether the element is visible.

#### Type(s)

| Type | Example |
|---|---|
| `boolean` | `true` |
| [`TokenReference`](/schema/token-reference/) | `$token: ...`<br>`$type: boolean` |
| [`PropBinding`](/schema/prop-binding/) | `$binding: "#/props/label"` |
| [`Conditional`](/schema/conditional/) | `if: { condition: {op: isNotNull, args: [...]}, then: true, else: false }` |

`Conditional` covers the common case of deriving visibility from a nullable prop (e.g. hide when a text or glyph prop is unset). See [ADR 018 — Conditional Visible Binding](https://github.com/rudironsoni/specs/blob/main/adr/018-conditional-visible-binding.md).

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
