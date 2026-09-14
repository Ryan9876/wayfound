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
const emails = [0, 1].map(index => `work-dependency-${index}-${randomUUID()}@example.test`);
const clients = [backend.client(), backend.client()];
const users = [];
const retryDelays = [150, 350, 750];
const base = 'http://127.0.0.1:3310';
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
async function createWorkspace(client, name) {
  return ok(await rpc(client, 'create_workspace', {
    p_name: name,
    p_problem: 'Represent work dependencies without silently changing work state.',
    p_release: 'Release 1.0',
    p_request: randomUUID(),
  }));
}
async function createWork(client, workspace, title) {
  return ok(await rpc(client, 'create_proposed_work_item', {
    p_workspace: workspace,
    p_title: title,
    p_outcome: `Produce ${title}.`,
    p_completion_condition: `${title} exists.`,
    p_evidence_expectation: `${title} can be checked later.`,
    p_request: randomUUID(),
  }));
}
function addArgs(workspace, dependent, prerequisite, reason, request = randomUUID()) {
  return {
    p_workspace: workspace,
    p_dependent_work_item: dependent,
    p_prerequisite_work_item: prerequisite,
    p_reason: reason,
    p_confirm: true,
    p_request: request,
  };
}
function removeArgs(workspace, dependency, reason, request = randomUUID()) {
  return {
    p_workspace: workspace,
    p_dependency: dependency,
    p_reason: reason,
    p_confirm: true,
    p_request: request,
  };
}
function transitionArgs(workspace, work, revision, status, reason) {
  return {
    p_workspace: workspace,
    p_work_item: work,
    p_expected_revision: revision,
    p_target_status: status,
    p_reason: reason,
    p_confirm: true,
    p_request: randomUUID(),
  };
}
async function listWork(client, workspace) {
  return ok(await rpc(client, 'list_work_items', { p_workspace: workspace }));
}
async function workState(workspace) {
  return (await sql.query(
    'select id,status,revision from wayfound.work_items where workspace_id=$1 order by id',
    [workspace],
  )).rows;
}
async function projectState(workspace) {
  const release = (await sql.query('select lifecycle,current_stage,revision from wayfound.releases where workspace_id=$1', [workspace])).rows;
  const requirements = (await sql.query('select id,status,revision from wayfound.requirements where workspace_id=$1 order by id', [workspace])).rows;
  const evidence = (await sql.query('select id,effect from wayfound.evidence_records where workspace_id=$1 order by id', [workspace])).rows;
  const artifacts = (await sql.query('select id,revision,accepted_version_id from wayfound.artifacts where workspace_id=$1 order by id', [workspace])).rows;
  return { release, requirements, evidence, artifacts };
}
async function startApp() {
  appServer = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3310'], {
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

try {
  for (let index = 0; index < 2; index++) {
    users.push(ok(await backend.admin.auth.admin.createUser({ email: emails[index], password, email_confirm: true })).user);
    ok(await clients[index].auth.signInWithPassword({ email: emails[index], password }));
  }

  const workspace = await createWorkspace(clients[0], 'Durable work dependencies');
  const foreignWorkspace = await createWorkspace(clients[1], 'Foreign dependency workspace');
  const actor = (await sql.query('select id from wayfound.actors where provider_subject=$1', [users[0].id])).rows[0].id;

  const dependent = await createWork(clients[0], workspace, 'Dependent work');
  const prerequisite = await createWork(clients[0], workspace, 'Prerequisite work');
  const foreignWork = await createWork(clients[1], foreignWorkspace, 'Foreign prerequisite');
  ok(await rpc(clients[0], 'transition_work_item', transitionArgs(workspace, prerequisite, 1, 'Approved', 'Approve the prerequisite before linking it.')));

  const beforeWork = await workState(workspace);
  const beforeProject = await projectState(workspace);
  const createRequest = randomUUID();
  const primaryArgs = addArgs(workspace, dependent, prerequisite, 'Dependent work needs the prerequisite result first.', createRequest);
  const primaryDependency = ok(await rpc(clients[0], 'add_work_item_dependency', primaryArgs));
  assert.equal(ok(await rpc(clients[0], 'add_work_item_dependency', primaryArgs)), primaryDependency, 'identical create replay returned a different dependency');
  expectedError(
    await rpc(clients[0], 'add_work_item_dependency', { ...primaryArgs, p_reason: 'Changed replay payload.' }),
    'changed dependency replay succeeded',
    '22023',
  );

  let listed = await listWork(clients[0], workspace);
  let dependentRecord = listed.find(item => item.id === dependent);
  let prerequisiteRecord = listed.find(item => item.id === prerequisite);
  assert(dependentRecord && prerequisiteRecord, 'linked work missing from read model');
  assert.equal(dependentRecord.dependencies.length, 1);
  assert.equal(dependentRecord.dependencies[0].id, primaryDependency);
  assert.equal(dependentRecord.dependencies[0].dependent_revision, 1);
  assert.equal(dependentRecord.dependencies[0].prerequisite_revision, 2);
  assert.equal(dependentRecord.dependencies[0].prerequisite_status, 'Approved');
  assert.equal(prerequisiteRecord.dependents.length, 1);
  assert.equal(prerequisiteRecord.dependents[0].dependent_work_item_id, dependent);
  assert(dependentRecord.dependency_candidates.some(item => item.id === prerequisite && item.status === 'Approved'), 'dependency candidate read model missing prerequisite');
  assert.deepEqual(await workState(workspace), beforeWork, 'dependency creation changed work status or revision');
  assert.deepEqual(await projectState(workspace), beforeProject, 'dependency creation changed project authority state');

  const addAudit = (await sql.query("select count(*)::int n from wayfound.audit_events where workspace_id=$1 and operation='work_item.dependency_added' and entity_id=$2", [workspace, primaryDependency])).rows[0].n;
  assert.equal(addAudit, 1, 'dependency add audit event count changed');
  const addRequestRows = (await sql.query('select count(*)::int n from wayfound.work_item_dependency_create_requests where actor_id=$1 and request_id=$2', [actor, createRequest])).rows[0].n;
  assert.equal(addRequestRows, 1, 'dependency create request history count changed');

  expectedError(
    await rpc(clients[0], 'add_work_item_dependency', addArgs(workspace, dependent, dependent, 'Self dependency.')),
    'self dependency succeeded',
    '22023',
  );
  expectedError(
    await rpc(clients[0], 'add_work_item_dependency', addArgs(workspace, dependent, prerequisite, 'Duplicate active edge.')),
    'duplicate active dependency succeeded',
    '55000',
  );
  expectedError(
    await rpc(clients[0], 'add_work_item_dependency', addArgs(workspace, dependent, foreignWork, 'Cross-workspace edge.')),
    'cross-workspace dependency succeeded',
    '23503',
  );
  expectedError(
    await rpc(clients[1], 'add_work_item_dependency', addArgs(workspace, dependent, prerequisite, 'Foreign owner edge.')),
    'foreign owner created dependency',
    '42501',
  );
  expectedError(
    await clients[0].schema('wayfound').from('work_item_dependencies').insert({
      workspace_id: workspace,
      dependent_work_item_id: dependent,
      prerequisite_work_item_id: prerequisite,
      dependent_revision: 1,
      prerequisite_revision: 2,
      reason: 'Direct insert must fail.',
      created_by_actor_id: actor,
    }),
    'direct protected dependency insert succeeded',
  );

  ok(await rpc(clients[0], 'transition_work_item', transitionArgs(workspace, prerequisite, 2, 'In progress', 'Start the prerequisite after dependency creation.')));
  listed = await listWork(clients[0], workspace);
  dependentRecord = listed.find(item => item.id === dependent);
  assert.equal(dependentRecord.dependencies[0].prerequisite_revision, 2, 'creation revision snapshot changed');
  assert.equal(dependentRecord.dependencies[0].prerequisite_current_revision, 3, 'current prerequisite revision did not advance in read model');
  assert.equal(dependentRecord.dependencies[0].prerequisite_status, 'In progress', 'current prerequisite status did not update in read model');

  const cycleA = await createWork(clients[0], workspace, 'Cycle A');
  const cycleB = await createWork(clients[0], workspace, 'Cycle B');
  const cycleC = await createWork(clients[0], workspace, 'Cycle C');
  ok(await rpc(clients[0], 'add_work_item_dependency', addArgs(workspace, cycleA, cycleB, 'A depends on B.')));
  ok(await rpc(clients[0], 'add_work_item_dependency', addArgs(workspace, cycleB, cycleC, 'B depends on C.')));
  expectedError(
    await rpc(clients[0], 'add_work_item_dependency', addArgs(workspace, cycleC, cycleA, 'C would depend on A.')),
    'indirect cycle succeeded',
    '55000',
  );

  const oppositeA = await createWork(clients[0], workspace, 'Concurrent opposite A');
  const oppositeB = await createWork(clients[0], workspace, 'Concurrent opposite B');
  const opposite = await Promise.all([
    rpc(clients[0], 'add_work_item_dependency', addArgs(workspace, oppositeA, oppositeB, 'Opposite edge A to B.')),
    rpc(clients[0], 'add_work_item_dependency', addArgs(workspace, oppositeB, oppositeA, 'Opposite edge B to A.')),
  ]);
  assert.equal(opposite.filter(result => !result.error).length, 1, 'concurrent opposite edges did not produce one winner');
  expectedError(opposite.find(result => result.error), 'concurrent opposite edge loser unexpectedly succeeded', '55000');

  const sameA = await createWork(clients[0], workspace, 'Concurrent same A');
  const sameB = await createWork(clients[0], workspace, 'Concurrent same B');
  const same = await Promise.all([
    rpc(clients[0], 'add_work_item_dependency', addArgs(workspace, sameA, sameB, 'Concurrent same edge one.')),
    rpc(clients[0], 'add_work_item_dependency', addArgs(workspace, sameA, sameB, 'Concurrent same edge two.')),
  ]);
  assert.equal(same.filter(result => !result.error).length, 1, 'concurrent same-edge requests did not produce one winner');
  expectedError(same.find(result => result.error), 'concurrent same-edge loser unexpectedly succeeded');
  assert.equal((await sql.query('select count(*)::int n from wayfound.work_item_dependencies where workspace_id=$1 and dependent_work_item_id=$2 and prerequisite_work_item_id=$3 and removed_at is null', [workspace, sameA, sameB])).rows[0].n, 1, 'concurrent same-edge requests created more than one active dependency');

  const rollbackA = await createWork(clients[0], workspace, 'Rollback dependent');
  const rollbackB = await createWork(clients[0], workspace, 'Rollback prerequisite');
  const rollbackCreateRequest = randomUUID();
  const rollbackCreate = addArgs(workspace, rollbackA, rollbackB, 'Create should roll back with audit failure.', rollbackCreateRequest);
  await sql.query(`create function wayfound.test_dependency_add_failure() returns trigger language plpgsql as $$begin if new.operation='work_item.dependency_added' then raise exception 'Injected dependency add audit failure'; end if; return new; end$$; create trigger test_dependency_add_failure before insert on wayfound.audit_events for each row execute function wayfound.test_dependency_add_failure()`);
  try {
    expectedError(await rpc(clients[0], 'add_work_item_dependency', rollbackCreate), 'dependency add audit failure did not fail');
  } finally {
    await sql.query('drop trigger test_dependency_add_failure on wayfound.audit_events; drop function wayfound.test_dependency_add_failure()');
  }
  assert.equal((await sql.query('select count(*)::int n from wayfound.work_item_dependencies where workspace_id=$1 and dependent_work_item_id=$2 and prerequisite_work_item_id=$3', [workspace, rollbackA, rollbackB])).rows[0].n, 0, 'failed dependency add committed a row');
  assert.equal((await sql.query('select count(*)::int n from wayfound.work_item_dependency_create_requests where actor_id=$1 and request_id=$2', [actor, rollbackCreateRequest])).rows[0].n, 0, 'failed dependency add retained request result');
  const rollbackDependency = ok(await rpc(clients[0], 'add_work_item_dependency', rollbackCreate));

  const rollbackRemoveRequest = randomUUID();
  const rollbackRemove = removeArgs(workspace, rollbackDependency, 'Remove should roll back with audit failure.', rollbackRemoveRequest);
  await sql.query(`create function wayfound.test_dependency_remove_failure() returns trigger language plpgsql as $$begin if new.operation='work_item.dependency_removed' then raise exception 'Injected dependency remove audit failure'; end if; return new; end$$; create trigger test_dependency_remove_failure before insert on wayfound.audit_events for each row execute function wayfound.test_dependency_remove_failure()`);
  try {
    expectedError(await rpc(clients[0], 'remove_work_item_dependency', rollbackRemove), 'dependency remove audit failure did not fail');
  } finally {
    await sql.query('drop trigger test_dependency_remove_failure on wayfound.audit_events; drop function wayfound.test_dependency_remove_failure()');
  }
  assert.equal((await sql.query('select removed_at from wayfound.work_item_dependencies where id=$1', [rollbackDependency])).rows[0].removed_at, null, 'failed dependency removal committed');
  assert.equal((await sql.query('select count(*)::int n from wayfound.work_item_dependency_remove_requests where actor_id=$1 and request_id=$2', [actor, rollbackRemoveRequest])).rows[0].n, 0, 'failed dependency removal retained request result');
  ok(await rpc(clients[0], 'remove_work_item_dependency', rollbackRemove));

  const removeRequest = randomUUID();
  const primaryRemove = removeArgs(workspace, primaryDependency, 'The prerequisite is no longer required for this work.', removeRequest);
  assert.equal(ok(await rpc(clients[0], 'remove_work_item_dependency', primaryRemove)), primaryDependency);
  assert.equal(ok(await rpc(clients[0], 'remove_work_item_dependency', primaryRemove)), primaryDependency, 'identical remove replay changed result');
  expectedError(
    await rpc(clients[0], 'remove_work_item_dependency', { ...primaryRemove, p_reason: 'Changed removal replay.' }),
    'changed removal replay succeeded',
    '22023',
  );
  expectedError(
    await rpc(clients[0], 'remove_work_item_dependency', removeArgs(workspace, primaryDependency, 'Second distinct removal.')),
    'inactive dependency was removed again',
    '55000',
  );
  const removed = (await sql.query('select dependent_work_item_id,prerequisite_work_item_id,dependent_revision,prerequisite_revision,reason,created_by_actor_id,created_at,removed_by_actor_id,removed_reason,removed_at from wayfound.work_item_dependencies where id=$1', [primaryDependency])).rows[0];
  assert.equal(removed.dependent_work_item_id, dependent);
  assert.equal(removed.prerequisite_work_item_id, prerequisite);
  assert.equal(removed.dependent_revision, 1);
  assert.equal(removed.prerequisite_revision, 2);
  assert.equal(removed.reason, primaryArgs.p_reason);
  assert.equal(removed.created_by_actor_id, actor);
  assert(removed.created_at);
  assert.equal(removed.removed_by_actor_id, actor);
  assert.equal(removed.removed_reason, primaryRemove.p_reason);
  assert(removed.removed_at);

  listed = await listWork(clients[0], workspace);
  assert.equal(listed.find(item => item.id === dependent).dependencies.some(item => item.id === primaryDependency), false, 'removed dependency remained active in dependent read model');
  assert.equal(listed.find(item => item.id === prerequisite).dependents.some(item => item.id === primaryDependency), false, 'removed dependency remained active in reverse read model');
  const recreated = ok(await rpc(clients[0], 'add_work_item_dependency', addArgs(workspace, dependent, prerequisite, 'A new dependency is needed after the earlier one was removed.')));
  assert.notEqual(recreated, primaryDependency, 're-created dependency reused removed dependency identity');

  const revokedA = await createWork(clients[0], workspace, 'Revoked dependent');
  const revokedB = await createWork(clients[0], workspace, 'Revoked prerequisite');
  await sql.query('delete from wayfound.memberships where workspace_id=$1 and actor_id=$2', [workspace, actor]);
  try {
    expectedError(
      await rpc(clients[0], 'add_work_item_dependency', addArgs(workspace, revokedA, revokedB, 'This must not save while membership is revoked.')),
      'revoked owner created dependency',
      '42501',
    );
    assert.deepEqual(await listWork(clients[0], workspace), [], 'revoked owner still listed work dependencies');
  } finally {
    await sql.query("insert into wayfound.memberships(workspace_id,actor_id,role) values($1,$2,'owner')", [workspace, actor]);
  }

  ok(await clients[0].auth.signOut({ scope: 'local' }));
  ok(await clients[0].auth.signInWithPassword({ email: emails[0], password }));
  listed = await listWork(clients[0], workspace);
  assert(listed.find(item => item.id === dependent).dependencies.some(item => item.id === recreated), 'active dependency did not survive re-login');
  assert((await sql.query('select removed_at from wayfound.work_item_dependencies where id=$1', [primaryDependency])).rows[0].removed_at, 'removed dependency history did not survive re-login');

  const uiDependentTitle = `UI dependent ${randomUUID().slice(0, 8)}`;
  const uiPrerequisiteTitle = `UI prerequisite ${randomUUID().slice(0, 8)}`;
  const uiDependent = await createWork(clients[0], workspace, uiDependentTitle);
  const uiPrerequisite = await createWork(clients[0], workspace, uiPrerequisiteTitle);

  await startApp();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await login(page, emails[0]);
  await page.goto(`${base}/workspaces/${workspace}?view=work#work-item-${uiDependent}`);
  const dependentCard = page.locator('.work-item-card').filter({ hasText: uiDependentTitle });
  const prerequisiteCard = page.locator('.work-item-card').filter({ hasText: uiPrerequisiteTitle });
  await dependentCard.getByText('Add dependency', { exact: true }).click();
  await dependentCard.getByLabel('What work must this depend on?').selectOption(uiPrerequisite);
  await dependentCard.getByLabel('Why is this dependency needed?').fill('The UI dependent work needs the UI prerequisite result first.');
  await dependentCard.getByRole('checkbox', { name: /I confirm that this work depends on the selected work/i }).check();
  await dependentCard.getByRole('button', { name: 'Add dependency', exact: true }).click();
  await dependentCard.getByText('Depends on', { exact: true }).waitFor({ timeout: 30000 });
  assert(await dependentCard.getByText(uiPrerequisiteTitle, { exact: true }).isVisible(), 'dependent card does not show prerequisite title');
  assert(await prerequisiteCard.getByText('Needed by', { exact: true }).isVisible(), 'prerequisite card does not show reverse relationship');
  assert(await prerequisiteCard.getByText(uiDependentTitle, { exact: true }).isVisible(), 'prerequisite card does not show dependent title');
  const uiWork = await listWork(clients[0], workspace);
  assert.equal(uiWork.find(item => item.id === uiDependent).status, 'Proposed', 'UI dependency changed dependent status');
  assert.equal(uiWork.find(item => item.id === uiPrerequisite).status, 'Proposed', 'UI dependency changed prerequisite status');

  const removeSummary = dependentCard.getByText('Remove dependency', { exact: true });
  await removeSummary.focus();
  assert(await removeSummary.evaluate(element => element === document.activeElement), 'dependency removal disclosure is not keyboard focusable');
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'dependency desktop view overflow');
  await page.screenshot({ path: `${outputDir}/work-dependency-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'dependency mobile view overflow');
  await page.screenshot({ path: `${outputDir}/work-dependency-mobile.png`, fullPage: true });

  await removeSummary.click();
  await dependentCard.getByLabel('Why does this dependency no longer apply?').fill('The UI prerequisite is no longer required.');
  await dependentCard.getByRole('checkbox', { name: /I confirm that this dependency no longer applies/i }).check();
  await dependentCard.getByRole('button', { name: 'Remove dependency', exact: true }).click();
  await dependentCard.getByText('No work dependencies recorded.', { exact: true }).waitFor({ timeout: 30000 });
  assert.equal(await dependentCard.getByText('Depends on', { exact: true }).count(), 0, 'removed UI dependency remained visible as active');

  console.log('PASS: durable work dependencies preserve an acyclic same-workspace graph and work-state independence; exact-target authority, idempotency, duplicate/cycle/concurrency denial, audit rollback, reversible history, revocation, re-login persistence, keyboard focus, and desktop/390 px rendering passed.');
} finally {
  if (browser) await browser.close().catch(() => {});
  await stopApp().catch(() => {});
  await sql.end();
}
