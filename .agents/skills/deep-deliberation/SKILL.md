---
name: deep-deliberation
description: >-
  Runs a checkpoint-gated decision process for consequential, forward-looking
  design choices. Optional --brake skips intermediate checkpoint waits and
  asks at the final recommendation; --autopilot takes recommended choices and
  proceeds to implement. Use only when the user explicitly invokes
  deep-deliberation to compare approaches, challenge assumptions, and reach an
  evidence-grounded recommendation. Use inception for a work-breakdown plan.
  Use dissect instead to audit an existing system or written plan.
user-invocable: true
disable-model-invocation: true
version: "2.6.0"
author: "Ali Farahat"
tags: ["decision-making", "red-team", "evidence", "orchestration"]
---

# Deep Deliberation

> **Leading words:** option tree, evidence tournament, reversibility,
> adversarial review, premortem, uncertainty, checkpoint, ground truth,
> brake, autopilot, plain question.

Deep Deliberation frames a consequential decision, compares viable alternatives,
tests them against evidence, and adjudicates unresolved risks. The pipeline
produces a decision record. Implementation starts only after Checkpoint 3
approval, or immediately under `--autopilot`.

## User Input

```text
$ARGUMENTS
```

Parse a pace flag from arguments **before** treating the rest as the decision:
`--brake`, `--circuit` (alias of `--brake`), `--autopilot`, `--auto` (alias of
`--autopilot`). Strip the flag from the decision text. Canonical name is
**brake**. `--circuit` and the word `circuit` mean brake. If both brake and
autopilot appear, autopilot wins. Reconstructing state: `circuit` → `brake`.

## Pace modes (optional)

Default is **interactive**: stop and wait at every checkpoint.

The user must opt in **this invocation** — a flag above, or an explicit phrase
(`brake`, `circuit`, `autopilot`, `take recommended`, `brake the rest`,
`circuit the rest`, `autopilot the rest`). Do not infer from urgency. Mid-run, the same phrases
switch mode from the current checkpoint. `stop brake` / `stop circuit` / `stop autopilot`
drops back to interactive.

| Mode | Intermediate checkpoints (1–2) | Final checkpoint (3) |
|---|---|---|
| `interactive` | Stop and wait | Stop and wait. Do not implement until a separate ask |
| `--brake` | Auto-accept the recommended choice; log and continue | Stop. Ask whether to go ahead with the final recommendation |
| `--autopilot` | Auto-accept; log and continue | Auto-accept. Treat the recommendation as the way to proceed |

**Skip the wait, not the work.** Stages, evidence tournament, and adjudication
still run. Emit a compact `PACE_LOG` of every auto-accepted choice.

**Cannot proceed:** if there is no unique recommendation (tie, both options
invalidated, return to Stage 1 required, degraded delegates below minimum),
stop and ask even on autopilot.

**Proceed** (autopilot, or brake after the user says go ahead): accept the
recommendation as the decision and start implementing it. That is the way
forward. The decision record is still emitted first.

This skill shares `--brake` / `--autopilot` grammar with `dissect`.
`--circuit` remains a supported alias of `--brake`.

**Interactive final footer.** On Checkpoint 3 only, when this run is
interactive, append the block below **verbatim at the very end of the Final
markdown report, right BEFORE invoking the blocking Checkpoint 3 question tool**
(so the user sees the report + footer immediately above the graphical question
widget). Omit it under `--brake` / `--autopilot`. Do not paraphrase.

```markdown
⚡ **Skip the waits next time**

This run was **interactive** — a stop at every checkpoint. Same skill, two other paces:

- `--brake` — take the recommended choices through the middle checkpoints, then stop at the final recommendation and ask before proceeding.
- `--autopilot` — take every recommended choice, including the last, and proceed without waiting.

`/deep-deliberation --brake <decision>` · `/deep-deliberation --autopilot <decision>`
```

## User questions (Native Question UI)

The report may be technical. The **ask** must not be.

In the **same turn** after emitting the complete stage report markdown: inspect your live declared tools and invoke the host's **native structured question tool** (`AskUserQuestion` on Claude Code, `AskQuestion` on Cursor, `question` on OpenCode, `request_user_input` on Codex, `vscode_askQuestions` or `ask_user` on Copilot/Gemini CLI). Fall back to a numbered plain-text list **only** when zero structured question tools are declared in this session. Never replace the stage report with the question, and **never print raw `prompt:` / `options:` YAML in markdown**.

- **Option count:** strictly **2–4 options** (`maxItems: 4` on Claude Code and OpenCode; native widgets automatically provide a free-text `"Other"` field).
- **Header & labels:** `header` ≤12 chars; option `label` ≤40 chars. First option ends `(Recommended)`. Last option is always `Say this in plain English`.
- **Prompt:** one plain-English product sentence. Never include `DELIBERATION_STATE` tokens or internal jargon.
- **Meta loop (`Say this in plain English`):** do not advance the stage. Rephrase with a concrete project example for each real option, then re-invoke the native question tool at the same checkpoint. Free-text user replies always override.

## Operating contract

- Do not edit files, implement code, or create formal plan documents while the
  pipeline is active. Proceeding (above) happens **after** Checkpoint 3 is
  accepted, not during Stages 1–3.
- Ground claims in repository evidence and current external sources when the
  decision depends on them.
- Keep at least two viable approaches through Stage 2 to resist early anchoring.
- Preserve material disagreements; never silently average them away.
- Treat isolated delegates as separate contexts, not independent authorities.
- Never invent missing delegate findings or unsupported evidence.
- Interactive: stop after every checkpoint; continue only after the user
  explicitly responds. `--brake` / `--autopilot`: skip waits as in Pace modes.
- The user may revise, restart, or end the pipeline at any checkpoint.
- A meta question (including `Say this in plain English`) does not
  advance the state; rephrase, re-ask, remain at the current checkpoint.

## Runtime state

Start every pipeline response with this block and update it mechanically:

```text
DELIBERATION_STATE
stage: 1 | 2 | 3
checkpoint: none | 1 | 2 | 3
mode: interactive | brake | autopilot
shortlist: unset | A,B
delegate_results: 0/N
next_action: one action only
```

If the state is missing after a context change, reconstruct it from the latest
completed template and ask a **plain question** before advancing.

## Pipeline

1. **Stage 1 — Frame and shortlist:** define the decision, generate 3–5
   approaches, and shortlist the strongest two.
2. **Checkpoint 1:** user approves the framing and shortlist (auto-accepted
   under `--brake` / `--autopilot`).
3. **Stage 2 — Evidence tournament:** 3–5 focused reviewers compare both
   shortlisted approaches using a normalized evidence contract.
4. **Checkpoint 2:** user reviews findings and unresolved disputes
   (auto-accepted under `--brake` / `--autopilot`).
5. **Stage 3 — Adjudication:** targeted evidence review and premortem produce the
   final recommendation.
6. **Checkpoint 3:** interactive waits; `--brake` asks whether to go ahead;
   `--autopilot` proceeds.

No implementation follows automatically unless `--autopilot` is on, or the user
says go ahead at the brake ask.

## Stage 1 — Frame and shortlist

Stage 1 is performed by the orchestrator without delegates.

### Entry gate

If the decision is materially ambiguous, ask a **plain question** before
starting Stage 1. If the task primarily audits something already built or
written, recommend `dissect` instead.

If two cheap throwaway sketches would settle the fork, offer that **prototype
off-ramp** before Stage 1: scratch dir, no pipeline, observe the behavior,
then resume here with evidence. Skip with `skip: shape already concrete` or
`skip: pace mode` under `--brake` / `--autopilot`. Interactive off-ramp
ask via the native question tool (`header: "Quick spike"`):

- **Question:** `Two quick throwaway sketches might settle this faster than a full comparison. Try that first?`
- **Options (3):**
  1. `Yes, sketch both first (Recommended)`
  2. `No, run the full comparison`
  3. `Say this in plain English`

When a candidate crosses a function boundary, sketch types and signatures
first (`not implemented`). Screen with
[references/design-red-flags.md](references/design-red-flags.md). Scrap the
sketch when the same workaround repeats.

### Procedure

1. Inspect relevant code, schemas, documentation, constraints, and prior
   decisions.
2. State the decision, desired outcome, constraints, non-goals, assumptions,
   evidence gaps, decision horizon, reversibility, and cost of delay.
3. Declare evaluation criteria before evaluating options. Use `must`,
   `important`, and `preference`; use numeric weights only when defensible.
4. Generate 3–5 meaningfully different approaches. For each, state its
   mechanism, expected benefit, main downside, critical assumptions, supporting
   evidence, reversibility, rough effort, and failure condition.
5. Remove clearly dominated options with an explicit reason.
6. Shortlist the strongest option and strongest challenger. Relabel them
   `Option A` and `Option B` for the remaining stages. Do not make the final
   recommendation yet.

Read [references/output_templates.md](references/output_templates.md), emit the
complete Stage 1 template, set `checkpoint: 1`. Interactive: stop.
`--brake` / `--autopilot`: log the shortlist as auto-accepted and continue to
Stage 2.

Checkpoint 1 choices (interactive) — invoke the host's native question tool (`header: "Checkpoint 1"`, **4 options**):

- **Question:** `I'll compare "[A short name]" vs "[B short name]". Is that the right choice to decide?`
- **Options (4):**
  1. `Yes, compare those two (Recommended)`
  2. `Change the options or criteria`
  3. `This is obvious now — stop`
  4. `Say this in plain English`

## Stage 2 — Evidence tournament

Stage 2 compares both shortlisted approaches. It does not defend a winner chosen
in Stage 1.

### Reviewer missions

Use these four default missions:

1. **Feasibility and integration**
2. **Failure, security, and edge cases**
3. **Operations, migration, and cost**
4. **Challenger advocate**

Add one domain specialist only when the decision clearly requires expertise not
covered above. Omit a default mission only when it is demonstrably irrelevant;
never run fewer than three reviews without user approval.

### Procedure

1. Identify specific repository files and authoritative external sources needed
   to evaluate the decision.
2. Read [references/subagent_prompt.md](references/subagent_prompt.md).
3. Launch one isolated, read-only delegate per mission using the host's supported
   mechanism. Use the host's default model unless the user requested another.
4. Launch delegates together when parallel dispatch is available. Launch and
   synthesis are separate assistant steps.
5. After results return, normalize and cluster them into evidence-backed
   blockers, fixable risks, minor concerns, unverified claims, disagreements,
   and evidence favoring the challenger.
6. If evidence invalidates both options, return to Stage 1 after user approval.

Each delegate returns no more than three findings. Every finding must contain:

```text
claim:
evidence:
source:
impact: blocker | fixable | minor | unverified
confidence: high | medium | low
affected_option: A | B | both
falsifier:
```

A blocker without evidence is `unverified`, not fatal.

Read [references/output_templates.md](references/output_templates.md), emit the
complete Stage 2 template, set `checkpoint: 2`. Interactive: stop.
`--brake` / `--autopilot`: log the synthesis as auto-accepted and continue to
Stage 3, unless `Return to Stage 1 required: yes` (then stop even on autopilot).

Checkpoint 2 choices (interactive) — invoke the host's native question tool (`header: "Checkpoint 2"`, **4 options**):

- **Question:** `Both options still stand after review. Ready for me to adjudicate and pick a winner?`
- **Options (4):**
  1. `Yes, pick a winner (Recommended)`
  2. `Revise an option or re-frame`
  3. `Stop here`
  4. `Say this in plain English`

## Stage 3 — Adjudication

Stage 3 resolves uncertainty instead of repeating Stage 2 with new personas.

Run these two read-only review missions:

1. **Evidence adjudicator:** verify disputed and high-impact claims; distinguish
   corroboration from repeated assertion.
2. **Premortem challenger:** assume the leading option failed six months after
   launch, identify the most plausible causes, and present the strongest
   remaining case for the runner-up.

Add a third domain adjudicator only when a Stage 2 dispute requires specialized
resolution.

The orchestrator then produces:

- Recommendation and rationale
- Comparison against the declared criteria
- Evidence that determined the decision
- Verified and unverified assumptions
- Material disagreements
- Reversibility and rollback cost
- Premortem risks and mitigations
- Conditions that would change the recommendation
- Ranked alternatives
- Cheapest experiment or spike that could reduce remaining uncertainty
- One next action appropriate to the session's current capabilities

Read [references/output_templates.md](references/output_templates.md), emit the
complete Final template, set `checkpoint: 3`.

- **Interactive:** append the interactive final footer verbatim at the end of the markdown report, **then** invoke the Checkpoint 3 native question tool and stop. Do not implement until confirmed.
- **`--brake`:** omit the interactive footer, invoke the Checkpoint 3 native question tool, and stop. If they say no, stay at this checkpoint.
- **`--autopilot`**, or **brake after they say go ahead:** proceed — accept the recommendation and start implementing it.

Checkpoint 3 choices (interactive / brake) — invoke the host's native question tool (`header: "Checkpoint 3"`, **4 options**):

- **Question:** `I recommend "[chosen]": [one-line why]. Make that the decision?`
- **Options (4):**
  1. `Yes, go with that (Recommended)`
  2. `Pick the other option`
  3. `Revise something first`
  4. `Say this in plain English`

## Delegate failure protocol

1. Retry one transient delegate failure.
2. Report unavailable missions explicitly.
3. If fewer than three Stage 2 reviews or fewer than two Stage 3 reviews return,
   ask whether to retry or continue in labelled degraded mode.
4. If delegation is unavailable, state `DELEGATED_REVIEW_UNAVAILABLE` and ask
   before substituting isolated orchestrator passes.
5. Never synthesize findings that were not returned.

## Completion check

Before declaring the pipeline complete, verify:

- At least two viable approaches received adversarial comparison.
- High-impact claims carry evidence or are labelled unverified.
- Reversibility and residual uncertainty are explicit.
- Material disagreements remain visible.
- The recommendation states what evidence would overturn it.
- No implementation occurred before Checkpoint 3 was accepted (interactive /
  brake wait) or auto-accepted (`--autopilot`).
- Interactive Checkpoint 3 included the pace-mode footer at the end of the markdown report right before invoking the Checkpoint 3 question tool.

## References

- [references/subagent_prompt.md](references/subagent_prompt.md) — portable
  delegate dispatch, reviewer prompt, evidence contract, and failure handling.
- [references/output_templates.md](references/output_templates.md) — exact
  Stage 1, Stage 2, and Final response structures.
