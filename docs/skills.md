# Skills

Each BalaKit skill is a playbook the agent follows when you ask for it by name. Default `npx balakit init` installs the engineering set. Packs marked **opt-in** need `npx balakit add <name>` or a [native plugin](install.md#native-plugins).

Install and first invoke: [README Quick start](../README.md#quick-start).

## Understand and change code

These ship with default `init`.

### `subsystem-walkthrough`

Explains how a subsystem works: architecture, runtime flow, ownership, and layering.

Ask when you would onboard a senior engineer onto that area. Not a line-by-line source tour. Use `design-rationale` for "why", `dissect` for an entity audit.

**Say:** "Walk through how checkout works."

### `design-rationale`

Explains why the code is shaped this way. Git and PRs first. Every claim is labeled Direct, Supported, Inferred, Speculative, or Unknown. Code is not treated as its own intent.

**Say:** "Why is this flag off?" or "Why is the threshold 50?"

### `proving-change-safety`

Finds what a change could break **beyond the diff**, then proves **one** safety fact by running real code. Grep is not the proof.

**Say:** "Is this diff safe to merge?"

### `kit-workflows`

Matches the task to one playbook: bug fix, named-data-shape feature, or behavior-preserving refactor. Not a sticky mode. If none of those fit, use `unmatched-workflow`.

**Say:** "Fix the login 500", "Add a CSV export", or "Refactor this without changing behavior."

### `unmatched-workflow`

Designs a falsifiable playbook when no narrower skill fits: a large migration, a multi-part change, or work a human will review after stepping away.

If the deliverable is the plan, use `inception` instead.

### `dissect`

Audits something that **already exists**: a service, schema, codebase area, or written plan. Red-teams each entity and returns a minimal-build plan.

Default is interactive (asks at checkpoints). `--circuit` skips mid-run waits and asks at the final recommendation. `--autopilot` takes recommended choices and continues.

Do not use this to author a new plan from a blank request. That is `inception`.

**Say:** `/dissect the billing service`

### `deep-deliberation`

Compares approaches **before** you build. Checkpointed. Use it when several options are viable and a wrong choice is expensive.

Same `--circuit` / `--autopilot` flags as `dissect`. Autopilot here may proceed to implement. If you want a work-breakdown plan, use `inception`.

**Say:** `/deep-deliberation Postgres vs SQLite for this worker`

### `inception`

Writes a durable, file-level plan and **stops**. It does not implement product code except `--autopilot`, which then runs `execute`.

If the host Plan Mode canvas is on, it writes there. If not, it writes `.balakit/plans/<slug>.md`.

| Flag | Mid-plan waits | At the plan |
| --- | --- | --- |
| (default) | Asks when blocked | Writes the plan. Stops. Recommends `execute` |
| `--circuit` | Auto-accepts recommended | Writes the plan. Stops. No extra ask |
| `--autopilot` | Auto-accepts recommended | Writes the plan, then runs `execute` |

If Plan Mode is on, `--autopilot` degrades to circuit (Plan Mode cannot implement). Accept the plan, leave Plan Mode, then `/execute`.

**Say:** `/inception add team-level API keys`

### `opinion`

Asks other **model families** on this harness the same question. Returns labeled takes. Nobody writes project files.

Optional `--agents N` (default 3, min 2, max 5). Distinct families only. If this host cannot spawn two families, use `deep-deliberation` instead.

**Say:** `/opinion should we split this package`

### `execute`

Same multi-model fan-out as `opinion`, then **this chat** does the work. Workers stay read-only. No `--agents` flag: the skill infers 2 or 3 from the job.

If you want the plan first, run `inception`. If nobody should write, run `opinion`. If one agent should just build, use `kit-workflows`.

**Say:** `/execute this canvas` or `/execute add the CSV export`

## Prove behavior

These ship with default `init`.

### `generating-app-verify`

Writes a repo-local skill (`skills/verify-<app>/`) that launches the real app and drives it the way a user does: web, CLI, API, or desktop.

Use this when the project has no scripted way to prove a feature. For a unit test, follow the `testing` rule instead.

### `refreshing-app-verify`

Re-drives every mapped feature on an existing verify skill. At most one PR of proven corrections. Does not patch product code on that pass.

If no verify skill exists, use `generating-app-verify`.

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

Research-first docs. Pick one [Diátaxis](https://diataxis.fr/) mode (tutorial, how-to, reference, or explanation), then write in STE / Global English.

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

### `nlm-skill`

NotebookLM CLI (`nlm`) and MCP: notebooks, sources, audio/video/slides, research.

**Opt-in:** `npx balakit add nlm-skill` (plugin: `balakit-nlm`)

## Pace flags (shared)

`dissect`, `deep-deliberation`, and `inception` accept:

| Flag | Meaning |
| --- | --- |
| (none) | Interactive. Ask when blocked. |
| `--circuit` | Skip mid-run waits. Still do the work. |
| `--autopilot` | Take recommended choices and continue. |

On `inception`, circuit silent-stops at the plan. Only `--autopilot` runs `execute`.

Checkpoints that ask you a question use the host's structured question tool, in plain English. The last option is always `Say this in plain English`, which rephrases with an example instead of advancing.

## Related

- [Install](install.md): how skills land on disk
- [CLI](cli.md): `add`, `remove`, `--agents`
- [README](../README.md): short table and quick start
