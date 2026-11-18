---
name: release-deploy
description: >-
  Release and deploy via GitHub tags and GitHub Actions (not every commit).
  Creates production releases from the default branch (main/master) and beta
  releases from staging, respecting tag-triggered CI workflows so releases are
  never duplicated. Use when the user asks to release, ship, deploy, cut a
  version, tag a release, publish beta/production, create a GitHub Release,
  or bump a semver tag. Stores per-repository config at .balakit/release.md.
user-invocable: true
disable-model-invocation: false
version: "1.2.0"
author: "Ali Farahat"
tags: ["release", "deploy", "semver", "github", "changelog", "beta", "production"]
---

# Release & Deploy (GitHub Tags)

> **Leading words:** commits ≠ deploys; branch → channel; tag triggers ship;
> changelog is truth; interview once; never duplicate tag CI.

## Core model

- **Commits ≠ deploys.** Only a **git tag** (or GitHub Release) triggers deployment via GitHub Actions.
- **Branch → channel**
  - Repo default branch (`gh repo view --json defaultBranchRef -q .defaultBranchRef.name`, typically `main` or `master`) → **production** release
  - `staging` → **beta** release
- **Tags**
  - Production: `vMAJOR.MINOR.PATCH` (e.g. `v1.4.0`)
  - Beta: `vMAJOR.MINOR.PATCH-beta.N` (e.g. `v1.4.0-beta.1`)
- **Version lockstep:** When `package.json` (or generated plugin/lockfile manifests) exists, bump `package.json` `"version"` (`X.Y.Z` without `v`), run the repo's sync/generate step and tests, and commit **before** tagging.
- **Release notes** come from the project's maintained `CHANGELOG.md` (do not invent a changelog). See [references/versioning.md](references/versioning.md).

## Before every release

1. **Load project config (`.balakit/release.md` in the target repository)**
   - Look for `.balakit/release.md` at the root of the target repository (never write project configs inside this skill's own directory).
   - If missing → run the **first-time interview** in [references/interview.md](references/interview.md), write `<repo>/.balakit/release.md` from [references/project.template.md](references/project.template.md), then continue.
2. **Confirm channel** with the user via the host's native structured question tool (`AskUserQuestion`, `AskQuestion`, `question`, `request_user_input`, `vscode_askQuestions`, or `ask_user`): beta (`staging`) or production (`main`/`master`). Never guess.
3. **Verify git & workflow ownership** (match the active OS shell):
   - Correct branch checked out, clean working tree, synced with remote, HEAD at intended commit.
   - Inspect `.github/workflows/` (and `.balakit/release.md`) to see whether a `push: tags: ['v*']` workflow already creates the GitHub Release and/or runs `npm publish`.
4. **Determine next version** from existing tags + user intent. Follow [references/versioning.md](references/versioning.md).
5. **Extract notes** from `CHANGELOG.md` for that version (cutting `[Unreleased]` into `## [vX.Y.Z]` first when committing a version bump). If changelog is missing/ambiguous → stop and ask.

## Release workflow

Follow [references/gh-release.md](references/gh-release.md). Summary:

1. Ensure `package.json`, `CHANGELOG.md` (`## [vX.Y.Z]`), generated manifests, and tests are committed and pushed on the release branch.
2. **If CI triggers on `push: tags: ['v*']` and creates the GitHub Release:** create and push an annotated tag (`git tag -a vX.Y.Z -m "vX.Y.Z"` + `git push origin vX.Y.Z`) — **do NOT also run `gh release create` or `npm publish` locally** (which duplicates the release or races CI).
3. **Otherwise (workflow triggers on `release: [published]` or manual release):** run `gh release create` with tag, title, `--notes-file`, and `--target` set to the release branch/SHA (`--prerelease` for beta).
4. Watch the release/deploy workflow (`gh run watch`) until green or report failure.
5. Summarize: tag, release URL, channel, and deploy target/URL from `.balakit/release.md`.

## Hard rules

- Never tag production from `staging`, or beta from the production branch, unless `.balakit/release.md` documents a different map **and** the user confirms.
- Never force-push tags or delete remote tags without explicit user request.
- Never write per-repo files inside `.agents/skills/` or `skills/release-deploy/` — always write `<repo>/.balakit/release.md`.
- Never fabricate changelog entries; only use `CHANGELOG.md` (or ask the user to update it first).
- Prefer `gh` over raw API calls.

## Platform-specific behavior

After the interview, `.balakit/release.md` names the stack. Read the matching reference only when needed:

- Cloudflare Workers/Pages → [references/platforms/cloudflare.md](references/platforms/cloudflare.md)
- Desktop apps (installers, auto-update, signed builds) → [references/platforms/desktop.md](references/platforms/desktop.md)
- Generic / npm / other → rely on `.balakit/release.md` workflow names and URLs

## Additional resources

- [references/interview.md](references/interview.md) — first-time setup questions
- [references/project.template.md](references/project.template.md) — config file shape
- [references/versioning.md](references/versioning.md) — semver + changelog rules
- [references/gh-release.md](references/gh-release.md) — GitHub CLI commands
