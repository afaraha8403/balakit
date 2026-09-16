---
name: opinion
description: >-
  Asks other model families on the current harness the same question and
  returns labeled takes. Nobody writes project files. Optional --agents N
  (default 3, min 2, max 5). Apply when the user invokes opinion or
  /opinion, wants other models' takes, or says auto-pick. Use execute when
  this chat should do the work after the takes. Use deep-deliberation for
  same-model checkpointed decisions. Use blinded-eval to A/B a skill change.
user-invocable: true
disable-model-invocation: true
invocation-type: manual
version: "1.1.0"
author: "Ali Farahat"
tags: ["orchestration", "multi-model", "opinion"]
when_to_use: |
  USE WHEN:
  - The user invokes opinion or /opinion, wants other models' takes, or says auto-pick without asking to write.
  - They want distinct model families, not extra personas of the same model.
  DO NOT USE WHEN:
  - This chat should do the work after the takes (use execute).
  - Only one model family can be spawned on this host (use deep-deliberation).
  - The work is a same-model design fork with checkpoints (use deep-deliberation).
---

# Opinion

> **Leading words:** distinct families, live host list, auto-pick,
> labeled takes, no writes.

Other models answer the same request. This chat does not edit the project.

## User input

```text
$ARGUMENTS
```

Optional `--agents N` (also `--n N`, or a lone integer). Default **3**.
Clamp to 2–5. Strip the flag from the question text. If the user already
named models, use that list and ignore `--agents`.

## Operating contract

- Do not auto-start this skill. The user must ask for it.
- Do not spawn two workers from the same model family.
- Do not pass `inherit` as a worker.
- Do not invent a model name. Use the live list this harness exposes.
- Workers are read-only. A worker that edits files has failed; discard that take.
- Do not write project files. If the user wanted the work done, use `execute`.
- If this host cannot spawn two families, stop and point at `deep-deliberation`.

## Runtime state

```text
OPINION_STATE
host: cursor | claude-code | opencode | copilot | codex | other
agents: 2-5
roster: unset | name,name
takes: 0/N
next_action: one action only
```

## Pipeline

Copy these steps into the todo list verbatim. Skip with `skip: <reason>`.

1. Parse `--agents` (default 3, clamp 2–5). Detect the host. Read [references/hosts.md](references/hosts.md). Build the live spawnable model list. Stop if fewer than two families exist.
2. Resolve roster: models the user named, or **auto-pick** `agents` families, or ask (Auto-pick first). Announce the roster before spawning.
3. Spawn one read-only worker per roster slot. Same prompt. Distinct `model`. Parallel. Read [references/worker-prompt.md](references/worker-prompt.md).
4. Render labeled takes. Stop. Do not merge into one verdict. Do not write files.

## Roster

If the user already named 2–5 models that exist on the live list and are distinct families, use them.

If the user said **auto-pick** (or chose it), run auto-pick for `agents` families from [references/hosts.md](references/hosts.md), announce, then spawn.

Otherwise ask:

```text
prompt: Which models should answer?
options:
- Auto-pick distinct families (Recommended)
- I'll choose from this host's list
- Say this in plain English
allow_multiple: false
```

`Say this in plain English` is a meta question: explain auto-pick with
an example of which models would be chosen, then re-ask. Do not spawn yet.

If they will choose, a second question lists one model per family (`allow_multiple: true`). Require 2 families, at most `agents`. Last option on that question is also `Say this in plain English`.

No structured question tool → numbered text fallback.

## Reply contract

```text
Playbook: opinion
roster: <model> (<family>), …
```

Then the labeled takes. No files changed.

## Delegate failure

1. Retry one transient spawn failure.
2. Never invent a missing take.
3. Fewer than two successful takes → stop, ask whether to retry or abort.
