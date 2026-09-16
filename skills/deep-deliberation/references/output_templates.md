# Output templates

Use these structures exactly. Fill every section; write `None` when a section
has no content. Do not replace them with an unstructured narrative.

Always set `mode:` in `DELIBERATION_STATE` (`interactive` | `circuit` |
`autopilot`).

When `mode` is `circuit` or `autopilot` and this is **not** the final
checkpoint: `next_action` is the next stage, not a wait. Replace the
`## Checkpoint N` ask with a `## PACE_LOG` of the auto-accepted choice.

When `mode` is `circuit` at Checkpoint 3: keep the ask (plain question:
go ahead with this recommendation?).

When `mode` is `autopilot` at Checkpoint 3: `next_action` is the proceed
action (start implementing the recommendation). Replace `## Checkpoint 3`
with a `## PACE_LOG` that records the auto-accepted recommendation, then
execute. Change `## Next step` from "Do not execute it" to the action you
are about to take.

When `mode` is `interactive` at Checkpoint 3: after `## Checkpoint 3`, append
the interactive final footer from the skill **verbatim**. It must be the last
thing in the message. Omit the footer when `mode` is `circuit` or `autopilot`.

## Stage 1 — Frame and shortlist

```markdown
DELIBERATION_STATE
stage: 1
checkpoint: 1
mode: interactive | circuit | autopilot
shortlist: A,B
delegate_results: 0/0
next_action: Wait for the user's Checkpoint 1 decision.

## Decision
[Decision, desired outcome, decision horizon, and cost of delay.]

## Constraints and non-goals
- Must: [...]
- Important: [...]
- Preference: [...]
- Non-goals: [...]

## Assumptions and evidence gaps
- Assumption: [...] — evidence: [source or unverified]

## Reversibility
[One-way or two-way door, rollback cost, and cost of being wrong.]

## Options
### Branch A — [name]
- Mechanism: [...]
- Expected benefit: [...]
- Main downside: [...]
- Critical assumptions: [...]
- Supporting evidence: [...]
- Reversibility: [...]
- Rough effort: S | M | L
- Failure condition: [...]

[Repeat for Branches B–E as needed.]

## Evaluation
- Branch A: [pass | partial | fail | unknown by criterion]
- Branch B: [pass | partial | fail | unknown by criterion]
- Pruned: [branch and explicit reason, or None]

## Shortlist
- Option A: [original branch] — [why it advances as the leading option]
- Option B: [original branch] — [why it advances as the strongest challenger]
- Evidence most likely to change this shortlist: [...]

## Checkpoint 1
Lead with one sentence a product owner could repeat. Then fire the
host's structured question (plain question). Do not replace this template
with the question.

prompt: I'll compare "[A short name]" vs "[B short name]". Is that the right choice to decide?
options:
- Yes, compare those two (Recommended)
- Swap or rewrite an option
- Change what we're optimizing for
- This is obvious now — stop
- Say this in plain English
```

## Stage 2 — Evidence tournament

```markdown
DELIBERATION_STATE
stage: 2
checkpoint: 2
mode: interactive | circuit | autopilot
shortlist: A,B
delegate_results: [returned]/[launched]
next_action: Wait for the user's Checkpoint 2 decision.

## Review missions
- [Mission]: [returned | failed | unavailable]

## Evidence-backed blockers
- [Claim] — [source] — affects [A | B | both]

## Fixable risks
- [Claim] — [source] — mitigation: [...]

## Minor concerns
- [Claim] — [source]

## Unverified claims
- [Claim] — missing evidence: [...]

## Material disagreements
- [Conflict] — [why it remains unresolved]

## Challenger case
[Strongest evidence favoring the current runner-up.]

## Synthesis
- Option A survives because: [...]
- Option B survives because: [...]
- Decision-changing unknowns: [...]
- Return to Stage 1 required: yes | no

## Checkpoint 2
Lead with one sentence a product owner could repeat. Then fire the
host's structured question (plain question).

prompt: Both options still stand. Ready for me to pick a winner?
options:
- Yes, pick a winner (Recommended)
- Change an option and re-check
- Start over with a different fork
- Stop here
- Say this in plain English
```

## Final recommendation

```markdown
DELIBERATION_STATE
stage: 3
checkpoint: 3
mode: interactive | circuit | autopilot
shortlist: A,B
delegate_results: [returned]/[launched]
next_action: Wait for the user's Checkpoint 3 decision.

## Recommendation
[Chosen option, confidence, and concise rationale.]

## Criteria comparison
- Must: [...]
- Important: [...]
- Preference: [...]

## Determining evidence
- [Evidence] — [source] — [implication]

## Assumptions and uncertainty
- Verified: [...]
- Unverified: [...]
- Residual uncertainty: [...]

## Material disagreements
- [Disagreement and why the recommendation proceeds despite it, or None]

## Reversibility and rollback
[Rollback path, switching cost, and point of no return.]

## Premortem
- Failure mode: [...] — mitigation: [...] — early warning: [...]

## Conditions that change the recommendation
- Switch or reopen the decision if: [...]

## Ranked alternatives
1. [Alternative] — prefer when [...]
2. [Alternative] — prefer when [...]

## Cheapest de-risking action
[Smallest experiment, prototype, or evidence-gathering action that could reduce
the most important uncertainty.]

## Next step
[One action appropriate to the session's current capabilities. Do not execute it.]

## Checkpoint 3
Lead with one sentence a product owner could repeat. Then fire the
host's structured question (plain question).

prompt: I recommend "[chosen]": [one-line why]. Make that the decision?
options:
- Yes, go with that (Recommended)
- Pick the other option
- Change something first
- Plan or build it next
- Say this in plain English

⚡ **Skip the waits next time**

This run was **interactive** — a stop at every checkpoint. Same skill, two other paces:

- `--circuit` — take the recommended choices through the middle checkpoints, then stop at the final recommendation and ask before proceeding.
- `--autopilot` — take every recommended choice, including the last, and proceed without waiting.

`/deep-deliberation --circuit <decision>` · `/deep-deliberation --autopilot <decision>`
```
