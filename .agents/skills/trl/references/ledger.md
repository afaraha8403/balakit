# Ledger and dossier

Two files per run, in `.balakit/trl/<slug>/`. The slug is kebab-case,
taken from the scope (for example `csv-export`). Re-running on the same
scope reuses the folder and appends cycles.

- `ledger.md`: the builder's record. Never shown to assessors.
- `dossier.md`: facts-only evidence. The audit and skeptic lenses receive
  it, pasted inline.

## ledger.md

```markdown
# TRL ledger: <scope>

- scope: app | feature | improvement — <one line>
- target: N
- relevant environment: <concrete definition>
- operational environment: <concrete definition>
- expected peak load: <number and source, or "asked: <date>">
- models: <display names per lens>

## Rows

| Row | In scope | Notes |
|---|---|---|
| core | yes | |
| ui-ux | n/a: <reason> | |
| <critical element> | yes | risk checks: <…> |

## Cycle <n> — <date>

Builder sealed score (written before the panel ran):
| Row | Level |
|---|---|

Panel:
| Row | cold | audit | skeptic | Panel | Provenance | Note |
|---|---|---|---|---|---|---|

Overall: TRL N · <provenance>
Disagreements: <row: each lens's blocking line>
Audit reproductions: <claim → pass | fail | not-run>
Gap plan: <row → next-level criteria → checks to write>
Built this cycle: <checks added, commits>
Waiting on user: <consent or attested evidence>
```

## dossier.md

```markdown
# Evidence: <scope>

| Claim | Row | Command or artifact | Observed | Provenance | Date |
|---|---|---|---|---|---|
| C1 | core | `npm test -- billing` | 48 passed, 0 failed | local | <date> |
| C2 | ui-ux | first-time-user walkthrough, goal "<goal>" | completed in 7 steps; stuck at step 3 (unclear button label) | staged | <date> |
| C3 | ui-ux | beta feedback from <name> | "<verbatim>" | attested | <date> |
```

Rules:

- One claim per row of the table. Observed = what the output said, not
  what it means.
- No adjectives, no levels, and no target in the dossier.
- A claim that failed an audit stays, marked `failed audit <cycle>`, until
  a new run replaces it.
- Never put secrets, tokens, or customer PII in either file.
