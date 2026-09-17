# ADR-0002: Authoritative project data and persistence model

**Status:** Proposed

**Date:** 2026-09-17

**Decision owner:** Project owner

## Decision

Use a relational, revision-aware project model in which the Wayfound application/API is the only writer of authoritative project state.

Persist explicit user inputs, accepted decisions, material review dispositions, approved project artifacts, and their traceability relationships. Keep generated previews derived and non-authoritative until a user explicitly acts on them.

Use normalized current-state records plus immutable content revisions and an append-only transition ledger. Do **not** use full event sourcing as the primary persistence model.

A consequential state change must be transactional: the new revision or state, its traceability links, and its transition/audit metadata must either all commit or all fail together.

## Context

The validated prototype intentionally keeps its state in one browser session:

`idea → adaptive Interview → typed Records → Draft artifacts → Draft / Proposed / Set aside review`

The prototype also establishes several rules that the production model must preserve:

- Interview answers are the source of intent.
- Records are traceable projections, not a second independent source of truth.
- Generated Draft artifacts are suggestions, not approved project state.
- `Proposed` is not `Approved`.
- A proposal cannot silently survive a material change to the content or source records that produced it.
- Unknowns, assumptions, blockers, and decisions remain distinct.

ADR-0001 proposes a browser client, authoritative server-side application/API, and relational project store. This ADR defines what that store means and what Wayfound should persist.

Wayfound is intended for people with varied technical experience, including younger builders. The persistence model therefore must support deletion and retention controls and must not rely on an audit design that copies user content into permanent logs that cannot later be removed.

## Decision drivers

- Preserve one clear authority for project state.
- Keep AI-generated or rule-generated suggestions non-authoritative until explicit human action.
- Preserve traceability from starting idea and Interview answer through Records, requirements, work, evidence, and releases.
- Preserve history without requiring full event sourcing.
- Make edits and upstream changes safe: stale downstream proposals must be detectable.
- Support future collaboration without last-write-wins data loss.
- Keep the model understandable to maintainers and queryable with ordinary relational tooling.
- Keep vendor-specific database behavior out of the domain model where practical.
- Support future privacy deletion and retention rules, including projects that may belong to younger users.
- Allow later identity, authorization, AI, and tool adapters to attach to the same project model without becoming data authorities themselves.

## Authority model

Wayfound will distinguish four kinds of state.

### 1. Authoritative source input

Explicit user-controlled project input that Wayfound must preserve durably once production persistence is enabled.

Examples:

- project title and starting idea
- accepted Interview answers
- explicit edits to an accepted decision
- explicit user review actions
- approved requirement/work content

These changes must pass through the application/API.

### 2. Durable trace projection

Structured Records created transactionally from authoritative source input so later work can reference a stable historical interpretation.

Examples:

- Decision records
- Assumption records
- Blocker records
- Open-question records

A durable Record remains linked to the exact source input revision that produced it. It does not become an independent source of intent.

### 3. Derived preview

Generated content that can be recomputed from current authoritative state and has not yet received an explicit user disposition.

Examples:

- build brief preview
- Journey preview
- draft requirement candidate
- draft follow-up work candidate

Derived previews are **not persisted by default**. Merely rendering a suggestion must not create authoritative project data.

### 4. Materialized project artifact

A derived preview becomes durable only when the user performs an explicit disposition that needs to survive the session, such as:

- Propose
- Set aside
- later: Approve, Reject, Supersede, or other approved lifecycle transitions

At that point Wayfound snapshots the exact content and exact source revisions into an immutable artifact revision. The artifact's current lifecycle state is stored separately from its immutable content revision.

## Proposed logical model

The exact SQL and database product remain separate implementation decisions. The production model should support the following logical objects.

### Project

Stable container for a Wayfound project.

Minimum responsibilities:

- application-owned immutable primary identifier
- user-facing name/title
- current project lifecycle state
- creation/update timestamps
- optimistic-concurrency version
- owner/authority reference once identity is defined

User-facing semantic keys such as `DEC-OUTCOME` or future `REQ-042` are **not** database primary keys. They are stable display/domain keys layered over application-owned identifiers.

### Interview run

Represents a definition/review pass against a project.

Minimum responsibilities:

- project reference
- run identifier
- start/completion timestamps
- routing/model version used for the pass
- status such as active/completed/superseded

Wayfound may have multiple Interview runs over the lifetime of a project.

### Answer + answer revision

An Answer is the stable logical response slot for a material question. Each edit creates a new immutable Answer Revision rather than overwriting history.

A revision records, as applicable:

- question/domain key
- selected option or user-entered content
- the question/routing definition version
- actor reference when identity is available
- time accepted
- predecessor revision

Only one Answer Revision is current for a logical Answer at a time.

### Record + record revision

Represents the typed trace record Wayfound currently projects in the browser.

Record types include:

- decision
- assumption
- blocker
- open question

A Record has a stable logical identifier. Its immutable revision stores the content snapshot and points to the exact Answer Revision or other authoritative source revision that produced it.

Creating or changing an accepted Answer and its corresponding current Record Revision should occur in one server transaction.

### Artifact + artifact revision

Represents durable build/project artifacts once a candidate receives an explicit user disposition or is otherwise deliberately saved.

Artifact kinds can include:

- requirement
- work item
- Journey item
- build brief
- later: design/architecture item, evidence item, release item

An Artifact has a stable application identifier and optional user-facing semantic key. Artifact Revision content is immutable.

The Artifact points to its current revision and current lifecycle state, for example:

- draft
- proposed
- set aside
- later: approved, rejected, superseded, released

Changing artifact content creates a new revision. It never rewrites the previous revision.

### Trace link

Represents an explicit relationship between exact revisions.

Examples:

- Answer Revision → Decision Record Revision (`produced`)
- Record Revision → Artifact Revision (`supports` / `derived-from`)
- Requirement Revision → Work Item Revision (`implemented-by`)
- Requirement Revision → Evidence Revision (`verified-by`)
- Artifact Revision → Release Revision (`included-in`)

Trace links should reference immutable revisions, not only logical object IDs, so Wayfound can answer what exact source content supported a historical state.

### State transition

Append-only transition metadata for consequential authoritative changes.

Minimum fields should include:

- project reference
- object type and object identifier
- exact revision identifier when relevant
- prior lifecycle state
- resulting lifecycle state
- actor reference when identity is available
- server timestamp
- operation/reason code
- request/correlation identifier

The transition ledger should store **metadata and revision references**, not duplicate unrestricted user text. This keeps auditability compatible with later privacy/retention/deletion requirements.

## Conceptual relationship

```text
Project
  │
  ├─ Interview Run
  │    └─ Answer
  │         └─ Answer Revision
  │                │
  │                └──── produced ────► Record Revision
  │                                      │
  │                                      └── derived-from/supports
  │                                                   │
  └─ Artifact ◄───────────────────────────────────────┘
       ├─ current lifecycle state
       └─ Artifact Revision
              │
              └─ Trace Links ──► exact source revisions

Every consequential lifecycle change
              │
              └─► State Transition metadata
```

## Draft-to-Proposed behavior

The production version should preserve the validated prototype behavior with a durable boundary.

### Rendering a candidate

Rendering a generated Draft candidate does not persist an Artifact.

### Propose

When a user chooses `Propose`, the server must in one transaction:

1. verify the source revisions and project version are still current
2. snapshot the candidate content into an Artifact Revision
3. record exact Trace Links to the source Record Revisions
4. calculate/store the candidate source fingerprint or equivalent revision set
5. set the Artifact lifecycle state to `proposed`
6. record a State Transition

The underlying source Records remain unchanged.

### Set aside

`Set aside` is also an explicit user disposition and MAY materialize the candidate so the decision can survive the session. If persisted, it uses the same content/source snapshot rules as Propose and records a transition to `set-aside`.

### Undo / return to Draft

Returning a materialized Proposed or Set-aside artifact to Draft changes lifecycle state but does not delete its historical revisions or transition history.

### Source changes after proposal

If any source revision that supported a Proposed artifact changes, the previous proposed Artifact Revision remains historical evidence of what was proposed at that time, but it cannot silently remain the current proposal for the changed project state.

The application must either:

- produce a new Draft revision and make it current, or
- mark the previous proposal stale/superseded and require re-proposal.

The exact user-facing stale-state terminology is a later product requirement, but silent carry-forward is prohibited.

## Approval boundary

Formal approval is not defined by this ADR, but the data model must make it possible safely.

A later `Approve` transition must target an **exact immutable Artifact Revision**. It must not mean “approve whatever content currently happens to use this artifact ID.”

The approval transaction must be able to verify:

- authenticated actor and project authority
- current Artifact Revision
- current source-revision/fingerprint validity
- allowed prior lifecycle state
- concurrency version

If any of those checks fail, the server rejects the transition instead of guessing.

## Concurrency model

Use optimistic concurrency at the Project aggregate and/or consequential object boundary.

The API should expose a version, revision, or equivalent concurrency token. A write based on stale state must fail with a conflict response and require the client to reload/reconcile.

Do not use silent last-write-wins behavior for consequential decisions, requirements, approvals, or review dispositions.

## Transaction boundaries

The following should be atomic when they occur together:

- accepted Answer Revision + resulting Record Revision(s) + Trace Link(s) + transition metadata
- proposed/set-aside Artifact Revision + source Trace Links + lifecycle state + transition metadata
- future approval transition + actor authorization result + exact revision binding + transition metadata

An audit entry must not claim a state transition that failed to commit, and committed authoritative state must not exist without the transition metadata required by the applicable rule.

## History model: revisions + transition ledger, not full event sourcing

Wayfound should store normalized current state for ordinary reads and immutable revisions for content history. An append-only transition ledger records consequential lifecycle changes.

Do not make the transition/event log the only way to reconstruct current project state in the initial production architecture.

### Why not full event sourcing now

Full event sourcing could provide strong historical reconstruction, but it would also add:

- event schema/versioning complexity
- replay/projection infrastructure
- more difficult data deletion and privacy handling
- higher maintenance burden for a small initial production application
- a second set of failure/recovery semantics before Wayfound has evidence it needs them

Revision tables plus a transition ledger provide the required traceability with a simpler operational model.

## Deletion, retention, and privacy boundary

This ADR defines the model capability, not the final retention policy.

The production schema must support project-level deletion and eventual purge. The transition ledger must not become a loophole that permanently retains deleted free-form user content.

Rules:

- transition entries should prefer identifiers, state metadata, and revision references over copied content
- user-authored free text should live in content revisions governed by the project's retention/deletion policy
- deleting or purging a project must have a defined effect on revisions, trace links, transition metadata, backups, and external provider copies
- real hosted user content must not be stored until those retention/deletion rules and applicable age/consent rules are approved

The identity/consent ADR must resolve how a project is associated with a user, guardian/parent controls if required, and deletion authority.

## Data integrity rules

The authoritative store must enforce or allow the application to enforce these invariants:

1. One project has one current authoritative version at a time.
2. A logical Answer, Record, or Artifact has at most one current revision.
3. Immutable revision content is never edited in place.
4. A Trace Link points to revisions that exist in the same project unless an approved cross-project relationship explicitly allows otherwise.
5. A Proposed or future Approved artifact identifies an exact Artifact Revision.
6. A future Approved transition cannot be created by an AI/tool adapter.
7. A derived preview cannot become authoritative solely because it was rendered.
8. A changed upstream source cannot silently preserve a stale proposal/approval against new content.
9. Consequential writes use concurrency checks.
10. State-transition metadata and authoritative state changes remain transactionally consistent.

## Options considered

### Option A — Persist the entire current browser state as one JSON document

**Summary:** Serialize the current Interview/project object and store it as one document per project.

**Advantages:**

- Closest to the current prototype.
- Fast initial implementation.
- Flexible structure while the product evolves.

**Disadvantages:**

- Trace relationships and partial updates become difficult to query and validate.
- Concurrency conflicts become coarse-grained.
- Historical content revisions require another convention inside the document.
- Referential integrity between decisions, requirements, work, evidence, and releases is weak.

**Risks:**

- The prototype shape can accidentally become a long-lived data contract.
- Large documents can become a hidden monolith that is difficult to migrate safely.

### Option B — Full event-sourced project model

**Summary:** Persist every domain change as an immutable event and rebuild current project state from the event stream.

**Advantages:**

- Strong historical reconstruction.
- Natural change log.
- Can support temporal debugging and projections.

**Disadvantages:**

- Higher conceptual and operational complexity.
- Event versioning/replay becomes foundational infrastructure.
- Privacy deletion and content correction become more complicated.
- Current-state query models require additional projections.

**Risks:**

- Wayfound could spend significant engineering effort maintaining event infrastructure before its product needs justify it.

### Option C — Relational current state + immutable revisions + transition ledger

**Summary:** Store normalized current logical objects, immutable content revisions, revision-to-revision trace links, and append-only transition metadata.

**Advantages:**

- Directly models Wayfound's traceability relationships.
- Ordinary current-state queries remain simple.
- Historical content remains available without destructive overwrites.
- Proposal/approval can bind to exact content revisions.
- Transactional relational constraints can protect important invariants.
- Easier privacy deletion than a content-heavy permanent event stream.
- Easier for maintainers to inspect with standard database tooling.

**Disadvantages:**

- More tables and domain concepts than a JSON-document prototype.
- Application code must deliberately manage revisions and transitions.
- Some historical reconstruction logic remains necessary.

**Risks:**

- Poor revision discipline could still create duplicate/stale objects.
- Over-normalizing speculative future objects could make the schema harder to evolve.

## Rationale

Option C provides the strongest fit for Wayfound's already-validated behavior without importing infrastructure complexity the project has not earned yet.

Wayfound's core value depends on relationships: why a requirement exists, which decision created it, what work implements it, what evidence verifies it, and which release contains it. A relational model with immutable revisions makes those relationships queryable and protects exact historical context.

The model also preserves the critical human-control boundary. Generated content can remain ephemeral until a human explicitly acts. When the user does act, Wayfound freezes the exact candidate and exact source revisions involved. Later approval can therefore target a specific revision rather than a moving suggestion.

The transition ledger supplies auditability without forcing the whole application into an event-sourced architecture. Keeping user content in governed revision rows instead of duplicating it into permanent audit events also creates a cleaner path for future deletion and retention requirements.

## Consequences

### Positive

- Durable project state has one server-enforced authority.
- Historical edits do not destroy earlier intent or proposals.
- Stale downstream proposals can be detected reliably.
- Traceability can reference exact historical revisions.
- AI-generated previews remain cheap and ephemeral until a person chooses to preserve them.
- Formal approval can later target immutable content and authenticated actors.
- Collaboration can use optimistic concurrency rather than silent overwrites.
- Database vendors remain replaceable within a conventional relational contract.

### Negative

- The application must implement explicit revision and transition rules.
- Production data migrations become a real engineering responsibility.
- The schema is more involved than persisting one JSON object.
- Project deletion must coordinate multiple related tables and backups.

### Neutral or accepted constraints

- The first production schema should model only entities needed by the first production-capable vertical slice; evidence/release entities can be added when their requirements are active.
- Semantic identifiers such as `DEC-OUTCOME` remain useful UI/domain keys but are not physical primary keys.
- Exact database vendor, ORM/query library, migration tool, and identifier encoding remain separate implementation choices.
- Identity/provider selection remains a separate ADR.

## Reversibility

Moving from relational revisions to another relational implementation is moderate if the domain contracts and application-owned identifiers remain stable.

Moving to full event sourcing later is possible but expensive; the transition ledger and revision history can provide migration input if evidence later justifies that architecture.

Moving from one-JSON-per-project to this model after production adoption would be materially harder because historical and traceability semantics would need to be reconstructed. For that reason, the normalized revision model should be established before durable hosted project data is introduced.

## Validation

Before this ADR can move from Proposed to Accepted, validate the model against representative lifecycle scenarios on paper or in an executable schema prototype:

1. create a project and save an Interview answer
2. change the answer and preserve the previous revision
3. produce a Decision Record linked to the exact accepted Answer Revision
4. generate a Draft requirement without persisting it
5. Propose that requirement and persist its exact content/source snapshot
6. change the upstream Answer/Record and verify the prior proposal cannot silently apply to the new source state
7. Undo or Set aside a proposal without deleting its history
8. simulate two clients editing the same consequential object and verify the stale write is rejected
9. demonstrate project deletion/purge can remove user content without leaving copied free text in transition metadata
10. demonstrate that an AI/tool adapter can suggest content but cannot directly create an Approved transition

## Reconsideration triggers

Revisit this decision if:

- Wayfound becomes intentionally local-only with no hosted durable projects
- product evidence shows that project state is primarily document/blob oriented and trace relationships are rare
- full temporal replay becomes a demonstrated product/operational requirement rather than a theoretical benefit
- privacy rules make the proposed history model inappropriate
- collaboration requirements demand a different concurrency model
- a different persistence model demonstrates simpler operation while preserving the same authority, revision, traceability, and deletion guarantees

## Related sources

- ADR-0001 — Production architecture baseline
- Requirement: WF-012 — Project Interview state into structured records
- Requirement: WF-014 — Derive draft build artifacts from Records
- Requirement: WF-016 — Review actionable draft artifacts without implying approval
- Architecture section: Data model and authority
- Delivery milestone: M1 — Production architecture baseline

## Status history

| Date | Status | Reason |
| --- | --- | --- |
| 2026-09-17 | Proposed | Initial durable-data proposal after validating session-only Interview, Records, Draft artifacts, and review state |
