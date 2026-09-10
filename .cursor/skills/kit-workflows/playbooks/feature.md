# Feature

New or changed behavior, built from a named data shape.

1. Name the data shape (types, records, events) before writing logic. Write that name in the reply before the diff.
2. Smallest change that produces the behavior. No unasked flexibility: no extra flags, env vars, config files, or helpers the user did not ask for.
3. Validate at trust boundaries only.
4. Prove the real user path (or the closest executable check). `skip:` if the surface cannot be driven and say why.

**Reply:** Playbook: feature. The data shape, what shipped, how you verified.
