# Fresh-Eyes Critique and Accessibility Audit

Load this reference in Phase 5 to evaluate every in-scope route without author
bias, filter out unsupported nitpicks, and enforce structural accessibility.

## 1. Blind fresh-eyes critic protocol

The agent that wrote the CSS rationalizes its own compromises. Separate writing
from judging whenever the host supports subagents.

- **With subagents:** spawn one read-only critic subagent with ONLY:
  1. The route list and Surface Intent per route
  2. `DESIGN.md` (or the reconstructed local system summary in `--refine`/`--audit`)
  3. The target component and style files
  4. Any captured screenshots (if available)
  Withhold builder commentary, self-scores, and prior rationale. Instruct the
  critic to score each route against Sections 2–5 below and return only findings
  that pass the Three-Proof Gate.
- **Without subagents:** perform a cold-read pass directly from the files and
  rubric. Treat every existing visual choice as guilty until proven by the
  route's Surface Intent and token contract.

## 2. Five-axis per-route scorecard (40 points max)

Score every in-scope route on each axis from `0` to `8`:

| Axis | 0–3 (Weak) | 4–6 (Passable) | 7–8 (Sharp) |
|---|---|---|---|
| **Visual Hierarchy** | Competing focal points, unclear primary action. | Primary action visible after scanning. | Eye lands on primary job in under 2 seconds. |
| **Typography & Legibility** | Poor scale contrast, cramped small numbers, wide measure. | Readable body, minor hierarchy drift. | Crisp scale, `tabular-nums`, comfortable measure, clean small text. |
| **Spatial Rhythm** | Crowded edges, card fatigue, uneven gaps. | Consistent spacing, minor rhythm breaks. | Tight groups, generous separation, headings bound to content. |
| **System Consistency** | Ad-hoc hex values, mixed radii, raw browser chrome. | Mostly tokenized, small drift. | Exact token fidelity, cohesive variants, themed browser surfaces. |
| **Craft & States** | Missing empty/error/loading states, vague copy, sluggish motion. | Main states work, minor polish gaps. | Complete states, exact action copy, snappy ≤200ms feedback. |

**Score bands:** `34–40` ship-ready · `26–33` polish pass required · `< 26`
structural rework required on that route before shipping.

## 3. Cognitive load check (Working Memory ≤ 4 rule)

People hold at most four chunks in working memory at one decision point. Count
failed items per route:

- [ ] **Single focus:** one clear primary task without competing banners or chrome.
- [ ] **Decision cap:** ≤ 4 visible options at any single decision point (1 primary action, 1–2 secondary, overflow grouped).
- [ ] **Navigation cap:** ≤ 5 top-level navigation items on primary bars.
- [ ] **Clear grouping:** related items bound by proximity or subtle surface change, not heavy box borders around everything.
- [ ] **Zero memory bridges:** users never need to remember a value from a previous screen to finish the current form or step.
- [ ] **Progressive disclosure:** advanced or infrequent controls stay tucked away until requested.

**Load rating:** `0–1` failures = low · `2–3` = moderate (address in polish) ·
`4+` = high (High severity finding).

## 4. The Three-Proof Gate (anti-nitpick filter)

Keep a critique or audit finding **only** when all three proofs exist. Prefer
zero findings over vague taste commentary.

1. **Contract:** cite a binding rule from `DESIGN.md`, the route's Surface
   Intent, the accessibility rubric below, or a direct internal contradiction
   on the same surface.
2. **Runtime:** prove the offending element, class, or token reaches the active
   rendered route (ignore dead code or unused stylesheets).
3. **Single Correction:** state one concrete change (exact token, semantic HTML
   tag, CSS property, or copy string). If the fix is ambiguous or invents new
   product scope, drop the finding.

## 5. Structural accessibility and usability rubric

Group every proven finding by route and severity using terse `file:line`
entries.

### High severity (must reach 0 in `build`, `refine`, and `redesign`)

- **Keyboard traps or unreachable controls:** interactive elements built from
  `<div>` or `<span>` with click handlers instead of `<button>` or `<a>`.
- **Fake semantic widgets:** plain `<button>` elements acting as checkboxes,
  switches, or tabs without native `<input type="checkbox">` or proper ARIA
  roles and states (`role="switch"`, `aria-checked`, `role="tablist"`).
- **Missing focus indicator:** `outline-none` / `outline: none` without a
  visible `:focus-visible` ring replacement.
- **Sticky focus occlusion:** tabbing with a keyboard scrolls a focused control
  underneath a `position: sticky` or `position: fixed` header/footer. Fix with
  `scroll-margin-top` / `scroll-padding-top` (or bottom equivalents).
- **Missing accessible names:** icon-only buttons without `aria-label`, form
  inputs without `<label>` or `aria-label`, meaningful images without `alt`
  (decorative icons need `aria-hidden="true"`).
- **Contrast failure:** body or placeholder text below `4.5:1`, or large text
  and UI control boundaries below `3:1`.
- **Silent destructive actions:** irreversible delete or reset actions with no
  confirmation dialog or undo path.
- **Broken mobile viewport:** horizontal page scrolling or unreachable primary
  controls at `390px` width.

### Medium severity (fix in `build`, `refine`, and `redesign`)

- Touch targets smaller than `44×44px` on coarse-pointer or mobile viewports.
- Async errors, toasts, or status updates missing `aria-live="polite"`.
- Skipped heading levels (`<h1>` straight to `<h4>`) or missing skip link to
  main content on multi-section pages.
- Motion ignoring `prefers-reduced-motion: reduce`, or using `transition: all`
  / layout-property animations.
- Forms blocking paste, missing inline field errors, or failing to focus the
  first error on submit.
- Missing `overscroll-behavior: contain` inside modals/drawers, or missing
  explicit image dimensions causing layout shift.

### Low severity (polish when touching the file)

- Straight ASCII `...` instead of `…`, missing `&nbsp;` in units/shortcuts, or
  missing `text-wrap: balance` / `tabular-nums`.
- Unstyled `::selection`, `caret-color`, or `text-underline-offset`.
