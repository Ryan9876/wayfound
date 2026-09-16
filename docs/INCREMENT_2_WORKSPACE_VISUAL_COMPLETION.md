# Increment 2 — Workspace Visual Completion

**Status:** In progress

## Outcome

Complete the approved Wayfound visual direction across the active single-owner workspace without changing durable product behavior, authority, persistence, evidence semantics, or AI boundaries.

This slice extends the already implemented Interview and workspace-shell direction to the remaining active destinations so the product reads as one coherent interface rather than a redesigned Interview embedded in older pages.

## Included destinations

- Overview
- Interview
- Journey
- Work
- Records
- Project Files
- Release & Care
- More on compact layouts
- Project selection / creation landing surface

## Visual contract

1. The persistent desktop project rail remains the primary workspace navigation and project-context surface.
2. Non-Overview destinations do not repeat the project-name heading above their page title; the project rail owns that context.
3. Destination titles use the same large, light editorial hierarchy established by Interview.
4. Primary content uses generous whitespace, soft neutral surfaces, large rounded containers, thin borders, restrained dark emphasis, and limited pine-green accent.
5. Journey presents the 15-stage path as a calm ordered sequence with the current stage given strong dark emphasis.
6. Work presents outcome-oriented work cards; `Done when` and evidence expectations remain explicit and readable.
7. Records groups decisions, requirements/evidence, and documents into visibly separated archive sections while preserving every durable status and control.
8. Project Files keeps the light drop surface / dark context-panel composition and the explicit browser-session-only storage boundary.
9. Release & Care uses a strong readiness surface and a separate ongoing-care surface without implying validation or release.
10. More presents compact secondary destinations as simple large cards instead of legacy dashboard tiles.
11. Existing forms, confirmations, disclosures, keyboard operation, visible focus, status text, and durable actions remain functionally unchanged.
12. Desktop and 390 px layouts must not introduce horizontal page overflow.

## Validation contract

The slice remains **In progress** until the exact implementation head passes:

- TypeScript;
- production build;
- accessibility and keyboard baseline;
- guided Interview and Project Files browser checks;
- full durable workspace regression suite;
- prototype-shell geometry checks;
- explicit browser checks for Journey, Work, Records, Project Files, Release & Care, and More;
- desktop screenshots for all active destinations;
- mobile screenshots for Interview, Journey, and Records;
- owner visual acceptance on the local Mac test environment.

A passing build alone is not sufficient to mark this slice Validated.

## Boundaries

- No database migration is introduced.
- No durable domain model changes are introduced.
- No authority, approval, evidence, verification, or release semantics are changed.
- No new AI provider or inference behavior is introduced.
- Project Files remains session-only until a separate durable file-import/storage architecture is approved and implemented.
- PR #1 remains Draft/open/unmerged until explicitly changed by the owner.
