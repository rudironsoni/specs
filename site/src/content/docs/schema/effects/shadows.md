---
title: "shadows"
description: "Drop and inner shadow definitions"
---

Array of shadow definitions. Part of [`Effects`](/schema/effects/).

#### Type(s)

`Shadow[]` — see [`Effects`](/schema/effects/#shadow) for the `Shadow` shape.

```yaml
- visible: true
  offsetX: 0
  offsetY: 4
  blur: 8
  spread: 0
  color:
    $token: DS Color.Shadow.Default
    $type: color
```

#### Source

[`src/schema/Effects.ts`](https://github.com/rudironsoni/specs/blob/main/src/schema/Effects.ts)
