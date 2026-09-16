# Increment 2 — Guided Product Definition UI

**Status:** In progress

## Outcome

Integrate the approved Wayfound UI direction into the existing Next.js application so the active product helps one owner turn an incomplete idea into an ordered product definition while preserving current governance, evidence, and storage boundaries.

This slice is an extension of the approved first-version interface requirements. It does not replace the charter, architecture, accepted ADRs, or existing durable records.

## Product boundaries

- The Interview is a real Wayfound destination, not a standalone demo.
- The Interview is advisory. Recommendations never select, approve, verify, or release a decision for the owner.
- The current implementation uses deterministic client-side recommendation rules. It introduces no new AI provider, model, or durable AI record.
- The Interview state is explicit and testable but not yet a new durable project-record type.
- Project Files is a frontend interaction contract only in this slice. Selected files remain in the browser session and are not uploaded, persisted, converted into evidence, or registered as project artifacts.
- Durable file import, storage, versioning, security, and artifact association remain governed by the later import/storage architecture and delivery work.
- ADR-0005 remains authoritative: Handoffs and multi-human collaboration are not required as active single-user core workflow destinations.

## Interface requirements

### Guided Interview

1. The owner can enter a natural-language idea or problem before qualifying questions begin.
2. Wayfound presents one required multiple-choice decision at a time.
3. The initial sequence covers direction, primary user, user job, current friction, desired outcome, first scope, solution form, material constraints, success evidence, and decision ownership.
4. Question definitions, choices, recommendation logic, answer state, progression, and brief synthesis remain separated so the flow can evolve without embedding all behavior in one component.
5. When current information supports a recommendation, Wayfound identifies one option as Recommended and explains why.
6. A recommendation is not auto-selected. The owner can choose another option.
7. Choice presentation can include explanation, benefit, and a material tradeoff. Wayfound must not invent a tradeoff when none is established.
8. Back navigation preserves prior answers.
9. Changing an earlier answer clears downstream answers that may no longer be valid and visibly explains that consequence.
10. Required decisions cannot be silently skipped.
11. The Product Brief updates as decisions are made and reads as connected reasoning rather than an answer list.
12. Interview completion shows `Brief ready for review` and remains Draft guidance. It must not imply Approved, Validated, or Released status.

### Navigation

Desktop fixture navigation provides direct access to Overview, Interview, Journey, Work, Handoffs, Records, Project Files, and Release & Care. In single-user mode, existing route guards continue to remove/de-emphasize historical multi-human Handoffs behavior.

The active durable single-user workspace provides direct desktop access to Overview, Interview, Journey, Work, Records, Project Files, and Release & Care.

Compact fixture navigation provides direct access to Overview, Interview, Journey, Work, and More. Less-frequent destinations remain reachable from More. The durable workspace may use its existing compact navigation pattern as long as Interview, Journey, Project Files, Records, and Release & Care remain reachable without horizontal page overflow.

### Project Files frontend contract

1. The owner can drag files into the drop zone or use the native file chooser.
2. The interface shows file name, available type, size, file count, and total size.
3. The owner can remove a selected file.
4. Empty, duplicate/rejection, add, remove, and narrow-layout states are explicit.
5. Long filenames must not create horizontal page overflow.
6. The interface clearly states that files are browser-session-only in this slice.
7. No database table, object-storage bucket, upload API, cloud provider, or evidence/artifact mutation is introduced by this UI slice.

### Visual and accessibility contract

- Preserve Wayfound typography and palette while translating the approved prototype's light, spacious, calm hierarchy, soft neutral surfaces, rounded containers, thin borders, restrained dark emphasis, and limited accent color.
- Maintain readable widths on ultrawide displays rather than stretching primary content indefinitely.
- Preserve semantic controls, visible focus, keyboard operation, text status, minimum practical touch targets, and responsive mobile behavior.
- Recommendation rationale and tradeoffs must be visible without hover.
- Motion is short and functional; `prefers-reduced-motion` removes the new question and selection motion.

## Validation contract

This slice can become **Validated** only after the exact implementation head passes:

- repository prototype/static checks;
- accessibility baseline;
- TypeScript check;
- production build;
- guided Interview/Project Files browser contract at desktop and 390px mobile widths;
- durable single-user workspace browser contract including the new destinations;
- existing durable workspace regression checks;
- screenshot inspection for desktop and mobile Interview and Project Files surfaces.

A build alone is not sufficient for Validated status.

## Out of scope

- durable Interview answer/brief persistence as a new record type;
- dynamically generated AI interview questions;
- cloud or Supabase file storage;
- file-to-evidence or file-to-artifact conversion;
- multi-human assignment, collaboration, or handoff authority;
- automatic approval or verification from Interview completion.
