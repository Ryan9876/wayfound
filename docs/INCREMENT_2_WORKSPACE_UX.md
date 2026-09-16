# Active workspace language and layout

**State:** Implemented; validation in progress.

## Outcome and scope

The single-user workspace leads with where the owner is and what to do next. This implements the owner's UX instruction under WF-ORI-001, WF-GDE-001/002, WF-UI-001/002/003, and ADR-0005. No record model, permission, transaction, or status transition changes are authorized by this work.

## Audit

The prior durable page stacked decisions, work, requirements, evidence, artifacts, and their create forms into one long page. The stage list occupied a second column, while the next-action copy always recommended clarification. Product-owner authority, qualified-review gates, record identifiers, and repeated verification disclaimers dominated normal reading. Single-user mode hid specialist panels with CSS but left instructions directing the owner to those hidden panels.

The prototype overview, journey, and standard pages use illustrative Borrow Desk data. They remain demo routes, not a source of facts for saved projects. Their static action controls and fixture records must not become active project behavior.

## Interface contract

- In single-user mode, desktop navigation has Overview, Journey, Work, Records, and Release & Care. Mobile has Overview, Journey, Work, and More, which links to the remaining two destinations.
- Navigation retains workspace identity in the URL. Unknown view values resolve to Overview. Browser back, refresh, and deep links retain the selected destination.
- Overview shows project, release, saved lifecycle, saved stage, stage-aware guidance, one primary action, What we know, What we still need to answer, and Recent changes.
- Blocked work takes priority over stage guidance. Saved work retains its exact status. No guidance changes a stage or starts work.
- The problem statement is labeled as the owner's description. Suggested questions are not represented as saved open questions. Facts, assumptions, decisions, risks, issues, and questions are not interchangeable.
- Recent changes shows latest saved record timestamps, not a fabricated audit feed. Work transition history remains accessible.
- Creation forms open only when requested. Required confirmations remain present and required. A save returns to the relevant destination and record anchor.
- Canonical record status stays visible. Technical identifiers, revision numbers, authority, obligation codes, and criterion names remain available under Details or secondary labels.
- Local AI discovery and Test AI retain their existing behavior. Metrics and diagnostics use disclosure; results can be dismissed.
- The original non-single-user UI is retained as `legacy-workspace.tsx`, with its original forms and lifecycle component. The existing regression suite continues to exercise that historical capability. Single-user mode renders the new component without specialist forms.
- Technical records retained from earlier work are readable as outside-review summaries; no new authority or AI approval substitutes for the existing review requirements.

## Plain-language mappings

| Primary label | Canonical meaning retained |
| --- | --- |
| Project | Workspace |
| Add decision / What did you decide? / Why? | Accepted owner product/business decision and rationale |
| Add work / What should this produce? / Done when | Proposed work item, outcome, completion condition |
| What will show it worked? | Expected evidence, not a result |
| What must the product do? / How will we know it works? | Requirement and acceptance criterion |
| Where did this come from? | Evidence source/provenance |
| Documents | Artifacts with versioned external references |
| Needs outside review | Proposed technical record, unchanged review requirements |

Implemented, Validated, and Released remain separate. Saving evidence does not verify a criterion. Accepting a document selects project direction; it does not validate content. AI remains advisory.

## Verification

Run existing TypeScript, production build, accessibility, prototype, single-user, local-AI, and full durable regression checks. The new `test:workspace-ui` browser test runs against the isolated automatic-owner app after CI seeds it. It covers creation, navigation, forms, canonical saved statuses, evidence, responsive layouts, keyboard disclosure, and reload. No hosted migration, merge, release, or deployment is part of this slice.

## Remaining product limits

Stage transitions, completed-work transitions, dedicated fact/assumption/risk/question records, durable AI-review output, release packets, and maintenance tracking remain future implementation scope. The UI states these limits where relevant. Real task-based comprehension research remains outstanding.
