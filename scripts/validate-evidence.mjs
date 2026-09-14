import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { localBackend } from './local-backend.mjs';

const backend = localBackend();
const sql = backend.sql;
await sql.connect();

const password = randomBytes(24).toString('base64url');
const emails = [0, 1].map(index => `evidence-owner-${index}-${randomUUID()}@example.test`);
const clients = [backend.client(), backend.client()];
const users = [];
const retryDelays = [150, 350, 750];
const base = 'http://127.0.0.1:3101';
const output = 'artifacts/workspace';
mkdirSync(output, { recursive: true });
let server;
let browser;
let dbPaused = false;

function ok(result) {
  if (result.error) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}

function jwtFuture(error) {
  return error?.code === 'PGRST303' && error.message === 'JWT issued at future';
}

function expectedError(result, message) {
  assert(result.error, message);
  assert(!jwtFuture(result.error), `${message}: transient PostgREST JWT clock failure`);
  return result.error;
}

async function rpc(client, name, args) {
  let result = await client.rpc(name, args);
  for (const delay of retryDelays) {
    if (!jwtFuture(result.error)) return result;
    await new Promise(resolve => setTimeout(resolve, delay));
    result = await client.rpc(name, args);
  }
  return result;
}

async function revokedRpc(accessToken, name, body) {
  let response;
  let responseBody;
  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    response = await fetch(`${backend.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: backend.key,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    responseBody = await response.clone().json().catch(() => null);
    if (!jwtFuture(responseBody) || attempt === retryDelays.length) break;
    await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
  }
  assert(!response.ok, `revoked session ${name} succeeded`);
  assert(!jwtFuture(responseBody), `revoked session ${name} only observed transient PostgREST JWT clock failure`);
}

async function start() {
  server = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3101'],
    {
      env: {
        ...process.env,
        SUPABASE_URL: backend.url,
        SUPABASE_PUBLISHABLE_KEY: backend.key,
        APP_ORIGIN: base,
      },
      stdio: 'ignore',
    },
  );
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(`${base}/sign-in`)).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Evidence validation application did not start');
}

async function stop() {
  if (server && server.exitCode === null) {
    const closed = once(server, 'exit');
    server.kill('SIGTERM');
    await closed;
  }
  server = null;
}

async function login(page, email) {
  await page.goto(`${base}/sign-in`);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(`${base}/workspaces`);
  await page.getByRole('heading', { name: 'What would you like to work on?', exact: true }).waitFor({ timeout: 30000 });
}

async function inspect(page, name) {
  for (const [label, width, height] of [['mobile', 390, 844], ['desktop', 1440, 1200]]) {
    await page.setViewportSize({ width, height });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} ${label} overflow`);
    await page.screenshot({ path: `${output}/${name}-${label}.png`, fullPage: true });

    await page.evaluate(() => document.activeElement?.blur());
    const targets = await page.locator('a[href],button:not([disabled]),input:not([type=hidden]),textarea,select,summary').evaluateAll(elements =>
      elements
        .filter(element => element.checkVisibility() && element.getBoundingClientRect().width > 0)
        .map((element, index) => {
          element.dataset.evidenceFocusId = String(index);
          return String(index);
        }),
    );
    const seen = new Set();
    for (let index = 0; index < targets.length + 5; index++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const element = document.activeElement;
        const style = getComputedStyle(element);
        return {
          id: element?.getAttribute('data-evidence-focus-id'),
          width: parseFloat(style.outlineWidth),
          style: style.outlineStyle,
        };
      });
      if (focused.id !== null) {
        seen.add(focused.id);
        assert(focused.width >= 1 && focused.style !== 'none', `${name} ${label} missing focus`);
      }
    }
    assert.equal(seen.size, targets.length, `${name} ${label} unreachable controls`);
  }
}

async function createWorkspaceAndRequirement(client, label) {
  const workspaceId = ok(await rpc(client, 'create_workspace', {
    p_name: `${label} evidence workspace`,
    p_problem: 'Volunteers need a reliable equipment checkout record.',
    p_release: 'Release 1.0',
    p_request: randomUUID(),
  }));
  const requirementId = ok(await rpc(client, 'record_owner_requirement', {
    p_workspace: workspaceId,
    p_title: 'Identify the active borrower',
    p_obligation: 'MUST',
    p_requirement: 'The product records the person responsible for each active equipment checkout.',
    p_acceptance_criterion: 'Given an equipment checkout is active, when the checkout record is viewed, then the responsible borrower is visible.',
    p_authority_confirm: true,
    p_request: randomUUID(),
  }));
  const requirements = ok(await rpc(client, 'list_requirements', { p_workspace: workspaceId }));
  assert.equal(requirements.length, 1);
  assert.equal(requirements[0].id, requirementId);
  assert.equal(requirements[0].acceptance_criteria.length, 1);
  return { workspaceId, requirement: requirements[0], criterion: requirements[0].acceptance_criteria[0] };
}

try {
  for (let index = 0; index < 2; index++) {
    users.push(ok(await backend.admin.auth.admin.createUser({ email: emails[index], password, email_confirm: true })).user);
    ok(await clients[index].auth.signInWithPassword({ email: emails[index], password }));
  }

  const owner = await createWorkspaceAndRequirement(clients[0], 'Owner A');
  const other = await createWorkspaceAndRequirement(clients[1], 'Owner B');
  const ownerActorId = (await sql.query('select id from wayfound.actors where provider_subject=$1', [users[0].id])).rows[0].id;
  const workspaceBeforeEvidence = ok(await rpc(clients[0], 'open_workspace', { p_id: owner.workspaceId }));

  const evidenceArgs = {
    p_workspace: owner.workspaceId,
    p_acceptance_criterion: owner.criterion.id,
    p_title: 'Borrower appears in the active checkout record',
    p_result: 'The active checkout view displayed the borrower responsible for the checked-out equipment.',
    p_source_note: 'Manual product walkthrough recorded by the product owner against the current Release 1.0 workspace.',
    p_effect: 'Supports',
    p_request: randomUUID(),
  };

  const duplicateEvidence = await Promise.all([
    rpc(clients[0], 'record_criterion_evidence', evidenceArgs),
    rpc(clients[0], 'record_criterion_evidence', evidenceArgs),
  ]);
  const evidenceId = ok(duplicateEvidence[0]);
  duplicateEvidence.forEach(result => assert.equal(ok(result), evidenceId));

  const savedEvidence = ok(await rpc(clients[0], 'list_evidence', { p_workspace: owner.workspaceId }));
  assert.equal(savedEvidence.length, 1);
  assert.equal(savedEvidence[0].id, evidenceId);
  assert.equal(savedEvidence[0].workspace_id, owner.workspaceId);
  assert.equal(savedEvidence[0].release_id, owner.requirement.release_id);
  assert.equal(savedEvidence[0].stage_number, owner.requirement.stage_number);
  assert.equal(savedEvidence[0].requirement_id, owner.requirement.id);
  assert.equal(savedEvidence[0].requirement_revision, owner.requirement.revision);
  assert.equal(savedEvidence[0].acceptance_criterion_id, owner.criterion.id);
  assert.equal(savedEvidence[0].criterion_revision, owner.criterion.revision);
  assert.equal(savedEvidence[0].title, evidenceArgs.p_title);
  assert.equal(savedEvidence[0].result, evidenceArgs.p_result);
  assert.equal(savedEvidence[0].source_note, evidenceArgs.p_source_note);
  assert.equal(savedEvidence[0].effect, 'Supports');
  assert.equal(savedEvidence[0].recorded_by_actor_id, ownerActorId);

  const requirementAfterEvidence = ok(await rpc(clients[0], 'list_requirements', { p_workspace: owner.workspaceId }));
  assert.equal(requirementAfterEvidence[0].status, 'Approved');
  assert.equal(requirementAfterEvidence[0].revision, owner.requirement.revision);
  assert.equal(requirementAfterEvidence[0].acceptance_criteria[0].revision, owner.criterion.revision);
  assert.equal(Object.prototype.hasOwnProperty.call(requirementAfterEvidence[0].acceptance_criteria[0], 'status'), false);

  expectedError(
    await clients[0].rpc('record_criterion_evidence', { ...evidenceArgs, p_title: 'Changed duplicate' }),
    'changed duplicate evidence request unexpectedly succeeded',
  );
  expectedError(
    await clients[0].rpc('record_criterion_evidence', { ...evidenceArgs, p_request: randomUUID(), p_effect: 'Verified' }),
    'invalid evidence effect unexpectedly succeeded',
  );
  expectedError(
    await clients[0].rpc('record_criterion_evidence', { ...evidenceArgs, p_request: randomUUID(), p_acceptance_criterion: randomUUID() }),
    'unknown acceptance criterion unexpectedly accepted evidence',
  );
  expectedError(
    await clients[0].rpc('record_criterion_evidence', { ...evidenceArgs, p_request: randomUUID(), p_acceptance_criterion: other.criterion.id }),
    'foreign acceptance criterion unexpectedly accepted evidence',
  );

  assert.deepEqual(ok(await rpc(clients[1], 'list_evidence', { p_workspace: owner.workspaceId })), []);
  expectedError(
    await clients[1].rpc('record_criterion_evidence', { ...evidenceArgs, p_request: randomUUID() }),
    'non-member evidence creation unexpectedly succeeded',
  );
  expectedError(await backend.client().rpc('list_evidence', { p_workspace: owner.workspaceId }), 'anonymous evidence read unexpectedly succeeded');
  expectedError(await clients[0].schema('wayfound').from('evidence_records').select('*'), 'private evidence table read unexpectedly succeeded');
  expectedError(await clients[0].from('evidence_records').insert({ title: 'bypass' }), 'direct evidence table write unexpectedly succeeded');

  const counts = async () => ({
    evidence: (await sql.query('select count(*)::int n from wayfound.evidence_records')).rows[0].n,
    requests: (await sql.query('select count(*)::int n from wayfound.evidence_requests')).rows[0].n,
    audits: (await sql.query("select count(*)::int n from wayfound.audit_events where operation='evidence.recorded'")).rows[0].n,
  });
  const beforeFailure = await counts();
  await sql.query(`create function wayfound.test_evidence_failure() returns trigger language plpgsql as $$begin if new.operation='evidence.recorded' then raise exception 'Injected evidence audit failure'; end if; return new; end$$; create trigger test_evidence_failure before insert on wayfound.audit_events for each row execute function wayfound.test_evidence_failure()`);
  try {
    expectedError(
      await clients[0].rpc('record_criterion_evidence', { ...evidenceArgs, p_request: randomUUID(), p_title: 'Rollback evidence' }),
      'injected evidence failure unexpectedly succeeded',
    );
  } finally {
    await sql.query('drop trigger test_evidence_failure on wayfound.audit_events; drop function wayfound.test_evidence_failure()');
  }
  assert.deepEqual(await counts(), beforeFailure, 'failed evidence transaction left partial durable state');

  const membership = (await sql.query('select actor_id,role from wayfound.memberships where workspace_id=$1 and actor_id=$2', [owner.workspaceId, ownerActorId])).rows[0];
  await sql.query('delete from wayfound.memberships where workspace_id=$1 and actor_id=$2', [owner.workspaceId, ownerActorId]);
  assert.deepEqual(ok(await rpc(clients[0], 'list_evidence', { p_workspace: owner.workspaceId })), []);
  expectedError(await clients[0].rpc('record_criterion_evidence', evidenceArgs), 'membership-revoked evidence retry unexpectedly succeeded');
  await sql.query('insert into wayfound.memberships(workspace_id,actor_id,role) values($1,$2,$3)', [owner.workspaceId, membership.actor_id, membership.role]);

  await sql.query("update auth.sessions set not_after=now()-interval '1 minute' where user_id=$1", [users[0].id]);
  expectedError(await clients[0].rpc('list_evidence', { p_workspace: owner.workspaceId }), 'expired session evidence read succeeded');
  await sql.query('update auth.sessions set not_after=null where user_id=$1', [users[0].id]);

  const protectedAccess = ok(await clients[0].auth.getSession()).session.access_token;
  await sql.query('delete from auth.sessions where user_id=$1', [users[0].id]);
  await revokedRpc(protectedAccess, 'list_evidence', { p_workspace: owner.workspaceId });
  ok(await clients[0].auth.signInWithPassword({ email: emails[0], password }));

  await start();
  browser = await chromium.launch({ headless: true });
  let context = await browser.newContext();
  let page = await context.newPage();
  await login(page, emails[0]);
  const workspaceUrl = `${base}/workspaces/${owner.workspaceId}`;
  await page.goto(workspaceUrl);
  await page.getByRole('heading', { name: 'Identify the active borrower', exact: true }).waitFor({ timeout: 30000 });

  const criterion = page.locator(`#criterion-${owner.criterion.id}`);
  assert(await criterion.getByText('1 evidence', { exact: true }).isVisible());
  assert(await criterion.getByRole('heading', { name: evidenceArgs.p_title, exact: true }).isVisible());
  assert(await criterion.getByText('Effect: Supports', { exact: true }).isVisible());
  assert(await criterion.getByText(evidenceArgs.p_source_note, { exact: true }).isVisible());
  assert(await criterion.getByText('Verification state unchanged.', { exact: true }).isVisible());
  const requirementSection = page.getByLabel('Requirements');
  assert(await requirementSection.getByText('Status: Approved', { exact: true }).isVisible());
  assert.equal(await requirementSection.getByText('Status: Verified', { exact: true }).count(), 0);

  await criterion.getByLabel('Evidence title', { exact: true }).fill('Second observation supports borrower identity');
  await criterion.getByLabel('Effect on criterion', { exact: true }).selectOption('Supports');
  await criterion.getByLabel('Result', { exact: true }).fill('A second active checkout showed the borrower name beside the checked-out item.');
  await criterion.getByLabel('Source / provenance', { exact: true }).fill('Second manual walkthrough by the product owner.');
  await criterion.getByRole('button', { name: 'Record evidence', exact: true }).click();
  await page.waitForURL(url => url.pathname === new URL(workspaceUrl).pathname && url.hash === `#criterion-${owner.criterion.id}`);
  await page.getByRole('heading', { name: 'Second observation supports borrower identity', exact: true }).waitFor({ timeout: 30000 });
  assert(await page.locator(`#criterion-${owner.criterion.id}`).getByText('2 evidence', { exact: true }).isVisible());
  assert(await page.getByLabel('Requirements').getByText('Status: Approved', { exact: true }).isVisible());
  assert.equal(await page.getByLabel('Requirements').getByText('Status: Verified', { exact: true }).count(), 0);
  await inspect(page, 'saved-evidence');

  await stop();
  await context.close();
  await start();
  context = await browser.newContext();
  page = await context.newPage();
  await login(page, emails[0]);
  await page.goto(workspaceUrl);
  await page.getByRole('heading', { name: 'Second observation supports borrower identity', exact: true }).waitFor({ timeout: 30000 });
  assert(await page.getByRole('heading', { name: evidenceArgs.p_title, exact: true }).isVisible());
  assert(await page.getByText(`Evidence ID: ${evidenceId}`, { exact: true }).isVisible());

  execFileSync('docker', ['pause', 'supabase_db_wayfound'], { stdio: 'ignore' });
  dbPaused = true;
  try {
    await page.goto(workspaceUrl, { timeout: 90000 });
    await page.getByRole('heading', { name: 'We could not load your workspace.' }).waitFor({ timeout: 60000 });
    await page.screenshot({ path: `${output}/evidence-database-unavailable.png`, fullPage: true });
  } finally {
    execFileSync('docker', ['unpause', 'supabase_db_wayfound'], { stdio: 'ignore' });
    dbPaused = false;
  }
  await page.reload();
  await page.getByRole('heading', { name: 'Second observation supports borrower identity', exact: true }).waitFor({ timeout: 30000 });
  assert(await page.getByRole('heading', { name: evidenceArgs.p_title, exact: true }).isVisible());

  const finalApiEvidence = ok(await rpc(clients[0], 'list_evidence', { p_workspace: owner.workspaceId }));
  assert.equal(finalApiEvidence.length, 2);
  assert.equal(finalApiEvidence.find(item => item.id === evidenceId).effect, 'Supports');
  assert.deepEqual(ok(await rpc(clients[0], 'open_workspace', { p_id: owner.workspaceId })), workspaceBeforeEvidence);
  const finalRequirement = ok(await rpc(clients[0], 'list_requirements', { p_workspace: owner.workspaceId }));
  assert.equal(finalRequirement[0].status, 'Approved');
  assert.equal(Object.prototype.hasOwnProperty.call(finalRequirement[0].acceptance_criteria[0], 'status'), false);

  console.log('PASS: durable criterion evidence records preserve requirement approval without creating verification state; idempotency, target integrity, tenant/session/revocation isolation, rollback, restart/resume, database interruption/recovery, keyboard focus, and responsive screenshots passed.');
} finally {
  if (dbPaused) {
    try { execFileSync('docker', ['unpause', 'supabase_db_wayfound'], { stdio: 'ignore' }); } catch {}
  }
  await stop().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  for (const user of users) {
    await backend.admin.auth.admin.deleteUser(user.id).catch(() => {});
  }
  await sql.end().catch(() => {});
}
