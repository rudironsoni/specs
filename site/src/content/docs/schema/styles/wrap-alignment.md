---
title: "wrapAlignment"
description: "Space distribution between wrapped auto-layout lines"
---

Space distribution between wrapped lines. Only meaningful when `wrap` is `true`.

#### Type(s)

| Type | Example |
|---|---|
| `WrapAlignment` | `"START"`, `"SPACE_BETWEEN"` |
| `null` | `null` |

Not token-bindable — structural property, not a design value.

#### Supported on

| Element | Figma Layer(s) |
|---|---|
| `container` | Component, Frame, Instance, Slot |

#### Figma key

Reads from `counterAxisAlignContent`. See [ADR 039 — Wrap Alignment](https://github.com/rudironsoni/specs/blob/main/adr/039-wrap-alignment.md).

#### Source

| Format | File |
|---|---|
| TypeScript | [`src/schema/Styles.ts`](https://github.com/rudironsoni/specs/blob/main/src/schema/Styles.ts) |
| JSON Schema | [`src/schema/schema/styles.schema.json`](https://github.com/rudironsoni/specs/blob/main/src/schema/schema/styles.schema.json) |
