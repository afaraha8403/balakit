# Depth bar

The plan is the product. A later agent must execute it without reconstructing
intent from chat. If a section below is empty, the plan is not done.

## Required sections

Write these onto the canvas (host-native wrapping is fine; the content must exist).

1. **Outcome** — one sentence a product owner could repeat.
2. **Named data shape** — types, records, events the work moves through. Name
   them before listing file edits.
3. **Units** — file-level (not module-level). Each unit has a falsifiable
   done-predicate.
4. **Out of scope** — what this plan will not do. Deleting an old API is out
   unless a predicate names it.
5. **Open questions** — split **blocks write** vs **does not block**.
6. **Verification** — per unit, the real path (or closest executable check).
7. **Specialist log** — pulled skills, and every catalog row skipped with
   `skip: <reason>`.
8. **Resume** — one exact next action after the plan (usually `/execute` on
   this canvas).

## Quality bar

- Paths and symbols, not vibes. Cite `file` or `file:line` when the code exists.
- Units are independently verifiable. Do not hide a negative behind a bundle.
- Preserve host UI anchors: Cursor frontmatter todos must map to units (Build
  needs non-empty `todos`). Claude: the injected file must be non-empty before
  `ExitPlanMode`.
- Do not dump a Balakit template that deletes host headings marked `KEEP`.

## Fail the bar

- Chat-only plan with no canvas path.
- 4k words of prose and zero executable units.
- A second file besides the canvas.
- Implementation started from this skill (unless `--autopilot` after the plan
  is written, and not in Plan Mode).
