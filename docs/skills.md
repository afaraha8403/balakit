# Skills

Each BalaKit skill is a playbook the agent follows when you ask for it by name. Default `npx balakit init` installs the engineering set. Packs marked **opt-in** need `npx balakit add <name>` or a [native plugin](install.md#native-plugins).

Install and first invoke: [README Quick start](../README.md#quick-start).

## Understand and change code

These ship with default `init`.

### `subsystem-walkthrough`

Explains how a subsystem works: architecture, runtime flow, ownership, and layering. Pairs Mermaid diagrams with a component invariants table when state transitions or message hops exist. Pass `--interactive` for a discardable single-file HTML state stepper.

Ask when you would onboard a senior engineer onto that area. Not a line-by-line source tour. Use `design-rationale` for "why", `dissect` for an entity audit.

**Say:** "Walk through how checkout works."

### `design-rationale`

Explains why the code is shaped this way. Git and PRs first. Every claim is labeled Direct, Supported, Inferred, Speculative, or Unknown. Code is not treated as its own intent.

**Say:** "Why is this flag off?" or "Why is the threshold 50?"

### `proving-change-safety`

Finds what a change could break **beyond the diff**, then proves **one** safety fact by running real code. Grep is not the proof.

**Say:** "Is this diff safe to merge?"

### `kit-workflows`

Matches the task to one playbook: bug fix, named-data-shape feature, behavior-preserving refactor, or a falsifiable custom playbook (`playbooks/custom.md`) when no standard shape fits. Not a sticky mode.

**Say:** "Fix the login 500", "Add a CSV export", or "Refactor this without changing behavior."

### `dissect`

Audits something that **already exists**: a service, schema, codebase area, or written plan. Red-teams each entity and returns a minimal-build plan.

Default is interactive (asks at checkpoints). `--brake` skips mid-run waits and asks at the final recommendation. `--autopilot` takes recommended choices and continues. `--circuit` is an alias of `--brake`.

Do not use this to author a new plan from a blank request. That is `inception`.

**Say:** `/dissect the billing service`

### `deep-deliberation`

Compares approaches **before** you build. Checkpointed. Use it when several options are viable and a wrong choice is expensive.

Same `--brake` / `--autopilot` flags as `dissect` (`--circuit` is an alias of `--brake`). Autopilot here may proceed to implement. If you want a work-breakdown plan, use `inception`.

**Say:** `/deep-deliberation Postgres vs SQLite for this worker`

### `inception`

Writes a durable, file-level plan and **stops**. It does not implement product code except `--autopilot`, which then runs `execute`.

If the host Plan Mode canvas is on, it writes there. If not, it writes `.balakit/plans/<slug>.md`.

| Flag | Mid-plan waits | At the plan |
| --- | --- | --- |
| (default) | Asks when blocked | Writes the plan. Stops. Recommends `execute` |
| `--brake` | Auto-accepts recommended | Writes the plan. Stops. No extra ask |
| `--autopilot` | Auto-accepts recommended | Writes the plan, then runs `execute` |

If Plan Mode is on, `--autopilot` degrades to brake (Plan Mode cannot implement). Accept the plan, leave Plan Mode, then `/execute`.

**Say:** `/inception add team-level API keys`

### `execute`

Spawns parallel read-only worker slots on this harness, synthesizes labeled takes, and then **this chat** implements the work. Pass `--opinion` (with optional `--agents N`, default 3, min 2, max 5) for read-only parallel takes where nobody writes project files.

Default roster is the **current model on every slot**. Auto-pick uses distinct model families. Assigning per worker may repeat a family. Spawn identifiers stay out of the question UI (family aliases only).

If you want the plan first, run `inception`. If nobody should write, run `/execute --opinion`. If one agent should just build, use `kit-workflows`.

**Say:** `/execute this canvas`, `/execute add the CSV export`, or `/execute --opinion should we split this package`

### `trl`

Scores a software Technology Readiness Level (TRL 1–9) and raises it in a loop. It works on a whole app, one feature, or a narrow improvement. Each in-scope area gets its own score: core logic, data, interfaces, UI/UX, accessibility, performance, security and privacy, infra, observability, reliability, and docs. The overall TRL is the **lowest** area.

Every cycle, three fresh assessor agents score from a thin slice of context. One reads only the repo, one audits the evidence list and re-runs claims, and one hunts for the first level that fails. They never see the target, the builder's own score, or earlier verdicts. The builder then writes the next level's exit criteria as failing checks and builds until they pass.

Levels 7–9 are reachable before launch with evidence from a production-equivalent environment. Scores carry a provenance label (`TRL 8 · staged` vs `TRL 9 · field`). Deploys, paid resources, real accounts, and messages to people always ask first.

| Flag | Default | Meaning |
| --- | --- | --- |
| `--target N` | `8` (launch-ready) | Stop when every area reaches N |
| `--cycles N` | `5` | Max assess → build cycles (1–12) |
| `--assess-only` | off | Score and list gaps. No project edits |
| `--circuit` | off | Skip the baseline checkpoint. Outward-facing asks still happen |

The ledger and evidence list live in `.balakit/trl/<slug>/`.

**Say:** `/trl the CSV export --target 7` or `/trl --assess-only`

## Prove behavior

These ship with default `init`.

### `verify-app`

Generates a repo-local skill (`skills/verify-<app>/`) that launches the real app and drives it the way a user does: web, CLI, API, or desktop. Pass `--refresh` to re-drive an existing verify map and open at most one PR of proven map fixes without touching product code.

Use this when the project has no scripted way to prove a feature or when an existing verify map drifted. For a unit or integration test, follow the `testing` rule instead.

**Say:** `/verify-app` or `/verify-app --refresh`

## Author skills and docs

`cloakbrowser-fallback` is opt-in. The others ship with default `init`.

### `authoring-skills-and-rules`

Creates or updates Skills (`SKILL.md`) and rules across Cursor, Claude Code, OpenCode, Codex, and Copilot. Playbook steps become todos with `skip:` reasons. User-facing questions stay in plain English.

A behavior-changing draft should run `blinded-eval` before you ship it.

### `blinded-eval`

Evaluates a Skill, rule, or prompt change without telling candidates they are in a test. Same organic prompt for each. The judge scores artifacts, not self-report.

Skip it for typos. Use it when the draft would change agent behavior.

**Say:** `/blinded-eval` after an authoring pass.

### `documentation-writer`

Research-first docs. Pick one [Diátaxis](https://diataxis.fr/) mode (tutorial, how-to, reference, or explanation), write in 80% ASD-STE100 / Global English, and verify prose with the bundled `scripts/lint-ste.mjs` checker.

Use `marketing-psychology` for marketing copy. Use `authoring-skills-and-rules` to write a Skill, not a README.

### `release-deploy`

Cuts a GitHub tag release (and the npm publish that the tag workflow runs). Changelog-driven notes. First use in a repo runs a setup interview.

Do not use this for a normal commit with no tag.

### `cloakbrowser-fallback`

Stealth Chromium (CloakBrowser) when the normal browser tool hits 403, 429, Cloudflare, Turnstile, reCAPTCHA, or an "are you human" wall.

**Opt-in:** `npx balakit add cloakbrowser-fallback`

## Marketing, SEO, media

All opt-in. Plugin packs: [Install](install.md#native-plugins).

### `everything-seo`

Technical SEO, semantic SEO, GEO (AI-search readiness), and multi-engine strategy.

**Opt-in:** `npx balakit add everything-seo` (plugin: `balakit-seo-skills`)

### `seo-audit`

Audits public pages: crawlability, meta, structured data, Core Web Vitals, `robots.txt` / sitemap **served** (status + Content-Type). Delegates depth to `everything-seo`.

**Opt-in:** `npx balakit add seo-audit`

### `agent-ready`

Makes a public origin discoverable to AI agents: well-known documents, Auth.md, api-catalog, A2A, MCP, WebMCP, DNS-AID, ACP/UCP/x402. Stack-agnostic.

**Opt-in:** `npx balakit add agent-ready`

### `marketing-psychology`

Applies behavioral design to copy, onboarding, CTAs, and pricing. Cognitive biases and the Fogg Behavior Model, used as craft, not as a trick list.

**Opt-in:** `npx balakit add marketing-psychology` (plugin: `balakit-marketing`)

### `startup-marketing-brain`

Go-to-market, audience building, distribution, and monetization for bootstrapped founders.

**Opt-in:** `npx balakit add startup-marketing-brain`

### `media-gen`

Image, video, upscale, and ad creative through Fal.ai. Dual-model stills when a reference image exists.

**Opt-in:** `npx balakit add media-gen` (plugin: `balakit-media`)

### `notebooklm`

NotebookLM CLI (`nlm`) and MCP: notebooks, sources, audio/video/slides, research.

**Opt-in:** `npx balakit@latest add notebooklm` (plugin: `balakit-notebooklm`)

## Pace flags (shared)

`dissect`, `deep-deliberation`, and `inception` accept:

| Flag | Meaning |
| --- | --- |
| (none) | Interactive. Ask when blocked. |
| `--brake` | Skip mid-run waits. Still do the work. `--circuit` is an alias. |
| `--autopilot` | Take recommended choices and continue. |

On `inception`, brake silent-stops at the plan. Only `--autopilot` runs `execute`.

Checkpoints inspect live tools and call the harness Question UI (`AskUserQuestion`, `AskQuestion`, `question`, `request_user_input`, `vscode_askQuestions`, or `ask_user`) in plain English (max 4 options). Report prose appears before the blocking tool call. The last option is always `Say this in plain English`, which rephrases with an example instead of advancing.

## Related

- [Install](install.md): how skills land on disk
- [CLI](cli.md): `add`, `remove`, `--agents`
- [README](../README.md): short table and quick start
