---
name: ui-craft
description: >-
  Design, refine, redesign, or audit web interfaces through five separated
  passes: token system (DESIGN.md), per-route visual thesis, craft-floor build,
  fresh-eyes critique with accessibility audit, and live 390px/1440px browser
  proof (--refine, --redesign, --audit, --focus, --brake). Apply when building
  a new web UI, polishing or redesigning an existing interface, fixing layout
  or accessibility regressions, or auditing visual craft. Do not trigger for
  single-line CSS edits. Use verify-app for long-term functional flow maps,
  seo-audit for crawl/meta/GEO, and trl for launch-readiness loops.
user-invocable: true
disable-model-invocation: false
version: "1.0.0"
author: "Ali Farahat"
tags: ["ui", "ux", "design-system", "accessibility", "frontend", "responsive"]
---

# UI Craft

> **Leading words:** brief wins, surface intent, token contract, craft floor,
> three-proof gate, fresh-eyes critique, rendered proof, refine preserves,
> redesign replaces.

Generic AI interfaces happen when one pass invents tokens, picks a voice,
writes markup, and ships unverified. This playbook splits those five hats into
gated passes with real DOM and viewport proof.

## Operating contract

- **Brief wins.** Honor explicit user aesthetics, eras, palettes, or fonts even
  when they overlap common defaults. Never override a clear brief with
  contrarian taste.
- **Refine preserves, redesign replaces.** In `--refine`, keep the incumbent
  brand, tokens, copy, and features. In `--redesign`, keep product truth,
  features, and factual copy, treat the old look as anti-reference, and replace
  `DESIGN.md` cleanly rather than half-polishing the old look.
- **Visual authority is evidence.** An existing app without `DESIGN.md` is not
  greenfield. Inspect live routes, CSS, and existing component primitives first.
- **Keep workflow state silent.** Track mode, route intents, scores, and fixes
  in session todos and `DESIGN.md`. Never emit internal state blocks in chat.

## Modes and modifiers

```text
$ARGUMENTS
```

| Flag | Role | Behavior |
|---|---|---|
| *(default / `build`)* | Workflow | Build a new app or surface end-to-end through all five passes. |
| `--refine` | Workflow | Tighten an existing surface while preserving its visual identity and tokens. |
| `--redesign` | Workflow | Keep features and factual copy, replace `DESIGN.md` and the visual world. |
| `--audit` | Workflow | Read-only critique, accessibility audit, and live viewport probe. Zero code edits. |
| `--focus <axis>` | Modifier | Narrow `--refine` or `--audit` to `type`, `layout`, `a11y`, `states`, `motion`, or `responsive`. |
| `--brake` | Modifier | Pause after Phase 2 (`DESIGN.md` and visual thesis, or audit plan) for user approval before editing UI code. |

**Auto-detecting mode when no workflow flag is passed:**
- New app, new page, or blank canvas → `build`
- Improve, clean up, polish, or fix an existing UI → `refine`
- Rebrand or overhaul visuals while keeping behavior → `redesign`
- Review, critique, or audit without edits → `audit`

### Per-route surface intents

Assign one intent to **each route**, never one intent for the whole app. A
tool's landing page still persuades, and a studio's settings page still
operates.

| Intent | Typical surfaces | Primary job |
|---|---|---|
| **Persuade** | Landing pages, pricing, campaigns | Earn attention and action. Bold visual voice and focal hero carry the page. |
| **Operate** | Dashboards, forms, tables, editors, settings | Complete tasks fast. Scanability, restraint, `tabular-nums`, and native patterns beat flair. |
| **Read** | Docs, guides, articles, changelogs | Support comprehension. Measure, hierarchy, and calm rhythm lead. |
| **Showcase** | Portfolios, galleries, interactive demos | Put the artifact first. Interface chrome recedes. |

## Pipeline

Copy these steps into the session todo list verbatim before starting. A step
you omit stays in the list with `skip: <reason>` or `n/a: <reason>`.

1. **Scope and route map.** Parse mode, `--focus`, and `--brake` from `$ARGUMENTS`. Inspect the repo's routes, framework, styling layer, existing tokens, and component primitives. Assign one Surface Intent to each in-scope route.
2. **Token contract and direction.** Load [references/design-system.md](references/design-system.md).
   - In `build` or `redesign`: write or replace `DESIGN.md` with tiered tokens (primitive, semantic, component), WCAG contrast ratios, display-vs-data typography split, and a domain cliché ban. Run the **Swap Test** against the brief.
   - In `refine` or `audit`: reconstruct the governing local system from the active runtime path without rewriting `DESIGN.md`.
3. **Direction checkpoint (`--brake` or ambiguous brief).** Present the direction summary if `--brake` is set or a greenfield brief is ambiguous. Ask via the host's native structured question tool (`AskUserQuestion`, `AskQuestion`, `question`, `request_user_input`, `vscode_askQuestions`, or `ask_user`). Fall back to a numbered list only when zero question tools exist. Keep options ≤4, end option 1 with `(Recommended)`, and put `Say this in plain English` last. Stop after approval if `--brake` stops before edits.
4. **Build or refine on the craft floor.** *(In `--audit`, mark `skip: audit-only`.)* Load [references/craft-floor.md](references/craft-floor.md) immediately before editing UI code. Implement or refine every in-scope route against the locked tokens and craft invariants. Honor `--focus` when set. Preserve features and factual copy in `refine` and `redesign`.
5. **Fresh-eyes critique and accessibility audit.** Load [references/critique-and-a11y.md](references/critique-and-a11y.md). Spawn a blind read-only critic subagent when the host supports subagents (cold-read pass otherwise). Score every in-scope route on the 5 axes and the cognitive-load check (≤4-choice rule). Filter findings through the **Three-Proof Gate** (contract, runtime, single correction). Audit semantic HTML, keyboard focus clearance, forms, touch targets, and motion. Fix all High and Medium findings in non-audit modes without breaking tokens. Re-check until zero High findings remain.
6. **Rendered viewport proof (`390px` and `1440px`).** Load [references/viewport-proof.md](references/viewport-proof.md). Start or attach to the real app, then wait for rendered state and fonts. Run the DOM audit probe on every in-scope route at `390×844` and `1440×900`. Inspect full-page screenshots and exercise interactive controls. Batch-fix every defect in non-audit modes and re-shoot changed routes to prove the fix. Kill only processes you started.
7. **Report.** Return the final summary matching the reply contract below.

## Focus shortcuts (`--focus`)

When `--focus <axis>` is passed with `--refine` or `--audit`, run steps 1, 2
(reconstruct only), 4 (unless `--audit`), 5, 6, and 7 scoped to that axis:

| `--focus` | Active checks |
|---|---|
| `type` | Scale contrast, 60–75ch measure, `text-wrap`, `tabular-nums`, punctuation, small-size legibility. |
| `layout` | Grouping proximity, heading spacing, card fatigue, `h-dvh`, `min-w-0`, fixed z-index layers. |
| `a11y` | Native controls, focus rings, sticky-bar focus clearance, ARIA labels, contrast ratios, forms. |
| `states` | Empty, loading skeletons, inline errors with recovery, disabled states, destructive dialogs. |
| `motion` | Compositor-only props, ≤200ms feedback, interruptibility, `prefers-reduced-motion`, focal restraint. |
| `responsive` | `390px` overflow, clipping, touch targets ≥44px, `safe-area-inset`, mobile nav reachability. |

## Reply contract

End every run with these fields (skip unused lines only when `n/a`):

- **Mode & Scope:** mode, active modifiers, and route list with Surface Intents.
- **System:** `DESIGN.md` created/updated path (or reconstructed local owners in `refine`/`audit`).
- **Critique Scorecard:** per-route `X/40` score (5 axes) + cognitive-load failure count.
- **Audit Results:** High/Medium/Low counts before and after fixes (or `file:line` list in `--audit`).
- **Viewport Proof:** `390×844` and `1440×900` probe results, screenshot confirmation, interactive checks verified, and any step skipped with `skip: <reason>`.

## References

| File | Load when |
|---|---|
| [references/design-system.md](references/design-system.md) | Phase 2: writing `DESIGN.md`, choosing Surface Intents, running the Swap Test, or tracing local tokens. |
| [references/craft-floor.md](references/craft-floor.md) | Phase 4: immediately before editing any UI file. |
| [references/critique-and-a11y.md](references/critique-and-a11y.md) | Phase 5: blind critique rubric, cognitive load check, Three-Proof Gate, and accessibility audit. |
| [references/viewport-proof.md](references/viewport-proof.md) | Phase 6: live browser proof at `390px` and `1440px` plus stack-agnostic DOM audit probe. |
