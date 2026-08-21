---
title: "cornerSmoothing"
description: "Squircle-style corner smoothing amount"
---

Corner smoothing amount (Figma's "squircle" effect), 0–1.

#### Type(s)

| Type | Example |
|---|---|
| `number` | `0.6` |
| [`TokenReference`](/schema/token-reference/) | `$token: ...`<br>`$type: number` |

Follows the same rectangle-only restriction as [`cornerRadius`](/schema/styles/corner-radius/).

#### Supported on

| Element | Figma Layer(s) |
|---|---|
| `container` | Component, Frame, Instance, Slot |
| `vectors` | Rectangle |

#### Source

| Format | File |
|---|---|
| TypeScript | [`src/schema/Styles.ts`](https://github.com/rudironsoni/specs/blob/main/src/schema/Styles.ts) |
| JSON Schema | [`src/schema/schema/styles.schema.json`](https://github.com/rudironsoni/specs/blob/main/src/schema/schema/styles.schema.json) |
