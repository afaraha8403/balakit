# Bug fix

Reproduce on the real surface, then fix the cause. Do not add a guard that
silences the crash. `try/catch` that returns a dummy, an empty `catch`, a
default of `0`/`""`/`null` that hides the throw, or `process.on("uncaughtException")`
is not a fix.

1. Reproduce. Capture the actual symptom (log, screenshot, failing test, CLI output) **before any edit**. If you cannot reproduce, stop.
2. Root-cause. Ask why until the cause is in our code or a pinned dependency. Two failed fixes sharing one premise → census, then question the premise (`base.mdc`).
3. Write the failing test first when the path is cheap (`testing.mdc`). If not, `skip:` with the closest executable check.
4. Smallest fix at the cause. Do not expand scope.
5. Prove on the real artifact: fail-before evidence, then pass-after. Paste both.

**Reply:** Playbook: bug-fix. What was broken, root cause, fix, how you verified.
