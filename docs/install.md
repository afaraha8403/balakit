# Install

BalaKit installs in three layers. Use the first layer for almost every machine. Use native plugins only when this client can load them. Use skills.sh directly when the CLI is not an option.

Do not `/add-plugin` the repository root. This repo is a marketplace of several plugins.

## CLI (recommended)

Requires [Node.js](https://nodejs.org/) 18 or newer. Run this **in the project directory**, not in `$HOME`.

```bash
npx balakit@latest init -y
```

That is standing rules plus default engineering skills, in this repository. Preview every file with `--dry-run`. Choose tools with `--agents claude-code,cursor`. Rules only: `--rules-only`. This machine: `--scope user`. Specific pieces: `npx balakit init base dissect -y`.

Guided setup: `npx balakit` with no `-y`. It asks scope, then tools (with what each one receives), then what to install, then shows every file before writing. Re-running it in an installed repo offers **Refresh what's installed**.

Skills come directly from the balakit package you ran, not from GitHub, so they work offline on Node 18+ and always match the rules' version.

After install: reload the agent window, then run `npx balakit@latest doctor` (or `doctor --fix` to repair drift). Doctor checks kit health (manifest drift, retired renames, leftover Mental names, Cursor `plugins/local`, and agent skill links). Mental health is `mental doctor` in the [Mental CLI](https://github.com/afaraha8403/mental).

Full commands: [CLI](cli.md).

## Native plugins

Five packs follow [Agent Plugins 1.0.0](https://agent-plugins.org/specification): a root `plugin.json` plus `skills/` under `plugins/balakit-*`.

| Plugin | Ships | Format |
| --- | --- | --- |
| `balakit-engineering` | Default engineering skills, plus `cloakbrowser-fallback` | Agent Plugins + Cursor twin |
| `balakit-seo-skills` | `everything-seo`, `seo-audit`, `agent-ready` | Agent Plugins + Cursor twin |
| `balakit-marketing` | `marketing-psychology`, `startup-marketing-brain` | Agent Plugins + Cursor twin |
| `balakit-media` | `media-gen` | Agent Plugins + Cursor twin |
| `balakit-notebooklm` | `notebooklm` | Agent Plugins + Cursor twin |
| `balakit-core` | Rules: `base`, `testing`, `comments`, `changelog` | Cursor Plugin only |
| `balakit-seo` | Rule: `seo-ai-search` | Cursor Plugin only |

Rules are **not** a portable Agent Plugins v1 component. They stay in Cursor plugins plus the `AGENTS.md` / `CLAUDE.md` blocks that `balakit init` writes. Plugin install never writes those standing files.

Catalogs in this repo: `.cursor-plugin/marketplace.json` (all seven), `.claude-plugin/marketplace.json` (five skill packs), `.agents/plugins/marketplace.json` (same five, OpenAI / Codex layout).

```bash
# Claude Code (in chat)
/plugin marketplace add afaraha8403/balakit
/plugin install balakit-engineering@balakit

# Codex CLI. ChatGPT: Plugins tab (web/desktop), same catalog.
codex plugin marketplace add afaraha8403/balakit
codex plugin add balakit-engineering@balakit

# GitHub Copilot CLI
copilot plugin marketplace add afaraha8403/balakit
copilot plugin install balakit-engineering@balakit
```

Cursor: add the GitHub marketplace `https://github.com/afaraha8403/balakit`, or run `npx balakit@latest init --scope user --cursor-plugins -y` so the CLI materializes every plugin pack into `~/.cursor/plugins/local/`. Reload the window.

Claude Code loads `.claude-plugin/plugin.json`. A root `plugin.json` on the repo is invisible to it.

OpenAI's IDE extension does not load plugins. ChatGPT web/desktop and Codex CLI share one catalog. Cursor / VS Code Copilot is a different client.

Cursor public marketplace publish is a separate, intentional step. When you are ready: `npm run sync`, then [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish). Do not submit from a routine change.

Index of generated trees: [plugins/README.md](../plugins/README.md).

## skills.sh fallback

Clients with no plugin loader, or a single extra skill, can also use [skills.sh](https://skills.sh/) ([vercel-labs/skills](https://github.com/vercel-labs/skills)) directly from GitHub:

```bash
npx skills add afaraha8403/balakit
npx skills add afaraha8403/balakit -g
npx skills add afaraha8403/balakit --skill dissect
```

Prefer `npx balakit add dissect` so the kit manifest stays in sync.

## Project vs user

| | Project (`--scope project`) | User (`--scope user`) |
| --- | --- | --- |
| Manifest | `.balakit/installed.json` | `~/.balakit/installed.json` |
| Standing | Single-injection: `AGENTS.md` / `CLAUDE.md` managed blocks; Cursor-only writes `.cursor/rules/*.mdc`, while Cursor + `AGENTS.md` writes only glob-scoped `.mdc` | `~/.cursor/rules/*.mdc`; `~/.claude/CLAUDE.md`; `~/.codex/AGENTS.md`; `~/.config/opencode/AGENTS.md`; `~/.copilot/copilot-instructions.md`; `~/.gemini/GEMINI.md` |
| Skills | Canonical `.agents/skills/<name>` + per-agent symlinks (`.cursor/skills`, `.claude/skills`, `.github/skills`, …) | Canonical `~/.agents/skills/<name>` + per-agent symlinks (`~/.claude/skills`, `~/.copilot/skills`, `~/.config/opencode/skills`, …) |
| Plugins | not copied | opt-in with `--cursor-plugins` (or the wizard question): every folder under `plugins/` → `~/.cursor/plugins/local/`. `remove --cursor-plugins` deletes them |

`add` **reconciles** with the matching manifest so later adds never shrink the managed block.

## Destinations (CLI, not native plugin install)

Canonical skill trees land in `.agents/skills/<name>` (project) or `~/.agents/skills/<name>` (user). Each selected harness receives a relative symlink (or recursive copy fallback when the OS blocks symlinks) in its native directory.

| Agent | Skills (project) | Skills (user) | Standing (project) | Standing (user) |
| --- | --- | --- | --- | --- |
| Cursor | `.cursor/skills` → `.agents/skills` | `~/.cursor/skills` → `~/.agents/skills` | `.cursor/rules/*.mdc` alone, or `AGENTS.md` + scoped `.mdc` | `~/.cursor/rules/*.mdc` (plus `~/.cursor/plugins/local/` with `--cursor-plugins`) |
| Claude Code | `.claude/skills` → `.agents/skills` | `~/.claude/skills` → `~/.agents/skills` | `CLAUDE.md` + `.claude/rules/<scoped>.md` | `~/.claude/CLAUDE.md` |
| Codex | `.agents/skills` | `~/.codex/skills` → `~/.agents/skills` | `AGENTS.md` | `~/.codex/AGENTS.md` |
| OpenCode | `.agents/skills` | `~/.config/opencode/skills` → `~/.agents/skills` | `AGENTS.md` | `~/.config/opencode/AGENTS.md` |
| Copilot | `.agents/skills` | `~/.copilot/skills` → `~/.agents/skills` | `AGENTS.md` + `.github/instructions/<scoped>.instructions.md` | `~/.copilot/copilot-instructions.md` |
| Gemini CLI | `.agents/skills` | `~/.gemini/skills` → `~/.agents/skills` | `AGENTS.md` | `~/.gemini/GEMINI.md` |

Optional agents (Cline, Kilo, omp, Windsurf, Roo, Zed, Amp, Continue, Junie, and Kiro) use the same native installer where a verified skill directory exists. Standing rules write `AGENTS.md` when that client reads it. Continue and Amazon Q list `standing: none` in the CLI matrix (skills still install).

Each picked tool receives only its own files. See [CLI → Which tools get which files](cli.md#which-tools-get-which-files).

`balakit list` and `balakit status` print the capability matrix (`*` = detected). Detection seeds only the first install. If nothing is detected, a first install uses `cursor`, `claude-code`, and `codex`. Later runs reuse the tools recorded in the manifest. Copilot counts as detected only when Copilot's own files exist (`.github/copilot-instructions.md`, `.github/instructions`, `.github/prompts`, or `~/.copilot`), not for any repo with `.github/`.

## Upgrading from an earlier version

Run `npx balakit@latest update` (or `npx balakit@latest doctor --fix`) to migrate existing project and user installs to manifest schema 4:

- Translates renamed rules and consolidated skills (`release` → `base`, `nlm-skill` → `notebooklm`, `opinion` → `execute`, `unmatched-workflow` → `kit-workflows`, `generating-app-verify` / `refreshing-app-verify` → `verify-app`).
- Deletes retired skill folders, retired `.mdc` rules, retired `balakit-nlm` Cursor plugins, and legacy `skills-lock.json` path entries.
- Prunes redundant Cursor `.mdc` duplicates when `AGENTS.md` already carries always-on rules.
- Preserves any rule file or skill folder you edited by hand (pass `--force` to replace and save your copy as `.bak`).

## Compatibility snapshot

| Client | Skills | Standing rules |
| --- | --- | --- |
| Cursor | Native CLI skills, Agent Plugins, or `--cursor-plugins` | Single-injection `.mdc` / `AGENTS.md` |
| Copilot / VS Code | Native CLI skills or `plugins/balakit-*` | `AGENTS.md` + `.github/instructions` / `~/.copilot/copilot-instructions.md` |
| Amazon Q / Kiro | Native CLI skills (`.kiro/skills`) or `plugins/balakit-*` | `AGENTS.md` when supported |
| ChatGPT / Codex | Native CLI skills or OpenAI catalog (IDE extension: no plugins) | `AGENTS.md` / `~/.codex/AGENTS.md` |
| Claude Code | Native CLI skills or `.claude-plugin/` marketplace | `CLAUDE.md` / `~/.claude/CLAUDE.md` |
| OpenCode, Gemini CLI, Cline, Kilo, Windsurf, … | Native CLI skills (Node 18+) | `AGENTS.md` + `~/.config/opencode/AGENTS.md` + `~/.gemini/GEMINI.md` |

Aider: rules only (`AGENTS.md`). Google Jules: registered, never auto-detected.

## After install

1. Reload the agent window (required after Cursor `plugins/local` or new skills).
2. Run `npx balakit@latest doctor` (add `--fix` to repair any drift).
3. Ask for a skill by name. [Skills](skills.md) lists what each one does.
