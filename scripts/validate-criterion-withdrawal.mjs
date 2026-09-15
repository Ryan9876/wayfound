import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { localBackend } from './local-backend.mjs';

const backend = localBackend();
const sql = backend.sql;
await sql.connect();

const password = randomBytes(24).toString('base64url');
const emails = [0, 1].map(index => `criterion-withdraw-${index}-${randomUUID()}@example.test`);
const clients = [backend.client(), backend.client()];
const users = [];
const retryDelays = [150, 350, 750];
const base = 'http://127.0.0.1:3314';
const outputDir = 'artifacts/workspace';
mkdirSync(outputDir, { recursive: true });
let appServer = null;
let browser = null;

function ok(result) {
  if (result.error) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}
function jwtFuture(error) {
  return error?.code === 'PGRST303' && error.message === 'JWT issued at future';
}
function expectedError(result, message, code) {
  assert(result?.error, message);
  assert(!jwtFuture(result.error), `${message}: transient PostgREST JWT clock failure`);
  if (code) assert.equal(result.error.code, code, `${message}: wrong error code`);
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
async function startApp() {
  appServer = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3314'], {
    env: {
      ...process.env,
      SUPABASE_URL: backend.url,
      SUPABASE_PUBLISHABLE_KEY: backend.key,
      APP_ORIGIN: base,
      WAYFOUND_SINGLE_USER_MODE: 'true',
    },
    stdio: 'ignore',
  });
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${base}/sign-in`)).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Application did not start');
}
async function stopApp() {
  if (appServer && appServer.exitCode === null) {
    const closed = once(appServer, 'exit');
    appServer.kill('SIGTERM');
    await closed;
  }
  appServer = null;
}
async function login(page, email) {
  await page.goto(`${base}/sign-in`);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(`${base}/workspaces`);
}
async function assertUniqueIds(page) {
  const duplicateIds = await page.locator('[id]').evaluateAll(elements => {
    const counts = new Map();
    for (const element of elements) counts.set(element.id, (counts.get(element.id) ?? 0) + 1);
    return [...counts.entries()].filter(([, count]) => count > 1).map(([id]) => id);
  });
  assert.deepEqual(duplicateIds, [], `duplicate DOM IDs: ${duplicateIds.join(', ')}`);
}
async function createWorkspace(client, name) {
  return ok(await rpc(client, 'create_workspace', {
    p_name: name,
    p_problem: 'Preserve acceptance-criterion history while changing active project conditions.',
    p_release: 'Release 1.0',
    p_request: randomUUID(),
  }));
}
async function createRequirement(client, workspace, title) {
  return ok(await rpc(client, 'record_owner_requirement', {
    p_workspace: workspace,
    p_title: title,
    p_obligation: 'MUST',
    p_requirement: 'Keep the checkout workflow understandable.',
    p_acceptance_criterion: 'The owner can see the borrower.',
    p_authority_confirm: true,
    p_request: randomUUID(),
  }));
}
async function requirement(client, workspace, id) {
  return ok(await rpc(client, 'list_requirements', { p_workspace: workspace })).find(row => row.id === id);
}
async function add(client, workspace, id, revision, statement) {
  return ok(await rpc(client, 'add_owner_criterion', {
    p_workspace: workspace,
    p_requirement: id,
    p_expected_revision: revision,
    p_statement: statement,
    p_reason: 'Keep this as a separate observable product condition.',
    p_confirm: true,
    p_request: randomUUID(),
  }));
}
function withdrawArgs(workspace, requirementId, criterionId, requirementRevision, criterionRevision, reason = 'This condition is no longer part of the active product check.') {
  return {
    p_workspace: workspace,
    p_requirement: requirementId,
    p_criterion: criterionId,
    p_expected_requirement_revision: requirementRevision,
    p_expected_criterion_revision: criterionRevision,
    p_reason: reason,
    p_confirm: true,
    p_request: randomUUID(),
  };
}
async function withdraw(client, payload) {
  return rpc(client, 'withdraw_owner_criterion', payload);
}
async function recordEvidence(client, workspace, criterionId, title, requestId = randomUUID()) {
  const payload = {
    p_workspace: workspace,
    p_acceptance_criterion: criterionId,
    p_title: title,
    p_result: 'Observed result.',
    p_source_note: 'Manual observation in an isolated test.',
    p_effect: 'Supports',
    p_request: requestId,
  };
  return { payload, result: await rpc(client, 'record_criterion_evidence', payload) };
}
async function rows(table, workspace) {
  return (await sql.query(`select * from wayfound.${table} where workspace_id=$1 order by id`, [workspace])).rows;
}

try {
  for (let index = 0; index < 2; index++) {
    users.push(ok(await backend.admin.auth.admin.createUser({ email: emails[index], password, email_confirm: true })).user);
    ok(await clients[index].auth.signInWithPassword({ email: emails[index], password }));
  }

  const workspace = await createWorkspace(clients[0], 'Criterion withdrawal');
  const foreignWorkspace = await createWorkspace(clients[1], 'Foreign criterion withdrawal');
  const id = await createRequirement(clients[0], workspace, 'Checkout conditions');
  const foreignId = await createRequirement(clients[1], foreignWorkspace, 'Foreign conditions');
  let current = await requirement(clients[0], workspace, id);
  const first = current.acceptance_criteria[0];
  assert.equal(first.lifecycle, 'Active');
  const secondId = await add(clients[0], workspace, id, current.revision, 'The owner can see the return date.');
  current = await requirement(clients[0], workspace, id);
  const thirdId = await add(clients[0], workspace, id, current.revision, 'The owner can see the equipment identifier.');
  current = await requirement(clients[0], workspace, id);
  assert.equal(current.revision, 3);
  assert.equal(current.acceptance_criteria.filter(c => c.lifecycle === 'Active').length, 3);

  const beforeSecond = current.acceptance_criteria.find(c => c.id === secondId);
  const evidenceRequest = randomUUID();
  const recorded = await recordEvidence(clients[0], workspace, secondId, 'Evidence before withdrawal', evidenceRequest);
  const evidenceId = ok(recorded.result);
  const evidenceBefore = await rows('evidence_records', workspace);
  const payload = withdrawArgs(workspace, id, secondId, current.revision, beforeSecond.revision);
  const replay = await Promise.all([withdraw(clients[0], payload), withdraw(clients[0], payload)]);
  const withdrawalId = ok(replay[0]);
  assert.equal(ok(replay[1]), withdrawalId, 'exact concurrent replay returned different withdrawal identities');
  current = await requirement(clients[0], workspace, id);
  const withdrawn = current.acceptance_criteria.find(c => c.id === secondId);
  assert.equal(current.revision, 4);
  assert.equal(withdrawn.lifecycle, 'Withdrawn');
  assert.equal(withdrawn.revision, 2);
  assert.equal(withdrawn.statement, beforeSecond.statement);
  assert.equal(withdrawn.addition.reason, beforeSecond.addition.reason);
  assert.equal(withdrawn.withdrawal.reason, payload.p_reason);
  assert.equal(withdrawn.withdrawal.from_requirement_revision, 3);
  assert.equal(withdrawn.withdrawal.to_requirement_revision, 4);
  assert.equal(withdrawn.withdrawal.from_criterion_revision, 1);
  assert.equal(withdrawn.withdrawal.to_criterion_revision, 2);
  assert.equal(current.acceptance_criteria.filter(c => c.lifecycle === 'Active').length, 2);
  assert.deepEqual(await rows('evidence_records', workspace), evidenceBefore, 'withdrawal rewrote existing evidence');

  const replayEvidence = await rpc(clients[0], 'record_criterion_evidence', recorded.payload);
  assert.equal(ok(replayEvidence), evidenceId, 'committed evidence replay stopped being idempotent after withdrawal');
  expectedError((await recordEvidence(clients[0], workspace, secondId, 'New evidence after withdrawal')).result, 'new evidence accepted for withdrawn criterion', '23503');
  expectedError(await withdraw(clients[0], { ...payload, p_reason: 'Changed replay reason' }), 'changed withdrawal replay accepted', '22023');
  expectedError(await withdraw(clients[0], withdrawArgs(workspace, id, secondId, current.revision, withdrawn.revision)), 'already-withdrawn criterion accepted', '55000');
  expectedError(await withdraw(clients[0], withdrawArgs(workspace, id, thirdId, 3, 1)), 'stale requirement revision accepted', '55000');
  expectedError(await withdraw(clients[0], withdrawArgs(workspace, id, thirdId, current.revision, 9)), 'stale criterion revision accepted', '55000');
  expectedError(await withdraw(clients[0], { ...withdrawArgs(workspace, id, thirdId, current.revision, 1), p_reason: '' }), 'empty reason accepted', '22023');
  expectedError(await withdraw(clients[0], { ...withdrawArgs(workspace, id, thirdId, current.revision, 1), p_reason: 'x'.repeat(2001) }), 'oversized reason accepted', '22023');
  expectedError(await withdraw(clients[0], { ...withdrawArgs(workspace, id, thirdId, current.revision, 1), p_confirm: false }), 'missing confirmation accepted', '22023');

  const singleId = await createRequirement(clients[0], workspace, 'Single active condition');
  const single = await requirement(clients[0], workspace, singleId);
  expectedError(await withdraw(clients[0], withdrawArgs(workspace, singleId, single.acceptance_criteria[0].id, single.revision, 1)), 'last active criterion withdrawal accepted', '55000');

  const foreign = await requirement(clients[1], foreignWorkspace, foreignId);
  expectedError(await withdraw(clients[0], withdrawArgs(workspace, id, foreign.acceptance_criteria[0].id, current.revision, 1)), 'foreign criterion accepted', '23503');
  expectedError(await withdraw(clients[1], withdrawArgs(workspace, id, thirdId, current.revision, 1)), 'foreign owner accepted', '42501');
  expectedError(await withdraw(backend.client(), withdrawArgs(workspace, id, thirdId, current.revision, 1)), 'anonymous withdrawal accepted');

  const technicalId = randomUUID();
  const technicalCriterionId = randomUUID();
  await sql.query(`insert into wayfound.requirements(id,workspace_id,release_id,stage_number,title,obligation,requirement_statement,kind,authority,status,approving_actor_id)
    values($1,$2,$3,$4,'Technical fixture','MUST','Preserve a technical boundary.','technical','owner-after-specialist-review','Approved',$5)`,
    [technicalId, workspace, current.release_id, current.stage_number, current.approving_actor_id]);
  await sql.query(`insert into wayfound.acceptance_criteria(id,workspace_id,requirement_id,statement) values($1,$2,$3,'A technical condition remains specialist-reviewed.')`,
    [technicalCriterionId, workspace, technicalId]);
  expectedError(await withdraw(clients[0], withdrawArgs(workspace, technicalId, technicalCriterionId, 1, 1)), 'owner-only withdrawal changed technical requirement', '42501');

  for (const table of ['criterion_withdrawals', 'criterion_withdraw_requests']) {
    expectedError(await clients[0].schema('wayfound').from(table).select('*'), 'direct protected read accepted');
    expectedError(await clients[0].schema('wayfound').from(table).insert({ workspace_id: workspace }), 'direct protected write accepted');
  }

  const raceId = await createRequirement(clients[0], workspace, 'Concurrent withdrawal');
  let raceRequirement = await requirement(clients[0], workspace, raceId);
  const raceSecond = await add(clients[0], workspace, raceId, raceRequirement.revision, 'Concurrent condition A.');
  raceRequirement = await requirement(clients[0], workspace, raceId);
  const raceThird = await add(clients[0], workspace, raceId, raceRequirement.revision, 'Concurrent condition B.');
  raceRequirement = await requirement(clients[0], workspace, raceId);
  const raceResults = await Promise.all([
    withdraw(clients[0], withdrawArgs(workspace, raceId, raceSecond, raceRequirement.revision, 1, 'Withdraw concurrent condition A.')),
    withdraw(clients[0], withdrawArgs(workspace, raceId, raceThird, raceRequirement.revision, 1, 'Withdraw concurrent condition B.')),
  ]);
  assert.equal(raceResults.filter(result => !result.error).length, 1, 'same-revision distinct withdrawals did not produce one winner');
  expectedError(raceResults.find(result => result.error), 'missing stale withdrawal loser', '55000');
  raceRequirement = await requirement(clients[0], workspace, raceId);
  assert.equal(raceRequirement.acceptance_criteria.filter(c => c.lifecycle === 'Active').length, 2);

  const failureId = await createRequirement(clients[0], workspace, 'Withdrawal rollback');
  let failureRequirement = await requirement(clients[0], workspace, failureId);
  const failureCriterion = await add(clients[0], workspace, failureId, failureRequirement.revision, 'Rollback condition.');
  failureRequirement = await requirement(clients[0], workspace, failureId);
  const failureBefore = failureRequirement;
  const failurePayload = withdrawArgs(workspace, failureId, failureCriterion, failureRequirement.revision, 1, 'Retry after injected audit failure.');
  await sql.query("create function wayfound.test_withdraw_failure() returns trigger language plpgsql as $$begin if new.operation='criterion.withdrawn' then raise exception 'Injected failure'; end if; return new; end$$; create trigger test_withdraw_failure before insert on wayfound.audit_events for each row execute function wayfound.test_withdraw_failure()");
  try {
    expectedError(await withdraw(clients[0], failurePayload), 'audit failure did not fail withdrawal');
  } finally {
    await sql.query('drop trigger test_withdraw_failure on wayfound.audit_events; drop function wayfound.test_withdraw_failure()');
  }
  assert.deepEqual(await requirement(clients[0], workspace, failureId), failureBefore, 'audit failure changed criterion or requirement');
  assert.equal((await sql.query('select count(*)::int n from wayfound.criterion_withdraw_requests where request_id=$1', [failurePayload.p_request])).rows[0].n, 0);
  assert.equal((await sql.query('select count(*)::int n from wayfound.criterion_withdrawals where criterion_id=$1', [failureCriterion])).rows[0].n, 0);
  ok(await withdraw(clients[0], failurePayload));

  await sql.query('delete from wayfound.memberships where workspace_id=$1 and actor_id=$2', [workspace, current.approving_actor_id]);
  try {
    expectedError(await withdraw(clients[0], payload), 'revoked membership replay accepted', '42501');
  } finally {
    await sql.query("insert into wayfound.memberships(workspace_id,actor_id,role) values($1,$2,'owner')", [workspace, current.approving_actor_id]);
  }
  await sql.query("update auth.sessions set not_after=now()-interval '1 minute' where user_id=$1", [users[0].id]);
  try {
    expectedError(await withdraw(clients[0], payload), 'expired session replay accepted', '28000');
  } finally {
    await sql.query('update auth.sessions set not_after=null where user_id=$1', [users[0].id]);
  }
  await sql.query('delete from auth.sessions where user_id=$1', [users[0].id]);
  expectedError(await withdraw(clients[0], payload), 'revoked session replay accepted', '28000');
  ok(await clients[0].auth.signInWithPassword({ email: emails[0], password }));

  const uiId = await createRequirement(clients[0], workspace, 'UI criterion withdrawal');
  let uiRequirement = await requirement(clients[0], workspace, uiId);
  const uiSecond = await add(clients[0], workspace, uiId, uiRequirement.revision, 'The owner can see when equipment is due.');
  uiRequirement = await requirement(clients[0], workspace, uiId);
  await recordEvidence(clients[0], workspace, uiSecond, 'Historical UI evidence');

  await startApp();
  browser = await chromium.launch({ headless: true });
  let page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await login(page, emails[0]);
  await page.goto(`${base}/workspaces/${workspace}?view=records#requirement-${uiId}`);
  let card = page.locator(`#requirement-${uiId}`);
  let manage = card.locator('summary').filter({ hasText: /^Manage acceptance criteria$/ });
  await manage.focus();
  await page.keyboard.press('Enter');
  let group = card.getByRole('group', { name: 'Acceptance criterion: The owner can see when equipment is due.' });
  await group.locator('summary').filter({ hasText: /^Withdraw this condition$/ }).click();
  await group.getByLabel('Why are you withdrawing this condition?').fill('   ');
  await group.getByRole('checkbox').check();
  await group.getByRole('button', { name: 'Withdraw condition', exact: true }).click();
  await group.getByRole('alert').waitFor();
  assert.equal((await group.getByLabel('Why are you withdrawing this condition?').inputValue()).trim(), '', 'withdrawal error changed entered reason unexpectedly');
  await group.getByLabel('Why are you withdrawing this condition?').fill('This condition is no longer part of the active checkout check.');
  await group.getByRole('button', { name: 'Withdraw condition', exact: true }).click();
  await page.waitForURL(/#criterion-/, { timeout: 30000 });
  await card.waitFor();
  manage = card.locator('summary').filter({ hasText: /^Manage acceptance criteria$/ });
  await manage.click();
  group = card.getByRole('group', { name: 'Acceptance criterion: The owner can see when equipment is due.' });
  await group.getByText('Withdrawn', { exact: true }).waitFor();
  await group.getByText(/Existing evidence remains historical/).waitFor();
  const uiSaved = await requirement(clients[0], workspace, uiId);
  const uiWithdrawn = uiSaved.acceptance_criteria.find(c => c.id === uiSecond);
  assert.equal(uiWithdrawn.lifecycle, 'Withdrawn');
  assert.equal(uiWithdrawn.revision, 2);
  assert.equal(uiSaved.acceptance_criteria.filter(c => c.lifecycle === 'Active').length, 1);

  for (const [label, width, height] of [['desktop', 1440, 1200], ['mobile', 390, 844]]) {
    await page.setViewportSize({ width, height });
    await assertUniqueIds(page);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${label} overflow`);
    await card.screenshot({ path: `${outputDir}/criterion-withdrawal-${label}.png` });
  }

  await browser.close();
  browser = null;
  await stopApp();
  await startApp();
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
  await login(page, emails[0]);
  await page.goto(`${base}/workspaces/${workspace}?view=records#requirement-${uiId}`);
  card = page.locator(`#requirement-${uiId}`);
  await card.locator('summary').filter({ hasText: /^Manage acceptance criteria$/ }).click();
  await card.getByRole('group', { name: 'Acceptance criterion: The owner can see when equipment is due.' }).getByText('Withdrawn', { exact: true }).waitFor();
  assert.equal((await requirement(clients[0], workspace, uiId)).acceptance_criteria.find(c => c.id === uiSecond).lifecycle, 'Withdrawn');

  console.log('PASS: owner product criterion withdrawal preserves criterion/evidence history; blocks last-active and technical withdrawal; denies new evidence; enforces tenant/session/revocation/direct-table boundaries; preserves idempotency, concurrency and audit rollback/retry; persists through restart/re-login; and renders text lifecycle status without desktop/390 px overflow.');
} finally {
  if (browser) await browser.close();
  await stopApp();
  await sql.end();
}
