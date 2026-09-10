<h1 align="center">balakit</h1>

<p align="center"><strong>Opinionated rules and skills for AI coding agents.</strong></p>

<p align="center">
  Standing rules land AGENTS.md-first. Skills: <a href="https://agent-plugins.org">Agent Plugins</a> when the client can load a plugin, otherwise <a href="https://skills.sh/">skills.sh</a>.<br>
  Domain groups ship as portable Agent Plugins 1.0.0 + Cursor local plugins.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/balakit"><img src="https://img.shields.io/npm/v/balakit.svg" alt="npm version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
  <a href="https://agent-plugins.org/specification"><img src="https://img.shields.io/badge/Agent%20Plugins-1.0.0-111111.svg" alt="Agent Plugins 1.0.0"></a>
</p>

<p align="center">
  <a href="#whats-in-the-kit">What's in the kit</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#compatibility">Compatibility</a> ·
  <a href="#paste-this-into-your-agent">Paste into your agent</a> ·
  <a href="#faq">FAQ</a>
</p>

Take what you like, ignore the rest. Standing rules: meta-principle, simplicity ladder, changelog / testing / comments, SEO guardrails, and release version lockstep. Engineering playbooks: how a subsystem works, why code is shaped this way, prove a change is safe by running real code, and drive the app the way a user does.

## What's in the kit

Ask the agent by skill name. These are playbooks, not a personality pack and not a sticky mode.

| When you need | Skill |
| --- | --- |
| How does this subsystem work? | `subsystem-walkthrough` |
| Why is it shaped this way? | `design-rationale` (every claim labeled Direct / Supported / Inferred / Speculative / Unknown) |
| Is this diff safe to merge? | `proving-change-safety` — prove the one fact by running real code |
| Bug fix, small feature, or refactor | `kit-workflows` |
| No narrower playbook fits | `unmatched-workflow` |
| Prove the app like a user | `generating-app-verify` then `refreshing-app-verify` |
| Prove a Skill or prompt change | `blinded-eval` |
| Audit an existing service or plan | `dissect` |
| Compare options before building | `deep-deliberation` |

Also in the kit: authoring Skills/rules, documentation (Diátaxis + STE), GitHub tag releases, SEO, marketing psychology, Fal.ai media, and NotebookLM. Full table under [Skills](#skills).

## Quick start

```bash
npx balakit                      # guided: this repo vs this machine
npx balakit init -y              # this repo — team rules
npx balakit init --scope user -y # this machine — user rules + Cursor plugins
```

`init` installs **standing rules** (and, on `--scope user`, copies Cursor plugins to `~/.cursor/plugins/local/`). **Skills are a second step** — `init` does not run skills.sh.

```bash
npx balakit add dissect --scope user --agents claude-code,opencode -y
npx balakit status
```

Node `>=18`. Preview with `--dry-run`. `-y` skips confirms.

### Three install paths

1. **Native plugin → skills.** Five packages under `plugins/` (`balakit-engineering`, `balakit-marketing`, `balakit-media`, `balakit-nlm`, `balakit-seo-skills`) each have a root `plugin.json` + `skills/`. That is [Agent Plugins 1.0.0](https://agent-plugins.org/specification).
2. **`npx balakit init` → standing rules.** Plugin install never writes AGENTS.md / CLAUDE.md / `.mdc`.
3. **`npx balakit add` / [skills.sh](https://skills.sh/) → fallback.** Clients with no plugin loader, or when native install failed.

### Compatibility

| Client | Skills | Standing rules |
| --- | --- | --- |
| Cursor | Native Agent Plugins, or user-scope `init` copies to `~/.cursor/plugins/local/` | `init` → `.mdc` + AGENTS.md |
| Copilot / VS Code | Native Agent Plugins: point at a `plugins/balakit-*` folder, not the repo root | `init` |
| Kiro | Native Agent Plugins (`plugins/balakit-*`). No marketplace add command in this kit; skills.sh maps to `kiro-cli` | `init` → AGENTS.md if it reads it |
| ChatGPT / Codex | One [OpenAI plugin catalog](https://developers.openai.com/codex/plugins). ChatGPT: Plugins tab (web/desktop). Codex CLI: `codex plugin …` / `/plugins`. **IDE extension: no plugins.** | `init` → `~/.codex/AGENTS.md` for Codex CLI. ChatGPT Work does not read that file |
| Claude Code | Marketplace only (`.claude-plugin/`). Root `plugin.json` is invisible | `init` → CLAUDE.md |
| OpenCode, Cline, Kilo, Windsurf, Gemini CLI, … | CLI / skills.sh | `init` → AGENTS.md if they read it |

### Paste this into your agent

Works in Cursor, Claude Code, ChatGPT / Codex, Copilot, OpenCode, and anything that can install a plugin or run a shell:

```text
Install Balakit from https://github.com/afaraha8403/balakit (npm package: balakit).

Balakit is an opinionated rules + skills kit. Standing rules go AGENTS.md-first (plus CLAUDE.md and Cursor .mdc). Skills are Agent Skills. Domain groups ship as Agent Plugins 1.0.0 packages (https://agent-plugins.org/specification).

This repo is a marketplace, not a single root plugin.json. Do not /add-plugin the repo root. Portable packages live under plugins/:
- Skill plugins: balakit-engineering, balakit-marketing, balakit-media, balakit-nlm, balakit-seo-skills (each has plugin.json + skills/)
- Cursor also ships balakit-core and balakit-seo (rules) via .cursor-plugin/marketplace.json (pluginRoot: plugins)
Manifests: .cursor-plugin/marketplace.json · .claude-plugin/marketplace.json · .agents/plugins/marketplace.json

Ask me: this repo (--scope project, default) or this machine (--scope user).

If this client can install plugins natively, do that FIRST. Native install loads the skill packages; it does not write AGENTS.md standing rules.

  Cursor: do not /add-plugin the repo URL. User-scope CLI copies plugins to ~/.cursor/plugins/local/. Or add marketplace https://github.com/afaraha8403/balakit from Customize → Plugins, enable the plugins, reload the window.
  Claude Code: /plugin marketplace add afaraha8403/balakit
               then /plugin install <name>@balakit for: balakit-engineering, balakit-marketing, balakit-media, balakit-nlm, balakit-seo-skills
               Claude Code cannot see root plugin.json — use the marketplace (needs .claude-plugin/).
  ChatGPT / Codex: one OpenAI catalog (not two products). ChatGPT web/desktop: Plugins tab. Codex CLI: `codex plugin marketplace add afaraha8403/balakit` then `codex plugin add <name>@balakit` for the same five names. OpenAI's IDE extension does not load plugins — use ChatGPT desktop, Codex CLI, or the CLI below.
  Copilot CLI: copilot plugin marketplace add afaraha8403/balakit
               then `copilot plugin install <name>@balakit` for the same five names
  VS Code:     Command Palette → Chat: Install Plugin From Source wants a single plugin.json. Point it at a plugins/balakit-* folder, or skip and use the CLI below.
  OpenCode / unknown: no plugin install. Skip native plugins. Use init + add below.

Then always write standing rules (`init` does not run skills.sh):

  npx balakit@latest init --scope <project|user> -y

If native plugin install already loaded the five skill plugins, skip the next add. If this client has no plugin install, or native failed:

  npx balakit@latest add authoring-skills-and-rules cloakbrowser-fallback deep-deliberation dissect documentation-writer blinded-eval subsystem-walkthrough design-rationale proving-change-safety generating-app-verify refreshing-app-verify unmatched-workflow kit-workflows release-deploy everything-seo seo-audit marketing-psychology startup-marketing-brain media-gen nlm-skill --scope <project|user> --agents <detected or cursor,claude-code,opencode,codex,copilot> -y

Do not npm publish or gh release create. Run `npx balakit@latest status`, tell me what it reports, and remind me to reload Cursor if plugins/local or the plugin UI changed. Customize → User Rules is account UI — the CLI cannot write it.
```

## Highlights

- **How / why / is it safe.** `subsystem-walkthrough`, `design-rationale`, and `proving-change-safety`.
- **Named playbooks, not a sticky mode.** `kit-workflows` is bug-fix, feature, or refactor. `unmatched-workflow` when none of those fit.
- **Drive the app like a user.** `generating-app-verify` writes a repo-local verify skill. `refreshing-app-verify` keeps the feature map honest.
- **Eval a Skill change before you ship it.** `blinded-eval`: isolated candidates, the same organic prompt, judge from artifacts.
- **Two scopes.** `--scope project` (this repo) vs `--scope user` (this machine, all projects).
- **Rules ≠ skills.** `init` = standing rules. `add <skill>` = skills.sh (`-g` on user scope).
- **Native plugins when the client supports them.** Marketplace manifests ship in-repo. Cursor: `~/.cursor/plugins/local/` (CLI copy) or add the GitHub marketplace. Claude Code: marketplace add. ChatGPT / Codex: same OpenAI catalog (Plugins tab or `codex plugin …`). Copilot: marketplace add `afaraha8403/balakit`, then install the five skill plugins. Standing rules still come from `balakit init`.
- **One version when you ship.** Git tag `vX.Y.Z`, `package.json` `"version"`, CHANGELOG heading, and npm publish are the same semver (`release` rule).

## Scopes

| | Project (`--scope project`) | User (`--scope user`) |
| --- | --- | --- |
| Manifest | `.balakit/installed.json` | `~/.balakit/installed.json` |
| Standing | `AGENTS.md` + `CLAUDE.md` managed blocks; `.cursor/rules/*.mdc` | `~/.cursor/rules/*.mdc`; `~/.claude/CLAUDE.md`; `~/.codex/AGENTS.md`; `~/.config/opencode/AGENTS.md` |
| Skills | skills.sh into the repo; Cursor also gets `.cursor/skills` → `.agents/skills` | skills.sh `-g`; Claude Code symlinks under `~/.claude/skills`; OpenCode loads `~/.agents/skills` (and `~/.config/opencode/skills`) |
| Plugins | not copied | `~/.cursor/plugins/local/balakit-*` |

Default team rules: `base`, `testing`, `comments`, `changelog`, `release`.

`add` **reconciles** with the matching manifest so later adds never shrink the managed block.

## Commands

```bash
npx balakit                         # guided setup
npx balakit init                    # same guided flow
npx balakit init -y                 # team kit, this repo
npx balakit init --scope user -y    # team kit + Cursor plugins, this machine
npx balakit add base testing
npx balakit add dissect --scope user --agents claude-code,opencode
npx balakit list
npx balakit status
npx balakit update                  # project manifest
npx balakit update --scope user     # home manifest
npx balakit remove testing
```

```bash
npm install -g balakit
balakit init
```

`--agents <ids|all>` selects skills.sh targets (default: detect). `--personal`, `doctor`, and `--mental-*` are leftover flags: they print a URL and exit.

## Destinations

Filesystem layout when using the CLI, not native plugin install.

| Agent | Skills (project) | Skills (user) | Standing (project) | Standing (user) |
| --- | --- | --- | --- | --- |
| Cursor | `.cursor/skills` **and** `.agents/skills` | `~/.cursor/skills` **and** `~/.agents/skills` | `.cursor/rules/*.mdc` + `AGENTS.md` | `~/.cursor/rules/*.mdc`. Plugins: `~/.cursor/plugins/local/` |
| Claude Code | `.claude/skills` | `~/.claude/skills` (often symlinks to `~/.agents/skills`) | `CLAUDE.md`; scoped `.claude/rules` | `~/.claude/CLAUDE.md` |
| Codex | `.agents/skills` | `~/.agents/skills`; skills.sh `-g` may also use `~/.codex/skills` | `AGENTS.md` | `~/.codex/AGENTS.md` |
| OpenCode | `.opencode/skills` (+ `.agents` / `.claude`) | `~/.agents/skills` (skills.sh “universal”); also `~/.config/opencode/skills` | `AGENTS.md` | `~/.config/opencode/AGENTS.md` |
| Copilot | `.github/skills` (+ `.agents` / `.claude`) | `~/.copilot/skills` | `AGENTS.md` + `.github/instructions` | Personal Copilot settings (left alone) |

Optional agents (Cline, Kilo, Windsurf, Gemini CLI, Roo, Zed, Amp, …): skills.sh only; standing = `AGENTS.md` if they read it.

`balakit list` and `balakit status` print the capability matrix (`*` = detected). Detection is a hint, not a guarantee.

Direct skills.sh:

```bash
npx skills add afaraha8403/balakit
npx skills add afaraha8403/balakit -g
npx skills add afaraha8403/balakit --skill dissect
```

## Plugins

`skills/` and `rules/` are the source of truth. `./sync.sh` materializes `plugins/` plus marketplace catalogs.

This repo is a **marketplace**, not one plugin. Catalogs: `.cursor-plugin/marketplace.json`, `.claude-plugin/marketplace.json`, `.agents/plugins/marketplace.json`. Portable packages live under `plugins/`. Do not `/add-plugin` the repo root.

| Plugin | Ships | Format |
| --- | --- | --- |
| `balakit-core` | rules: `base`, `testing`, `comments`, `changelog`, `release` | Cursor Plugin |
| `balakit-seo` | `seo-ai-search` rule only | Cursor Plugin |
| `balakit-seo-skills` | `everything-seo`, `seo-audit` | Agent Plugins + Cursor twin |
| `balakit-marketing` | `marketing-psychology`, `startup-marketing-brain` | Agent Plugins + Cursor |
| `balakit-media` | `media-gen` | Agent Plugins + Cursor |
| `balakit-nlm` | `nlm-skill` | Agent Plugins + Cursor |
| `balakit-engineering` | `authoring-skills-and-rules`, `cloakbrowser-fallback`, `deep-deliberation`, `dissect`, `documentation-writer`, `blinded-eval`, `subsystem-walkthrough`, `design-rationale`, `proving-change-safety`, `generating-app-verify`, `refreshing-app-verify`, `unmatched-workflow`, `kit-workflows`, `release-deploy` | Agent Plugins + Cursor |

Rules are **not** a portable Agent Plugins v1 component (they stay in Cursor plugins + `AGENTS.md`). There is no bundled `mcp.json` — `nlm-skill` talks to an external MCP. Every plugin `version` equals `package.json`. Skill `SKILL.md` `version:` stays independent.

Native marketplace add:

```bash
# Claude Code (in chat)
/plugin marketplace add afaraha8403/balakit
/plugin install balakit-engineering@balakit

# ChatGPT / Codex — one OpenAI catalog. ChatGPT: Plugins tab (web/desktop).
# Codex CLI:
codex plugin marketplace add afaraha8403/balakit
codex plugin add balakit-engineering@balakit

# GitHub Copilot CLI
copilot plugin marketplace add afaraha8403/balakit
copilot plugin install balakit-engineering@balakit
```

Cursor public marketplace: do **not** submit from a routine change. When you are ready, `./sync.sh` then follow [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish).

## Rules

| Rule | Typical use |
| --- | --- |
| `base` | Meta-principle, dual-mode communication, simplicity ladder, repo hygiene |
| `changelog` | Changelog maintenance (Features / Fixes / Changes) |
| `comments` | Comments and documentation comments |
| `release` | Git tag, CHANGELOG heading, `package.json`, and npm publish share one semver |
| `seo-ai-search` | SEO + AI-search implementation (file-scoped) |
| `testing` | Testing philosophy |

## Skills

### Understand and change code

| Skill | Summary |
| --- | --- |
| `subsystem-walkthrough` | How a subsystem works: architecture, runtime flow, ownership, layering |
| `design-rationale` | Why code is shaped this way. Git and PRs first. Every claim labeled by evidence strength |
| `proving-change-safety` | What a change could break beyond the diff; prove the one safety fact by running real code |
| `kit-workflows` | Bug-fix, named-data-shape feature, or behavior-preserving refactor. Not a sticky mode |
| `unmatched-workflow` | Design a falsifiable playbook when no narrower skill fits |
| `dissect` | Audit an existing service or plan into a minimal-build plan |
| `deep-deliberation` | Checkpointed option comparison before building |

### Prove behavior

| Skill | Summary |
| --- | --- |
| `generating-app-verify` | Generate a repo-local skill that drives the real app the way a user does |
| `refreshing-app-verify` | Keep a generated verify skill's feature map honest |

### Author skills and docs

| Skill | Summary |
| --- | --- |
| `authoring-skills-and-rules` | Create or update Skills and rules across agents. Playbook steps become todos with `skip:` reasons |
| `blinded-eval` | Blinded eval of a Skill or prompt change (isolated candidates, organic prompt, judge from artifacts) |
| `documentation-writer` | Research-first docs: one Diátaxis mode, STE / Global English |
| `release-deploy` | GitHub tag releases; changelog-driven notes |
| `cloakbrowser-fallback` | Stealth Chromium when normal automation is blocked |

### Marketing, SEO, media

| Skill | Summary |
| --- | --- |
| `everything-seo` | Comprehensive SEO playbook |
| `seo-audit` | SEO audit workflow |
| `marketing-psychology` | Psychology for product and marketing copy |
| `startup-marketing-brain` | Startup marketing: distribution, automation, monetization |
| `media-gen` | Fal.ai image, video, upscale, dual-model ad creative |
| `nlm-skill` | NotebookLM CLI (`nlm`) and MCP |

## FAQ

**Project or user?**
This repo only → `--scope project` (default). Every project on this PC → `--scope user`. User scope also copies Cursor plugins.

**Why didn’t skills show up after `init`?**
`init` writes standing rules (and user-scope Cursor plugin copies). Skills come from native plugin install **or** `balakit add <skills> --scope … --agents …`.

**Does native plugin install replace the CLI?**
No. Plugins load skills (and Cursor plugins can load rules). `balakit init` still writes the AGENTS.md / CLAUDE.md standing kit. Skip `balakit add` only when this client already loaded the five skill plugins.

**Claude Code ignored root `plugin.json`.**
Expected. Claude Code loads `.claude-plugin/plugin.json`. Use `/plugin marketplace add afaraha8403/balakit`, then `/plugin install <name>@balakit`.

**ChatGPT or Codex — which one?**
Same OpenAI plugins. ChatGPT = Plugins tab (web/desktop). Codex CLI = `codex plugin …` / `/plugins`. OpenAI’s IDE extension does not load plugins. Cursor / VS Code Copilot is a different client.

**OpenCode (or Cline, Windsurf, …) has no plugin install.**
Skip native plugins. `npx balakit init` then `npx balakit add … --agents opencode` (or the detected id).

**Customize → User Rules is empty.**
That UI is Cursor account settings, not files. The CLI writes `~/.cursor/rules/*.mdc` and `~/.cursor/plugins/local/`. Reload the window.

**Can I mix agents?**
Yes. `--agents cursor,claude-code,opencode` (or `all`). Only verified skills.sh ids are passed as `-a`.

## Developing

`skills/` and `rules/` are the source of truth.

```bash
./sync.sh
npm test
npm run lockstep
```

```powershell
powershell -ExecutionPolicy Bypass -File .\sync.ps1
```

Never hand-edit generated plugin `version` fields — bump `package.json`, then `./sync.sh`.

CI on `master` / `staging`: tests + lockstep. A `v*` tag runs `.github/workflows/release.yml` (GitHub Release + `npm publish`). Repo secret `NPM_TOKEN` must be an npm **Automation** token (publish/classic tokens fail with `EOTP`).

```text
bin/cli.mjs                 # entry
skills/<name>/SKILL.md      # skills source
rules/<name>.mdc            # rules source
plugins/<name>/             # generated domain plugins
.cursor-plugin/marketplace.json
.github/workflows/          # CI + tag-triggered npm publish
sync.sh / sync.ps1
```

---

**npm:** [balakit](https://www.npmjs.com/package/balakit) · **repo:** [afaraha8403/balakit](https://github.com/afaraha8403/balakit) · **license:** [MIT](LICENSE)
