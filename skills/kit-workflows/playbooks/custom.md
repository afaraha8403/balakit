# Playbook: custom (unmatched workflow)

> **Leading words:** falsifiable done-predicate, hypothesis loop, VERIFIED
> NOT VERIFIED INCONCLUSIVE.

Use when no narrower playbook (`bug-fix`, `feature`, `refactor`) fits — a large
migration, multi-part change, or autonomous run the human will review later.
Before any product code, the deliverable is an explicit verification workflow
scaled to the risk. **Inconclusive is not a pass.**

Copy these steps into the todo list verbatim. Skip with `skip: <reason>`.

1. Frame: define a falsifiable done-predicate, scope boundaries, and rigor level (one-way doors require higher rigor). Present the frame before starting a long run.
2. Design the workflow: break work into atomic units, order riskiest-unknown first, and build the verification harness before product edits. Deleting an old API is out of scope unless the Step 1 predicate names it. Write the phase list down.
3. Run the hypothesis loop: treat each unit as an experiment — state hypothesis, make the smallest change, measure on the real artifact, and keep or revert.
4. Verify the whole change against the Step 1 predicate on the real artifact.

## Unit verdicts

Label every unit **VERIFIED**, **NOT VERIFIED**, or **INCONCLUSIVE**. Never hide a negative result.

Pair delegated work with a parent read of the real files and outputs. If a worker games a gate, tighten the gate contract. If a gate measures the wrong thing, fix the gate in its own atomic step before continuing.

## Reply contract

First line: `Playbook: custom`. Then the phase list you ran, rigor level and why, what is **VERIFIED** against the predicate, and any open or **INCONCLUSIVE** items.
