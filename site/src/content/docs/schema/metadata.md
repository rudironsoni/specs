---
title: "Metadata"
description: "Generation metadata — author, schema version, source, and config"
---

Generation metadata attached to the spec. Present when the spec was produced by a tool (plugin, CLI) rather than authored by hand.

## Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `author` | `string` | Yes | Who or what generated the spec |
| `lastUpdated` | `string` | Yes | ISO 8601 timestamp |
| `generator` | `object` | Yes | Tool info — `name`, `version`, `url`. Current generate output does not write `license` |
| `generator.version` | `string` | Yes | Semver string of the tool that produced the spec (e.g. `"1.10.0"`) |
| `generator.license` | `object` | No | Historical field. Older specs may still carry `status` and `level`. Current `specs-from-figma` omits it |
| `schema` | `object` | Yes | Schema version info — `url`, `version`, and optional `latest` URL |
| `source` | `object` | Yes | Figma source — `pageId`, `nodeId`, `nodeType` (COMPONENT, COMPONENT_SET, or FRAME) |
| `config` | [`Config`](/schema/config/) | Yes | The configuration used to generate this spec |

## Further Reading

- [ADR 001 — Surface License State in Component Output](https://github.com/rudironsoni/specs/blob/main/adr/001-metadata.license.md) — historical field for `generator.license`
