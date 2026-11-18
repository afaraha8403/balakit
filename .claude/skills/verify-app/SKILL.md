---
name: verify-app
description: >-
  Generate or refresh a project-local verification skill (skills/verify-<app>/)
  and user-POV feature map that drives the real app — web, CLI, API, desktop,
  or mobile. Auto-detects mode: generates when no verify skill exists, or runs
  a source-then-live audit and proven corrections when one exists. Apply when
  the user invokes /verify-app, asks to create or audit a verify/control skill,
  or needs scripted proof of real behavior. Use testing.mdc for unit/integration
  test rules.
user-invocable: true
disable-model-invocation: true
version: "2.0.0"
author: "Ali Farahat"
tags: ["verification", "e2e", "feature-map", "maintenance"]
---

# App verification skill (`generate` or `refresh`)

> **Leading words:** interview the repo, drive like a user, feature map,
> prove one feature, source then live, proven corrections, never product code.

Every serious project needs a way to launch the app, exercise a feature as a
user would, and keep evidence under `skills/verify-<app>/` (cross-agent Agent
Skills path — never `.cursor/` only).

## Mode detection (`$ARGUMENTS`)

1. Locate `skills/verify-*/` (or `.agents/skills/verify-*/`) in the repository.
2. **Generate mode** when none exists (or `--generate` was passed with `--force`).
3. **Refresh mode** when a verify skill already exists (or `--refresh` was passed).

---

## Mode A — Generate (`no existing verify skill`)

Copy these steps into the todo list verbatim. Skip with `skip: <reason>`.

1. Interview the repo (surface, run, drive, observe, isolate). Ask the user via the host's native question tool only what you cannot observe from files.
2. Write `skills/verify-<app>/SKILL.md` with Launch, Doctor, Drive, Evidence, Cleanup, Helpers. Helpers live under `helpers/` (not `scripts/`). A Launch helper is required even when the app is a one-shot CLI (ready signal = usage line + exit).
3. Seed a feature map (`features/README.md` + 3–5 user-POV feature files). Shape: [references/feature-map.md](references/feature-map.md).
4. Run launch → doctor → drive **one** mapped feature → confirm evidence survives cleanup.
5. Point at `/verify-app --refresh` for future upkeep.

If the checkout does not start, fix or report that first. A skill written against a broken base teaches the wrong steps.

### Interview

- **Surface:** web UI, CLI/TUI, desktop, API, mobile? Pick the primary.
- **Run:** the repo's documented dev command, ports, env, seed, auth.
- **Drive:** existing harness first (Playwright, expect, curl). Then browser/CDP, PTY, or HTTP.
- **Observe:** screenshots, transcripts, bodies, logs, exit codes, DB.
- **Isolate:** can two instances run safely in parallel? If not, state it and refuse to double-drive a shared session.

### Generated skill sections (zero placeholders)

- **Launch** — exact command, ready signal, teardown.
- **Doctor** — read-only check ("is this instance worth driving?").
- **Drive** — real selectors/commands from this repo (ARIA, data attributes, prompt strings, routes — never coordinates).
- **Evidence** — what to capture and where. Real user path, side effects counted, mocks only at external boundaries.
- **Cleanup** — kill only processes you started (`kill <PID>`); evidence survives.
- **Helpers** — executable scripts under `helpers/` with exact invocation examples.

---

## Mode B — Refresh (`existing verify skill found`)

Only edit the verification skill directory on a refresh pass — **never edit product code**. Copy these steps into the todo list verbatim. Skip with `skip: <reason>`.

1. Locate `skills/verify-*/` and run index hygiene on `features/README.md`.
2. Source wave: spawn one read-only subagent per feature file to verify selectors, routes, and flags against current source. Children never drive or edit.
3. Reconcile recipes. Flag user-facing surfaces missing from the map only with an exact source path.
4. Live pass: exercise every mapped feature at least once. Run Doctor before the first drive and after any failed drive. Confirm evidence survives cleanup.
5. Triage: map drift → fix the map; harness gap → fix helper; product broken → report regression without papering over it.
6. Outcome: **clean** (no diff) / **changed** (one atomic diff of proven corrections) / **blocked** (state exact blocker).

---

## Reply contract

- **Generate:** `Mode: generate`, paths written, which feature you proved, where evidence lives, and confirmation that cleanup left evidence intact.
- **Refresh:** `Mode: refresh`, outcome (`clean` | `changed` | `blocked`), features covered, unreachable prerequisites, and confirmed drift vs product regressions.
