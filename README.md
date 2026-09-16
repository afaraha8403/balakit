<p align="center">
  <img src="assets/balakit.svg" alt="BalaKit" width="180" height="180">
</p>

<h1 align="center">BalaKit</h1>

<p align="center"><strong>Standing rules and named playbooks for AI coding agents.</strong></p>

<p align="center">
  Rules shape every task. Skills are playbooks you invoke by name.<br>
  One command installs both. Cursor, Claude Code, Codex, Copilot, OpenCode, and more.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/balakit"><img src="https://img.shields.io/npm/v/balakit.svg" alt="npm version"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
  <a href="https://agent-plugins.org/specification"><img src="https://img.shields.io/badge/Agent%20Plugins-1.0.0-111111.svg" alt="Agent Plugins 1.0.0"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick start</a> ·
  <a href="#try-inception">Try inception</a> ·
  <a href="#what-you-get">What you get</a> ·
  <a href="#skills">Skills</a> ·
  <a href="docs/install.md">Install</a> ·
  <a href="docs/cli.md">CLI</a> ·
  <a href="docs/faq.md">FAQ</a>
</p>

BalaKit is a kit of files your coding agent already knows how to load. Standing rules go into `AGENTS.md` (and the matching files for Claude Code, Cursor, and Codex). Skills are playbooks you call by name, such as `/inception` or `kit-workflows`. Take what you like. Ignore the rest.

It is not a personality pack and not a sticky chat mode. Mental continuity lives in a [separate CLI](https://github.com/afaraha8403/mental).

## Quick start

Requires [Node.js](https://nodejs.org/) 18 or newer.

```bash
npx balakit@latest init -y
```

Run that **in the project directory**, not in `$HOME`. `npx balakit` without `@latest` will use a local `node_modules/balakit` or a global install if one exists, which can be months old.

That writes standing rules and the default engineering skills into **this repository**. Reload the agent window. Then ask by skill name: "walk through how auth works" or `/inception add a CSV export`.

Preview first with `--dry-run`. Skip the skills and keep only rules with `--rules-only`. Install the same kit for every project on this machine with `--scope user`:

```bash
npx balakit@latest init --dry-run
npx balakit@latest init --rules-only -y
npx balakit@latest init --scope user -y
```

User scope also copies Cursor plugins to `~/.cursor/plugins/local/`. Check the kit with `npx balakit doctor` (that is not `mental doctor`).

No menus: pass `-y`. Guided setup: `npx balakit` with no flags.

### Try inception

After `init`, plan without hunting the skills table:

- `/inception <request>` asks when blocked. In Agent mode it writes `.balakit/plans/<slug>.md`.
- `/inception --circuit <request>` skips waits and stops at the plan.
- `/inception --autopilot <request>` writes the plan, then runs `execute` (degrades if Plan Mode is on).

Full contract: [inception](docs/skills.md#inception).

## What you get

| Layer | What it is | When it runs |
| --- | --- | --- |
| **Standing rules** | Always-on behavior: simplicity, testing, comments, changelog, one version when you ship | Every task |
| **Engineering skills** | Playbooks you invoke: how / why / is it safe, plan, audit, compare, prove, ship | When you ask, or when the skill's apply-when matches |
| **Extra packs** | SEO, marketing, media (Fal.ai), NotebookLM, stealth browser | `npx balakit add …` or a native plugin |

Default `init` does **not** install SEO, marketing, media, NotebookLM, or `cloakbrowser-fallback`. Add those when you need them.

Two scopes: `--scope project` (this repo, default) vs `--scope user` (this machine). Details: [Install](docs/install.md).

## Skills

Ask the agent by name. One sentence each. Full pages: [Skills](docs/skills.md).

### Understand and change code

| You want | Skill | What it does |
| --- | --- | --- |
| How does this work? | [`subsystem-walkthrough`](docs/skills.md#subsystem-walkthrough) | Explains architecture, runtime flow, and ownership |
| Why is it shaped this way? | [`design-rationale`](docs/skills.md#design-rationale) | Investigates history. Every claim gets an evidence label |
| Is this diff safe? | [`proving-change-safety`](docs/skills.md#proving-change-safety) | Names one safety fact and proves it by running real code |
| Bug, small feature, or refactor | [`kit-workflows`](docs/skills.md#kit-workflows) | Matches one playbook. Not a sticky mode |
| Nothing else fits | [`unmatched-workflow`](docs/skills.md#unmatched-workflow) | Designs a falsifiable playbook for the leftover work |
| Audit what already exists | [`dissect`](docs/skills.md#dissect) | Red-teams an existing service, schema, or plan |
| Compare approaches before building | [`deep-deliberation`](docs/skills.md#deep-deliberation) | Checkpointed option comparison |
| A durable, file-level plan | [`inception`](docs/skills.md#inception) | Writes the plan and stops. Recommends `execute` |
| Parallel takes, no writes | [`opinion`](docs/skills.md#opinion) | Current model by default; auto-pick for other families. This chat does not edit |
| Workers research, then do the work | [`execute`](docs/skills.md#execute) | Same fan-out, then this chat implements |

`dissect`, `deep-deliberation`, and `inception` share `--circuit` (skip waits) and `--autopilot` (take recommended choices). On `inception`, circuit still **stops at the plan**. Only `--autopilot` runs `execute`.

### Prove behavior

| You want | Skill | What it does |
| --- | --- | --- |
| Drive the app like a user | [`generating-app-verify`](docs/skills.md#generating-app-verify) | Writes a repo-local verify skill for the real app |
| Keep that map honest | [`refreshing-app-verify`](docs/skills.md#refreshing-app-verify) | Re-drives every mapped feature. Does not patch product code |

### Author skills and docs

| You want | Skill | What it does |
| --- | --- | --- |
| Write a Skill or rule | [`authoring-skills-and-rules`](docs/skills.md#authoring-skills-and-rules) | Frontmatter, layout, and craft across agents |
| A/B a Skill or prompt change | [`blinded-eval`](docs/skills.md#blinded-eval) | Isolated candidates, the same organic prompt, judge from artifacts |
| Write a README or guide | [`documentation-writer`](docs/skills.md#documentation-writer) | One Diátaxis mode, then STE / Global English |
| Cut a GitHub / npm release | [`release-deploy`](docs/skills.md#release-deploy) | Tag-triggered releases from the changelog |
| Browser automation is blocked | [`cloakbrowser-fallback`](docs/skills.md#cloakbrowser-fallback) | Stealth Chromium when 403 / Turnstile / CAPTCHA stops you |

`cloakbrowser-fallback` is opt-in (`npx balakit add cloakbrowser-fallback`), not part of default `init`.

### Marketing, SEO, media (opt-in)

| You want | Skill | Pack |
| --- | --- | --- |
| Technical / semantic / AI search SEO | [`everything-seo`](docs/skills.md#everything-seo) | `npx balakit add everything-seo` |
| Audit a public page | [`seo-audit`](docs/skills.md#seo-audit) | `npx balakit add seo-audit` |
| Make a site discoverable to agents | [`agent-ready`](docs/skills.md#agent-ready) | `npx balakit add agent-ready` |
| Copy psychology | [`marketing-psychology`](docs/skills.md#marketing-psychology) | `npx balakit add marketing-psychology` |
| Startup GTM and distribution | [`startup-marketing-brain`](docs/skills.md#startup-marketing-brain) | `npx balakit add startup-marketing-brain` |
| Images and video via Fal.ai | [`media-gen`](docs/skills.md#media-gen) | `npx balakit add media-gen` |
| NotebookLM CLI and MCP | [`nlm-skill`](docs/skills.md#nlm-skill) | `npx balakit add nlm-skill` |

Or install the matching [plugin pack](docs/install.md#native-plugins).

## Standing rules

Default `init` installs these five. They are always on.

| Rule | What it does |
| --- | --- |
| `base` | Meta-principle, dual-mode chat, simplicity ladder, repo hygiene |
| `testing` | Tests must catch a real bug. Prove behavior on the real artifact |
| `comments` | Document why, not what. Every exported symbol gets a doc comment |
| `changelog` | `CHANGELOG.md` grouped as Features / Fixes / Changes |
| `release` | Git tag, changelog heading, `package.json`, and npm publish share one semver |

`seo-ai-search` is file-scoped SEO + AI-search implementation. Add it when you ship public pages: `npx balakit add seo-ai-search`.

## Commands

```bash
npx balakit                         # guided setup
npx balakit@latest init -y          # this repo: rules + engineering skills
npx balakit@latest init --scope user -y
npx balakit init --rules-only -y    # standing rules only
npx balakit add dissect --scope user
npx balakit list
npx balakit status
npx balakit doctor
npx balakit update
npx balakit remove testing
```

```bash
npm install -g balakit
balakit init -y
```

`--agents <ids|all>` selects [skills.sh](https://skills.sh/) targets (default: detect). `--personal` and `--mental-*` print a URL and exit. Full flag list: [CLI](docs/cli.md).

## Native plugins

This repo is a **marketplace**, not one plugin. Do not `/add-plugin` the repo root.

Five [Agent Plugins 1.0.0](https://agent-plugins.org/specification) packs live under `plugins/` (`balakit-engineering`, `balakit-marketing`, `balakit-media`, `balakit-nlm`, `balakit-seo-skills`). Cursor also has two rules-only plugins (`balakit-core`, `balakit-seo`). Plugin install loads skills. It does **not** write `AGENTS.md`. You still run `balakit init` for standing rules.

```text
# Claude Code
/plugin marketplace add afaraha8403/balakit
/plugin install balakit-engineering@balakit

# Codex CLI (ChatGPT uses the Plugins tab; same catalog)
codex plugin marketplace add afaraha8403/balakit
codex plugin add balakit-engineering@balakit

# GitHub Copilot CLI
copilot plugin marketplace add afaraha8403/balakit
copilot plugin install balakit-engineering@balakit
```

Per-client notes and filesystem destinations: [Install](docs/install.md).

### Paste this into your agent

```text
Install BalaKit from https://github.com/afaraha8403/balakit (npm package: balakit).

Run: npx balakit@latest init --scope <project|user> -y
That writes standing rules (AGENTS.md / CLAUDE.md / .mdc) and default engineering skills.
User scope also copies Cursor plugins to ~/.cursor/plugins/local/.

Optional extras (native plugin when this client can; otherwise skip):
  Cursor: add marketplace https://github.com/afaraha8403/balakit — do not /add-plugin the repo root.
  Claude Code: /plugin marketplace add afaraha8403/balakit then /plugin install <name>@balakit
  ChatGPT / Codex: Plugins tab or `codex plugin …`. OpenAI IDE extension: no plugins.
  Copilot CLI: copilot plugin marketplace add afaraha8403/balakit

Then: npx balakit@latest doctor
Reload Cursor if plugins/local changed. Do not npm publish.
```

## Compatibility

| Client | Skills | Standing rules |
| --- | --- | --- |
| Cursor | Native Agent Plugins, or user-scope `init` copies to `~/.cursor/plugins/local/` | `init` → `.mdc` + `AGENTS.md` |
| Copilot / VS Code | Point at a `plugins/balakit-*` folder, not the repo root | `init` |
| Amazon Q / Kiro | Agent Plugins under `plugins/balakit-*`. skills.sh id is `kiro-cli` | `init` → `AGENTS.md` if it reads it |
| ChatGPT / Codex | One [OpenAI plugin catalog](https://developers.openai.com/codex/plugins). ChatGPT: Plugins tab. Codex CLI: `codex plugin …`. **IDE extension: no plugins.** | `init` → `~/.codex/AGENTS.md` for Codex CLI |
| Claude Code | Marketplace only (`.claude-plugin/`). Root `plugin.json` is invisible | `init` → `CLAUDE.md` |
| OpenCode, Cline, Kilo, Windsurf, Gemini CLI, … | CLI / skills.sh | `init` → `AGENTS.md` if they read it |

Aider has no skills.sh id (rules only). Google Jules is listed in the CLI matrix but is never auto-detected.

## FAQ

**This repo or this machine?**
This repo → `--scope project` (default). Every project on this PC → `--scope user`.

**Skills missing after `init`?**
Default `init` installs engineering skills. `--rules-only` skips them. Marketing / SEO / media / nlm / `cloakbrowser-fallback` still need `add` or a plugin. Reload the agent window.

**Do native plugins replace the CLI?**
No. Plugins load skills (and Cursor plugins can load rules). `balakit init` still writes the standing kit.

More answers: [FAQ](docs/faq.md).

## Developing

`skills/` and `rules/` are the source of truth. Generated plugin trees and marketplace catalogs come from `./sync.sh`.

```bash
./sync.sh
npm test
npm run lockstep
```

```powershell
powershell -ExecutionPolicy Bypass -File .\sync.ps1
```

Never hand-edit generated plugin `version` fields. Bump `package.json`, then `./sync.sh`.

CI on `master` / `staging` runs tests and lockstep. A `v*` tag runs `.github/workflows/release.yml` (GitHub Release + `npm publish`). Repo secret `NPM_TOKEN` must be an npm **Automation** token.

```text
bin/cli.mjs                 # entry
skills/<name>/SKILL.md      # skills source
rules/<name>.mdc            # rules source
plugins/<name>/             # generated domain plugins
docs/                       # install, CLI, skills catalog, FAQ
.cursor-plugin/marketplace.json
```

## Docs

| Page | Mode |
| --- | --- |
| [Skills](docs/skills.md) | What each playbook does |
| [Install](docs/install.md) | Scopes, plugins, destinations |
| [CLI](docs/cli.md) | Commands, flags, agent ids |
| [FAQ](docs/faq.md) | Troubleshooting |
| [Mental (moved)](docs/mental-design.md) | Pointer to the standalone CLI |

---

**npm:** [balakit](https://www.npmjs.com/package/balakit) · **repo:** [afaraha8403/balakit](https://github.com/afaraha8403/balakit) · **license:** [MIT](LICENSE)
