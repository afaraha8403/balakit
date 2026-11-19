---
name: execute
description: >-
  Spawns parallel read-only workers on the current harness, renders labeled
  takes, and then implements the merged plan in this chat — or stops
  read-only when `--opinion` (or "opinion only / don't edit") is requested.
  Default roster uses the current model on every slot; optional `--opinion`,
  `--agents N` (2–5 in opinion mode; 2–3 in execute mode), or `auto-pick`.
  Apply when the user invokes /execute, asks for parallel worker takes
  before implementing, or asks for multi-agent second opinions. Use
  inception to author a durable plan first, kit-workflows for single-agent
  work, deep-deliberation for checkpointed trade-offs, or blinded-eval to
  A/B a skill change.
user-invocable: true
disable-model-invocation: true
version: "2.0.0"
author: "Ali Farahat"
tags: ["orchestration", "multi-model", "execute", "opinion"]
---

# Execute (with `--opinion` read-only mode)

> **Leading words:** current first, same-family ok, slug shield,
> auto-pick stays distinct, labeled takes, this chat does the work.

Parallel workers inspect the codebase read-only and return independent
takes. In **execute mode** (default), this chat merges the takes with
attribution, writes the code, and verifies on the real artifact. In
**opinion mode** (`--opinion`, `--read-only`, or when the user asks for
takes/opinions without editing), this chat renders the labeled takes and
stops with zero file writes.

## User input & flags

```text
$ARGUMENTS
```

- `--opinion` / `--read-only` (or user says "just give takes / don't write"): sets `mode: opinion`. Nobody edits project files.
- `--agents N` / `--n N`: in `opinion` mode, clamp 2–5 (default 3). In `execute` mode, pick 3 by default or 2 if small/local/mechanical (unless the user explicitly named 2–5 models).
- Strip flags from the task text passed to workers.

## Operating contract

- Do not auto-start this skill; the user must opt into it.
- Current-for-all is the default. Same family may occupy multiple slots when chosen by the user.
- Auto-pick is the only path that requires distinct model families.
- Never invent a model identifier; use only the live list this harness exposes.
- **Slug shield:** Never write a raw spawn model identifier in a question prompt, option label, chat roster, worker prompt, or take label. Map family → live-list identifier only inside the spawn tool's `model` argument (`inherit` or omit `model` for Current).
- Workers are strictly read-only. Discard any worker take that modifies files.
- In `execute` mode, only this parent chat writes files after rendering takes. In `opinion` mode, nobody writes files.
- If this host cannot spawn child agents at all, stop and report it. If auto-pick finds fewer than two families, offer Current-for-all or `deep-deliberation`.

## Runtime state (internal only)

Track `mode` (`execute | opinion`), `host`, `agents` (`2–5`), `roster`, and `takes` (`0/N`) silently in the session todo list. **Never emit an internal state code block in user-facing chat.**

## Pipeline

Copy these steps into the todo list verbatim. Skip with `skip: <reason>`.

1. Parse mode (`execute` vs `opinion`) and `agents` count. Detect the host and read [references/hosts.md](references/hosts.md) to build the live spawnable model list.
2. Resolve roster: models the user named, **Current for all**, auto-pick, or slot-by-slot assignment. Announce the roster with **display names** before spawning.
3. Spawn one read-only worker per roster slot in parallel with the same prompt from [references/worker-prompt.md](references/worker-prompt.md).
4. Render labeled takes (`[Current]`, `[OpenAI]`, …). If `mode: opinion`, stop here with zero file writes.
5. (`mode: execute` only; `skip: opinion-mode` otherwise) Merge takes with `[display name]` attribution, implement in this chat, and prove behavior on the real artifact.

## Roster selection (Native Question UI)

- If the user already named 2–5 available models, use them (same family allowed). One named model (or `current`) fills every slot.
- If the user asked for **auto-pick**, select `agents` distinct families per [references/hosts.md](references/hosts.md), announce display names, and spawn immediately.
- Otherwise, invoke the host's **native structured question tool** (see [references/hosts.md](references/hosts.md) — `AskUserQuestion`, `AskQuestion`, `question`, `request_user_input`, `vscode_askQuestions`, or `ask_user`; never print raw `prompt:`/`options:` YAML). Ask one single-select question with **4 options**:
  1. `Current model for all workers (Recommended)` (`id: current`)
  2. `Auto-pick distinct families` (`id: auto`)
  3. `I'll assign each worker` (`id: assign`)
  4. `Say this in plain English` (`id: simplify`)
- `Say this in plain English` is a meta option: explain Current-for-all vs Auto-pick with display-name examples (never spawn IDs), then re-invoke the question tool. Do not spawn yet.
- If they choose `I'll assign each worker`, ask **one single-select question per slot** (up to 4 options per widget; first option `Current model (Recommended)`, remaining options using display names and `fam-*` IDs from [references/hosts.md](references/hosts.md)).
- Fall back to a numbered plain-text list **only** when zero question tools are declared in this session.

## Write (`mode: execute` only)

- Resolve consensus and divergence with `[display name]` attribution.
- Keep strong minority observations; state why weak claims were rejected.
- Implement directly in this parent chat — never send writes to workers.
- Prove on the real path (or closest executable check; `skip:` if unreachable).

## Reply contract

```text
Playbook: execute (or Playbook: execute --opinion)
roster: Current, OpenAI, Grok
```

Followed by the labeled takes, and (in `execute` mode) what shipped and how it was verified.

## Delegate failure

1. Retry one transient spawn failure once.
2. Never fabricate a missing take.
3. Fewer than two successful takes → stop and ask via the native question tool whether to retry or abort.
