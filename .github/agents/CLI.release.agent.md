---
description: How Specs releases work. CI cuts one version for schema, from-figma, and CLI.
---

# Release

Do not tag or publish from a laptop. `.github/workflows/release.yml` owns that.

## What happens

1. Land conventional commits on `main` (`feat:`, `fix:`, `feat!:` / `BREAKING CHANGE`).
2. The Release workflow opens a release PR. It bumps every `package.json` to the same version and updates `CHANGELOG.md`.
3. Merge that PR. CI creates tag `vX.Y.Z`, a GitHub Release with the changelog, and publishes the three packages to GitHub Packages (`https://npm.pkg.github.com`).

`chore:`, `docs:`, and `ci:` do not open a release PR.

Install:

```
@rudironsoni:registry=https://npm.pkg.github.com
npm install @rudironsoni/specs-cli
```

## Do not

- Create `specs-cli@` or `specs-schema@` tags.
- Publish to npmjs.
- Hand-edit version fields except on the release-please PR if extra-files missed a pin.
