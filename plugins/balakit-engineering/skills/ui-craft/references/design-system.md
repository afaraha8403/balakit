# Design System and Art Direction

Load this reference in Phase 2 before writing `DESIGN.md` (in `build` or
`redesign`) or reconstructing the local system (in `refine` or `audit`).

## 1. Ground the brief in the subject matter

Derive visual choices from the product's actual world, audience, materials, and
primary job. Never invent an abstract style detached from the domain.

- Name the **product**, **audience**, **primary job**, and **emotional register**
  in 3–4 short lines.
- If the user's brief leaves the subject or direction genuinely open on a
  greenfield build, propose one concrete direction and confirm via the host's
  structured question tool.
- **Brief wins.** If the user explicitly asks for a specific aesthetic, color
  scheme, or typeface, build it faithfully even if it appears on the cliché
  calibration list below.

## 2. Assign a Surface Intent per route

Choose the intent from the visitor's goal on that route, never from the company
type.

| Surface Intent | Focal treatment | Typography | Color and density | Motion |
|---|---|---|---|---|
| **Persuade** | Open with the domain's sharpest artifact, headline, or live demo. | Expressive display voice allowed for hero and section anchors. | Generous negative space, 1 dominant accent, clear CTA contrast. | One authored focal reveal, zero scattered scroll bounce. |
| **Operate** | Task controls and key metrics above the fold. | Clean legible sans for all stats, forms, and small labels. Mandatory `tabular-nums`. | Calm neutral ground, restrained status hues, scannable grouping. | Fast ≤200ms state feedback only. |
| **Read** | Clear document hierarchy, visible orientation, clean margins. | 60–75ch line measure, comfortable line-height (1.55–1.75), strong heading contrast. | Low-glare canvas, high text contrast, quiet borders. | Minimal, no distracting entrances. |
| **Showcase** | Lead with the work itself from the first viewport. | Quiet metadata typography that supports the piece. | Canvas frames the work, chrome stays secondary. | Smooth transitions tied to user navigation. |

## 3. Lock the token contract (`DESIGN.md`)

In `build` or `redesign`, write `DESIGN.md` at the project root before editing
UI code. Update the existing design-system doc instead if the repo already
tracks one. Define three tiers so components never scatter raw hex values:

1. **Primitive tokens:** base neutrals, 1 primary accent, semantic status hues
   (success, warning, danger), type families, spacing scale (4px or 8px base),
   border radii, and fixed z-index layers (`base`, `sticky`, `overlay`,
   `modal`, `toast`).
2. **Semantic tokens:** `bg-canvas`, `bg-surface`, `bg-elevated`,
   `text-primary`, `text-secondary`, `text-muted`, `border-subtle`,
   `border-strong`, `accent-solid`, `accent-ink`, `focus-ring`.
3. **Component rules:** button hierarchy (1 primary style, 1 secondary, 1
   destructive), input height and focus behavior, card/container boundary rule,
   and chart series palette.

### Non-negotiable token checks

- **Contrast math:** body and placeholder text ≥ 4.5:1, large text (≥ 18px bold
  or ≥ 24px regular) and UI controls/icons ≥ 3:1. Verify both light and dark
  modes when dark mode is in scope.
- **Tinted neutrals:** on colored surfaces, tint secondary text and borders
  from that surface's hue instead of flat neutral gray.
- **Typography split:** use at most two typeface families (one display voice
  and one workhorse body/UI face, or one versatile family). Reserve monospace
  strictly for code, IDs, keyboard shortcuts, and measurements.
- **Depth discipline:** shadows need an offset and soft blur. Reject zero-offset
  colored halos and arbitrary drop-shadow stacking.

## 4. Cliché calibration and the Swap Test

For calibration, unguided AI interfaces cluster around five tells:

1. **Warm cream + terracotta serif:** `#F4F1EA` ground, high-contrast serif
   headline, clay accent regardless of subject.
2. **Dark ground + purple or acid neon:** dark background with glowing purple,
   pink, or cyan gradients as primary decoration.
3. **Uniform SaaS card grid:** identical rounded boxes (`icon + title + blurb`)
   with soft gray shadows and nested cards inside cards.
4. **Template chrome:** tracked ALL-CAPS eyebrow labels above every heading,
   fake `01 / 02 / 03` sequence numbers on non-sequential lists, one accented
   colored/italic word in every headline, `→` appended to every button, or
   hardcoded `rgba(0,0,0,.1)` shadows everywhere.
5. **Hero-metric boilerplate:** giant number, tiny uppercase label, three stat
   pills, and a decorative gradient wash.

**Run the Swap Test before writing UI code:** mentally replace the product name
and copy with an unrelated SaaS tool. If the layout, palette, and typography
still look equally interchangeable, the direction is a template. Replace at
least two structural axes (layout grammar, color temperature, focal artifact,
or typographic voice) until the design belongs to this brief. Record 3–5
project-specific **anti-patterns to ban** in `DESIGN.md`.

## 5. Reconstructing the local system (`--refine` and `--audit`)

When preserving an existing identity, do not rewrite `DESIGN.md` and do not
scan the whole repository for unrelated experiments.

1. Start from the target route and layout files.
2. Trace only active imports, resolved CSS custom properties, Tailwind config
   or theme tokens, and shared component primitives used on that surface.
3. Summarize the governing system in four bullets before auditing:
   - Audited routes and Surface Intents
   - Active design sources (`DESIGN.md`, theme config, token CSS)
   - Governing primitives and component owners
   - Explicit documented exceptions (or `None documented`)
