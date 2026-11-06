# CLI

`npx balakit` installs standing rules and skills, then records them in a manifest so later `add` / `update` / `remove` stay consistent.

Requires [Node.js](https://nodejs.org/) 18 or newer for rules. Skills need Node 22.20 or newer, because the bundled skills.sh CLI requires it. On older Node, rules still install and the CLI says skills were skipped. The binary is `balakit` (`bin/cli.mjs`). Package version and CLI version are the same semver.

Install walkthrough: [Install](install.md). What each skill does: [Skills](skills.md).

## Commands

| Command | What it does |
| --- | --- |
| `npx balakit` | Guided setup: scope → tools → what to install → review every file → confirm |
| `npx balakit init [names...]` | Same guided setup. With `-y`, installs the recommended set, or only the named rules/skills |
| `npx balakit add <names...>` | Add rules and/or skills by name. Reconciles the manifest |
| `npx balakit remove <names...>` | Remove owned kit pieces. Keeps rule files you changed. Refuses an unsafe `AGENTS.md` wipe |
| `npx balakit remove --cursor-plugins` | Delete the plugin packs copied into `~/.cursor/plugins/local` |
| `npx balakit list` | Available rules, skills, capability matrix |
| `npx balakit status` | What BalaKit owns (project + user manifests), with skill counts on disk |
| `npx balakit doctor` | Checks every recorded file on disk. Exit 1 when something is missing or broken |
| `npx balakit update` | Reinstall everything recorded, from this version. Repairs missing skills and rule files. Both scopes unless `--scope` is given |
| `npx balakit help <command>` | Help for one command (also `<command> --help`) |
| `npx balakit -v` | Print semver |

Unknown command: error with a "did you mean" hint, exit 1. A step that needs an answer when there is no terminal (CI, a piped script, an agent) exits 2 and asks for `-y`; it never exits 0 having done nothing.

```bash
npx balakit init -y
npx balakit init -y --agents claude-code
npx balakit init base dissect -y
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
| `--agents <ids\|all>` | recorded, else detect | Tools to install for. Each tool gets only its own files (below) |
| `--rules-only` | off | `init`: standing rules only, no default skills |
| `--force` | off | Replace rule files you changed. Your copy is saved as `<file>.bak` |
| `--cursor-plugins` | off | User scope + Cursor: also copy every plugin pack to `~/.cursor/plugins/local`. Once copied, `update` keeps them current |
| `--json` | off | `list` / `status` / `doctor`: machine-readable output |
| `--dry-run` | off | Preview every file. No writes |
| `-y`, `--yes` | off | Skip confirms. Makes `init` non-interactive |
| `-h`, `--help` | | Usage (`<command> --help` for one command) |

### Which tools get which files

| Tool picked | This repo | This machine |
| --- | --- | --- |
| Claude Code | `CLAUDE.md` block (+ `.claude/rules` for scoped rules) | `~/.claude/CLAUDE.md` block |
| Cursor | `AGENTS.md` block + `.cursor/rules/*.mdc` | `~/.cursor/rules/*.mdc` |
| Codex, OpenCode, Copilot, and other AGENTS.md readers | `AGENTS.md` block (Copilot also gets `.github/instructions` for scoped rules) | Codex `~/.codex/AGENTS.md`, OpenCode `~/.config/opencode/AGENTS.md`. Others: no user-wide file |

A file that already has a balakit block stays maintained, even after you stop picking its tool.

The first install uses `--agents`, or the tools it detects. After that, the CLI uses the tools recorded in the manifest, so the targets don't change because a new folder appeared. `init --agents …` replaces the recorded list; `add --agents …` adds to it.

### Files you changed

Balakit records a hash of every rule file it writes (`.mdc`, scoped twins). If a file differs from that hash, or existed before balakit wrote it, `init`, `update` and `remove` leave it alone and say so. `--force` replaces it and keeps your version as `<file>.bak`. Managed blocks in `AGENTS.md` / `CLAUDE.md` are always rewritten. `doctor` warns when you have edited one.
| `-v`, `--version` | | Semver |

`--personal`, `--with-personal`, `--lift-ignore`, `--mental-*`, or a name list containing `mental` print the [Mental](https://github.com/afaraha8403/mental) URL and exit 1. Continuity is not part of this package.

## What `init` installs

**Rules:** `base`, `testing`, `comments`, `changelog`, `release`.  
Not included: `seo-ai-search` (add it when you need it). Alias: `global` → `base`.

**Skills** (unless `--rules-only`):

```text
subsystem-walkthrough, design-rationale, proving-change-safety, kit-workflows,
unmatched-workflow, dissect, deep-deliberation, inception, opinion, execute, trl,
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
| project | `.balakit/installed.json` | `3` |
| user | `~/.balakit/installed.json` | `3` |

Schema 3 adds `files`, a hash per kit-written rule file. Older manifests are read as-is. Their rule files still count as balakit's, so `update` keeps working.

`update --scope project` or `--scope user` limits which manifest job runs.

## doctor vs Mental

`balakit doctor` is this kit. It compares both manifests with disk:
- corrupt manifests
- missing or hand-edited managed blocks
- missing or changed rule files
- recorded skills missing from disk
- broken skill links in `.claude/skills`, `.cursor/skills` and `~/.copilot/skills`
- leftover `mental` names

Missing or broken items exit 1, and `update` fixes them. Warnings alone (for example, a block you edited) exit 0.

Mental health is `mental doctor`. See [docs/mental-design.md](mental-design.md).

## Direct skills.sh

[skills](https://github.com/vercel-labs/skills) `1.5.25` is a pinned dependency. The CLI runs it with the current Node binary and uses this package's own `skills/` folder as the source. Skills therefore match the rules' version, install offline, and don't depend on `npx` (which fails without a shell on Windows). It passes `-s` / `-a` / `-y`, plus `-g` for user scope.

skills.sh writes a `skills-lock.json` in the project. Its `source` is the local package path the skills came from. Re-run `npx balakit update` to refresh skills; don't use `npx skills update`.

Manual forms, which pull from GitHub instead:

```bash
npx skills add afaraha8403/balakit
npx skills add afaraha8403/balakit -g
npx skills add afaraha8403/balakit --skill dissect
```

Prefer `npx balakit add` so `.balakit/installed.json` (or `~/.balakit/installed.json`) stays accurate.

## Help text

`npx balakit --help` prints live usage, including the current init rule and skill lists from this checkout.
