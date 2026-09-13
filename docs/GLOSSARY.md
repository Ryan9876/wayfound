# Wayfound Glossary

**Status:** Approved baseline

## Purpose

Use this glossary to keep Wayfound terminology consistent. This supports the project requirement to use one preferred term for one intended meaning.

Add a term when different contributors could reasonably use different words for the same concept or when a Wayfound-specific term needs a precise definition.

## Rules

- Use the preferred term in project communication and source files.
- Do not introduce a synonym only for style.
- Define a term before using a project-specific abbreviation.
- If a term changes meaning, update the glossary and affected source-of-truth files in the same change.
- Do not use one term for two materially different concepts.

## Baseline terms

| Preferred term | Meaning | Do not use as an interchangeable synonym |
| --- | --- | --- |
| requirement | An approved statement of required product or system behavior | idea, wish, task |
| acceptance criterion | An observable condition used to determine whether a requirement or work item is satisfied | requirement |
| work item | A bounded unit of planned delivery work | requirement |
| decision | An approved choice among alternatives or a choice that establishes project direction | assumption |
| assumption | An unverified statement used temporarily for reasoning or planning | fact, decision |
| fact | Information supported by an authoritative source or direct observation | assumption, hypothesis |
| hypothesis | A possible explanation that requires validation | root cause, fact |
| risk | An uncertain event or condition that can affect an objective | issue |
| issue | A current condition that already requires attention or action | risk |
| blocker | A dependency or unresolved decision that prevents specific work from proceeding | inconvenience, ordinary uncertainty |
| implemented | The required code or configuration exists | validated, released |
| validated | Required acceptance criteria and checks passed | implemented, released |
| released | A validated change is available in its intended environment | deployed when deployment alone does not imply release readiness |
| component | A major architectural unit with a defined responsibility and boundary | module, service, subsystem unless those terms have a distinct defined meaning |
| authoritative source | The source that has final ownership of a defined fact or data domain | copy, cache |
| Architecture Decision Record (ADR) | A durable record of a consequential architecture decision, its context, alternatives, and consequences | design note when the decision is consequential |
| source of truth | The highest-authority project record for a defined decision or subject | chat history, memory |

## Product-specific terms

No Wayfound product-specific terms are defined yet.

Add terms in this format:

| Preferred term | Meaning | Do not use as an interchangeable synonym |
| --- | --- | --- |
| TBD | TBD | TBD |