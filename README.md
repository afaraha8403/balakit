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

Pick tools with `--agents claude-code,cursor`. Each tool receives only its own files. Cursor plugin packs are opt-in with `--cursor-plugins`. Check kit health with `npx balakit@latest doctor`, or repair drift in one command with `npx balakit@latest doctor --fix`.

No menus: pass `-y`. Guided setup: `npx balakit` with no flags.

### Try inception

After `init`, plan without hunting the skills table:

- `/inception <request>` asks when blocked. In Agent mode it writes `.balakit/plans/<slug>.md`.
- `/inception --brake <request>` skips waits and stops at the plan.
- `/inception --autopilot <request>` writes the plan, then runs `execute` (degrades if Plan Mode is on).

Full contract: [inception](docs/skills.md#inception).

### Try ui-craft

Build, refine, redesign, or audit web UIs in five separated passes (`DESIGN.md` tokens, per-route intents, craft floor, blind critique, and `390px`/`1440px` browser proof):

- `/ui-craft <brief>` builds a new web UI end-to-end.
- `/ui-craft --refine` tightens an existing interface while preserving its brand and tokens.
- `/ui-craft --redesign` replaces the visual world while keeping features and copy.
- `/ui-craft --audit` scores every route and runs a read-only a11y and DOM probe (combine any mode with `--focus <axis>` or `--brake`).

Full contract: [ui-craft](docs/skills.md#ui-craft).

## What you get

| Layer | What it is | When it runs |
| --- | --- | --- |
| **Standing rules** | Always-on behavior: simplicity, testing, comments, changelog, one version when you ship | Every task |
| **Engineering skills** | Playbooks you invoke: how / why / is it safe, plan, audit, compare, design UI, prove, ship | When you ask, or when the skill's apply-when matches |
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
| Bug, small feature, refactor, or custom playbook | [`kit-workflows`](docs/skills.md#kit-workflows) | Matches a named playbook, or designs a falsifiable custom playbook when none fits |
| Audit what already exists | [`dissect`](docs/skills.md#dissect) | Red-teams an existing service, schema, or plan |
| Compare approaches before building | [`deep-deliberation`](docs/skills.md#deep-deliberation) | Checkpointed option comparison |
| A durable, file-level plan | [`inception`](docs/skills.md#inception) | Writes the plan and stops. Recommends `execute` |
| Workers research, then build (or `--opinion` read-only) | [`execute`](docs/skills.md#execute) | Parallel takes across worker slots (`--opinion` stops before edits) |
| Design, refine, redesign, or audit a web UI | [`ui-craft`](docs/skills.md#ui-craft) | Five-pass UI workflow: `DESIGN.md` tokens, per-route intents, craft floor, blind critique + a11y, `390px`/`1440px` live proof |
| Make it ready for real users | [`trl`](docs/skills.md#trl) | Scores a TRL 1–9 per area with a blind agent panel, then builds toward the next level |

`dissect`, `deep-deliberation`, and `inception` share `--brake` (skip waits) and `--autopilot` (take recommended choices). `--circuit` still works (alias of `--brake`). On `inception`, brake still **stops at the plan**. Only `--autopilot` runs `execute`. Interactive checkpoints call each harness's native Question UI (`AskUserQuestion`, `AskQuestion`, `question`, `request_user_input`, `vscode_askQuestions`, or `ask_user`) with at most 4 options and `Say this in plain English` last.

### Prove behavior

| You want | Skill | What it does |
| --- | --- | --- |
| Drive the app like a user (or `--refresh` existing map) | [`verify-app`](docs/skills.md#verify-app) | Generates or refreshes a repo-local verify skill against the running app |

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
| Images and video via Fal.ai | [`media-gen`](docs/skills.md#media-gen) | `npx balakit@latest add media-gen` |
| NotebookLM CLI and MCP | [`notebooklm`](docs/skills.md#notebooklm) | `npx balakit@latest add notebooklm` |

Or install the matching [plugin pack](docs/install.md#native-plugins).

## Standing rules

Default `init` installs four rules: three always-on standing rules plus path-scoped changelog maintenance.

| Rule | Scope | What it does |
| --- | --- | --- |
| `base` | Always on | Meta-principle, dual-mode chat, native Question UI, simplicity ladder, release lockstep |
| `testing` | Always on | Tests must catch a real bug. Prove behavior on the real artifact |
| `comments` | Always on | Document why, not what. Every exported symbol gets a doc comment |
| `changelog` | `**/CHANGELOG.md` | `CHANGELOG.md` grouped as Features / Fixes / Changes |

`seo-ai-search` is file-scoped SEO and AI-search implementation for public routes and metadata files. Add it when you ship public pages: `npx balakit@latest add seo-ai-search`.

## Commands

```bash
npx balakit@latest                         # guided setup
npx balakit@latest init -y                 # this repo: rules + engineering skills
npx balakit@latest init --scope user -y
npx balakit@latest init --rules-only -y    # standing rules only
npx balakit@latest add dissect --scope user
npx balakit@latest list
npx balakit@latest status
npx balakit@latest doctor --fix
npx balakit@latest update
npx balakit@latest remove testing
```

```bash
npm install -g balakit
balakit init -y
```

`--agents <ids|all>` picks the tools to install for (default: the tools recorded last time, else detect). `--personal` and `--mental-*` print a URL and exit. Full flag list: [CLI](docs/cli.md).

## Native plugins

This repo is a **marketplace**, not one plugin. Do not `/add-plugin` the repo root.

Five [Agent Plugins 1.0.0](https://agent-plugins.org/specification) packs live under `plugins/` (`balakit-engineering`, `balakit-marketing`, `balakit-media`, `balakit-notebooklm`, `balakit-seo-skills`). Cursor also has two rules-only plugins (`balakit-core`, `balakit-seo`). Plugin install loads skills. It does **not** write `AGENTS.md`. You still run `balakit init` for standing rules.

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

Run: npx balakit@latest init --scope <project|user> --agents <this client's id> -y
(ids: cursor, claude-code, codex, opencode, copilot, … — see npx balakit@latest list)
That writes standing rules (AGENTS.md / CLAUDE.md / .mdc) and default engineering skills for that client only.

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
| Cursor | Native CLI skills (`.cursor/skills`), Agent Plugins, or `--cursor-plugins` (`~/.cursor/plugins/local/`) | Single-injection: `.cursor/rules/*.mdc` alone, or `AGENTS.md` + glob-scoped `.mdc` |
| Copilot / VS Code | Native CLI skills (`.agents/skills` / `~/.copilot/skills`) or `plugins/balakit-*` | `AGENTS.md` + `.github/instructions/*.instructions.md` (project), `~/.copilot/copilot-instructions.md` (user) |
| Amazon Q / Kiro | Native CLI skills (`.kiro/skills` / `~/.kiro/skills`) or `plugins/balakit-*` | `AGENTS.md` when supported |
| ChatGPT / Codex | Native CLI skills (`.agents/skills` / `~/.codex/skills`) or [OpenAI plugin catalog](https://developers.openai.com/codex/plugins). **IDE extension: no plugins.** | `AGENTS.md` (project), `~/.codex/AGENTS.md` (user) |
| Claude Code | Native CLI skills (`.claude/skills` / `~/.claude/skills`) or `.claude-plugin/` marketplace | `CLAUDE.md` + `.claude/rules/*.md` (project), `~/.claude/CLAUDE.md` (user) |
| OpenCode & Gemini CLI | Zero-dep native CLI installer on Node 18+ | `AGENTS.md` (project), `~/.config/opencode/AGENTS.md` and `~/.gemini/GEMINI.md` (user) |
| Cline, Kilo, Windsurf, Roo, Zed, Amp, Continue, Junie | Zero-dep native CLI installer on Node 18+ | `AGENTS.md` when supported |

Aider receives rules only (`AGENTS.md`). Google Jules is listed in the CLI matrix and is never auto-detected.

## FAQ

**This repo or this machine?**
This repo → `--scope project` (default). Every project on this PC → `--scope user`.

**Skills missing after `init`?**
Default `init` installs engineering skills. `--rules-only` skips them. Marketing / SEO / media / `notebooklm` / `cloakbrowser-fallback` still need `add` or a plugin. Reload the agent window.

**Do native plugins replace the CLI?**
No. Plugins load skills (and Cursor plugins can load rules). `balakit init` still writes the standing kit.

More answers: [FAQ](docs/faq.md).

## Developing

`skills/` and `rules/` are the source of truth. Generated plugin trees, standing docs, and repo mirrors come from `npm run sync` (`scripts/sync.mjs`).

```bash
npm run sync
npm test
npm run lockstep
```

Never hand-edit generated plugin `version` fields. Bump `package.json`, then run `npm run sync`.

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
