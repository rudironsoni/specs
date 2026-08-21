---
title: "mainAxisAlignment"
description: "Main-axis alignment for an auto-layout container"
---

Alignment along the main axis (depends on `layoutMode`).

#### Type(s)

| Type | Example |
|---|---|
| `MainAxisAlignment` | `"START"`, `"END"`, `"CENTER"`, `"SPACE_BETWEEN"` |
| `null` | `null` |

Not token-bindable — structural property, not a design value.

#### Supported on

| Element | Figma Layer(s) |
|---|---|
| `container` | Component, Frame, Instance, Slot |

#### Figma key

Reads from `primaryAxisAlignItems`. See [ADR 040 — Layout Alignment](https://github.com/rudironsoni/specs/blob/main/adr/040-layout-alignment.md).

#### Source

| Format | File |
|---|---|
| TypeScript | [`src/schema/Styles.ts`](https://github.com/rudironsoni/specs/blob/main/src/schema/Styles.ts) |
| JSON Schema | [`src/schema/schema/styles.schema.json`](https://github.com/rudironsoni/specs/blob/main/src/schema/schema/styles.schema.json) |
