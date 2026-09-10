# Refactor

Behavior-preserving reshape.

1. Pin the contract: existing tests, a recorded CLI output, or a snapshot of the real path. Pass before.
2. Subtract dead weight first (unused paths, one-caller wrappers). Ask before deleting.
3. Migrate callers and delete the old internal API in the same change. Do not keep a compatibility alias the user did not ask for.
4. Prove equivalence: the pin from step 1 still passes. Pass after.

**Reply:** Playbook: refactor. What changed in shape, what stayed in behavior, the proof.
