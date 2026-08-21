---
title: "crossAxisAlignment"
description: "Cross-axis alignment for an auto-layout container"
---

Alignment along the cross axis (perpendicular to `layoutMode`).

#### Type(s)

| Type | Example |
|---|---|
| `CrossAxisAlignment` | `"START"`, `"END"`, `"CENTER"`, `"STRETCH"`, `"BASELINE"` |
| `null` | `null` |

Not token-bindable — structural property, not a design value.

#### Supported on

| Element | Figma Layer(s) |
|---|---|
| `container` | Component, Frame, Instance, Slot |

#### Figma key

Reads from `counterAxisAlignItems`. See [ADR 040 — Layout Alignment](https://github.com/rudironsoni/specs/blob/main/adr/040-layout-alignment.md).

#### Source

| Format | File |
|---|---|
| TypeScript | [`src/schema/Styles.ts`](https://github.com/rudironsoni/specs/blob/main/src/schema/Styles.ts) |
| JSON Schema | [`src/schema/schema/styles.schema.json`](https://github.com/rudironsoni/specs/blob/main/src/schema/schema/styles.schema.json) |
