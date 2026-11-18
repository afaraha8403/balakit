---
name: kit-workflows
description: >-
  Portable playbooks for a bug fix, a named-data-shape feature, a
  behavior-preserving refactor, or a custom hypothesis-driven workflow
  (large migrations and multi-part changes). Apply when the user asks to
  reproduce and fix a defect, ship a feature, reshape code without changing
  behavior, or run a structured migration when no narrower playbook fits.
  Use inception when the deliverable is the plan. Use deep-deliberation for
  a consequential design fork. Use dissect for an existing-system audit.
user-invocable: true
disable-model-invocation: false
version: "2.0.0"
author: "Ali Farahat"
tags: ["playbook", "bug-fix", "feature", "refactor", "migration"]
---

# Kit workflows

> **Leading words:** match a playbook, copy steps, skip with reason, prove
> on the real path.

Not a sticky mode. Match the task to one playbook. Copy that file's steps
into the todo list verbatim. Skipped steps stay with `skip:` / `n/a:`.

| Playbook | When |
|---|---|
| [playbooks/bug-fix.md](playbooks/bug-fix.md) | A defect: reproduce, root-cause, fix with evidence |
| [playbooks/feature.md](playbooks/feature.md) | New or changed behavior from a named data shape |
| [playbooks/refactor.md](playbooks/refactor.md) | Behavior-preserving reshape |
| [playbooks/custom.md](playbooks/custom.md) | Large migration, multi-part change, or task where none of the three above fit |

## Reply contract

First line: `Playbook: bug-fix`, `Playbook: feature`, `Playbook: refactor`, or `Playbook: custom`.
Then what was verified, and any `skip:` lines.
