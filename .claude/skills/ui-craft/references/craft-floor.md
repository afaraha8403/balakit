# Craft Floor

Load this reference immediately before editing any UI file in Phase 4. Apply
these invariants silently as part of building or refining without pasting the
checklist into chat.

## 1. Existing primitives first

- Reuse the repository's accessible primitives before building custom widgets
  (Radix, Base UI, React Aria, Headless UI, or native `<dialog>`).
- Never mix two primitive libraries inside the same interaction surface.
- Never hand-roll focus traps, roving tabindex, escape-to-close, or click-outside
  dismissal when a native element or installed primitive handles them.
- Read existing theme tokens and utility scales before defining custom values.

## 2. Layout and overflow resilience

- Use `min-h-dvh` or `h-dvh` instead of `h-screen` so mobile browser chrome
  does not clip bottom controls.
- Put `min-w-0` on flex children that contain truncatable text. Guard
  user-generated or variable text with `truncate`, `line-clamp-*`, or
  `break-words`.
- Use the fixed z-index layers from `DESIGN.md` (`base`, `sticky`, `overlay`,
  `modal`, `toast`). Never write arbitrary z-index values like `z-[9999]`.
- Respect `env(safe-area-inset-*)` on full-bleed or fixed mobile headers and
  bottom bars.
- Never nest bordered cards inside bordered cards. Separate inner groups with
  spacing, subtle surface contrast, or a single divider.
- Keep more vertical space above a heading than below it so headings bind to
  the content they introduce.

## 3. Typography and real copy

- Apply `text-wrap: balance` on display headings and `text-wrap: pretty` on
  body paragraphs.
- Apply `font-variant-numeric: tabular-nums` to all counters, streaks, prices,
  timers, chart axes, and table number columns so digits stay aligned.
- Keep body copy at `≥ 16px` with line lengths of 60–75 characters. Never drop
  readable UI metadata below `12px`.
- Use real typographic characters: ellipsis `…` (not `...`), typographic quotes
  where prose uses quotes, and non-breaking spaces in units and shortcuts
  (`10&nbsp;MB`, `⌘&nbsp;K`).
- Write product-specific copy. Buttons name the exact action ("Delete habit",
  not "Confirm"). Loading labels end with `…` ("Saving…").

## 4. Interaction, forms, and navigation

- Gate destructive or irreversible actions behind an accessible confirmation
  dialog (`AlertDialog` or native `<dialog>`) or a clear undo window. Never
  delete silently on a single click.
- Use real `<a>` or router `<Link>` elements for navigation so Cmd/Ctrl+click
  and middle-click work. Use `<button type="button">` for in-page actions and
  `<button type="submit">` inside forms.
- Reflect shareable view state (tabs, filters, pagination, selected panel) in
  URL query parameters when routing exists.
- Make form labels clickable (`htmlFor` or wrapping the control) so checkboxes,
  radios, and switches share one continuous hit target.
- Set exact `type` (`email`, `url`, `tel`, `number`), `inputmode`, and
  `autocomplete` attributes. Disable spellcheck (`spellCheck={false}`) on
  emails, usernames, slugs, and codes. Never block paste.
- Keep the submit button enabled until submission starts, show inline progress
  during the request, place validation errors next to the offending field, and
  move focus to the first invalid field on failed submit.

## 5. Motion budget

- Animate compositor-friendly properties only (`transform`, `opacity`) for
  interactive UI. Never use `transition: all` and never animate layout geometry
  (`width`, `height`, `top`, `left`, `margin`, `padding`).
- Keep micro-interaction feedback at `≤ 200ms` with a crisp ease-out curve.
  Make animations interruptible mid-flight.
- Prefer one purposeful focal reveal on a `Persuade` hero over identical
  fade-and-slide-up entrances on every section.
- Respect `prefers-reduced-motion: reduce` by removing movement or falling back
  to instant state changes. Pause decorative loops when off-screen.

## 6. Complete states and browser surfaces

- Implement real states for every dynamic component: **empty** (with one clear
  next action), **loading** (structural skeleton matching final geometry to
  prevent layout shift), **error** (exact cause plus recovery control),
  **disabled**, and **hover/active/focus-visible**.
- Give `<img>` elements explicit `width` and `height` (or `aspect-ratio`) to
  prevent cumulative layout shift.
- Theme the native browser surfaces from the palette so unstyled browser
  defaults do not leak through:
  - `::selection` background and foreground
  - `caret-color` in text inputs
  - `:focus-visible` ring offset and contrast
  - `text-underline-offset` on inline links
  - `overscroll-behavior: contain` inside modals, drawers, and sheets
  - `touch-action: manipulation` on interactive controls
