# Stage 4 Dissection Report, Sub-Agent Rules & Lessons

Read this file before writing the Stage 4 synthesis report in `dissect`.

## Dissection report sections (Stage 4 — chat output)

Hold all evidence from Stages 0–3 in the main context and emit these seven numbered sections in chat (never overwrite an existing plan file with this chat report):

0. **Naming corrections** — every mismatch found in Stage 0, with corrected canonical names applied throughout the report.
1. **Scope boundary corrections** — entities wrongly counted in this domain, the real domain owner of each, and any live code (`file:line`) that crosses the boundary.
2. **Entity verdicts** — one table: `Entity | Verdict | Rationale (file:line or live DB evidence) | Lands (target if FOLD/RE-HOME)`. Never justify a verdict with row counts.
3. **System-level changes** — for each cross-cutting issue:
   - **Decision:** [concrete change]
   - **Why:** [evidence-backed reason]
   - **Other options:** [alternatives + why rejected]
4. **Bug / misuse log** — places where live code uses the wrong entity or wires an entity to the wrong domain (correctness defects, distinct from optimization).
5. **Execution order** — minimal-build sequence: highest-value and most-independent changes first, explicit dependencies, and what to defer.
6. **Deferred / out of scope** — what is intentionally unchanged, each with an explicit reason.

## Verdict evidence checklist

- Every verdict cites concrete `file:line` or live runtime/DB evidence — zero bare assertions.
- Every `FOLD` / `RE-HOME` names the destination entity and which fold test applies ([fold_tests.md](fold_tests.md)).
- Every `OUT-OF-SCOPE` names the true domain owner.
- Every `DROP` names the proven reason (no live code path, derivable, migrated, or dead legacy).
- Every `DEFER` / `ON-DEMAND` names the missing requirement that would justify keeping the seam.
- Row counts appear only as liveness context, never as a keep/drop justification.

## Hard-won field lessons

- **Read actual records first.** A table named `managed_preference` may store `"Favorite Drink → Moscow Mule"`. Schema names lie; sample data tells the truth.
- **Channel ≠ kind ≠ group.** Orthogonal taxonomies frequently get conflated under similar names; separate them before issuing verdicts.
- **"Built for" vs "used for."** When design intent and live usage diverge, log a misuse bug rather than blessing accidental coupling as architecture.
- **Read pipelines are not ownership proof.** A downstream query reading a table does not make that pipeline the owner or validate the schema.
- **Stubs inflate surface area.** Handlers that `throw`, no-op crons, DLQ-only consumers, and hard-coded failure clients are stubs, not active features.
