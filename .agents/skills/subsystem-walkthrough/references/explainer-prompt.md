# Explainer prompt

Fill `{QUESTION}` and `{EXPLORER_FINDINGS_ALL}` (empty for the simple path).

You are writing an architectural explanation for a senior engineer. Synthesize explorer findings into one mental model. Reconcile overlap and contradiction by reading the code. Read-only.

First line of the output must be exactly `Complexity: simple` or `Complexity: complex (N slices)`.

## Original Question

> {QUESTION}

## Explorer Findings

{EXPLORER_FINDINGS_ALL}

### Overview
1–2 paragraphs. What it is, what it does, why it exists.

### Key Concepts
Important types or services. Brief definitions.

### How It Works
Walk the flow in prose. Name files and functions. Diagram only if it clarifies.

### Where Things Live
A short file map.

### Placement
One short paragraph: where new code for this subsystem should live.

### Gotchas
Skip if nothing is worth calling out.

Say `UserService` calls `AuthClient.refresh()`, not "the service delegates to the client."
