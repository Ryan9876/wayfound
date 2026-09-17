from pathlib import Path

req_path = Path('docs/PRODUCT_REQUIREMENTS.md')
req = req_path.read_text()
marker = '\n## 5. Non-functional requirements\n'
if '### WF-025 — Reconstruct validated Records from durable Interview state' not in req:
    section = '''\n### WF-025 — Reconstruct validated Records from durable Interview state\n\n**Status:** Approved\n\n**Priority:** P0\n\n**User or system:** Wayfound\n\n**Requirement:**\n\n> When a durable local project has current Interview answers, Wayfound MUST reconstruct the same current Records projection produced by the validated Interview model without creating a second authoritative source.\n\n**Acceptance criteria:**\n\n- The durable runtime uses the validated `getInterviewRecords` projection semantics for current decision, assumption, blocker, and open-question records.\n- The same starting idea and current answer set produce the same projected record identifiers, types, titles, statements, details, and applicability behavior as the validated model.\n- An accepted answer projects as a decision; `not-sure` projects as an open question rather than a decision.\n- Derived assumptions, blockers, and open questions appear only while the current durable Interview state implies them.\n- Answers that become non-applicable do not appear in the current Records projection.\n- Answer-backed projected records expose the exact current durable Answer Revision and trace Record Revision that support them.\n- Derived records without a materialized source revision are explicitly identified as derived current-state projections.\n- Recomputing Records MUST NOT write new authoritative rows merely because the Records view was opened.\n\n**Constraints:**\n\n- Durable Interview answers and revisions remain authoritative; the Records projection remains derived.\n- M2.2 MUST NOT materialize derived assumptions/blockers/open questions as independent durable truth solely for display.\n- Draft artifact generation/promotion from the durable Records view remains a later slice.\n\n**Evidence / validation:**\n\n- Automated parity tests against the validated Records projector.\n- SQLite integration tests proving answer-backed evidence and derived-record appearance/disappearance.\n- Read-only check proving opening/recomputing Records does not advance Project version or create revisions.\n\n### WF-026 — Show durable current Records with trace evidence\n\n**Status:** Approved\n\n**Priority:** P1\n\n**User or system:** User\n\n**Requirement:**\n\n> When the local user opens Records for a durable project, Wayfound MUST show the current Records projection and enough trace evidence to distinguish saved answer-backed records from derived current-state records.\n\n**Acceptance criteria:**\n\n- Records is reachable from the durable project Interview and returns to the same project without losing saved state.\n- Records shows counts for decisions, assumptions, blockers, and open questions.\n- Each record shows its validated record identifier, friendly type/title, statement, source, and supporting detail when available.\n- Answer-backed records indicate that they are backed by saved Interview revisions and expose their durable revision identifiers for traceability.\n- Derived records clearly say that they are derived from current Interview state and are not separately stored as project truth.\n- Refreshing Records produces the same current projection for the same durable Interview state.\n- Revising the Interview and returning to Records updates the projection rather than preserving stale derived records.\n- The Records page remains usable at desktop and 390 px widths with no horizontal overflow.\n\n**Constraints:**\n\n- M2.2 is a read/projection slice; it does not add Record editing, approval, artifact generation, or external AI.\n- Friendly labels remain primary while stable identifiers and revision evidence remain available for traceability.\n\n**Evidence / validation:**\n\n- Chromium navigation/refresh/revision flow.\n- Responsive browser check at 390 px.\n- Integration tests for counts and trace evidence.\n'''
    if marker not in req:
        raise SystemExit('requirements marker missing')
    req = req.replace(marker, section + marker, 1)

idx = '| WF-024 | Persist and restore the current adaptive Interview answer state | P0 | Validated | SQLite revision/reopen + Chromium tests |'
if '| WF-025 | Reconstruct validated Records from durable Interview state' not in req:
    replacement = idx + '\n| WF-025 | Reconstruct validated Records from durable Interview state | P0 | Approved | Records parity + SQLite projection tests |\n| WF-026 | Show durable current Records with trace evidence | P1 | Approved | Chromium + responsive + trace evidence |'
    if idx not in req:
        raise SystemExit('WF-024 index row missing')
    req = req.replace(idx, replacement, 1)
req_path.write_text(req)

plan_path = Path('docs/DELIVERY_PLAN.md')
plan = plan_path.read_text()
if '### M2.2 — Durable Records' not in plan:
    marker2 = '\n## 4. Active work\n'
    section2 = '''\n### M2.2 — Durable Records\n\n**Goal:** Project the validated Records model from durable local Interview state and show it with exact evidence links without creating a second authority.\n\n**Entry criteria:** M2.1 validated; WF-025 and WF-026 approved.\n\n**Exit criteria:**\n\n- Durable Records use the validated Records projection semantics.\n- Answer-backed records link to exact current Answer/Record revisions.\n- Derived assumptions/blockers/open questions remain read-only projections and disappear when no longer implied.\n- Opening/refreshing Records does not mutate Project version or create revisions.\n- Interview ↔ Records navigation preserves durable state.\n- Model/integration/TypeScript/build/Chromium/390 px gates pass.\n- No cloud account or LLM is required.\n\n**Status:** In progress.\n'''
    if marker2 not in plan:
        raise SystemExit('delivery marker missing')
    plan = plan.replace(marker2, section2 + marker2, 1)
row = '| Migrate validated adaptive Interview onto local durable answer state | WF-023 / WF-024 | Implementation | Validated | M2 validated | Model parity + SQLite + Chromium |'
new_row = row + '\n| Migrate validated Records view onto durable Interview state | WF-025 / WF-026 | Implementation | In progress | M2.1 validated | Projection parity + SQLite + Chromium |'
if 'Migrate validated Records view onto durable Interview state' not in plan:
    if row not in plan:
        raise SystemExit('M2.1 active work row missing')
    plan = plan.replace(row, new_row, 1)
plan_path.write_text(plan)
