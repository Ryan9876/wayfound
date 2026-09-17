from pathlib import Path
import re

req_path = Path('docs/PRODUCT_REQUIREMENTS.md')
req = req_path.read_text()

for requirement_id in range(17, 23):
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

for requirement_id in range(17, 23):
    pattern = re.compile(rf'^(\| WF-{requirement_id:03d} \|.*?\| P0 \|) Approved (\|.*)$', re.M)
    req, count = pattern.subn(r'\1 Validated \2', req, count=1)
    if count != 1:
        raise SystemExit(f'Could not update WF-{requirement_id:03d} index row')

validation_record = '''\n**2026-09-17 — M2 local-first durable project slice**\n\n- GitHub Actions M2 local-first CI run #66 passed on commit `17148a0badef8a2dda0722f0e3b6857eaa4e3782`.\n- Sixteen domain, authorization, telemetry, concurrency, traceability, environment, and AI-provider boundary tests passed.\n- Two local SQLite integration tests passed, including stable local Actor reuse, project/database reopen, command idempotency, immutable Answer/Record revisions, exact trace links, proposal materialization, stale-source rejection, stale-write protection, and database rejection of an `approved` Artifact lifecycle value.\n- TypeScript checking and the optimized Next.js production build passed with local identity, local persistence, AI disabled, and no Clerk, Neon, Vercel, or external-model credentials.\n- Playwright Chromium passed the local browser flow: create project, save a decision, materialize an exact-source Proposed requirement, navigate away and reopen the durable project, submit an intentionally stale command and receive HTTP 409 `CONFLICT`, verify the rejected command did not mutate current state, and confirm no horizontal overflow at 390 px.\n- The separate optional PostgreSQL compatibility job passed migration, integration, schema-presence, rollback, and schema-removal checks. It remains compatibility evidence rather than a dependency of local M2.\n- M2 does not introduce formal Artifact approval, hosted synchronization, public sharing, or external AI by default.\n\n'''
marker = '\n## 8. Change rule\n'
if validation_record.strip() in req:
    raise SystemExit('M2 validation record already present')
if marker not in req:
    raise SystemExit('Missing change-rule marker')
req = req.replace(marker, validation_record + marker, 1)
req_path.write_text(req)

plan_path = Path('docs/DELIVERY_PLAN.md')
plan = plan_path.read_text()
old_status = '**Status:** In progress — local SQLite/Actor/AI provider adapters are being integrated and CI is being converted to make local operation the primary M2 gate.'
new_status = '**Status:** Validated — M2 local-first CI run #66 passes the complete local gate: domain/AI tests, SQLite integration and reopen behavior, TypeScript, production build without hosted credentials, Chromium create/reopen/save/propose/stale-conflict flow, 390 px responsive check, and optional PostgreSQL compatibility.'
if old_status not in plan:
    raise SystemExit('M2 in-progress status not found')
plan = plan.replace(old_status, new_status, 1)

replacements = {
    '| Implement stable local human Actor | WF-017 / ADR-0009 | Implementation | Implemented; validation pending | Local SQLite | Local integration test |':
    '| Implement stable local human Actor | WF-017 / ADR-0009 | Implementation | Validated | Local SQLite | Local integration + reopen tests |',
    '| Implement local SQLite project store | WF-018 through WF-021 / ADR-0009 | Implementation | Implemented; validation pending | SQLite schema | Local integration + reopen tests |':
    '| Implement local SQLite project store | WF-018 through WF-021 / ADR-0009 | Implementation | Validated | SQLite schema | Local integration + Chromium reopen flow |',
    '| Preserve exact revisions, trace links, idempotency, and stale-write checks locally | WF-019 through WF-021 | Implementation | Implemented; validation pending | Local project store | Local integration tests |':
    '| Preserve exact revisions, trace links, idempotency, and stale-write checks locally | WF-019 through WF-021 | Implementation | Validated | Local project store | Local integration + Chromium stale-conflict flow |',
    '| Add local/provider-optional AI adapter boundary | WF-022 / ADR-0009 | Implementation | Implemented; validation pending | Provider configuration | AI boundary tests |':
    '| Add local/provider-optional AI adapter boundary | WF-022 / ADR-0009 | Implementation | Validated | Provider configuration | AI boundary tests + no-cloud build |',
    '| Make local runtime build without hosted credentials | ADR-0009 | Implementation | Implemented; CI pending | Next.js + SQLite native package | Typecheck + production build |':
    '| Make local runtime build without hosted credentials | ADR-0009 | Implementation | Validated | Next.js + SQLite native package | Typecheck + production build + Chromium |',
    '| Retain PostgreSQL/Clerk hosted adapters as optional compatibility paths | ADR-0008 / ADR-0009 | Implementation | Implemented; non-blocking | Hosted mode requirements later | Optional compatibility tests |':
    '| Retain PostgreSQL/Clerk hosted adapters as optional compatibility paths | ADR-0008 / ADR-0009 | Implementation | PostgreSQL compatibility validated; Clerk retained, non-blocking | Hosted mode requirements later | Optional compatibility tests |',
}
for old, new in replacements.items():
    if old not in plan:
        raise SystemExit(f'Missing delivery-plan row: {old}')
    plan = plan.replace(old, new, 1)

plan = plan.replace('Near-term work after M2 local validation:', 'Near-term work after M2 validation:', 1)
plan_path.write_text(plan)
