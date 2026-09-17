# M2.1 Durable Adaptive Interview Implementation Notes

## Decision

Use the validated `app/interview-model.js` source verbatim inside the durable Next.js runtime and guard the copy with an automated byte-for-byte parity test.

The durable client renders that shared model. The server independently validates current applicability and option membership before persisting an answer.

## Durable answer projection

M2.1 persists the current answer and one current trace Record per Interview question under an internal `INT-<QUESTION>` key so a question can move between resolved and unresolved state without leaving two competing current Records.

- normal option → current Record type `decision`, statement is the selected option label
- `not-sure` → current Record type `open-question`, statement is the question prompt

Every save still creates a new immutable Answer Revision and Record Revision. The logical current Record changes type when the current answer changes; prior revisions remain history.

The existing prototype-facing `DEC-*` / `OQ-*` identifiers remain the validated session projection contract. Exact durable Records-page identifier parity is intentionally deferred to the subsequent durable Records migration rather than being invented inside M2.1.

## Authority boundary

The browser submits only:

- expected Project version
- question identifier
- selected option identifier

The server derives Record type/title/statement from the validated Interview model. Browser-supplied Record text is not authoritative in the M2.1 Interview path.

## Reopen behavior

The durable Interview endpoint reconstructs current answer state from each Answer's current immutable revision. The client then uses the validated model to calculate applicability, progress, completion, and the first unanswered applicable question.

No browser session state is required to resume the Interview.
