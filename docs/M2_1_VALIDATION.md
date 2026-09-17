# M2.1 Durable Adaptive Interview Validation

**Status:** Validated

## Scope

M2.1 migrates the already-validated adaptive Interview behavior onto the validated local M2 authority and SQLite persistence path.

It does not change the Interview question policy, require an LLM, add cloud services, or complete the later durable Records/artifact migration.

## Required gates

Before WF-023, WF-024, or M2.1 can be marked Validated:

1. `web/src/shared/interview-model.js` is byte-for-byte identical to `app/interview-model.js`.
2. Server-side save rejects a question that is not currently applicable.
3. Server-side save rejects an option that does not belong to the question.
4. Accepted choices create immutable Answer Revisions through the local authoritative command path.
5. Refresh/database reopen reconstructs the current answer set from SQLite.
6. Back/review restores persisted selections and revising a choice creates a later Answer Revision.
7. `not-sure` remains unresolved current state and is not represented as an accepted decision.
8. Stale project versions return a conflict instead of overwriting newer Interview state.
9. Adaptive behavior is visible in Chromium for a representative idea whose question set changes from the general flow.
10. The existing M2 local/no-cloud build, SQLite, authority, AI-boundary, and optional PostgreSQL compatibility gates remain green.
11. 390 px browser validation shows no horizontal overflow.

## Deferred

- editing the starting idea and reconciling prior durable answers
- full durable projection of derived assumptions, blockers, and open questions
- durable Records page parity
- durable draft artifact generation/review parity
- formal Artifact approval
- desktop packaging
- hosted/team mode

## Validation evidence

- CI run #79: local-wayfound success.
- Model parity: exact source equality.
- 17 model/domain/AI tests passed.
- 4 local SQLite integration tests passed.
- TypeScript and production build passed.
- Chromium adaptive/reopen/revise/unresolved/stale-write flow passed.
- 390 px no-horizontal-overflow gate passed.
- Optional PostgreSQL compatibility remained green.
