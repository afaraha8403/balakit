---
name: inception
description: >-
  Produces a durable, file-level implementation plan by loosely composing
  Balakit specialists. Stops before code except --autopilot, which then runs
  execute. Default interactive; --brake skips mid-plan waits and silent-stops
  at the plan. Apply when the user invokes inception or /inception, or wants a
  long-running detailed plan. If host Plan Mode is on, write into that native
  plan. If not, write .balakit/plans/<slug>.md. Use dissect to audit an existing
  plan. Use deep-deliberation to pick among approaches. Use execute to implement.
user-invocable: true
disable-model-invocation: true
version: "1.4.0"
author: "Ali Farahat"
tags: ["planning", "orchestration", "inception"]
---

# Inception

> **Leading words:** host canvas, one canvas, specialist catalog, depth bar,
> skip the wait not the work, brake, autopilot.

Inception authors a plan. It does not implement — except `--autopilot`, which
writes the plan then runs `execute` in this chat.

## User input

```text
$ARGUMENTS
```

Parse a pace flag **before** treating the rest as the request:
`--brake`, `--circuit` (alias of `--brake`), `--autopilot`, `--auto` (alias of
`--autopilot`). Strip the flag from the request text. Canonical name is
**brake**. `--circuit` and the word `circuit` mean brake. If both brake and
autopilot appear, autopilot wins. Reconstructing state: `circuit` → `brake`.

## Pace modes (optional)

Default is **interactive**: ask when blocked or the choice is costly.

The user must opt in **this invocation** — a flag above, or an explicit phrase
(`brake`, `circuit`, `autopilot`, `take recommended`, `brake the rest`,
`circuit the rest`, `autopilot the rest`). Do not infer from urgency. Mid-run, the same phrases
switch mode from the current checkpoint. `stop brake` / `stop circuit` / `stop autopilot`
drops back to interactive.

| Mode | Mid-plan waits | At the plan |
|---|---|---|
| `interactive` | Ask. Clarify. Wait. | Write plan. **Stop.** Recommend `execute`. |
| `--brake` | Auto-accept recommended. `PACE_LOG`. | Write plan. **Stop.** Recommend `execute`. No extra ask. |
| `--autopilot` | Auto-accept. `PACE_LOG`. | Write plan. **Run `execute`** (auto-pick distinct families; execute's interactive default is Current-for-all). |

This skill shares `--brake` / `--autopilot` grammar with `dissect` and
`deep-deliberation`. `--circuit` remains a supported alias of `--brake`. The
**final gate differs**: brake silent-stops. Only autopilot crosses into
`execute`.

**Skip the wait, not the work.** Specialists still run when they apply. Emit a
compact `PACE_LOG` of every auto-accepted choice.

**Cannot proceed:** blocked fork, no unique plan, canvas cannot be written.
Stop and ask even on autopilot.

**Plan Mode vs autopilot:** host Plan Mode cannot implement. Do not
`SwitchMode` / `ExitPlanMode` to run `execute`. Degrade to brake.
`skip: plan-mode` in `PACE_LOG`. Tell them to accept / Build / leave Plan Mode,
then `/execute`.

## Operating contract

- Do not auto-start this skill. The user must ask for it.
- One canvas. Never a sibling plan file.
- Do not implement product code. `--autopilot` hands off to `execute`.
- Do not `SwitchMode` / enter Plan Mode unless they chose that this turn.
- Do not name this skill `plan` and do not ship a second OpenCode primary `plan`.
- Never write `.balakit/installed.json`.
- Pull specialists from the catalog with `skip: <reason>`. Not a waterfall.
- Preserve host-required plan structure (Cursor YAML todos, Claude injected
  path). Depth lands as sections, not a replacement template.

## Runtime state

Start every pipeline response with this block and update it mechanically:

```text
INCEPTION_STATE
stage: frame | specialists | write | done
pace: interactive | brake | autopilot
host: cursor | claude-code | opencode | copilot | codex | other
plan_mode: on | off
canvas: unset | <path or host-uri>
next_action: one action only
```

If the state is missing after a context change, reconstruct it from the latest
canvas path and ask the user to confirm before advancing.

## Pipeline

Copy these steps into the todo list verbatim. Skip with `skip: <reason>`.

1. Parse the pace flag. Detect the host and whether Plan Mode is on. Read [references/hosts.md](references/hosts.md).
2. Resolve the canvas (below). Record `canvas` in `INCEPTION_STATE`.
3. Frame: outcome, constraints, non-goals, named data shape if it is already knowable. Interactive: ask only when blocked or the choice is costly.
4. Pull specialists from [references/specialists.md](references/specialists.md). Each unused row stays in the list with `skip: <reason>`.
5. Write the plan onto the canvas. Meet [references/depth-bar.md](references/depth-bar.md). Host-native format when Plan Mode is on.
6. Interactive / `--brake`: stop. Recommend `execute`. `--autopilot`: if `plan_mode: on`, degrade (`skip: plan-mode`); else run `execute` with auto-pick roster.

## Canvas

**Plan Mode on** → the live host plan is the document of record. Empty/new:
fill via the host-native create path. Already has content: patch in place
(`KEEP` / `PATCH` / `APPEND`). Do not full-file `Write` a replacement. Do not
create `.balakit/plans/` as a second copy.

**Plan Mode off** → do not yank them into Plan Mode.

In `interactive` mode, invoke the host's **native structured question tool** (see [references/hosts.md](references/hosts.md) — `AskUserQuestion`, `AskQuestion`, `question`, `request_user_input`, `vscode_askQuestions`, or `ask_user`; never print raw `prompt:`/`options:` YAML in chat). Ask one single-select question (`header: "Plan canvas"`):

- **Question:** `Where should this plan live?`
- **Options (4):**
  1. `.balakit/plans/<slug>.md in this repo (Recommended)`
  2. `Switch to this host's Plan Mode (native UI)`
  3. `I'll specify a custom path`
  4. `Say this in plain English`

Fall back to a numbered plain-text list only when zero question tools are declared in this session.

`Say this in plain English` is a meta option: explain native Plan Mode vs a `.balakit/plans/` file with one concrete example, then re-invoke the question tool. Do not write yet.

- Recommended → `.balakit/plans/<slug>.md` (create the directory). Slug is
  kebab-case from the request, filesystem-safe.
- Native UI → `SwitchMode` to plan (user consent) or tell them Shift+Tab /
  Tab / `/plan`, then treat Plan Mode as on.
- Custom path → they name it (or enter it in the widget's free-text field). Refuse `.balakit/installed.json`, `skills/`,
  and a second file when a host plan is already live.

`--brake` / `--autopilot`: skip the ask. Default `.balakit/plans/<slug>.md`.

Mental `--against` points at the canvas path. Do not copy the plan into Mental.

## Reply contract

```text
Playbook: inception
pace: interactive | brake | autopilot
canvas: <path or host-uri>
specialists: <pulled>, skipped: <name (reason)>, …
```

Then: the plan lives at `canvas`. Interactive and brake recommend `execute`
next (not exclusive: `kit-workflows` — including `playbooks/custom.md` — may still consume
it). Autopilot continues into `execute` unless `skip: plan-mode`.

Interactive final footer, last block, verbatim. Omit under `--brake` /
`--autopilot`. Do not paraphrase.

```markdown
⚡ **Skip the waits next time**

This run was **interactive** — questions when blocked. Same skill, two other paces:

- `--brake` — skip mid-plan waits, write the plan, stop. Recommend execute. No extra ask.
- `--autopilot` — skip waits, write the plan, run execute (auto-pick). Degrades to brake if Plan Mode is on.

`/inception --brake <request>` · `/inception --autopilot <request>`
```

## References

| File | Use it for |
|---|---|
| [references/hosts.md](references/hosts.md) | Host detection, Plan Mode signals, native write path, forbidden fights |
| [references/depth-bar.md](references/depth-bar.md) | What “extremely detailed” means; required plan sections |
| [references/specialists.md](references/specialists.md) | Sibling skill catalog with apply-when and skip reasons |
