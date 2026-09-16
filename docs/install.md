# Install

BalaKit installs in three layers. Use the first layer for almost every machine. Use native plugins only when this client can load them. Use skills.sh directly when the CLI is not an option.

Do not `/add-plugin` the repository root. This repo is a marketplace of several plugins.

## CLI (recommended)

Requires [Node.js](https://nodejs.org/) 18 or newer. Run this **in the project directory**, not in `$HOME`.

```bash
npx balakit@latest init -y
```

That is standing rules plus default engineering skills, in this repository. Preview with `--dry-run`. Rules only: `--rules-only`. This machine: `--scope user`.

Guided menus: `npx balakit` with no `-y`.

After install: reload the agent window, then `npx balakit doctor`. Doctor is kit health (manifest drift, leftover Mental names, Cursor `plugins/local`, Copilot `~/.copilot/skills` when Copilot is a selected user agent). Mental health is `mental doctor` in the [Mental CLI](https://github.com/afaraha8403/mental).

Full commands: [CLI](cli.md).

## Native plugins

Five packs follow [Agent Plugins 1.0.0](https://agent-plugins.org/specification): a root `plugin.json` plus `skills/` under `plugins/balakit-*`.

| Plugin | Ships | Format |
| --- | --- | --- |
| `balakit-engineering` | Default engineering skills, plus `cloakbrowser-fallback` | Agent Plugins + Cursor twin |
| `balakit-seo-skills` | `everything-seo`, `seo-audit`, `agent-ready` | Agent Plugins + Cursor twin |
| `balakit-marketing` | `marketing-psychology`, `startup-marketing-brain` | Agent Plugins + Cursor twin |
| `balakit-media` | `media-gen` | Agent Plugins + Cursor twin |
| `balakit-nlm` | `nlm-skill` | Agent Plugins + Cursor twin |
| `balakit-core` | Rules: `base`, `testing`, `comments`, `changelog`, `release` | Cursor Plugin only |
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

Cursor: add the GitHub marketplace `https://github.com/afaraha8403/balakit`, or run `npx balakit init --scope user -y` so the CLI copies `plugins/` into `~/.cursor/plugins/local/`. Reload the window.

Claude Code loads `.claude-plugin/plugin.json`. A root `plugin.json` on the repo is invisible to it.

OpenAI's IDE extension does not load plugins. ChatGPT web/desktop and Codex CLI share one catalog. Cursor / VS Code Copilot is a different client.

Cursor public marketplace publish is a separate, intentional step. When you are ready: `./sync.sh`, then [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish). Do not submit from a routine change.

Index of generated trees: [plugins/README.md](../plugins/README.md).

## skills.sh fallback

Clients with no plugin loader, or a single extra skill, can use [skills.sh](https://skills.sh/) ([vercel-labs/skills](https://github.com/vercel-labs/skills)). The BalaKit CLI already does this, pinned to `skills@1.5.25`.

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
| Standing | `AGENTS.md` + `CLAUDE.md` managed blocks; `.cursor/rules/*.mdc` | `~/.cursor/rules/*.mdc`; `~/.claude/CLAUDE.md`; `~/.codex/AGENTS.md`; `~/.config/opencode/AGENTS.md` |
| Skills | skills.sh into the repo; Cursor also gets `.cursor/skills` → `.agents/skills` | skills.sh `-g`; Claude Code often symlinks `~/.claude/skills` to `~/.agents/skills`. User-scope Copilot is a kit post-pass: symlink `~/.copilot/skills/<name>` → `~/.agents/skills/<name>` (not “skills.sh might create it if `~/.copilot` exists”). If `/` still hides personal skills after that dest is populated, that is a VS Code Copilot gap — file it upstream; do not copy the pack into every repo. |
| Plugins | not copied | every folder under `plugins/` → `~/.cursor/plugins/local/` |

`add` **reconciles** with the matching manifest so later adds never shrink the managed block.

## Destinations (CLI, not native plugin install)

| Agent | Skills (project) | Skills (user) | Standing (project) | Standing (user) |
| --- | --- | --- | --- | --- |
| Cursor | `.cursor/skills` **and** `.agents/skills` | `~/.cursor/skills` **and** `~/.agents/skills` | `.cursor/rules/*.mdc` + `AGENTS.md` | `~/.cursor/rules/*.mdc`. Plugins: `~/.cursor/plugins/local/` |
| Claude Code | `.claude/skills` | `~/.claude/skills` | `CLAUDE.md`; scoped `.claude/rules` | `~/.claude/CLAUDE.md` |
| Codex | `.agents/skills` | `~/.agents/skills`; skills.sh `-g` may also use `~/.codex/skills` | `AGENTS.md` | `~/.codex/AGENTS.md` |
| OpenCode | `.opencode/skills` (+ `.agents` / `.claude`) | `~/.agents/skills`; also `~/.config/opencode/skills` | `AGENTS.md` | `~/.config/opencode/AGENTS.md` |
| Copilot | `.github/skills` (+ `.agents` / `.claude`) | `~/.copilot/skills` | `AGENTS.md` + `.github/instructions` | Personal Copilot settings (left alone) |

Optional agents (Cline, Kilo, Windsurf, Gemini CLI, Roo, Zed, Amp, Continue, Junie, Amazon Q / Kiro): skills.sh where the id is verified; standing = `AGENTS.md` if that client reads it. Continue and Amazon Q have `standing: none` in the CLI matrix (skills can still install).

`balakit list` and `balakit status` print the capability matrix (`*` = detected). Detection is a hint, not a guarantee. If nothing is detected, the CLI defaults to `cursor`, `claude-code`, and `codex`.

## Compatibility snapshot

| Client | Skills | Standing rules |
| --- | --- | --- |
| Cursor | Native plugins, or user-scope copy to `plugins/local` | `init` |
| Copilot / VS Code | Point at `plugins/balakit-*`, not the repo root | `init` |
| Amazon Q / Kiro | `plugins/balakit-*`; skills.sh id `kiro-cli` | `init` → `AGENTS.md` if it reads it |
| ChatGPT / Codex | OpenAI catalog. IDE extension: no plugins | Codex CLI: `~/.codex/AGENTS.md` |
| Claude Code | Marketplace only | `init` → `CLAUDE.md` |
| OpenCode, Cline, Kilo, Windsurf, Gemini CLI, … | CLI / skills.sh | `init` → `AGENTS.md` if they read it |

Aider: no skills.sh id (rules only). Google Jules: registered, never auto-detected.

## After install

1. Reload the agent window (required after Cursor `plugins/local` or new skills).
2. `npx balakit doctor`
3. Ask for a skill by name. [Skills](skills.md) lists what each one does.
