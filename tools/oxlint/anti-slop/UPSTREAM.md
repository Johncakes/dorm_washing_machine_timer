# Vendored anti-slop Oxlint plugin

This directory is owned by this repository. Edit rules here freely, and record deviations below.

## Source

- **Upstream repository:** unknown. The installing skill bundle does not record one.
- **Upstream commit:** unknown.
- **Copied from:** the `install-anti-slop` Claude Code skill bundle (`assets/anti-slop/`), installed on 2026-11-27 with its `scripts/install.mjs`.
- **Pristine snapshot:** none retained. At install time the copy was byte-identical to the skill bundle (`diff -r` clean). A digest of the 37 copied files, excluding this file, is `eb5b28b0d59a8addec0f0027a63aab2a108e2bb506bcb77413fdb674c2598525`, from:

  ```sh
  cd tools/oxlint/anti-slop && find . -type f ! -name UPSTREAM.md -path './*' ! -path './vendor/eslint-stylistic/UPSTREAM.md' | sort | xargs sha256sum | sha256sum
  ```

  A digest identifies bytes but cannot reconstruct them. A future update has no verified base and should be merged as a no-base update.
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
