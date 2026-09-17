# ADR-0004: Privacy, retention, and age boundary

**Status:** Proposed

**Date:** 2026-09-17

**Decision owner:** Project owner

## Decision

Adopt privacy-by-default boundaries for hosted Wayfound projects before production persistence is enabled.

The initial production-capable slice should keep projects private by default, minimize collected personal data, keep user-authored project content out of telemetry and transition logs, and avoid sending project content to external AI/model providers until a separate approved feature path defines that processing.

Hosted persistence must support project deletion and eventual purge across primary storage, revision history, derived materializations, and backups according to a documented retention schedule. Numeric retention periods remain TBD until product/legal requirements are approved.

Wayfound must not assume that all users are adults. Before hosted accounts or external AI processing are made available to younger users, the product must have an approved age-eligibility/consent policy and any required parent/guardian controls. This ADR defines the technical boundary that makes those policies enforceable; it does not invent legal thresholds.

## Context

Wayfound is intended for people with varied technical experience, including younger builders. The product can contain free-form ideas, school projects, hobby projects, technical designs, or business information. That content can include personal or sensitive information even when Wayfound did not explicitly ask for it.

The validated prototype keeps all user content in browser memory and sends nothing to an external service. ADR-0001 proposes a hosted server/data boundary. ADR-0002 proposes durable content revisions and transition metadata. ADR-0003 proposes authenticated Actors and project-scoped authorization.

Moving from an in-memory prototype to hosted persistence changes the privacy risk substantially. Wayfound therefore needs explicit rules for data minimization, private-by-default access, telemetry, deletion, backups, external AI processing, and age-related eligibility before real hosted user content is stored.

## Decision drivers

- Preserve the current prototype's strong default that user content is not sent elsewhere without a defined reason.
- Support younger builders without silently assuming an adult-only product.
- Avoid copying free-form project content into logs, telemetry, or audit systems that are harder to delete.
- Make project deletion technically achievable across revision/history structures.
- Keep external AI/model providers from becoming hidden data processors.
- Keep privacy rules understandable to users with different technical backgrounds.
- Avoid collecting personal profile fields that Wayfound does not need.
- Keep future public sharing separate from private project storage.
- Allow future parent/guardian or organization policy to attach to a stable Actor/project model.
- Preserve traceability without using privacy-hostile permanent content logs.

## Data classes

Wayfound should distinguish at least these data classes because they have different retention and exposure needs.

### Project content

Examples:

- starting idea
- Interview answers
- decisions, assumptions, blockers, open questions
- requirement/work/artifact revisions
- evidence and release records added later

This can contain arbitrary user-authored text and must be treated as user content.

### Identity/account data

Examples:

- internal Actor identifier
- external identity mapping
- display name if collected
- membership/role state

Collect only fields necessary for identity, recovery, collaboration, and policy enforcement.

### Authorization/audit metadata

Examples:

- Actor ID
- project ID
- revision ID
- prior/resulting state
- timestamp
- operation/reason code
- request/correlation ID

Audit metadata should reference content revisions rather than duplicate their free-form text.

### Operational telemetry

Examples:

- route latency
- error type
- deployment/build identity
- feature/version identifiers

Project content must not be included in operational telemetry by default.

### Generated/model output

Generated content remains project content when saved/materialized. A transient model response is still potentially user-derived content and must follow the external-processing policy when an external provider is used.

## Private by default

Hosted projects are private by default.

Access requires a Wayfound authorization path such as project membership or a later explicitly approved sharing mechanism.

Public links, searchable/public projects, classroom sharing, community galleries, or publishing are separate product features and must not emerge merely because a project has a URL.

## Data minimization

Wayfound should not collect identity/profile fields merely because an identity provider exposes them.

At minimum:

- use stable internal Actor IDs for project relationships
- store provider identity mappings required for authentication/account linking
- collect display/profile fields only when the product actually uses them
- do not collect date of birth or infer age from project content unless an approved age/eligibility policy requires that information
- do not store model/provider metadata that is not needed for traceability, cost, safety, or operations

## External AI/model processing

The first hosted production-capable slice should remain functional without sending project content to an external AI/model provider.

Before an external AI feature can process project content, the feature must define:

- what project data is sent
- which provider/service receives it
- purpose of the processing
- whether data is retained by the provider and under what configured policy
- which users/projects are eligible to use the feature
- how the user can tell that external processing will occur
- whether the feature is optional and what local/non-AI behavior remains available
- deletion/retention implications
- logging/redaction behavior

External AI output cannot directly approve or silently mutate authoritative project state, consistent with ADR-0001 through ADR-0003.

## Telemetry and logging

Default observability must be content-minimizing.

Do not log by default:

- full starting ideas
- Interview free text
- requirement statements
- prompts sent to models
- model responses
- attachment contents
- secrets/credentials

Prefer identifiers and structured metadata such as:

- project ID
- artifact/revision ID
- operation type
- model/provider identifier when applicable
- duration/token/cost metadata when applicable
- error code/class

Debug tooling that captures content must be a separately controlled mode with explicit access, retention, and redaction rules.

## Encryption and transport

Hosted production project content and identity data must use encrypted transport and encrypted storage appropriate to the selected platform.

Encryption does not replace authorization, deletion, or minimization. Encryption key ownership/rotation details remain an implementation decision for the selected hosting/data platform.

## Retention model

Numeric retention periods are not selected by this ADR.

Before production launch, Wayfound must define a documented retention schedule covering at least:

- active project content
- deleted projects awaiting purge, if a recovery window exists
- account/identity records
- audit/transition metadata
- application logs
- AI/provider logs where applicable
- database backups/snapshots
- exported/shared copies under Wayfound's control

The retention schedule must name the owner and deletion behavior for each data class.

## Project deletion and purge

The data model must support a real project-deletion lifecycle.

A reasonable technical sequence is:

```text
Active project
   ↓ delete request by authorized Actor
Pending deletion / recovery state (if product policy allows)
   ↓
Purged from active authoritative storage
   ↓
Expires from backups according to documented backup-retention policy
```

The exact recovery window, if any, is TBD.

Project purge must account for:

- Answer/Record/Artifact revisions
- Trace Links
- materialized Draft/Proposed/Approved artifacts
- membership references
- transition metadata
- attachments/evidence added later
- caches/search indexes
- external provider copies under Wayfound's control or configured processing contracts

Transition/audit storage must not become a permanent copy of deleted free-form project content.

## Account deletion

Account deletion and project deletion are related but not identical.

Before multi-project hosted accounts launch, Wayfound must define what happens when an Actor requests account deletion while the Actor:

- owns one or more projects
- belongs to shared projects
- is the historical approver/author of revisions

Historical project integrity may require retaining a non-identifying internal Actor reference while removing account/profile information, subject to approved policy. The exact rule remains TBD and must be reviewed with the identity/retention policy before production.

## Younger users and age eligibility

Wayfound's technical model must not assume every Actor is an adult.

Before hosted persistence is offered to younger users, the product must choose and document one or more supported modes, for example:

- an age-eligible self-service account model under an approved policy
- a parent/guardian-managed relationship where required
- an educator/organization-managed environment where appropriate
- a local-only/non-hosted mode for users who are not eligible for hosted processing

This ADR intentionally does not select age thresholds, consent wording, or legal interpretations. Those require product/legal review for the markets in which Wayfound is offered.

Technical requirements for any approved guardian/organization model should attach to internal Actors and explicit relationships rather than overloading ordinary project roles such as Owner or Reviewer.

## Consent/policy records

If an approved age/privacy policy requires consent records, the system should store structured policy evidence rather than free-form notes.

Conceptually that may include:

- Actor/relationship identifiers
- policy/version identifier
- consent/eligibility state
- time recorded
- actor/authority that supplied it when applicable
- withdrawal/revocation time when applicable

The exact schema and required fields remain dependent on the approved policy.

## Attachments and imported files

Future file uploads can contain more sensitive information than typed Interview answers.

Before file persistence is enabled, define:

- allowed file types/sizes
- malware/content scanning boundary if required
- access-control inheritance
- storage encryption
- retention/deletion behavior
- whether file content may be sent to external AI/providers
- generated derivative/thumbnail/index deletion behavior

File persistence is not included in the first production-capable slice unless a separate requirement activates it.

## Options considered

### Option A — Collect broadly now and define retention/privacy later

**Summary:** Persist the prototype state and provider/account metadata first, then add privacy controls after product usage grows.

**Advantages:**

- Fastest implementation.
- Fewer upfront policy decisions.

**Disadvantages:**

- Creates deletion and data-minimization debt immediately.
- Can spread user content into logs, analytics, backups, and external services before ownership is clear.
- Particularly unsuitable for a product intended to be approachable to younger users.

**Risks:**

- Privacy controls become expensive retrofits.
- Historical copies can be difficult to locate and delete.

### Option B — No hosted storage; remain local-only

**Summary:** Keep all project content on the user's device and avoid accounts/server persistence.

**Advantages:**

- Strong data-minimization boundary.
- No server-side content retention.
- Simpler privacy surface for the product operator.

**Disadvantages:**

- Weak cross-device durability, collaboration, server-side integrations, and formal approval identity.
- Conflicts with the proposed production architecture if Wayfound needs shared durable projects.

**Risks:**

- Local backup/recovery responsibility shifts entirely to users.
- Later migration to hosted collaboration is harder.

### Option C — Hosted private-by-default persistence with explicit processing boundaries

**Summary:** Persist only defined project/account data, keep projects private by default, minimize telemetry, support deletion/purge, and require explicit feature decisions before external AI or public sharing.

**Advantages:**

- Supports durable projects while preserving a strong privacy boundary.
- Makes external AI processing visible and replaceable.
- Creates a workable deletion/retention architecture before data accumulates.
- Can support younger-user policies without hard-coding one policy prematurely.

**Disadvantages:**

- Requires retention/deletion implementation and policy work before production launch.
- Limits convenience features that would otherwise send content to third parties automatically.

**Risks:**

- Incorrectly designed deletion/backups can still leave residual data.
- Age/consent policy uncertainty can block hosted availability for some intended users.

## Rationale

Option C preserves Wayfound's current trust posture while allowing the product to become durable and collaborative.

The strongest privacy decision is made before data spreads: keep user content in the authoritative project store, keep logs/telemetry content-minimizing, and make external processing a deliberate feature boundary rather than a default implementation detail.

The approach also fits the revision/audit model from ADR-0002. User-authored content lives in governed revisions that can participate in deletion/retention, while audit entries reference those revisions rather than permanently duplicating the content.

Because Wayfound may serve younger builders, age/consent behavior cannot be deferred until after hosted accounts launch. At the same time, this architecture ADR should not invent jurisdiction-specific thresholds. The technical system should support an approved eligibility/guardian policy once product/legal requirements define it.

## Consequences

### Positive

- Hosted projects have a clear private-by-default posture.
- Project content does not leak into ordinary logs by design.
- External AI processing remains explicit rather than hidden.
- Deletion is part of the schema/operations design from the start.
- The Actor model can support future guardian/organization relationships without redefining project roles.
- Wayfound can offer a non-external-AI core experience even when AI processing is unavailable or inappropriate.

### Negative

- Production launch requires retention/deletion implementation and policy decisions.
- Some analytics/debugging workflows become less convenient because raw content is not routinely logged.
- Hosted use for younger users may need to remain unavailable until age/consent requirements are resolved.
- External AI features need additional UX and provider-governance work.

### Neutral or accepted constraints

- Numeric retention periods remain TBD.
- Exact age eligibility/consent rules remain TBD.
- Exact data residency/region requirements remain TBD.
- Public sharing is not part of private hosted persistence by default.
- The initial hosted vertical slice can ship without external AI processing.

## Reversibility

Adding broader data collection or external processing later is relatively easy technically but must pass explicit product/privacy review.

Removing data copies after they have spread across logs, analytics, backups, and providers is substantially harder. For that reason this ADR intentionally starts restrictive.

## Validation

Before this ADR can move from Proposed to Accepted, validate the production design can demonstrate:

1. a hosted project is private unless explicit access is granted
2. ordinary application logs/telemetry do not contain project free text
3. project deletion reaches all primary project-content/revision tables and trace links
4. backup retention/purge behavior is documented for the selected platform
5. an external AI feature can be disabled without breaking the core project workflow
6. external AI requests are routed only through an explicit server-side processing path
7. deletion/retention behavior for AI-provider copies is documented before that feature is enabled
8. the system can represent age/consent/guardian policy state if later requirements activate it
9. account deletion/ownership-transfer behavior is defined before shared hosted accounts launch
10. debug/content-capture modes, if any, have explicit access and retention controls

## Reconsideration triggers

Revisit this decision if:

- Wayfound becomes permanently local-only
- approved product scope requires projects to be public by default
- legal/product review defines stronger data-residency, retention, consent, or guardian requirements
- a selected AI/provider architecture requires data handling incompatible with these boundaries
- a target enterprise/school environment requires organization-owned retention policies that must override project defaults

## Related sources

- ADR-0001 — Production architecture baseline
- ADR-0002 — Authoritative project data and persistence model
- ADR-0003 — Identity and project authorization boundary
- Project charter: younger builders and privacy constraints
- Architecture section: Security architecture; Data model and authority
- Delivery milestone: M1 — Production architecture baseline

## Status history

| Date | Status | Reason |
| --- | --- | --- |
| 2026-09-17 | Proposed | Initial privacy/retention/age boundary for hosted Wayfound projects |
