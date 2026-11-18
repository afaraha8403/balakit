---
name: documentation-writer
description: >-
  Write clear, scannable documentation with a research-first, phase-separated
  workflow. Pick one Diátaxis mode, then apply STE and Global English.
  Apply when the user asks for documentation, READMEs, doc sites, API
  reference, migration guides, or technical markdown. Use marketing-psychology
  for marketing copy. Use authoring-skills-and-rules to write a Skill, not a
  README. Not commit-message lint — changelog.mdc owns changelog headings.
user-invocable: true
disable-model-invocation: false
version: "1.5.0"
author: "Ali Farahat"
tags: ["documentation", "technical-writing", "markdown", "research-first", "diataxis"]
---

# Documentation Writer

> **Leading words:** research-first, Diátaxis mode, BLUF, STE, Global English,
> evidence-aware, phase separation.

Research-first technical documentation. Chat stays Caveman. The document uses
Standard Professional Mode (80% ASD-STE100).

Copy these phases into the todo list verbatim. A skipped phase stays with
`skip: <reason>`.

1. Discover — list every file, API, and feature the docs must cover.
2. Research — read primary sources for versions, flags, and install commands.
3. Outline — name the Diátaxis mode and write a BLUF per section.
4. Draft — apply 80% STE, Global English, and the slop catalog.
5. Verify — run examples, check citations, and run `lint-ste.mjs`.

Mode table: [references/diataxis.md](references/diataxis.md).
Sentence craft: [references/style.md](references/style.md).
Slop ids: [references/slop-catalog.md](references/slop-catalog.md).

## Subagents

If the host can launch a `Task` / `explore` subagent, use a read-only explore
pass for a large or unfamiliar codebase before drafting. Use web search for
anything version-sensitive. Do not assume those tools exist.

## Phase 1 — Discover

Read relevant files. Delegate broad mapping to explore when available.

*Exit:* you can list every file/API/feature the docs must cover.
🛑 Do not proceed to Research until the user confirms the scope (or you are
explicitly operating solo and the scope is unambiguous). Ask with the host's
structured question tool. Prompt in plain English. Last option:
`Say this in plain English` (meta: rephrase + example, do not advance).

## Phase 2 — Research

Web research **before** asserting facts about APIs, CLI flags, install
commands, LTS timelines, or security claims. Prefer primary sources. Capture
citations. If sources conflict, say what is uncertain.

*Exit:* every claim you will make has a source link.
🛑 Do not proceed to Outline until Research is complete.

## Phase 3 — Outline

Name the Diátaxis mode. Headings, audience, prerequisites. BLUF: lead each
section with the direct answer in 40–60 words.

*Exit:* skeleton approved.
🛑 Present the outline. Do not draft until confirmed. Ask with the host's
structured question tool. Prompt in plain English. Last option:
`Say this in plain English` (meta: rephrase + example, do not advance).

## Phase 4 — Draft

Apply [references/style.md](references/style.md) and the slop catalog.
Start each section with the BLUF answer. Tables for comparisons. Concrete
examples first.

*Exit:* every outline section has content.

## Phase 5 — Verify

Re-read against the repo. Re-check critical external claims. Run code examples
when possible. Lint written markdown with the bundled 80% STE checker:

```bash
node <skill-dir>/scripts/lint-ste.mjs <files...>
```

Fix reported violations, or keep an intentional exception and name it in the
reply.

*Exit:* every example runs as documented, every external claim matches its citation, and `lint-ste.mjs` passes (or every kept exception is justified).

## Standard file shape

1. Title + 1–2 sentence summary (BLUF).
2. Quick start — exact commands.
3. Usage / examples — most common case first.
4. API / reference if needed — tables.

## Reply contract

Name the Diátaxis mode, the files written, and any claim still unverified.
