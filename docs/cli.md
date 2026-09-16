# CLI

`npx balakit` installs standing rules and skills, then records them in a manifest so later `add` / `update` / `remove` stay consistent.

Requires [Node.js](https://nodejs.org/) 18 or newer. The binary is `balakit` (`bin/cli.mjs`). Package version and CLI version are the same semver.

Install walkthrough: [Install](install.md). What each skill does: [Skills](skills.md).

## Commands

| Command | What it does |
| --- | --- |
| `npx balakit` | Guided setup (plan → review → apply) |
| `npx balakit init` | Same guided setup. With `-y` or `--dry-run`, non-interactive |
| `npx balakit add <names...>` | Add rules and/or skills by name. Reconciles the manifest |
| `npx balakit remove <names...>` | Remove owned kit pieces. Refuses an unsafe `AGENTS.md` wipe |
| `npx balakit list` | Available rules, skills, capability matrix |
| `npx balakit status` | What BalaKit owns (project + user manifests) |
| `npx balakit doctor` | Kit health: manifest drift, leftover Mental names, `plugins/local`, Copilot `~/.copilot/skills` |
| `npx balakit update` | Re-install from the manifest. Skills via `skills update` |
| `npx balakit -h` | Help |
| `npx balakit -v` | Print semver |

Unknown command: error plus usage, exit 1.

```bash
npx balakit init -y
npx balakit init --scope user -y
npx balakit init --rules-only -y
npx balakit add seo-ai-search
npx balakit add dissect --scope user --agents claude-code,opencode
npx balakit update --scope user
npx balakit remove testing
```

```bash
npm install -g balakit
balakit init -y
```

## Options

| Flag | Default | Effect |
| --- | --- | --- |
| `--scope project\|user` | `project` | This repo vs this machine |
| `--agents <ids\|all>` | detect | Comma-separated agent ids, or `all` |
| `--rules-only` | off | `init`: standing rules only, no default skills |
| `--dry-run` | off | Preview. No writes |
| `-y`, `--yes` | off | Skip confirms. Makes `init` non-interactive |
| `-h`, `--help` | | Usage |
| `-v`, `--version` | | Semver |

`--personal`, `--with-personal`, `--lift-ignore`, `--mental-*`, or a name list containing `mental` print the [Mental](https://github.com/afaraha8403/mental) URL and exit 1. Continuity is not part of this package.

## What `init` installs

**Rules:** `base`, `testing`, `comments`, `changelog`, `release`.  
Not included: `seo-ai-search` (add it when you need it). Alias: `global` → `base`.

**Skills** (unless `--rules-only`):

```text
subsystem-walkthrough, design-rationale, proving-change-safety, kit-workflows,
unmatched-workflow, dissect, deep-deliberation, inception, opinion, execute,
generating-app-verify, refreshing-app-verify, blinded-eval,
authoring-skills-and-rules, documentation-writer, release-deploy
```

Opt-in (not in that list): `agent-ready`, `everything-seo`, `seo-audit`, `marketing-psychology`, `startup-marketing-brain`, `media-gen`, `nlm-skill`, `cloakbrowser-fallback`.

## Agent ids

Used by `--agents` and printed by `list` / `status`. Detection looks at well-known folders in the repo and home. If nothing is detected, the CLI uses `cursor`, `claude-code`, `codex`.

| Id | Label | skills.sh `-a` |
| --- | --- | --- |
| `cursor` | Cursor | `cursor` |
| `claude-code` | Claude Code | `claude-code` |
| `codex` | Codex | `codex` |
| `opencode` | OpenCode | `opencode` |
| `copilot` | GitHub Copilot | `github-copilot` |
| `cline` | Cline | `cline` |
| `kilocode` | Kilo Code | `kilo` |
| `omp` | pi / omp | `pi` |
| `windsurf` | Windsurf | `windsurf` |
| `roo` | Roo Code | `roo` |
| `gemini-cli` | Gemini CLI | `gemini-cli` |
| `zed` | Zed | `zed` |
| `amp` | Amp | `amp` |
| `continue` | Continue | `continue` |
| `junie` | JetBrains Junie | `junie` |
| `amazon-q` | Amazon Q / Kiro | `kiro-cli` |
| `aider` | Aider | (none: rules only) |
| `jules` | Google Jules | (none; detect is always false) |

Only verified skills.sh ids are passed as `-a`. Others are skipped for skill install. Rules can still install.

## Manifests

| Scope | Path | Schema |
| --- | --- | --- |
| project | `.balakit/installed.json` | `2` |
| user | `~/.balakit/installed.json` | `2` |

`update --scope project` or `--scope user` limits which manifest job runs.

## doctor vs Mental

`balakit doctor` is this kit: corrupt or drifted manifests, managed `AGENTS.md` / `CLAUDE.md` blocks, `~/.cursor/plugins/local`, leftover `mental` names in a manifest, and missing `~/.copilot/skills` links when the user manifest lists skills with agent `copilot`.

Mental health is `mental doctor`. See [docs/mental-design.md](mental-design.md).

## Direct skills.sh

The CLI pins [skills](https://github.com/vercel-labs/skills) to `1.5.25` and passes `-s` / `-a` / `-y` (and `-g` for user scope). Equivalent manual forms:

```bash
npx skills add afaraha8403/balakit
npx skills add afaraha8403/balakit -g
npx skills add afaraha8403/balakit --skill dissect
```

Prefer `npx balakit add` so `.balakit/installed.json` (or `~/.balakit/installed.json`) stays accurate.

## Help text

`npx balakit --help` prints live usage, including the current init rule and skill lists from this checkout.
