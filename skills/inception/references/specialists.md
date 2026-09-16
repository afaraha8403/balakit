# Specialist catalog

Loose composition. Pull a sibling when its apply-when matches. Copy that
skill’s steps into todos when pulled. Unused rows stay with `skip: <reason>`.
Do not inline those skills here — read their `SKILL.md` when pulled.

Pointers are one level deep: this file → that `SKILL.md`. Do not chain.

## Catalog

| Skill | Pull when | Skip when |
|---|---|---|
| `dissect` | Brownfield. The system or an existing written plan must be interrogated before new work is specified. | Greenfield / nothing to audit. `skip: no existing system`. |
| `design-rationale` | A weird existing shape might be load-bearing. Changing it needs why. | No historical “why” question. `skip: no rationale question`. |
| `subsystem-walkthrough` | The runtime model is wrong or missing and the plan would be fiction. | The walkthrough would not change a unit. `skip: runtime already known`. |
| `deep-deliberation` | A consequential fork with two viable approaches. Cost of choosing wrong beats the cost of deliberating. | No fork, or the canvas already picked. `skip: no fork`. |
| `opinion` | High-stakes disagreement; parallel takes should answer; nobody writes. | The question is mechanical. `skip: no parallel-take need`. |
| `proving-change-safety` | Name the safety facts the later build must prove (do not run the prove from Inception). | No merge-risk seam yet. `skip: no safety fact to name`. |
| `documentation-writer` | The plan’s outcome is a docs surface (Diátaxis). | Implementation plan, not a docs request. `skip: not a docs deliverable`. |

## Do not pull to implement

| Skill | Why it stays out of Inception |
|---|---|
| `execute` | Consumer. Recommend at the end. Run only under `--autopilot` after the plan is written (not in Plan Mode). |
| `kit-workflows` | Consumer for a known small build. User may choose it instead of execute. |
| `unmatched-workflow` | Consumer when no playbook fits **and they are about to work**. Inception stops at the plan. |
| `blinded-eval` | Proves a skill/prompt change. Not a product-plan specialist. |
| `authoring-skills-and-rules` | Authors skills/rules, not this plan. |

## After a specialist returns

Keep writing the **same canvas**. Chat reports stay in chat (`dissect` Stage 4,
`deep-deliberation` decision record). Fold only the findings the depth bar
needs into the plan as `PATCH` / `APPEND`.
