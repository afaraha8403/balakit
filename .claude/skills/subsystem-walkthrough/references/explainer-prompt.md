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
Walk the flow in 80% STE (≤25 words per descriptive sentence, simple tenses, zero synonym rotation, epistemic hedges preserved when behavior is inferred). Name exact files and functions.

Whenever message hops, lifecycles, or multi-component topologies exist, include:
1. A Mermaid diagram matching the structure (`sequenceDiagram` for request/message passing, `stateDiagram-v2` for state lifecycles, `flowchart TD`/`LR` with subgraphs for topology).
2. A 3-column invariants table `[Component | Responsibility | Invariant]` right below the diagram.

### Where Things Live
A short file map.

### Placement
One short paragraph: where new code for this subsystem should live.

### Gotchas
Skip if nothing is worth calling out.

Say `UserService` calls `AuthClient.refresh()`, not "the service delegates to the client."
