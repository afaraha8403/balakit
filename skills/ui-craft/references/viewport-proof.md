# Rendered Viewport Proof (`390px` and `1440px`)

Load this reference in Phase 6. Source code and compilation do not prove that a
layout works on a real screen. Inspect the rendered DOM and screenshots at both
mobile and desktop sizes.

## 1. Choose the browser driver

Pick the lightest tool already available in this repo or environment:

1. Project's existing Playwright or browser test harness.
2. `agent-browser` CLI if installed on PATH.
3. Local Playwright via Node (`npx playwright`) or Python (`playwright`).
4. Host interactive preview tools (`preview_*`) only when the user explicitly
   asked for live browser preview.

If zero browser runtimes exist in the environment and the user did not ask to
install one, do not install a browser silently. Record
`skip: no headless browser runtime available` in the reply contract and report
the exact gap. Never claim screenshot proof without looking at real captures.

## 2. Reconnaissance-then-action lifecycle

1. **Server lifecycle:** check whether the dev server is already listening on
   the project's documented port. If not, start it in the background, wait for
   an HTTP 200 ready response, and record its exact PID. When finished, kill
   only the PID you started (`kill <PID>`).
2. **Two mandatory viewports:** visit every in-scope route at:
   - **Mobile:** `390×844` (touch / coarse pointer)
   - **Desktop:** `1440×900`
   If the app ships a dark mode toggle, verify dark mode on at least one
   primary route at both sizes.
3. **Wait for real readiness:** wait for network settle (`networkidle` or
   app-specific ready element) and `await document.fonts.ready` before probing
   or shooting.
4. **Run the DOM audit probe** (Section 3) on each route and viewport.
5. **Capture and inspect full-page screenshots** at both viewports. Look for
   visual issues a DOM script misses: muddy contrast, awkward line wraps,
   crowded hierarchy, broken charts, or cramped padding.
6. **Drive key controls:** click real interactive elements (toggles, checklists,
   modal open/close, form validation, mobile menu) and assert zero uncaught
   console errors or page errors.
7. **Batch fixes and re-verify:** fix every defect found in one batched pass,
   then re-run the probe and re-shoot every changed route to prove zero
   regressions.

## 3. Stack-agnostic DOM audit probe

Evaluate this self-contained function inside the live browser page (via
`page.evaluate(...)`, `agent-browser eval`, or CDP) on every route at both
`390×844` and `1440×900`. It works on any web framework.

```js
() => {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const isVisible = (el) => {
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || parseFloat(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const labelOf = (el) =>
    (el.getAttribute("aria-label") || el.getAttribute("title") || el.innerText || el.value || "")
      .trim()
      .slice(0, 60);

  // 1. Horizontal overflow
  const overflowPx = Math.max(0, document.documentElement.scrollWidth - vw);
  const overflowOffenders = [];
  if (overflowPx > 1) {
    for (const el of document.querySelectorAll("body *")) {
      if (!isVisible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.right > vw + 1) {
        overflowOffenders.push({
          tag: el.tagName.toLowerCase(),
          cls: String(el.className || "").slice(0, 60),
          right: Math.round(r.right),
          text: labelOf(el),
        });
      }
    }
  }

  // 2. Unintentional text clipping
  const clippedText = [];
  for (const el of document.querySelectorAll("h1,h2,h3,h4,p,a,button,span,label,td,th")) {
    if (!isVisible(el)) continue;
    const s = getComputedStyle(el);
    if (s.textOverflow === "ellipsis") continue;
    if (el.scrollWidth > el.clientWidth + 2 && s.overflowX !== "visible") {
      clippedText.push({ tag: el.tagName.toLowerCase(), text: labelOf(el) });
    }
  }

  // 3. Undersized touch targets on mobile (< 44x44)
  const smallTargets = [];
  if (vw <= 480) {
    const sel = "a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=checkbox],[role=switch]";
    for (const el of document.querySelectorAll(sel)) {
      if (!isVisible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 44 || r.height < 44) {
        smallTargets.push({
          tag: el.tagName.toLowerCase(),
          w: Math.round(r.width),
          h: Math.round(r.height),
          text: labelOf(el),
        });
      }
    }
  }

  // 4. Unlabeled buttons and form controls
  const unlabeled = [];
  for (const el of document.querySelectorAll("button,input:not([type=hidden]),select,textarea")) {
    if (!isVisible(el)) continue;
    const id = el.id;
    const hasLabel =
      Boolean(labelOf(el)) ||
      Boolean(el.getAttribute("aria-labelledby")) ||
      Boolean(el.closest("label")) ||
      (id && Boolean(document.querySelector(`label[for="${CSS.escape(id)}"]`)));
    if (!hasLabel) {
      unlabeled.push({ tag: el.tagName.toLowerCase(), cls: String(el.className || "").slice(0, 60) });
    }
  }

  // 5. Non-semantic click targets
  const divClickables = [];
  for (const el of document.querySelectorAll("div,span,li")) {
    if (!isVisible(el)) continue;
    const s = getComputedStyle(el);
    const hasRole = Boolean(el.getAttribute("role"));
    const hasTab = el.hasAttribute("tabindex");
    if (s.cursor === "pointer" && !el.closest("a,button,label") && (!hasRole || !hasTab)) {
      divClickables.push({ tag: el.tagName.toLowerCase(), text: labelOf(el) });
    }
  }

  // 6. Sticky or fixed bar coverage check
  const fixedBars = [...document.querySelectorAll("body *")]
    .filter((el) => {
      if (!isVisible(el)) return false;
      const pos = getComputedStyle(el).position;
      return pos === "fixed" || pos === "sticky";
    })
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName.toLowerCase(), top: Math.round(r.top), bottom: Math.round(r.bottom), h: Math.round(r.height) };
    })
    .filter((b) => b.h >= 24 && b.h < vh * 0.4);

  return {
    viewport: `${vw}x${vh}`,
    horizontalOverflowPx: overflowPx,
    overflowOffenders: overflowOffenders.slice(0, 10),
    clippedText: clippedText.slice(0, 10),
    smallTargets: smallTargets.slice(0, 15),
    unlabeled: unlabeled.slice(0, 10),
    divClickables: divClickables.slice(0, 10),
    fixedBars,
  };
}
```

When `fixedBars` is non-empty, tab through interactive elements with the
keyboard (or `page.keyboard.press("Tab")`). Confirm the focused element's
bounding box never sits behind a fixed or sticky bar. Fix occlusion with
`scroll-padding-top` / `scroll-margin-top` (or bottom equivalents).
