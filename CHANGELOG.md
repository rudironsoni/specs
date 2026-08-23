# Changelog

All notable changes to this repository are documented here. `@rudironsoni/specs-schema`, `@rudironsoni/specs-from-figma`, and `@rudironsoni/specs-cli` share one version.

CI cuts a `vX.Y.Z` tag from [Conventional Commits](https://www.conventionalcommits.org/) on `main`, writes a GitHub Release with the changelog, and publishes the three packages to GitHub Packages.

History before lockstep (separate schema and CLI versions):

- [schema](src/schema/CHANGELOG.md)
- [cli](src/cli/CHANGELOG.md)

## [0.31.0](https://github.com/rudironsoni/specs/compare/v0.30.0...v0.31.0) (2026-08-23)


### Features

* **cli:** add multi-source design-system bootstrap ([f906ce6](https://github.com/rudironsoni/specs/commit/f906ce6e23307f26df6535a6079215cb6135cb40))
* **cli:** emit MCP Figma scripts and scan Ignite Sass colors ([0c3113c](https://github.com/rudironsoni/specs/commit/0c3113cc676ebae96cc5279d46c9a68b9f7263bc))
* **cli:** emit MCP Figma scripts and scan Ignite Sass colors ([db9afdd](https://github.com/rudironsoni/specs/commit/db9afdd270f948d1ccf39d5edaed0e7eedde1404))


### Bug Fixes

* **cli:** stop hardcoding Ignite in bootstrap bindings ([f7fbe1f](https://github.com/rudironsoni/specs/commit/f7fbe1fd4ec5fa979f03e93bf1b8df4898c12918))

## [0.30.0](https://github.com/rudironsoni/specs/compare/86cb4f6c80db59336b9e2127039cab7963766664...v0.30.0) (2026-08-21)


### Features

* move modules under src and publish to GitHub Packages ([3fe243d](https://github.com/rudironsoni/specs/commit/3fe243d222c74c54bcb0425e0a4ba6cdec3a8ccd))


### Bug Fixes

* add CI workflow and enable Pages deploy ([de3b7e0](https://github.com/rudironsoni/specs/commit/de3b7e0cff872d0645121bf5318c25dead65e857))
* prefix docs assets for GitHub Pages /specs/ ([d3342bb](https://github.com/rudironsoni/specs/commit/d3342bb7907c61db50b44e1981f1538145a6d0af))
