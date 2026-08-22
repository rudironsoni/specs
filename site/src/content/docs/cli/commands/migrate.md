---
title: "migrate"
---

Plan and apply syntax-aware migrations from accepted bindings. `--platform` selects the pack (`angular`, `react`, `vue`, `swiftui`, `compose`). `apply` writes files. `--dry-run` plans only.

```bash
specs migrate plan --source ./app --platform angular --workspace .specs/bootstrap
specs migrate apply --dry-run --source ./app --platform react
specs migrate apply --source ./app --platform react
specs migrate verify --source ./app --platform react
```
