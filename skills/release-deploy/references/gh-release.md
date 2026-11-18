# GitHub CLI release workflow

Use `gh` and `git` matching the active OS shell (`bash`/`zsh` on Linux/macOS; PowerShell on Windows).

## Preconditions

From `.balakit/release.md` + user confirmation:

- Channel and branch match (`defaultBranchRef.name` — `main`/`master` — or `staging`)
- Intended commit is HEAD (with `package.json`, `CHANGELOG.md`, and sync outputs already committed and pushed)
- Next tag string confirmed
- Changelog notes verified (`## [vX.Y.Z]`)
- Guardrails satisfied (clean tree, CI green)
- Tag-CI ownership checked (`.github/workflows/release*.yml`): determine whether pushing `v*` already creates the GitHub Release in Actions!

Useful checks:

```bash
git status
git branch --show-current
git log -1 --oneline
gh auth status
gh repo view --json nameWithOwner,defaultBranchRef
gh release list --limit 20
git tag -l "v*" --sort=-v:refname | head -n 20   # PowerShell: | Select-Object -First 20
```

## Path A — Tag-triggered CI owns GitHub Release (`push: tags: ['v*']`)

When a workflow in `.github/workflows/` triggers on `v*` tags and runs `gh release create` / `npm publish`, push the annotated tag ONLY (do **not** run `gh release create` locally):

```bash
git tag -a "v1.4.0" -m "v1.4.0"
git push origin "v1.4.0"
```

## Path B — CLI creates the GitHub Release (`release: [published]` or no tag-release job)

Prefer letting `gh` create the tag and release from the target branch or SHA:

### Beta (`staging`)

```bash
gh release create "v1.4.0-beta.1" --target staging --title "v1.4.0-beta.1" --notes-file notes.md --prerelease
```

### Production (`main` or `master` — match `defaultBranchRef.name`)

```bash
gh release create "v1.4.0" --target main --title "v1.4.0" --notes-file notes.md
```

Notes:
- Write extracted changelog body to a temporary `notes.md` (and clean it up afterward).
- `--target` must match the release branch or exact commit SHA for that channel.
- Do not push tags or create releases until the user confirms the version.

## Watch deployment

1. Open or watch the workflow named in project config:

```powershell
gh run list --limit 5
gh run watch
```

2. Or link the release:

```powershell
gh release view "v1.4.0" --web
```

3. Verify using the beta/production URL or artifact checks from project config.

## Failure handling

- If the release was created but the workflow failed: report the run URL; do **not** delete the tag unless the user asks.
- If tagging the wrong branch was requested: refuse and explain channel rules.
- If `gh` auth fails: stop and ask the user to authenticate (`gh auth login`).

## Safety

- No `git push --force` on tags
- No rewriting published release notes unless the user asks
- No production tag from `staging` (or beta tag from `main`) unless project config + user explicitly override
