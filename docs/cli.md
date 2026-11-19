# CLI

`npx balakit` installs standing rules and skills, then records them in a manifest so later `add` / `update` / `remove` stay consistent.

Requires [Node.js](https://nodejs.org/) 18 or newer for both rules and skills. Skills install directly from the packaged `skills/` directory with zero external CLI dependencies. The binary is `balakit` (`bin/cli.mjs`). Package version and CLI version share one semver.

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
| `npx balakit@latest doctor [--fix]` | Checks every recorded file, skill tree, and link on disk. `--fix` reconciles and repairs broken scopes |
| `npx balakit@latest update` | Reinstalls recorded pieces, migrates renamed skills/rules, and prunes retired artifacts across active scopes |
| `npx balakit mcp` | Runs the stdio MCP elicitation server (`ask_user` UI card for MCP hosts with form elicitation) |
| `npx balakit help <command>` | Help for one command (also `<command> --help`) |
| `npx balakit -v` | Print semver |

Unknown command: error with a "did you mean" hint, exit 1. Interactive prompts with no TTY (CI, pipes, or an agent) exit 2 and ask for `-y`. They never exit 0 silently.

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
| `--force` | off | Replace rule files or skill directories you changed. Your copy is saved as `<path>.bak` |
| `--fix` | off | `doctor`: reconcile and repair missing, stale, or broken files across active scopes |
| `--cursor-plugins` | off | User scope + Cursor: also copy every plugin pack to `~/.cursor/plugins/local`. Once copied, `update` keeps them current |
| `--json` | off | `list` / `status` / `doctor`: machine-readable output |
| `--dry-run` | off | Preview every file. No writes |
| `-y`, `--yes` | off | Skip confirms. Makes `init` non-interactive |
| `-h`, `--help` | | Usage (`<command> --help` for one command) |
| `-v`, `--version` | | Print semver |

### Which tools get which files

| Tool picked | This repo | This machine |
| --- | --- | --- |
| Claude Code | `CLAUDE.md` block + `.claude/rules/<scoped>.md` | `~/.claude/CLAUDE.md` block |
| Cursor alone | `.cursor/rules/*.mdc` (no duplicate `AGENTS.md`) | `~/.cursor/rules/*.mdc` |
| Cursor + any `AGENTS.md` tool | Always-on rules once in `AGENTS.md` + scoped `.cursor/rules/<scoped>.mdc` | `~/.cursor/rules/*.mdc` |
| Codex, OpenCode, Copilot, Gemini CLI, and other `AGENTS.md` readers | `AGENTS.md` block (Copilot also gets `.github/instructions/<scoped>.instructions.md`) | Codex `~/.codex/AGENTS.md` + `~/.codex/config.toml` (`default_mode_request_user_input`), OpenCode `~/.config/opencode/AGENTS.md`, Copilot `~/.copilot/copilot-instructions.md` + `~/.copilot/mcp-config.json`, Gemini CLI `~/.gemini/GEMINI.md` + `~/.gemini/settings.json` |

Scoped rules write an on-demand copy to `.balakit/rules/<name>.md` (or `~/.balakit/rules/<name>.md`). `AGENTS.md`, `CLAUDE.md`, and user standing blocks then add a 1-line conditional pointer instead of inlining scoped prose. In user scope, BalaKit also installs `~/.balakit/mcp.mjs` and merges `mcpServers.balakit` without overwriting your existing MCP servers or Codex settings.

A file that already has a balakit block stays maintained, even after you stop picking its tool, until `update` reconciles unselected surfaces.

The first install uses `--agents`, or the tools it detects. After that, the CLI uses the tools recorded in the manifest, so targets stay stable. `init --agents …` replaces the recorded list, while `add --agents …` adds to it.

### Files you changed

BalaKit records a SHA-256 hash of every rule file and canonical skill directory it writes. If a rule file or skill folder differs from its hash or predates BalaKit, `init`, `update`, and `remove` keep it and report it. `--force` replaces it and keeps your version as `<path>.bak`. Managed blocks in `AGENTS.md` and `CLAUDE.md` always rewrite, and `doctor` warns when you edited one.

`--personal`, `--with-personal`, `--lift-ignore`, `--mental-*`, or a name list containing `mental` print the [Mental](https://github.com/afaraha8403/mental) URL and exit 1. Continuity is not part of this package.

## What `init` installs

**Rules:** `base`, `testing`, `comments`, `changelog`.  
Not included: `seo-ai-search` (add it when you need it). Aliases: `global` → `base`, `release` → `base`.

**Skills** (unless `--rules-only`):

```text
subsystem-walkthrough, design-rationale, proving-change-safety, kit-workflows,
dissect, deep-deliberation, inception, execute, trl, verify-app, blinded-eval,
authoring-skills-and-rules, documentation-writer, release-deploy
```

Opt-in (not in that list): `agent-ready`, `everything-seo`, `seo-audit`, `marketing-psychology`, `startup-marketing-brain`, `media-gen`, `notebooklm`, `cloakbrowser-fallback`.

Legacy skill aliases (`nlm-skill` → `notebooklm`, `opinion` → `execute`, `unmatched-workflow` → `kit-workflows`, `generating-app-verify` / `refreshing-app-verify` → `verify-app`) resolve automatically during `add`, `remove`, and `update`.

## Agent ids

Used by `--agents` and printed by `list` / `status`. Detection looks at well-known folders in the repo and home. If nothing is detected, the CLI uses `cursor`, `claude-code`, `codex`.

| Id | Label | Target skill id |
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
| `jules` | Google Jules | (none: detect is always false) |

Only verified skill target ids receive skill folders and symlinks. Other tools skip skill installation while still receiving standing rules.

## Manifests

| Scope | Path | Schema |
| --- | --- | --- |
| project | `.balakit/installed.json` | `4` |
| user | `~/.balakit/installed.json` | `4` |

Schema 4 records SHA-256 hashes in `files` for rule files and canonical `.agents/skills/<name>` trees. During `update` or `doctor --fix`, it migrates renames and sweeps retired artifacts. Older manifests migrate automatically on read.

`update --scope project` or `--scope user` limits which manifest job runs.

## doctor vs Mental

`balakit doctor` checks this kit across both manifests and disk:
- corrupt manifests or unmigrated schema versions
- duplicate overlapping rules/skills installed in both project and user scopes
- missing or hand-edited managed blocks
- missing, locally edited, or retired rule files
- recorded skills missing from disk, edited locally, or retired
- broken skill links across agent directories (`.claude/skills`, `.cursor/skills`, `~/.copilot/skills`, etc.)
- stale `skills-lock.json` or retired `balakit-*` Cursor plugins
- leftover `mental` names

Missing, stale, or broken items exit 1, and `npx balakit@latest doctor --fix` (or `update`) repairs them. Warnings alone (such as an intentional edit or dual-scope overlap) exit 0.

Mental health is `mental doctor`. See [docs/mental-design.md](mental-design.md).

## Skill installation engine

BalaKit ships a zero-dependency native skill installer (`bin/lib/skills-install.mjs`) that copies canonical skill trees into `.agents/skills` (or `~/.agents/skills`) and links per-agent directories directly on Node 18+. Re-run `npx balakit@latest update` to refresh skills and clean up legacy `skills-lock.json` files.

If you prefer the external [skills.sh](https://skills.sh/) CLI (`vercel-labs/skills`), you can still pull directly from GitHub:

```bash
npx skills add afaraha8403/balakit
npx skills add afaraha8403/balakit -g
npx skills add afaraha8403/balakit --skill dissect
```

Prefer `npx balakit add` so `.balakit/installed.json` (or `~/.balakit/installed.json`) stays accurate.

## Help text

`npx balakit --help` prints live usage, including the current init rule and skill lists from this checkout.
