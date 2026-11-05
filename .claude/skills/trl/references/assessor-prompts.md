# Assessor prompts

Spawn three assessors per cycle, in parallel, as fresh agents. Each gets
one lens. Fill every bracketed field. Paste the full text of
[scale.md](scale.md) and [dimensions.md](dimensions.md) into `SCALE`.
Assessors must not need this skill's folder.

## What assessors never get

Keep these out of every prompt, file name, and attachment:

- The target level, or words like "goal" and "aiming for".
- The builder's sealed score, or any earlier verdict or cycle number.
- The ledger, or any path under `.balakit/trl/`.
- Praise, adjectives, or a narrative about how the work went.
- Which other lenses exist, or that a panel exists.

The dossier is facts only: claim id, row, command, observed output
summary, provenance, artifact path. Strip anything else before sending.

## Shared block (every lens)

```text
READINESS ASSESSMENT
You are scoring the technology readiness of one piece of software, from
evidence only. Score what is demonstrated now. Ignore plans and intent.

SCOPE
[one line: app | feature | improvement, and what it is]
repo: [absolute path]
environments:
- relevant: [concrete definition, URLs if any]
- operational: [concrete definition, URLs if any]
rows in scope: [list; omit n/a rows]
extra rows (critical technology elements): [name: risk-specific checks]

SCALE
[full text of scale.md, then dimensions.md]

READ-ONLY CONTRACT
- Read, search, and run read-only commands. You may run the project's
  existing test, lint, and build commands.
- Never edit, create, or delete tracked files. Never install packages
  globally, deploy, send messages, or change any external system.
- Never open `.balakit/`.
- Only GET requests against the listed environment URLs. No logins with
  real user accounts.

RETURN exactly this block, one line per row in scope:
TRL_VERDICT
lens: [lens id]
rows:
- row: <name> | level: <0-9> | provenance: <tag> | blocking: <first unmet criterion at level+1, quoted from SCALE> | evidence: <paths or commands> | confidence: high | med | low
reproduced: <claim id → pass | fail | not-run (reason)>   (audit lens only)
unknowns: <what you could not check and why>
```

## Lens: cold

No dossier. Fresh eyes on the artifact itself.

```text
LENS: cold
You get the repository and the environments, nothing else. Work out
what this software does and how far it is demonstrated. Run the existing
test and build commands where they are cheap. Score each row from what
you can see and run yourself.
```

## Lens: audit

Dossier plus verification.

```text
LENS: audit
DOSSIER
[facts-only dossier]

Re-run at least [2, or every claim if fewer than 2] dossier claims
whose commands are read-only. Prefer the claims that the highest levels
rest on. Mark each claim pass, fail, or not-run with a reason. Score
each row using only claims that passed or that you confirmed in
artifacts.
```

## Lens: skeptic

Dossier plus adversarial reading.

```text
LENS: skeptic
DOSSIER
[facts-only dossier]

For each row, find the lowest level whose exit criteria are not met.
Look for weak evidence: tests that would pass on empty output, stubs
where the level needs real dependencies, local runs claimed as staged,
missing negative cases, and screenshots with no run behind them. Score
each row one below that first unmet level.
```

## First-time-user walkthrough (build evidence, not panel)

For the `ui-ux` and `docs-support` rungs at 7 and 9, spawn a separate
fresh agent while building. Give it only the URL (or the docs) and one
goal in plain words, such as "Sign up and export last month's invoices as
CSV." No repo, no hints. It returns the steps it took, where it got
stuck, and whether it finished. Record that output in the dossier as
`staged` evidence, verbatim.
