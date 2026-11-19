<!-- GENERATED FILE — do not edit by hand.
     Source of truth: rules/*.mdc · Regenerate: npm run sync (or ./sync.sh) -->

# Project Rules

Standing rules for Claude Code, generated from this repository's `rules/*.mdc`. Edit the source rules, then run `npm run sync` to regenerate this file.

<!-- from rules/base.mdc -->
## Base Rules

Applies to every task in this repo. Project-scoped rules extend or override these.

### The Meta-Principle
**The human is monitoring you in the IDE. They can see everything. Your job is to minimize the mistakes they need to catch while maximizing the useful work you produce.**

**On conflict (within these rules):** safety & secrets > correctness > simplicity > brevity. Never compress away a security, data-loss, or accessibility safeguard to satisfy Caveman or Simplicity.

### AI Behavior & Communication (Dual-Mode)

**Caveman Mode (defined):** Terse, compressed prose for the human. Fragments over sentences. Drop filler and articles (a/an/the). Use symbols (→, =, vs) and logical emojis (🐛, 🚀, 🛑, 📝) so the human scans fast. Compress *style* only — never correctness — and leave code, paths, URLs, and commands verbatim. Never flatten epistemic modality or hedges (`may`, `likely`, `unverified`) into false certainty. (Mirrors the **Caveman** skill at its `full` level: "why use many token when few token do trick.")

**Reason fully, speak Caveman.** Caveman constrains the *surfaced message*, not your thinking. Plan and reason at full fidelity internally; compress only the text the human reads. Brevity is an output constraint, never a reasoning shortcut.

Two registers — pick by surface:

**1. Chat + summaries → Caveman.** Goal: instant human "aha" at minimum tokens.

**2. Artifacts → Standard Professional Mode (80% ASD-STE100).** Code, comments, JSDoc, architecture plans, `CHANGELOG.md`, commit messages, and docs use softened Simplified Technical English: active voice, simple tenses, ≤20 words per procedural step (one action per step), ≤25 words per descriptive sentence, zero synonym rotation (one canonical term per entity everywhere), and zero AI filler (`ensure`→`make sure`, `prior to`→`before`, `utilize`→`use`, no `delve`/`leverage`/`seamless`). Keep articles (`a`/`an`/`the`) and epistemic hedges intact; never Caveman.

**Comprehension Ladder (when explaining complex systems):**
- **Controlled prose** → short facts, diffs, and trade-offs.
- **Mermaid + invariants table** (`sequenceDiagram`, `stateDiagram-v2`, `flowchart` + `[Component | Role | Invariant]`) → protocols, topologies, and lifecycles instead of prose walls.
- **Discardable single-file HTML stepper** (host preview or scratch file, never unasked repo files) → offer when dynamic state or race conditions resist static diagrams.

**Post-Change Summary (Caveman).** On any turn that modifies files, end with this compact block (skip on read-only / answer-only turns):
- `✅ CHANGES:` [file] — [short reason, e.g. "Auth logic → fixed login bug"]
- `⏭️ BYPASSED:` [file/concept] — [reason] *(include only when something was intentionally deferred)*
- `⚠️ CONCERNS:` [file] — [edge cases / risks] *(include only when real risks remain; omit "none")*
- For any in-code concern, also inject the matching tag at the line: `// BUG:`, `// FIXME:`, `// TODO:`, `// CONCERN:`, `// OPTIMIZE:`.

### Think Before Coding
**No assumptions. No hidden confusion. Surface tradeoffs.**
- **State assumptions:** Do this before coding. Genuinely blocked? Stop → name the confusion → ask.
- **Ask only when it pays:** Unless an active skill or playbook defines an explicit interactive checkpoint, ask only when blocked or when a choice is costly / hard to reverse. Otherwise pick the sane default, act, and state the call in one line.
- **Native Question UI:** When asking the human a structured choice, inspect your live declared tools (calling `tool_search` for `"ask_user"` once if deferred tools are active) and invoke the host's native question tool (`AskUserQuestion`, `AskQuestion`, `question`, `request_user_input`, `vscode_askQuestions`, or `ask_user` / `balakit` MCP `ask_user`) instead of printing raw option YAML or prose menus. Never prepend internal `*_STATE` telemetry blocks in user-facing chat; keep workflow state in session todos or plan files. Keep total options ≤4 (`(Recommended)` first; `Say this in plain English` last on workflow checkpoints), emit report prose before the blocking tool call, and fall back to a numbered plain-text list only when no question tool is declared in the session.
- **Surface tradeoffs:** On real forks, present options → let human pick. No silent high-stakes choices.
- **Push back:** Not a yes-machine. Bad human approach? Explain downside → propose alternative. Accept override.
- **Attack the premise:** After two failed fixes that share one premise, census which actors hold the imbalance, then question the premise instead of writing a third fix that assumes it.

### Simplicity First (Lazy, Not Negligent)
**Best code = the code you never wrote. Write only what the task needs.**

Climb the ladder before writing code → stop at the first rung that works:
1. **Need it?** → No: skip it (YAGNI).
2. **Stdlib does it?** → Use it.
3. **Native platform feature?** → Use it.
4. **Installed dependency?** → Use it. No new dep for what a higher rung covers.
5. **One line?** → One line.
6. **Only then:** the minimum that works.

- **Naive → Optimize:** Build correct naive version first. Verify. Optimize later. Correctness > Performance.
- **Name the data shape first:** before writing logic, name the types or structures the work will move through. Downstream code should become obvious from that shape.
- **Only requested features:** Build exact request. No unasked "flexibility," no speculative abstraction.
- **Duplicate > Abstraction:** No abstractions for single-use code. Stateful or branchy logic belongs in a type, a table, or a state machine — not a growing if-chain.
- **Validate at trust boundaries:** user input, external API — and not internal glue. Make illegal states unrepresentable at those boundaries.
- **Build the lever:** non-trivial bulk work (migrations, sweeps, similar edits) is a rerunnable script or codemod, not a pile of hand edits.
- **Refine:** 200 lines → 50 lines.
- **NEVER cut [non-negotiable]:** trust-boundary validation, data-loss handling, security, accessibility. Code stays small because it is *necessary*, not golfed.

### Surgical Changes & Code Discipline
**Touch only what is needed. Clean your own mess.**
- **Fix cause, not symptom:** Change must trace directly to request. Do not add a guard that silences a crash; reproduce, then fix the cause.
- **Leave adjacent code alone:** No side-effect refactoring or formatting tweaks. Redesign from first principles only when the new requirement **invalidates** the current shape.
- **Match existing style:** Always.
- **Explain "Why":** Articulate, clear inline comments or JSDoc for *why*, not *what* (Standard Mode).
- **Dead code hygiene:** List unreachable code after refactor. Ask to delete. No silent corpses. Remove dead weight **before** adding the new path. When reshaping an internal API, migrate callers and delete the old path in the same change.

### Filesystem, Environment & Execution
- **Strict filesystem:** Ask before creating files. No `.md` unless instructed.
- **Shell portability:** Match the active OS and shell (`bash`/`zsh` on Linux/macOS; PowerShell 7+ or separate lines on Windows PowerShell 5.1 where `&&` fails). Prefer `node` scripts for cross-platform repo automation.
- **Protect secrets [CRITICAL]:** Never commit `.env`, credentials, API keys.
- **Env vars:** Update `.env.example` in same change. Comment purpose, format, source.

### Goal-Driven Execution & Validation
**Tests = safety net. Changesets = record.**
- **Test-first:** Complex logic? Write failing test → implement → pass. Show both.
- **Establish criteria:** - Validation: failing test → pass.
  - Bug: failing reproduction → pass.
  - Refactor: pass before → pass after.
- **Prove it on the real artifact:** run the feature, read the actual value, inspect the diff. Compiling, a delegate summary, or "it looks right" is not proof.
- **Sequence verifiable units:** multi-step work checks each unit before the next. Do not batch verification at the end.
- **Minimize reader load:** a competent reader should answer "where does X come from?" in thirty seconds. Collapse one-caller wrappers and shrink mutable scope.
- **Skipped tests:** Explain in chat, not code comments.

### Change Log & Release Lockstep
**Maintain human-readable history (Standard Mode — No Caveman).**
- **Grouping:** `[Unreleased]` on top; group entries under `Features` / `Fixes` / `Changes` newest-first (`rules/changelog.mdc` owns full format when editing `CHANGELOG.md`). Update `CHANGELOG.md` in the same commit/PR for user-visible changes.
- **One version lockstep:** Git tag (`vX.Y.Z`), `package.json` `"version"` (`X.Y.Z`), `CHANGELOG.md` heading (`## [vX.Y.Z]`), and package publish must share one exact semver. Bump `package.json` first, run the repo's sync/generate step, never hand-edit generated manifests, and never tag an uncommitted version.
- **Tag-workflow ownership:** When CI publishes on `v*` tags, push the committed tag only — do not also run `gh release create` or `npm publish` locally (use the `release-deploy` skill).

<!-- from rules/comments.mdc -->
## Comments & Documentation

### Default to zero comments

Names document code. Add an inline comment only when the WHY is non-obvious:

- A hidden constraint not visible in the code.
- A subtle invariant a reader might violate.
- A workaround for a specific bug (link the upstream issue).
- Behavior a competent reader would find surprising.

If removing the comment wouldn't confuse a future reader, delete it.

### Never write

- Restatements of the code — `increment counter` above `counter++`.
- Task / ticket references — `added for CAN-123`, `fixes billing bug`.
- Caller references — `used by the contacts module`.
- Change history — `was async before`, `removed old logic`.
- Commented-out code.
- Banner comments — `=== SECTION ===`.

### Authorized Tracking Tags (Exception)

You MUST use the following authorized tags to track technical debt and risks (as required by the Global Rules), using your language's comment syntax. These should cleanly describe the issue for IDE tracking:
- `BUG:` — For critical, immediate issues.
- `FIXME:` — For broken code or technical debt needing refactor.
- `TODO:` — For general planned work.
- `CONCERN:` — For edge cases or architectural risks.
- `OPTIMIZE:` — For performance improvements or clean-up tasks.

### Document every exported symbol

Every part of a module's public surface — exported functions, types, classes, constants — gets a documentation comment in your language's convention (doc comment, docstring, etc.). Internal/private helpers only get one when the WHY is non-obvious.

- The first line is a one-sentence summary ending with a period.
- Document a parameter only when its name isn't self-explanatory. Never restate information the signature already carries (e.g. the type, in a typed language).
- Document the return only when it isn't obvious from the function name.
- Document every error/exception the function can raise as part of its contract.
- Add an example for non-trivial public APIs and shared utilities.
- Keep noun clusters ≤3 words and use one canonical term per entity across the module (zero synonym rotation).
- Format sharp-edge safety callouts as `CAUTION:` or `WARNING:` followed by a direct command, then the specific data-loss or security risk.
- Don't duplicate what the language already expresses — let the type system, signatures, and tooling do their job.

### Externally-surfaced docs

When documentation strings are generated into a public API surface (OpenAPI/Swagger, SDK docs, generated reference sites, schema descriptions), **those strings ship to external consumers** — write them for API users, not just your team.

- Describe every public field/parameter with a short user-facing sentence.
- Map each endpoint/handler summary to the generated summary and description.
- Declare at least one example response for each public route.

<!-- from rules/testing.mdc -->
## Testing

### Philosophy

Every test must earn its place by preventing a bug that would affect users. Do not write tests to hit a coverage number. If you cannot explain what bug a test would catch, do not write it.

Favor integration tests over unit tests. Test real code paths — input validated, work performed, result returned. Reserve unit tests for complex business logic: pricing calculations, date handling, permission resolution. Do not write unit tests for glue code or tests that mock everything away. If a test would still pass when every imported function returns `undefined`, rewrite the assertion or delete the test.

### Folder Convention

Mirror the source structure under a single top-level tests location (or your framework's convention), separating tiers clearly:

- Unit tests — complex business logic only.
- Integration tests — the default tier for most behavior.
- End-to-end tests — full-stack flows.

Follow whatever layout the project already uses; do not impose a new one mid-project.

### Tooling

- Use the test runner the project already adopts. Do not introduce an additional test framework without team agreement.
- Match the existing assertion style, fixtures, and mocking approach.
- Keep end-to-end tests pointed at a deployed/staging-like environment rather than hard-coded local URLs when the project's flow expects that.

### When to Write Tests

A behavior change in a PR requires a test that exercises that behavior. "Behavior change" means: what the user sees or what the API returns is different. Refactors that preserve behavior do not require new tests — existing tests should still pass.

**Bug fixes:** Write the failing test first. The test is the proof the bug existed and that the fix works. If the cheap local test path is unclear, expensive, integration-heavy, or not requested, say so in chat with the closest executable check you will run instead. Prefer no test over a mock-only "regression" that would still pass if every imported function returned `undefined`.

Prove behavior on the **real artifact** (the function the user calls, the CLI, the running app) — not a proxy, a self-report, or "it compiles."

### End-to-End Tests

E2E tests are often slow and run against a deployed environment rather than locally. Do not write E2E tests that assume a local server or a specific hard-coded URL unless the project is set up for that.

Do not write E2E tests speculatively. Only write them after the user confirms the feature is done. When a feature implementation appears complete, proactively ask the user (Caveman format):
- *"Feature done? Write E2E?"*

### Secrets [CRITICAL]

Never commit API keys, tokens, passwords, or database URLs in any file — including config, `.env`, source code, or test fixtures.
- Use local-only secret files (e.g. `.env.local`, `.dev.vars`) that are gitignored.
- Use the platform's secret manager for deployed environments.
- Prefer an automated secret scanner (e.g. `gitleaks`) in pre-commit hooks and CI to enforce this.

### Skipping Tests

If you skip tests, say so in chat with the reason — never in a code comment.
**Acceptable reasons:**
1. The path is provably unreachable.
2. An existing test already covers the exact behavior.
3. The human explicitly overrode the test requirement.

## Conditional rules

Apply these only when working on matching files:

- **changelog** (globs: `"**/CHANGELOG.md"`) — Maintain CHANGELOG.md for significant changes; grouped by type (Features, Fixes, Changes); source for GitHub release notes → see `rules/changelog.mdc`
- **seo-ai-search** (globs: `"**/pages/**/*.{astro,ts,tsx,jsx,vue,svelte,mdx},**/app/**/*.{tsx,jsx,mdx},**/routes/**/*.{ts,tsx,jsx,vue,svelte},**/*{seo,meta,schema,jsonld,sitemap,robots,llms}*.{ts,tsx,js,mjs,astro,md,txt},**/public/{robots.txt,llms*.txt,ai.txt,sitemap*.xml}"`) — Universal guidelines for SEO and AI-search implementation — meta tags, JSON-LD, llms.txt, crawlability, and adversarial security. → see `rules/seo-ai-search.mdc`
