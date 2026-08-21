---
title: "Overview"
description: "Overview of the Specs component schema"
---

The `@rudironsoni/specs-schema` package defines the TypeScript types and JSON Schema for a **component spec** — a structured, platform-agnostic description of a design-system component.

## Spec Architecture

Every generated spec follows this tree — from a single-element icon to a complex composite with dozens of variants.

<pre style="line-height:1.6">
components:
└─ {component name}                        → <a href="component/">Component</a>
  ├─ <a href="anatomy/">anatomy</a>:
  │ └─ {element name}: { type, slot }
  ├─ <a href="props/">props</a>:
  │ └─ {prop name}: { type, default, … }
  ├─ default:                              → <a href="variants/">Variant</a>
  │ ├─ <a href="layout/">layout</a>:
  │ │ └─ - {parent}:
  │ │   └─ - {child}
  │ └─ <a href="elements/">elements</a>:
  │   └─ {element name}:
  │     ├─ content                         → <a href="prop-binding/">PropBinding</a>
  │     ├─ <a href="children/">children</a>                        → <a href="children/">Children</a> (slot fills → <a href="slot-content-ref/">SlotContentRef</a>)
  │     └─ <a href="styles/">styles</a>:                      (48 properties)
  │       ├─ color                         → <a href="token-reference/">TokenReference</a>, <a href="gradient-value/">GradientValue</a>
  │       ├─ spacing, size                 → <a href="token-reference/">TokenReference</a>, <a href="conditional/">Conditional</a>
  │       ├─ layout                        → <a href="token-reference/">TokenReference</a>, <a href="conditional/">Conditional</a>
  │       ├─ <a href="typography/">typography</a>                  → <a href="token-reference/">TokenReference</a>
  │       ├─ <a href="effects/">effects</a>                     → <a href="token-reference/">TokenReference</a>
  │       ├─ cornerRadius                  → <a href="corners/">Corners</a>
  │       ├─ padding, strokeWeight         → <a href="sides/">Sides</a>
  │       ├─ visibility                    → <a href="prop-binding/">PropBinding</a>
  │       └─ …                             <a href="styles/">see full list</a>
  ├─ variants:                             → <a href="variants/">Variant</a>[]
  │ └─ - <a href="prop-configurations/">configuration</a>:
  │     <a href="layout/">layout</a>:
  │     <a href="elements/">elements</a>:                      (layered styling and binding changes)
  ├─ invalidVariantCombinations:           → <a href="prop-configurations/">PropConfigurations</a>[]
  ├─ <a href="subcomponents/">subcomponents</a>:
  │ └─ {name}: { …same shape as above }
  ├─ <a href="metadata/">metadata</a>:
  │ └─ <a href="config/">config</a>:
  ├─ <a href="instance-examples/">instanceExamples</a>:                   → <a href="instance-examples/">InstanceExample</a>
  │ └─ {name}: { title, propConfigurations }
  └─ <a href="slot-content/">slotContentExamples</a>:                → <a href="slot-content/">SlotContent</a>
    └─ {name}: { <a href="anatomy/">anatomy</a>, <a href="elements/">elements</a>, <a href="layout/">layout</a> }
</pre>

**Start at `default`.** The default variant is the complete baseline — every element fully described with styles, content, and layout. This is the component at rest.

**Variants are deltas.** Each entry in `variants` carries a [`configuration`](/schema/prop-configurations/) (which prop values activate it) and only the properties that *change*. Consumers resolve the final state by merging applicable overrides onto the default, in order. See [Variants](/schema/variants/) and the [Variant Layering](/guides/variant-layering/) guide.

**Style values can be rich.** Any style property might be a raw literal, a [`TokenReference`](/schema/token-reference/) pointing to a design token, a [`PropBinding`](/schema/prop-binding/) driven by a prop, or a [`Conditional`](/schema/conditional/) that switches on prop state. Composite values like [`Typography`](/schema/typography/), [`Effects`](/schema/effects/), [`GradientValue`](/schema/gradient-value/), [`Corners`](/schema/corners/), and [`Sides`](/schema/sides/) have their own shapes.

### Conventions

- **`Style`** — A value that can be a literal (`string | number | boolean | null`), a [`TokenReference`](/schema/token-reference/), a [`PropBinding`](/schema/prop-binding/), or a [`Conditional`](/schema/conditional/).
- **`Record<string, T>`** — An object keyed by user-defined names (element names, prop names, etc.) with values of type `T`.
- **`$ref`** — A JSON Pointer or URI reference linking to another part of the spec or an external definition.
- **`$binding`** — A JSON Pointer to a prop (e.g. `#/props/label`), creating a dynamic link between a prop value and a style or element property.

## Package Exports

The package exports TypeScript types for every node in the schema, plus one runtime value:

```ts
import type { Component } from '@rudironsoni/specs-schema';
import { DEFAULT_CONFIG } from '@rudironsoni/specs-schema';
```

`DEFAULT_CONFIG` is the only runtime export. All other exports are type-only.
