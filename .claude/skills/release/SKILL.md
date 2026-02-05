---
name: release
description: Build, validate, tag, and publish a new release of eyecite-ts
disable-model-invocation: true
arguments:
  - name: version
    description: "Semver version to release (e.g., 0.3.0, 1.0.0-beta.1)"
---

# Release eyecite-ts

Execute the full release workflow for a new version of eyecite-ts.

## Pre-flight Checks

Before starting, verify:

1. **Clean working tree**: `git status` shows no uncommitted changes
2. **On main branch**: `git branch --show-current` returns `main`
3. **Tests pass**: `npx vitest run` exits 0
4. **Type check passes**: `npx tsc --noEmit` exits 0
5. **Lint passes**: `npx biome lint src tests` exits 0

If any check fails, stop and report the issue. Do NOT proceed with a dirty state.

## Release Steps

### 1. Version bump
- Update `version` in `package.json` to the specified version
- Do NOT modify `package-lock.json` manually — it will be updated by npm

### 2. Build
- Run `npm run build` (tsdown)
- Verify `dist/` output contains all three entry points:
  - `dist/index.mjs`, `dist/index.cjs`, `dist/index.d.ts`
  - `dist/data/index.mjs`, `dist/data/index.cjs`, `dist/data/index.d.ts`
  - `dist/annotate/index.mjs`, `dist/annotate/index.cjs`, `dist/annotate/index.d.ts`

### 3. Size check
- Run `npm run size` to verify bundle is within limits (50KB for core)
- Report actual sizes

### 4. Commit and tag
- Commit: `chore: release v{version}`
- Tag: `git tag v{version}`
- Do NOT push yet — confirm with user first

### 5. Confirm before push
Ask the user:
- Push to origin? (`git push && git push --tags`)
- Publish to npm? (`npm publish`)

Only proceed with explicit confirmation for each.

## Post-release

- Report the release summary: version, bundle sizes, test count, tag
- Suggest updating PROJECT.md if this is a milestone release
