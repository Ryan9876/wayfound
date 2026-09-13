# Wayfound Glossary

**Status:** Approved baseline

## Rules

- Use one preferred term for one intended meaning.
- Do not introduce synonyms only for style.
- Define a Wayfound-specific term before repeated use.
- Update this glossary and affected source-of-truth files together when a term changes meaning.

## Baseline terms

| Preferred term | Meaning | Do not use as an interchangeable synonym |
| --- | --- | --- |
| requirement | An approved statement of required product or system behavior | idea, wish, task |
| acceptance criterion | An observable condition used to determine whether a requirement or work item is satisfied | requirement, test result |
| work item | A bounded unit of planned delivery work | requirement |
| decision | An approved choice among alternatives or a choice that establishes project direction | assumption |
| assumption | An unverified statement used temporarily for reasoning or planning | fact, decision |
| fact | Information supported by an authoritative source or direct observation | assumption, hypothesis |
| hypothesis | A possible explanation that requires validation | root cause, fact |
| risk | An uncertain event or condition that can affect an objective | issue |
| issue | A current condition that already requires attention or action | risk |
| blocker | A dependency or unresolved decision that prevents specific work from proceeding | ordinary uncertainty |
| implemented | The required code or configuration exists | validated, released |
| validated | Required acceptance criteria and checks passed | implemented, released |
| released | A validated change is available in its intended environment | deployed when deployment alone does not imply release readiness |
| authoritative source | The source that has final ownership of a defined fact or data domain | copy, cache |
| Architecture Decision Record (ADR) | A durable record of a consequential architecture decision, its context, alternatives, and consequences | ordinary design note |
| source of truth | The highest-authority project record for a defined decision or subject | chat history, memory |

## Product-specific terms

| Preferred term | Meaning | Do not use as an interchangeable synonym |
| --- | --- | --- |
| owner | The person accountable for product and business decisions for a Wayfound project | every contributor, specialist |
| specialist | A qualified person or tool performing bounded specialist work; a human specialist reviews matters that require qualified judgment | owner |
| stage | One of the 15 canonical areas of work in the Wayfound journey | gate when sequence is not mandatory |
| release | A bounded product scope with its own readiness, authorization, deployment, and operating record | entire project |
| artifact | A versioned project output such as a problem brief, requirement set, design, decision record, or returned specialist document | evidence when it is not evidence |
| accepted artifact | The artifact version currently accepted as project direction | latest upload, proposed revision |
| proposed artifact | A new or changed artifact version awaiting acceptance | accepted artifact |
| evidence | A recorded result that supports or challenges a requirement, decision, readiness check, or outcome | acceptance criterion |
| outdated evidence | Evidence that may no longer support the current artifact or decision because a relevant dependency changed | failed evidence |
| handoff | A bounded transfer of context, constraints, requested work, and return expectations to a specialist or specialist tool | integration |
| reconciliation | Review of returned or changed work against accepted scope, decisions, assumptions, and requirements | automatic acceptance |
| release packet | The versioned set of release scope, target, data effects, checks, findings, recovery information, ownership, and requested authorization | deployment alone |
| prototype | An experiment for learning that may use simulated data and incomplete implementation | production-ready product, MVP |
