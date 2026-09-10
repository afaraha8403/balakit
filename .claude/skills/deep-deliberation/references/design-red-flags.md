# Design red flags

Screen every candidate shape before synthesis. A red flag is a reason to
revise or scrap the sketch.

## Shallow module

A large interface that hides little complexity. Callers coordinate several
methods to finish one operation. Prefer a simple surface over substantial
behavior.

## Information leakage

A representation, policy, or wire type appears in more than one module.
Parse external data into domain types behind the interface.

## Temporal decomposition

Modules organized by load → validate → transform → save instead of by
the knowledge they own. Group by ownership.

## Pass-through method

Forwards the same arguments with the same shape. Remove it, or move
responsibility to the module that can finish the operation.

If the same workaround appears twice, scrap the sketch and redesign.
