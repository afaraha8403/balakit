---
name: dissect
description: >-
  Evidence-driven dissection of an existing service, written plan, or codebase
  area. Interrogates every entity (table, field, component, endpoint, module,
  boundary) against ground truth from multiple sources at once, red-teams each
  verdict devil's-advocate style, and arrives at the minimal-build optimization
  plan. Runs as a staged pipeline with human checkpoints and parallel read-only
  sub-agents so each investigation stays laser-focused. Optional --brake skips
  intermediate checkpoint waits and asks at the final recommendation; --autopilot
  takes recommended choices and proceeds. Use when the user invokes /dissect, or
  asks to audit / optimize / challenge / "tear apart" an existing system, schema,
  or plan. If the session is in Cursor or Claude Plan Mode, update the existing
  plan in place — never rewrite it. Use inception to author a new plan.
user-invocable: true
disable-model-invocation: true
version: "2.8.0"
author: "Ali Farahat"
tags: ["dissect", "audit", "red-team", "minimal-build", "refactor", "ground-truth", "orchestration"]
---

# Dissect

> **Leading words:** dissect, ground truth, entity-level, minimal-build,
> red-team, evidence-backed, stub detection, naming audit, fold test,
> phase separation, patch in place, brake, autopilot, plain question.

Systematically interrogate and optimize an existing service, written plan, or
system. The goal is not to rubber-stamp the current design — it is to arrive at
the **minimal-build plan** that correctly meets the requirements, by challenging
every assumption with live evidence and an adversarial review panel.

**Trigger:** `/dissect [--brake|--autopilot] <target>` where `<target>` is a
service name, plan file path, codebase area, or free-form description. If
omitted, ask. Pace flags are optional; default is interactive (stop at every
checkpoint).

`dissect` is the backward-looking counterpart to `deep-deliberation`. They share
DNA — parallel read-only sub-agents, devil's-advocate red-teaming, human
checkpoints, evidence over intent, and the same `--brake` / `--autopilot`
grammar — but point in opposite directions: deliberation designs what to build;
dissect audits what already exists. `--circuit` remains a supported alias of
`--brake`.

---

## User Input

```text
$ARGUMENTS
```

Parse a pace flag from arguments **before** treating the rest as `<target>`:
`--brake`, `--circuit` (alias of `--brake`), `--autopilot`, `--auto` (alias of
`--autopilot`). Strip the flag from the target string. Canonical name is
**brake**. `--circuit` and the word `circuit` mean brake. If both brake and
autopilot appear, autopilot wins. Reconstructing state: `circuit` → `brake`.

---

## Pace modes (optional)

Default is **interactive**: stop and wait at every checkpoint.

The user must opt in **this invocation** — a flag above, or an explicit phrase
(`brake`, `circuit`, `autopilot`, `take recommended`, `brake the rest`,
`circuit the rest`, `autopilot the rest`). Do not infer from urgency, "just audit this", or a
desire to move fast. Mid-run, the same phrases switch mode from the current
checkpoint. `stop brake` / `stop circuit` / `stop autopilot` drops back to interactive.

| Mode | Intermediate checkpoints (1–2) | Final checkpoint (3) |
|---|---|---|
| `interactive` | Stop and wait | Stop and wait. Do not proceed until they ask |
| `--brake` | Auto-accept the recommended choice; log and continue | Stop. Ask whether to go ahead with the final recommendation |
| `--autopilot` | Auto-accept; log and continue | Auto-accept. Treat the recommendation as the way to proceed |

**Skip the wait, not the work.** Stages, evidence, red-team, and the naming
audit still run. Emit a compact `PACE_LOG` of every auto-accepted choice.

**Cannot proceed:** if there is no unique recommendation (tie, empty shortlist,
pipeline wants to go backward), stop and ask even on autopilot.

**Proceed** (autopilot, or brake after the user says go ahead):

- Plan Mode / existing plan file: apply the surgical patch map. Do not
  implement code unless they also asked to implement.
- Otherwise: start executing the recommended ToT / execution branch.

Discrepancies still surface (principle 9). Brake holds them for the final
ask. Autopilot logs the recommended resolution in `PACE_LOG` and the report;
never drop them.

**Interactive final footer.** On Checkpoint 3 only, when this run is
interactive, append the block below **verbatim at the end of the Stage 4
markdown report, right BEFORE invoking the blocking Checkpoint 3 question tool**.
Omit it under `--brake` / `--autopilot`. Do not paraphrase.

```markdown
⚡ **Skip the waits next time**

This run was **interactive** — a stop at every checkpoint. Same skill, two other paces:

- `--brake` — take the recommended choices through the middle checkpoints, then stop at the final recommendation and ask before proceeding.
- `--autopilot` — take every recommended choice, including the last, and proceed without waiting.

`/dissect --brake <target>` · `/dissect --autopilot <target>`
```

---

## User questions (Native Question UI)

The report may be technical. The **ask** must not be.

In the **same turn** after emitting the stage report markdown: inspect your live declared tools and invoke the host's **native structured question tool** (`AskUserQuestion` on Claude Code, `AskQuestion` on Cursor, `question` on OpenCode, `request_user_input` on Codex, `vscode_askQuestions` or `ask_user` on Copilot/Gemini CLI). Fall back to a numbered plain-text list **only** when zero structured question tools are declared in this session. Do not replace the report with the question, and **never print raw `prompt:` / `options:` YAML in markdown**.

- **Option count:** strictly **2–4 options** (`maxItems: 4` on Claude Code and OpenCode; native widgets automatically provide a free-text `"Other"` field).
- **Header & labels:** `header` ≤12 chars; option `label` ≤40 chars. First option ends `(Recommended)`. Last option is always `Say this in plain English` (meta: do not advance; rephrase with a concrete example from this codebase and re-invoke the question tool). Free-text overrides.

---

## Core principles (never waive)

1. **Ground truth beats intent.** What the code actually does overrides what the
   plan says it should do. Always verify live.
2. **Row counts are a liveness signal only.** A 0-row table can be load-bearing;
   a populated table can be redundant. Never use row count as a keep/drop reason.
3. **Name what it IS, not what it was named.** Entities are frequently misnamed.
   Read a few actual records before drawing conclusions. A table called
   `contact_preference` might store food allergies and golf equipment.
4. **Own vs read.** "Entities this service reads" ≠ "entities this service owns."
   Reading a table does not mean you should count it in the domain.
5. **Stubs are not live.** A function that `throws new Error('not implemented')`,
   a cron that no-ops, or a consumer that re-queues to the DLQ is not a running
   feature. Check before counting it as active behavior.
6. **Minimal build.** Every proposed change must trace to a requirement. Do not
   design for hypothetical future use. Three similar things beat a premature
   abstraction.
7. **Naming audit is phase zero.** Naming confusion causes the most incorrect
   verdicts. Run it before any verdict.
8. **Sub-agents return evidence, the orchestrator returns verdicts.** A sub-agent
   that declares "VERDICT: DROP" unprompted is overstepping. Synthesis happens in
   the main context where all evidence is held together.
9. **Escalate discrepancies, don't resolve them silently.** If code says X and the
   plan says Y, surface both. Interactive: wait at the checkpoint. `--brake`:
   hold them for the final ask. `--autopilot`: log the recommended resolution
   in `PACE_LOG` and the report; never drop them.
10. **Patch in place — never rewrite the live plan.** If the session is in Cursor
    Plan Mode or Claude Plan Mode, or the target is an existing plan document,
    the source plan is the document of record. Dissect it, then surgically
    update it (fix, tune, fill gaps). Never full-file `Write` it. Never create a
    second plan that replaces it. Unaddressed sections stay verbatim. Read
    [references/plan_preservation.md](references/plan_preservation.md) before
    any write. Override only if the human explicitly asks to rewrite from scratch.

---

## Pipeline overview

```
USER input (service / plan / codebase area)
   ↓
[Stage 0] Intake + Naming Audit                 (1 explore sub-agent)
   🛑 CHECKPOINT 1 — human confirms names + scope boundary
   ↓
[Stage 1] Multi-source Ground Truth             (3 explore sub-agents, parallel)
[Stage 2] Entity-level Devil's Advocate         (1 explore sub-agent per cluster)
   🛑 CHECKPOINT 2 — human reviews per-entity verdicts
   ↓
[Stage 3] Cross-cutting + Adversarial Red-Team  (system challenge + ToT branches)
[Stage 4] Synthesis + Minimal-Build Plan        (orchestrator, main context)
   🛑 CHECKPOINT 3 — human picks the execution branch
```

Copy this checklist and track progress out loud:

```
Progress:
- [ ] Stage 0: Naming audit
- [ ] CHECKPOINT 1 — names + scope confirmed
- [ ] Stage 1: Multi-source ground truth (DB + code + plan, parallel)
- [ ] Stage 2: Entity-level devil's advocate (one agent per cluster)
- [ ] CHECKPOINT 2 — entity verdicts reviewed
- [ ] Stage 3: Cross-cutting challenges + ToT refactor branches + red-team
- [ ] Stage 4: Synthesis → minimal-build plan
- [ ] CHECKPOINT 3 — execution branch chosen
```

> **Right-size the pipeline.** This is heavy. For a small target (a handful of
> entities, one file) collapse Stages 0–2 into a single pass and skip the parallel
> fan-out — but never skip the naming audit. Checkpoint 1 **wait** is skippable
> only under `--brake` / `--autopilot`.

---

## Stage 0 — Intake + Naming Audit

Surface naming confusion that could corrupt every later verdict, before any
analysis. Dispatch one read-only (`explore`) sub-agent:

```
Prompt: Naming audit for <target>.

For every entity (table, field, service, component, endpoint) in scope:
  1. Does the name accurately describe what it actually holds/does?
  2. Is there another entity with a similar name it could be confused with?
  3. Read 2–3 actual records (or the code body) and compare to the name.
     Flag any mismatch.

Return a table only (no verdicts):
  Entity | What name implies | What it actually contains | Mismatch?
```

If the session is already in **Cursor Plan Mode** or **Claude Plan Mode** and
the user did not name a different target, the target **is the current plan
document**. Record its path. Read
[references/plan_preservation.md](references/plan_preservation.md) now — before
any write.

### 🛑 Checkpoint 1
Lead with one sentence a product owner could repeat (what you found, what's
in vs out of scope). Then emit the naming table and proposed scope boundary (what
this target owns vs merely reads).

Interactive: invoke the host's native question tool (`header: "Checkpoint 1"`, **4 options**), then stop:
- **Question:** `Some names don't match what they actually store. Use the corrected names for the rest of this review?`
- **Options (4):**
  1. `Yes, use the corrected names (Recommended)`
  2. `Keep the original names`
  3. `Change what we're reviewing first`
  4. `Say this in plain English`

`--brake` / `--autopilot`: log the proposed names and scope as auto-accepted
(`PACE_LOG`) and continue. A mismatch here changes the verdicts in every later
stage.

---

## Stage 1 — Multi-source Ground Truth

Gather evidence from **all three** sources simultaneously via parallel read-only
sub-agents. Each source catches what the others miss.

| Source | What it catches |
|---|---|
| **Live DB / runtime** | Actual schema, real data, column comments, row shapes |
| **App code** | What actually reads/writes each entity; stubs vs live paths |
| **Plan / spec / migrations** | Intent; evolution history; documented decisions |

Launch three `explore` sub-agents in parallel (one message, three `Task` calls):

**A — Live introspection:** every in-scope entity (name, fields, types,
descriptions), 2 sample records each, row counts (liveness only), and FK/ownership
relationships.

**B — Code evidence:** every file that reads/writes each entity (file:line);
whether each reader/writer is live or a stub; the module that OWNS each entity vs
those that merely READ it; any code using the wrong entity for its purpose.

**C — Plan / spec / migration evidence:** the original design doc, migration
history (before/after), documented decisions, what was explicitly deferred or
descoped, and what the plan SAYS is live vs what code/DB show.

Synthesize the three outputs. Note every discrepancy between sources — that is
where the real problems live.

---

## Stage 2 — Entity-level Devil's Advocate

For each entity **cluster** (group related entities), dispatch one focused
`explore` sub-agent that challenges every verdict. **One cluster = one agent.**
Never batch unrelated clusters — context pollution corrupts both verdicts.

Standard question set (apply to every entity):

```
For entity <X>:
1. PURPOSE   — Plain terms: what does it do? What breaks if it vanished tomorrow?
2. OWNERSHIP — Does <service> own it, or merely read it from another domain?
3. NAME      — Does the name match the data? (Reference Stage 0.)
4. EVIDENCE  — Live code that reads AND writes it? file:line each. Writers but no
               readers (or vice-versa) → flag. Read by a service that shouldn't
               own it → flag.
5. FOLD TEST — Can it be absorbed into a parent? (See fold tests below.)
6. PII/BOUNDARY — Personal data? Which DB/domain should it live in? Match current?
7. STUB CHECK — Is the using code live, or a stub/throw/no-op?
8. VERDICT   — Propose from the dynamic taxonomy below, justified with evidence.
               Never justify with row count.
```

### 🛑 Checkpoint 2
Lead with one sentence a product owner could repeat. Then emit the per-entity
verdicts table (`Entity | Proposed verdict | Evidence`).

Interactive: invoke the host's native question tool (`header: "Checkpoint 2"`, **4 options**), then stop:
- **Question:** `For each piece I recommend keep, combine, remove, or move. Look right?`
- **Options (4):**
  1. `Looks right, keep going (Recommended)`
  2. `I want to change some verdicts`
  3. `Inspect one piece closer`
  4. `Say this in plain English`

`--brake` / `--autopilot`: log the proposed verdicts as auto-accepted and
continue.

---

## Dynamic verdict taxonomy

`KEEP / FOLD / DROP` is too rigid — it only fits relational tables. A
dissection target may be a written plan, a runtime flow, or a coupled module,
so verdicts are **action-oriented and target-aware**. The full taxonomy
(KEEP, FOLD, DROP, DEFER, ON-DEMAND, EXTRACT, RE-HOME, REFACTOR,
OUT-OF-SCOPE) with meanings, plan-vs-code typicals, and the distinctions
that matter (RE-HOME vs EXTRACT, DEFER vs DROP, ON-DEMAND vs KEEP) lives in
[references/verdict_taxonomy.md](references/verdict_taxonomy.md).

Each verdict must cite evidence (file:line or live DB), never row count.
Pick the most precise verdict from the taxonomy.

---

## Stage 3 — Cross-cutting challenges + adversarial red-team

After entity verdicts, challenge the **system-level design**, then red-team the
emerging plan from independent adversarial angles. This is where dissect borrows
deep-deliberation's Tree-of-Thought and red-team machinery.

### 3a. System-level questions (one `explore` sub-agent)
1. **Send/process model** — Is there pre-staging/pre-rendering/pre-computation
   that could be deferred to the moment it's needed? What's the throughput ceiling?
2. **Feedback loops** — When something fails (bounce, rejection, error), is the
   signal captured and acted on, or is the feedback path a stub?
3. **Ownership boundaries** — Where does this service read/write data that belongs
   to another? Any misuse of another domain's tables?
4. **Naming & taxonomy** — Are concepts that share a name actually different
   things (kind vs channel vs group)? Conflation causes the worst bugs.
5. **Live vs designed** — For each major feature, is it actually running or a
   stub/planned/throw? List what is NOT live that the plan implies is live.

### 3b. Tree-of-Thought refactor branches (orchestrator)
Do not assume a single target state. Generate **2–4 distinct end-states** for the
optimization, each with idea, pros/cons, main risk, and rough effort (S/M/L).
Example axis for a storage-heavy target:
- *Branch A — ON-DEMAND:* compute at read, zero new storage.
- *Branch B — FOLD/JSONB:* absorb into parent, flexible, fewer joins.
- *Branch C — hard relational consolidation:* columns + strict keys.
Prune dominated branches and say why. Recommend one + a runner-up.

### 3c. Adversarial red-team panel (parallel `explore` sub-agents)
Launch independent personas in parallel; each attacks first, then concedes what
survives, and returns evidence — not a final verdict. Minimum panel:
- **Zero-Utility Hawk** — argues to DROP or FOLD every entity; forces each KEEP to
  earn its place against live evidence.
- **Migration-Risk Hawk** — red-teams the proposed plan itself: does the migration
  create more downtime/risk than leaving the mess in place?
- **Boundary Hawk** — hunts ownership/PII violations and wrong-domain reads.
- **Stub Hunter** — proves which "features" are actually live vs throws/no-ops/DLQ.

(Reuse the deep-deliberation persona prompt shape: identity → relevant file paths
→ approach under review → attack, then concede, then evidence.)

### 3d. Lead judgment (orchestrator)

After the panel returns, you are the lead. Filter findings before they enter
Stage 4. Do not auto-apply.

| Bucket | Meaning |
|---|---|
| **Act On** | Consensus or a lone finding with a `file:line` that would ship a real defect |
| **Consider** | Plausible, not proven; mention in the report |
| **Noted** | Style or preference; do not churn the plan |
| **Dismissed** | Nit, hypothetical, or "I would have done it differently" with no failure |

Nitpick gravity: a rename is not a defect. Hypothetical vs actual: "could theoretically" without a path is Dismissed. Preserve material disagreements; never silently average them away.

---

## Stage 4 — Synthesis + minimal-build plan

Read [references/synthesis_and_lessons.md](references/synthesis_and_lessons.md) and synthesize all evidence in the main context into the seven dissection report sections (`0. Naming corrections`, `1. Scope boundary corrections`, `2. Entity verdicts`, `3. System-level changes`, `4. Bug / misuse log`, `5. Execution order`, `6. Deferred / out of scope`), obeying [references/fold_tests.md](references/fold_tests.md) (`1:1 → columns`, `1:N bounded → JSONB unless relational access needed`, `1:N unbounded / N:M → separate table`, never fold across PII/DB boundaries).

If the session is in Cursor or Claude Plan Mode, or the target is an existing plan file, follow [references/plan_preservation.md](references/plan_preservation.md): build a surgical patch map (`KEEP` / `PATCH` / `APPEND` / `FLAG`) and preserve unaddressed sections verbatim — never rewrite the plan file.

### 🛑 Checkpoint 3
Lead with one plain-English sentence a product owner could repeat, followed by the Stage 4 report (and patch map if patching a plan).

- **Interactive:** append the `⚡ Skip the waits next time` footer verbatim at the end of the markdown report, **then** invoke the host's native question tool (`header: "Checkpoint 3"`, **4 options**) and stop. Do not implement or edit the plan file until confirmed.
- **`--brake`:** omit the interactive footer, invoke the Checkpoint 3 native question tool, and stop.
- **`--autopilot`**, or **brake after confirmation:** proceed as defined under Pace modes.

Checkpoint 3 question (`header: "Checkpoint 3"`, **4 options**):
- **Question:** `I recommend "[short branch name]": [one-line why]. Go with that?`
- **Options (4):**
  1. `Yes, do that (Recommended)`
  2. `Pick the runner-up option`
  3. `Don't start yet`
  4. `Say this in plain English`

---

## Sub-agent dispatch rules

- **Parallel for Stage 1** (DB + code + plan) — independent, launch in one turn.
- **One cluster per Stage 2 agent** — never mix unrelated clusters.
- **Read-only (`explore`).** Sub-agents inherit the parent model and return raw evidence with `file:line`, never verdicts. Escalate discrepancies to the checkpoint or `PACE_LOG`.

## References

| File | Use it for |
|---|---|
| [references/synthesis_and_lessons.md](references/synthesis_and_lessons.md) | Stage 4 seven-section report format, verdict evidence checklist, and field lessons |
| [references/verdict_taxonomy.md](references/verdict_taxonomy.md) | Dynamic verdict taxonomy (`KEEP`, `FOLD`, `DROP`, `DEFER`, `ON-DEMAND`, `EXTRACT`, `RE-HOME`, `REFACTOR`, `OUT-OF-SCOPE`) |
| [references/fold_tests.md](references/fold_tests.md) | Fold-test table (cardinality → fold type → blocker) and PII/DB-boundary rules |
| [references/plan_preservation.md](references/plan_preservation.md) | Plan Mode / existing plan file: patch in place (`KEEP`/`PATCH`/`APPEND`/`FLAG`), never rewrite |
