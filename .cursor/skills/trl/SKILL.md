---
name: trl
description: >-
  Score and raise a software Technology Readiness Level (TRL 1–9) in an
  assess-then-build loop using three blind read-only assessor subagents and
  failing-first evidence checks (`--target 8`, `--cycles 5`, `--assess-only`,
  `--circuit`). Apply when the user invokes /trl, asks for a readiness score,
  or wants an app or feature raised to launch readiness. Use execute --opinion
  for open-ended takes, verify-app to map live flows, or proving-change-safety
  for one diff.
user-invocable: true
disable-model-invocation: true
version: "1.1.0"
author: "Ali Farahat"
tags: ["readiness", "trl", "orchestration", "evidence", "tdd"]
---

# TRL

> **Leading words:** evidence not intent, lowest row wins, blind panel,
> fresh eyes every cycle, one level at a time, failing check first,
> provenance label, ask before outward.

A TRL is the highest level whose exit criteria are **demonstrated** by
evidence. Plans, intent, and self-report count for nothing. The builder
(this chat) never scores itself upward. Three fresh assessors do, every
cycle, from a deliberately thin slice of context.

## User input

```text
$ARGUMENTS
```

| Flag | Default | Meaning |
|---|---|---|
| `--target N` | `8` | Stop when every in-scope row reaches N. 8 = launch-ready. |
| `--cycles N` | `5` | Max assess → build cycles. Clamp 1–12. Each cycle spawns three assessors; five keeps one run inside one session. |
| `--assess-only` | off | Baseline panel and gap list only. Never edits the project. |
| `--circuit` | off | Skip the baseline checkpoint. Outward-facing asks still happen. |

Strip flags from the scope text. A lone integer is `--target`.

## Operating contract

- Do not auto-start. The user must ask for this skill.
- **Evidence not intent.** Only reproducible evidence moves a row: a check
  that ran, its command, its output, its provenance. Read
  [references/scale.md](references/scale.md) for levels and provenance.
- **Lowest row wins.** Overall TRL = the minimum over in-scope rows. Never
  average.
- **Blind panel.** Assessors never see the target, the builder's score,
  earlier verdicts, the cycle number, or `.balakit/trl/`. A fresh set of
  assessors runs every cycle. Commit messages and code comments written
  during the loop never name a level or the target, because assessors
  read the repo.
- **Panel beats builder.** If the builder's sealed score is higher than the
  panel's, the panel's number stands.
- **One level at a time.** A row rises at most one level per cycle. Do
  not build level N+2 evidence before level N+1 passes.
- **Failing check first.** Write each next-level exit criterion as an
  executable check, see it fail (or confirm it is missing), then build.
- **Ask before outward.** Deploys, paid resources, DNS, real accounts,
  emails or messages to people, production data, and secrets always get a
  user question, even under `--circuit`. Use `request_secret` or the host
  equivalent for secrets. Never invent one.
- **Never author `attested` evidence.** Human sign-off, beta feedback, and
  dogfood notes come from the user, word for word, with who and when.
- `--assess-only` writes only the ledger and dossier under `.balakit/trl/`.

## Runtime state (internal only)

Track `stage` (`frame | baseline | panel | gap | build | done`), `scope`, `target`, `cycle` (`n/max`), `overall`, and `ledger` (`.balakit/trl/<slug>/ledger.md`) silently in the ledger file and session todo list. **Never emit an internal state code block in user-facing chat.** If context compacts mid-run, rebuild state from `.balakit/trl/<slug>/ledger.md` and confirm with the user before advancing.

## Pipeline

Copy these steps into the todo list verbatim. Skip with `skip: <reason>`.

1. Parse flags. Detect the host and read [references/hosts.md](references/hosts.md). The host must spawn subagents. If it cannot, stop.
2. Frame. Fill the ledger header from [references/ledger.md](references/ledger.md): scope, target, the **relevant environment** and **operational environment** for this scope, in-scope rows from [references/dimensions.md](references/dimensions.md) (each dropped row gets `n/a: <reason>`), and any critical technology elements (novel or risky parts) as extra rows. Ask only for what the repo cannot tell you.
3. Baseline evidence. Run what already exists (tests, builds, linters, deploy config, health checks). Write the facts-only dossier. Write the builder's sealed score per row into the ledger.
4. Panel. Spawn the three lenses in parallel from [references/assessor-prompts.md](references/assessor-prompts.md). Aggregate (below). Log the cycle in the ledger.
5. Checkpoint. Show the scorecard and the gap plan for the next level. `--assess-only` → reply and stop. `--circuit` → skip the wait on cycle 1 only. Otherwise ask (below).
6. Gap → checks. For each row below target, lowest first, turn the next level's unmet criteria into evidence checks in the project's own test layout and tools. Run them. Confirm they fail or are missing.
7. Build until those checks pass. Ask before outward actions. Record each passing check in the dossier with its command, output summary, and provenance.
8. Next cycle. Back to step 4 with new assessors. Stop on: target reached, cycles exhausted, plateau, or blocked on the user (below).
9. Report per the reply contract. Leave the ledger in place.

## Aggregation

Per row, from the three verdicts:

- Spread ≤ 1 → panel level = median.
- Spread ≥ 2 → panel level = minimum. Log `disagreement` with each lens's
  blocking reason. Do not average.
- The auditor marks a dossier claim `fail` → that claim does not count,
  for every lens, this cycle.
- The panel level stands, whether it is above or below the builder's
  sealed score. The sealed score is logged only to show calibration.
- Row provenance = the weakest provenance among the evidence that row's
  level rests on.

Overall = minimum row. The label is `TRL N · <provenance>`, for example
`TRL 8 · staged`.

The gap list is the union of every lens's `blocking` lines for rows below
target, deduplicated.

## Stop conditions

- **Target reached.** Every in-scope row ≥ target on the panel.
- **Cycles exhausted.** Report where it stands.
- **Plateau.** No row rose for two cycles in a row. Stop building. Attack
  the premise: which assumption do both failed cycles share? Report it and
  ask.
- **Blocked on the user.** The next check needs consent for an outward
  action or needs `attested` evidence. Ask. If the user declines, stop
  that row and continue the others.

## Checkpoint question (Native Question UI)

After emitting the baseline scorecard and gap plan (and on plateau), invoke the host's **native structured question tool** (see [references/hosts.md](references/hosts.md) — `AskUserQuestion`, `AskQuestion`, `question`, `request_user_input`, `vscode_askQuestions`, or `ask_user`; never print raw `prompt:`/`options:` YAML). Ask one single-select question (`header: "TRL loop"`, **4 options**):

- **Question:** `The panel scored this TRL N. Should I start raising it toward TRL <target>?`
- **Options (4):**
  1. `Yes, raise it (Recommended)`
  2. `Change the target level`
  3. `Stop here with the score and gap list`
  4. `Say this in plain English`

`Say this in plain English` is a meta option: explain what the next level requires here with one concrete example check, then re-invoke the question tool without advancing. Fall back to a numbered plain-text list only when zero question tools are declared in this session.

## Reply contract

```text
Playbook: trl
scope: <one line>
overall: TRL N · <provenance>  (baseline TRL M)
target: N · reached | not reached (<stop reason>)
cycles: n
ledger: .balakit/trl/<slug>/ledger.md
```

Then:

1. Scorecard: one row per in-scope area, with level, provenance, and panel spread.
2. Disagreements the panel logged.
3. Open gaps for the next level, lowest row first.
4. Items waiting on the user (consent, `attested` evidence).
5. Builder vs panel: each row where the sealed score differed.

## Delegate failure

1. Retry one failed assessor once.
2. Never invent a verdict. A cycle with fewer than two verdicts does not
   move any row. Say so.
3. An assessor that edited tracked files, deployed, or touched an
   external system has failed. Discard its verdict and revert its edits.
