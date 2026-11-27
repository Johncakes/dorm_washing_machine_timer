# Vendored anti-slop Oxlint plugin

This directory is owned by this repository. Edit rules here freely, and record deviations below.

## Source

- **Upstream repository:** https://github.com/dmmulroy/anti-slop
- **Upstream path:** `skills/install-anti-slop/assets/anti-slop/`
- **Upstream commit:** `63dbb09f73438e550a6991dc6d778f979ffbf183` (repository HEAD on 2026-11-27). The plugin path was last changed in `d2a9aea3b896ffcb291a85f2c1301aa2543ad8c8`.
- **Verified:** on 2026-11-27, `diff -r` between that path at `63dbb09` and this directory (excluding this file) showed no differences. That commit is the base for future updates.
- **Installed with:** the `install-anti-slop` Claude Code skill's `scripts/install.mjs`, whose bundled copy is identical to the upstream path above.
- **Digest** of the 37 copied files, excluding this file: `eb5b28b0d59a8addec0f0027a63aab2a108e2bb506bcb77413fdb674c2598525`, from:

  ```sh
  cd tools/oxlint/anti-slop && find . -type f ! -name UPSTREAM.md -path './*' ! -path './vendor/eslint-stylistic/UPSTREAM.md' | sort | xargs sha256sum | sha256sum
  ```
- `vendor/eslint-stylistic/` carries its own `UPSTREAM.md` and `LICENSE` (ESLint Stylistic, commit `435c3ea0fd26a5fef9042c4b36b6e165fbbf8d08`, MIT). Keep both with every copy.

## Installed plugin paths

- Generic plugin: `tools/oxlint/anti-slop/index.ts`, registered as `anti-slop` in `.oxlintrc.json`.
- Effect plugin: `tools/oxlint/anti-slop/effect/index.ts`, copied but **not registered**, because this project does not depend on `effect`.

## Configuration

- `oxlint` and `@oxlint/plugins` are pinned to exactly `1.95.0`. Upgrade both together.
- All 18 generic rules plus native `oxc/no-accumulating-spread` are enabled at `error` in `.oxlintrc.json`.
- `npm run lint` runs ESLint (Next.js rules) and then Oxlint.

## Local deviations

- None in the plugin source.
- Repository-side: `tsconfig.json` enables `allowImportingTsExtensions` (the project is `noEmit`), because the plugin imports its own modules with `.ts` extensions. `eslint.config.mjs` ignores this directory.
