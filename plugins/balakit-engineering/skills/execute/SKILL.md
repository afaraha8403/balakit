---
name: execute
description: >-
  Asks other model families on the current harness to research read-only,
  then this chat does the work. Apply when the user invokes execute or
  /execute, or wants other models to research before this chat writes.
  Use opinion when nobody should write. Use inception to produce the plan
  first. Use kit-workflows for one-agent implementation. Use
  deep-deliberation for same-model checkpointed decisions.
user-invocable: true
disable-model-invocation: true
invocation-type: manual
version: "1.2.0"
author: "Ali Farahat"
tags: ["orchestration", "multi-model", "execute"]
when_to_use: |
  USE WHEN:
  - The user invokes execute or /execute, or wants other models to research then this chat to do the work.
  - They want distinct model families, not extra personas of the same model.
  DO NOT USE WHEN:
  - Nobody should write (use opinion).
  - Only one model family can be spawned on this host (use deep-deliberation).
  - They want one agent to just build (use kit-workflows).
  - They want the plan as the deliverable (use inception).
---

# Execute

> **Leading words:** distinct families, live host list, auto-pick,
> this chat does the work, labeled takes.

Other models research. This chat does the work. There is no agent-count
flag — pick 2 or 3 from the job (default 3; 2 if the request is small,
local, or mechanical).

## Operating contract

- Do not auto-start this skill. The user must ask for it.
- Do not spawn two workers from the same model family.
- Do not pass `inherit` as a worker.
- Do not invent a model name. Use the live list this harness exposes.
- Workers are read-only. A worker that edits files has failed; discard that take.
- This chat writes after the takes. Do not send writes back to workers.
- If this host cannot spawn two families, stop and point at `deep-deliberation`.

## Runtime state

```text
EXECUTE_STATE
host: cursor | claude-code | opencode | copilot | codex | other
agents: 2 | 3
roster: unset | name,name
takes: 0/N
next_action: one action only
```

## Pipeline

Copy these steps into the todo list verbatim. Skip with `skip: <reason>`.

1. Detect the host. Read [references/hosts.md](references/hosts.md). Build the live spawnable model list. Stop if fewer than two families exist.
2. Set `agents` to 3, or 2 if the request is small, local, or mechanical. If the user named models, use that list (2–5) instead of auto-pick.
3. Resolve roster: models the user named, or **auto-pick**, or ask (Auto-pick first). Announce the roster before spawning.
4. Spawn one read-only worker per roster slot. Same prompt. Distinct `model`. Parallel. Read [references/worker-prompt.md](references/worker-prompt.md).
5. Render labeled takes. Do not write yet.
6. This chat merges with `[model]` attribution, does the work, proves the real path.

## Roster

If the user already named 2–5 models that exist on the live list and are distinct families, use them.

If the user said **auto-pick** (or chose it), run auto-pick for `agents` families from [references/hosts.md](references/hosts.md), announce, then spawn.

Otherwise ask:

```text
prompt: Which models should research?
options:
- Auto-pick distinct families (Recommended)
- I'll choose from this host's list
- Say this in plain English
allow_multiple: false
```

`Say this in plain English` is a meta question: explain auto-pick with
an example of which models would be chosen, then re-ask. Do not spawn yet.

If they will choose, a second question lists one model per family (`allow_multiple: true`). Require 2–3 families unless they named more. Last option on that question is also `Say this in plain English`.

No structured question tool → numbered text fallback.

## Write

- Resolve consensus and divergence with `[model]` attribution.
- Keep valuable minority observations. Reject weak claims explicitly.
- Do the work here. Do not delegate writes back to workers.
- Prove on the real path (or closest executable check). `skip:` if the surface cannot be driven.

## Reply contract

```text
Playbook: execute
roster: <model> (<family>), …
```

Then the labeled takes, what shipped, and how you verified.

## Delegate failure

1. Retry one transient spawn failure.
2. Never invent a missing take.
3. Fewer than two successful takes → stop, ask whether to retry or abort.
