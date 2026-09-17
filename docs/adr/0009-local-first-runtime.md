# ADR-0009: Local-first runtime and provider-optional AI

**Status:** Accepted

**Date:** 2026-09-17

**Decision owner:** Project owner

**Supersedes:** ADR-0007 for default hosting, persistence, identity, and AI runtime choices. ADR-0007 remains historical evidence of the prior hosted-first interpretation.

## Decision

Wayfound is **local-first by default**.

A normal Wayfound installation must be able to run on one computer without requiring Vercel, Neon, Clerk, an external LLM provider, or any other cloud account.

Keep the existing architectural boundaries that remain useful:

- Next.js + TypeScript application shell
- Wayfound server/domain command boundary
- explicit authorization and lifecycle commands
- immutable revisions
- exact revision-to-revision trace links
- optimistic concurrency
- transactional authoritative changes
- AI/model output remains non-authoritative until a human-controlled Wayfound transition materializes it
- provider adapters remain replaceable

Change the default infrastructure around those boundaries:

- **Identity:** one stable local human Actor for the local installation; no sign-in required
- **Persistence:** local SQLite database by default
- **Application execution:** local Next.js server/browser UI by default
- **AI:** off by default; local Ollama and LM Studio are first-class options
- **External AI:** optional and explicitly opt-in before project content may be sent to a non-loopback endpoint
- **Hosted mode:** Vercel, PostgreSQL/Neon, Clerk, and other hosted adapters remain optional future deployment choices rather than prerequisites

## Why this changes ADR-0007

ADR-0007 correctly selected several durable engineering boundaries but incorrectly turned the selected hosted providers into the normal Wayfound runtime.

The intended product direction is that a person can use Wayfound privately on their own computer and choose whether AI runs locally or through an external provider. A hosted/multi-user edition may exist later, but it must not define the base product architecture.

The project owner explicitly corrected this direction before M2 was merged.

## Local authority path

```text
Local browser UI
      │
      ▼
Local Wayfound Next.js server
      │
      ├─ resolve stable local human Actor
      ├─ authorize project capability
      ├─ validate domain transition
      ├─ verify expected version/revision
      ├─ create immutable revisions / trace links
      ├─ append transition metadata
      └─ commit one local database transaction
              │
              ▼
         local SQLite
```

The browser still does not become the system of record merely because the application is local.

## Local persistence

Use SQLite for the default single-computer project store.

For M2, use `better-sqlite3` with an explicit versioned schema and WAL mode. The domain model remains storage-adapter independent.

Default database location:

```text
~/.wayfound/wayfound.sqlite
```

Allow an explicit local path override for development, testing, backup, or portable use.

The local schema preserves the important M1/M2 invariants:

- stable Actor identity
- private projects
- project membership/ownership
- immutable Answer revisions
- immutable Record revisions
- immutable Artifact revisions
- current logical revision pointers
- exact trace links
- state-transition metadata
- command idempotency receipts
- optimistic project versioning
- Artifact lifecycle limited to Draft / Proposed / Set aside in M2

A future hosted PostgreSQL adapter may implement the same contracts without becoming the only representation of the model.

## Local identity

Local mode creates or reuses one persisted human Actor identified by the local installation.

No external identity provider is required for single-user local operation.

Hosted/team mode may use Clerk or another provider to assert external identity, but Wayfound continues to own project authorization and Actor mapping.

## AI provider model

AI is an optional adapter, not part of authoritative state.

Supported M2 configuration families:

### Off

Default. Wayfound remains usable without any model.

### Ollama local

Use the local OpenAI-compatible endpoint by default:

```text
http://127.0.0.1:11434/v1
```

### LM Studio local

Use the local OpenAI-compatible endpoint by default:

```text
http://127.0.0.1:1234/v1
```

### External OpenAI-compatible provider

A user may configure an external endpoint and API key.

Wayfound must reject non-loopback AI endpoints unless the user deliberately enables external AI processing. Enabling an endpoint is not blanket permission for every future feature; features still need an approved project-context/input policy before sending content.

Provider-specific adapters such as Anthropic may be added later without changing the domain authority model.

## External-content rule

Default rule:

> Project content stays on the local computer unless the user deliberately enables a feature/provider that sends specified content elsewhere.

Configuration or UI must make external processing distinguishable from local processing.

Secrets remain local/server-side and are never written into project records, browser state, Git, or ordinary telemetry.

## Application execution

M2 runs as a local Next.js application using the Node.js runtime.

Desktop packaging is not selected by this ADR. A future native wrapper/installer may start and supervise the same local application boundary if that improves usability.

The product must not require a hosted deployment merely to prove that the local application works.

## Hosted mode

Hosted mode remains possible but optional.

Potential adapters include:

- PostgreSQL/Neon persistence
- Clerk or another identity provider
- Vercel or another application host
- team/multi-user membership
- remote access and synchronization

Hosted mode must satisfy the same domain rules and additional approved privacy, retention, deletion, consent, identity, and operational requirements before storing real hosted user content.

The Neon preview project created during the earlier M2 validation remains non-production validation infrastructure only. It is not part of the local M2 runtime.

## AI authority boundary

Whether the model is local or remote does not change its authority.

A model may return:

- suggested Interview questions
- routing/classification hints
- draft requirements
- draft work
- architecture suggestions
- review findings

The model may not directly:

- approve an Artifact
- silently alter authoritative project state
- grant membership/capabilities
- bypass stale-revision checks
- execute destructive external actions without a separately approved control model

## M2 acceptance consequence

M2 is redefined as the **local durable project vertical slice**.

M2 validation must prove, without cloud credentials:

1. Wayfound starts locally.
2. A stable local human Actor is reused across requests/restarts.
3. A private project is persisted locally and reopened after process/database reopen.
4. Accepted answers create immutable Answer and Record revisions.
5. exact revision trace links exist.
6. Draft/Proposed semantics remain explicit.
7. stale versions and stale source revisions are rejected.
8. the local database cannot store `approved` as an M2 Artifact lifecycle state.
9. AI is off by default.
10. Ollama and LM Studio configurations resolve to loopback endpoints.
11. external AI endpoints fail closed until outbound AI is deliberately enabled.
12. the Next.js production build passes without Clerk, Neon, or Vercel credentials.

Hosted integration is no longer a merge gate for M2.

## Consequences

### Positive

- Wayfound works privately with no cloud account.
- Local LLMs become first-class rather than second-class fallbacks.
- Users retain control of when project content leaves their computer.
- Hosted vendors can be changed or omitted without changing core project semantics.
- The system can still grow into collaborative hosted mode later.

### Negative

- Local database backup/restore, upgrades, and corruption recovery become product responsibilities.
- A local server/process must be started and supervised until desktop packaging is introduced.
- Multi-device sync and collaboration are not automatically available.
- Supporting both local and hosted adapters requires contract tests to prevent behavior drift.

## Reversibility

This decision preserves the ability to add hosted mode later because the core domain model, identifiers, commands, and traces remain application-owned.

A hosted edition should implement adapters around the same domain contracts rather than forking project semantics.

## Reconsideration triggers

Revisit details if:

- local SQLite cannot satisfy measured project workloads
- desktop packaging requires a materially different runtime
- users approve a synchronization model
- team collaboration becomes an approved near-term requirement
- privacy/residency requirements mandate a different local or hosted storage design
- model/provider protocols require additional adapters

Do not revisit local-first as a default merely because a hosted service is convenient for development.

## Related sources

- ADR-0001 — Production architecture baseline
- ADR-0002 — Authoritative project data and persistence model
- ADR-0003 — Identity and project authorization
- ADR-0004 — Privacy, retention, and age boundary
- ADR-0005 — Application API and AI/tool boundary
- ADR-0006 — Deployment, migrations, and rollback
- ADR-0007 — Prior hosted-first stack selection (superseded for defaults)
- ADR-0008 — PostgreSQL access implementation (retained for optional hosted compatibility)

## Status history

| Date | Status | Reason |
| --- | --- | --- |
| 2026-09-17 | Accepted | Project owner corrected Wayfound to local-first with optional local/public model providers and optional hosted adapters |
