from pathlib import Path
import re

req_path = Path('docs/PRODUCT_REQUIREMENTS.md')
req = req_path.read_text()
for requirement_id in (23, 24):
    heading = f'### WF-{requirement_id:03d} —'
    start = req.find(heading)
    if start < 0:
        raise SystemExit(f'Missing {heading}')
    next_heading = req.find('\n### WF-', start + len(heading))
    end = next_heading if next_heading >= 0 else req.find('\n## 5.', start)
    section = req[start:end]
    if '**Status:** Approved' not in section:
        raise SystemExit(f'WF-{requirement_id:03d} is not Approved as expected')
    section = section.replace('**Status:** Approved', '**Status:** Validated', 1)
    req = req[:start] + section + req[end:]

for requirement_id in (23, 24):
    pattern = re.compile(rf'^(\| WF-{requirement_id:03d} \|.*?\| P0 \|) Approved (\|.*)$', re.M)
    req, count = pattern.subn(r'\1 Validated \2', req, count=1)
    if count != 1:
        raise SystemExit(f'Could not update WF-{requirement_id:03d} index row')

validation = '''\n**2026-09-17 — M2.1 Durable Adaptive Interview**\n\n- GitHub Actions M2 local-first CI run #79 passed on the M2.1 branch after the request-context fix.\n- The durable runtime Interview model is byte-for-byte identical to the validated `app/interview-model.js` source.\n- Seventeen model/domain/authorization/telemetry/AI-boundary tests passed, including the model parity gate.\n- Four local SQLite integration tests passed, including adaptive applicability/option rejection, immutable Answer Revision history, database reopen, `not-sure` unresolved projection, and stale-write rejection.\n- TypeScript checking and the optimized Next.js production build passed without hosted credentials.\n- Playwright Chromium passed the durable adaptive flow: create a puzzle-game project, answer the adaptive Interview, reach the game-specific question, refresh, use Back with the persisted selection restored, revise the answer to create revision 2, save `not-sure` as an open question, reject a stale write with HTTP 409, and retain authoritative state.\n- The 390 px browser gate passed with no horizontal overflow.\n- The optional PostgreSQL compatibility job remained green and non-blocking.\n- M2.1 adds no LLM requirement, hosted dependency, starting-idea editing, formal approval, or full durable Records/artifact migration.\n\n'''
marker = '\n## 8. Change rule\n'
if validation.strip() not in req:
    if marker not in req:
        raise SystemExit('Change-rule marker missing')
    req = req.replace(marker, validation + marker, 1)
req_path.write_text(req)

plan_path = Path('docs/DELIVERY_PLAN.md')
plan = plan_path.read_text()
old_status = '**Status:** In progress.\n\n## 4. Active work'
new_status = '**Status:** Validated — model parity, SQLite revision/reopen behavior, server-side applicability validation, no-cloud build, adaptive Chromium flow, answer revision, stale-conflict, and 390 px responsive gates pass.\n\n## 4. Active work'
if old_status not in plan:
    raise SystemExit('M2.1 in-progress status marker missing')
plan = plan.replace(old_status, new_status, 1)
old_row = '| Migrate validated adaptive Interview onto local durable answer state | WF-023 / WF-024 | Implementation | In progress | M2 validated | Model parity + SQLite + Chromium |'
new_row = '| Migrate validated adaptive Interview onto local durable answer state | WF-023 / WF-024 | Implementation | Validated | M2 validated | Model parity + SQLite + Chromium |'
if old_row not in plan:
    raise SystemExit('M2.1 active-work row missing')
plan = plan.replace(old_row, new_row, 1)
plan_path.write_text(plan)

validation_path = Path('docs/M2_1_VALIDATION.md')
validation_doc = validation_path.read_text()
validation_doc = validation_doc.replace('**Status:** In progress', '**Status:** Validated', 1)
if '## Validation evidence' not in validation_doc:
    validation_doc += '''\n## Validation evidence\n\n- CI run #79: local-wayfound success.\n- Model parity: exact source equality.\n- 17 model/domain/AI tests passed.\n- 4 local SQLite integration tests passed.\n- TypeScript and production build passed.\n- Chromium adaptive/reopen/revise/unresolved/stale-write flow passed.\n- 390 px no-horizontal-overflow gate passed.\n- Optional PostgreSQL compatibility remained green.\n'''
validation_path.write_text(validation_doc)
