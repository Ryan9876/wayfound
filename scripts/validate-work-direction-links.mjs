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
const emails = [0, 1].map(index => `work-direction-${index}-${randomUUID()}@example.test`);
const clients = [backend.client(), backend.client()];
const users = [];
const retryDelays = [150, 350, 750];
const base = 'http://127.0.0.1:3311';
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
    p_problem: 'Trace which work relies on accepted project direction without inventing impact state.',
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
async function createDecision(client, workspace, title) {
  return ok(await rpc(client, 'record_owner_decision', {
    p_workspace: workspace,
    p_title: title,
    p_decision: `${title} is accepted project direction.`,
    p_rationale: `The project needs ${title}.`,
    p_authority_confirm: true,
    p_request: randomUUID(),
  }));
}
async function createArtifact(client, workspace, title) {
  const artifactId = ok(await rpc(client, 'create_proposed_artifact', {
    p_workspace: workspace,
    p_title: title,
    p_kind: 'Project document',
    p_summary: `${title} captures accepted project direction.`,
    p_reference_label: `${title} reference`,
    p_reference_url: `https://example.test/${randomUUID()}`,
    p_request: randomUUID(),
  }));
  const artifacts = ok(await rpc(client, 'list_artifacts', { p_workspace: workspace }));
  const artifact = artifacts.find(item => item.id === artifactId);
  assert(artifact && artifact.versions.length === 1, `${title} artifact missing`);
  return { artifactId, versionId: artifact.versions[0].id };
}
async function acceptArtifact(client, workspace, artifactId, versionId) {
  return ok(await rpc(client, 'accept_artifact_version', {
    p_workspace: workspace,
    p_artifact: artifactId,
    p_version: versionId,
    p_authority_confirm: true,
    p_request: randomUUID(),
  }));
}
function decisionArgs(workspace, work, decision, reason, request = randomUUID()) {
  return {
    p_workspace: workspace,
    p_work_item: work,
    p_decision: decision,
    p_reason: reason,
    p_confirm: true,
    p_request: request,
  };
}
function artifactArgs(workspace, work, artifact, version, reason, request = randomUUID()) {
  return {
    p_workspace: workspace,
    p_work_item: work,
    p_artifact: artifact,
    p_version: version,
    p_reason: reason,
    p_confirm: true,
    p_request: request,
  };
}
function removeArgs(workspace, link, reason, request = randomUUID()) {
  return {
    p_workspace: workspace,
    p_link: link,
    p_reason: reason,
    p_confirm: true,
    p_request: request,
  };
}
async function listWork(client, workspace) {
  return ok(await rpc(client, 'list_work_items', { p_workspace: workspace }));
}
async function durableState(workspace) {
  const work = (await sql.query('select id,status,revision from wayfound.work_items where workspace_id=$1 order by id', [workspace])).rows;
  const decisions = (await sql.query('select id,status,revision from wayfound.decisions where workspace_id=$1 order by id', [workspace])).rows;
  const artifacts = (await sql.query('select id,revision,accepted_version_id from wayfound.artifacts where workspace_id=$1 order by id', [workspace])).rows;
  const versions = (await sql.query('select id,artifact_id,lifecycle,revision from wayfound.artifact_versions where workspace_id=$1 order by id', [workspace])).rows;
  const releases = (await sql.query('select id,lifecycle,current_stage,revision from wayfound.releases where workspace_id=$1', [workspace])).rows;
  return { work, decisions, artifacts, versions, releases };
}
async function startApp() {
  appServer = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3311'], {
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

try {
  for (let index = 0; index < 2; index++) {
    users.push(ok(await backend.admin.auth.admin.createUser({ email: emails[index], password, email_confirm: true })).user);
    ok(await clients[index].auth.signInWithPassword({ email: emails[index], password }));
  }

  const workspace = await createWorkspace(clients[0], 'Durable project-direction links');
  const foreignWorkspace = await createWorkspace(clients[1], 'Foreign direction workspace');
  const actor = (await sql.query('select id from wayfound.actors where provider_subject=$1', [users[0].id])).rows[0].id;
  const work = await createWork(clients[0], workspace, 'Dependent work');
  const foreignWork = await createWork(clients[1], foreignWorkspace, 'Foreign work');
  const decision = await createDecision(clients[0], workspace, 'Use staffed checkout');
  const foreignDecision = await createDecision(clients[1], foreignWorkspace, 'Foreign direction');
  const artifact = await createArtifact(clients[0], workspace, 'Accepted problem brief');
  const proposedArtifact = await createArtifact(clients[0], workspace, 'Still proposed brief');
  const foreignArtifact = await createArtifact(clients[1], foreignWorkspace, 'Foreign accepted brief');
  await acceptArtifact(clients[0], workspace, artifact.artifactId, artifact.versionId);
  await acceptArtifact(clients[1], foreignWorkspace, foreignArtifact.artifactId, foreignArtifact.versionId);

  const before = await durableState(workspace);
  const decisionRequest = randomUUID();
  const decisionPayload = decisionArgs(workspace, work, decision, 'This work implements the accepted staffed-checkout direction.', decisionRequest);
  const decisionLink = ok(await rpc(clients[0], 'link_work_to_decision', decisionPayload));
  assert.equal(ok(await rpc(clients[0], 'link_work_to_decision', decisionPayload)), decisionLink, 'identical decision-link replay changed result');
  expectedError(
    await rpc(clients[0], 'link_work_to_decision', { ...decisionPayload, p_reason: 'Changed replay payload.' }),
    'changed decision-link replay succeeded',
    '22023',
  );

  let listed = await listWork(clients[0], workspace);
  let workRecord = listed.find(item => item.id === work);
  assert(workRecord, 'work missing after decision link');
  const savedDecisionLink = workRecord.direction_links.find(link => link.id === decisionLink);
  assert(savedDecisionLink, 'decision link missing from work read model');
  assert.equal(savedDecisionLink.target_kind, 'Decision');
  assert.equal(savedDecisionLink.work_revision, 1);
  assert.equal(savedDecisionLink.decision_id, decision);
  assert.equal(savedDecisionLink.decision_revision, 1);
  assert.equal(savedDecisionLink.decision_status, 'Accepted');
  assert.equal(workRecord.direction_decision_candidates.some(item => item.id === decision), false, 'linked decision remained an eligible candidate');
  assert(workRecord.direction_artifact_candidates.some(item => item.artifact_id === artifact.artifactId), 'accepted artifact missing from candidate list');
  assert.equal(workRecord.direction_artifact_candidates.some(item => item.artifact_id === proposedArtifact.artifactId), false, 'proposed artifact appeared as eligible direction');
  assert.deepEqual(await durableState(workspace), before, 'decision link changed durable target/project state');

  expectedError(
    await rpc(clients[0], 'link_work_to_decision', decisionArgs(workspace, work, decision, 'Duplicate decision link.')),
    'duplicate active decision link succeeded',
    '55000',
  );
  expectedError(
    await rpc(clients[0], 'link_work_to_decision', decisionArgs(workspace, work, foreignDecision, 'Cross-workspace decision link.')),
    'cross-workspace decision link succeeded',
    '23503',
  );
  expectedError(
    await rpc(clients[1], 'link_work_to_decision', decisionArgs(workspace, work, decision, 'Foreign owner direction link.')),
    'foreign owner created decision link',
    '42501',
  );
  expectedError(
    await rpc(clients[0], 'link_work_to_artifact', artifactArgs(workspace, work, proposedArtifact.artifactId, proposedArtifact.versionId, 'Proposed artifact must not be direction.')),
    'proposed artifact linked as accepted direction',
    '55000',
  );
  expectedError(
    await rpc(clients[0], 'link_work_to_artifact', artifactArgs(workspace, work, artifact.artifactId, proposedArtifact.versionId, 'Cross-artifact version mismatch.')),
    'cross-artifact version linked',
    '23503',
  );
  expectedError(
    await rpc(clients[0], 'link_work_to_artifact', artifactArgs(workspace, work, foreignArtifact.artifactId, foreignArtifact.versionId, 'Cross-workspace artifact link.')),
    'cross-workspace artifact link succeeded',
    '23503',
  );
  expectedError(
    await rpc(clients[0], 'link_work_to_decision', decisionArgs(workspace, foreignWork, decision, 'Foreign work target.')),
    'cross-workspace work linked',
    '23503',
  );
  expectedError(
    await clients[0].schema('wayfound').from('work_direction_links').insert({
      workspace_id: workspace,
      work_item_id: work,
      work_revision: 1,
      target_kind: 'Decision',
      decision_id: decision,
      decision_revision: 1,
      reason: 'Direct insert must fail.',
      created_by_actor_id: actor,
    }),
    'direct protected direction-link insert succeeded',
  );

  const artifactRequest = randomUUID();
  const artifactPayload = artifactArgs(workspace, work, artifact.artifactId, artifact.versionId, 'This work relies on the accepted problem brief.', artifactRequest);
  const artifactLink = ok(await rpc(clients[0], 'link_work_to_artifact', artifactPayload));
  assert.equal(ok(await rpc(clients[0], 'link_work_to_artifact', artifactPayload)), artifactLink, 'identical artifact-link replay changed result');
  expectedError(
    await rpc(clients[0], 'link_work_to_artifact', { ...artifactPayload, p_reason: 'Changed artifact replay.' }),
    'changed artifact-link replay succeeded',
    '22023',
  );
  listed = await listWork(clients[0], workspace);
  workRecord = listed.find(item => item.id === work);
  const savedArtifactLink = workRecord.direction_links.find(link => link.id === artifactLink);
  assert(savedArtifactLink, 'artifact link missing from work read model');
  assert.equal(savedArtifactLink.target_kind, 'Artifact');
  assert.equal(savedArtifactLink.work_revision, 1);
  assert.equal(savedArtifactLink.artifact_id, artifact.artifactId);
  assert.equal(savedArtifactLink.artifact_revision, 2);
  assert.equal(savedArtifactLink.artifact_version_id, artifact.versionId);
  assert.equal(savedArtifactLink.artifact_version_revision, 2);
  assert.equal(savedArtifactLink.artifact_current_accepted_version_id, artifact.versionId);
  assert.equal(workRecord.direction_artifact_candidates.some(item => item.artifact_id === artifact.artifactId), false, 'linked artifact remained an eligible candidate');
  assert.deepEqual(await durableState(workspace), before, 'artifact link changed durable target/project state');

  expectedError(
    await rpc(clients[0], 'link_work_to_artifact', artifactArgs(workspace, work, artifact.artifactId, artifact.versionId, 'Duplicate artifact link.')),
    'duplicate active artifact link succeeded',
    '55000',
  );

  const concurrentWork = await createWork(clients[0], workspace, 'Concurrent linked work');
  const concurrentDecision = await createDecision(clients[0], workspace, 'Concurrent accepted direction');
  const concurrent = await Promise.all([
    rpc(clients[0], 'link_work_to_decision', decisionArgs(workspace, concurrentWork, concurrentDecision, 'Concurrent direction one.')),
    rpc(clients[0], 'link_work_to_decision', decisionArgs(workspace, concurrentWork, concurrentDecision, 'Concurrent direction two.')),
  ]);
  assert.equal(concurrent.filter(result => !result.error).length, 1, 'concurrent same-target links did not produce one winner');
  expectedError(concurrent.find(result => result.error), 'concurrent same-target loser unexpectedly succeeded');
  assert.equal((await sql.query("select count(*)::int n from wayfound.work_direction_links where workspace_id=$1 and work_item_id=$2 and target_kind='Decision' and decision_id=$3 and removed_at is null", [workspace, concurrentWork, concurrentDecision])).rows[0].n, 1, 'concurrent requests created more than one active direction link');

  const rollbackWork = await createWork(clients[0], workspace, 'Rollback direction work');
  const rollbackDecision = await createDecision(clients[0], workspace, 'Rollback accepted direction');
  const rollbackCreateRequest = randomUUID();
  const rollbackCreate = decisionArgs(workspace, rollbackWork, rollbackDecision, 'Creation should roll back if audit fails.', rollbackCreateRequest);
  await sql.query(`create function wayfound.test_direction_add_failure() returns trigger language plpgsql as $$begin if new.operation='work_item.direction_link_added' then raise exception 'Injected direction add audit failure'; end if; return new; end$$; create trigger test_direction_add_failure before insert on wayfound.audit_events for each row execute function wayfound.test_direction_add_failure()`);
  try {
    expectedError(await rpc(clients[0], 'link_work_to_decision', rollbackCreate), 'direction add audit failure did not fail');
  } finally {
    await sql.query('drop trigger test_direction_add_failure on wayfound.audit_events; drop function wayfound.test_direction_add_failure()');
  }
  assert.equal((await sql.query('select count(*)::int n from wayfound.work_direction_links where workspace_id=$1 and work_item_id=$2 and decision_id=$3', [workspace, rollbackWork, rollbackDecision])).rows[0].n, 0, 'failed direction add committed a row');
  assert.equal((await sql.query('select count(*)::int n from wayfound.work_direction_link_create_requests where actor_id=$1 and request_id=$2', [actor, rollbackCreateRequest])).rows[0].n, 0, 'failed direction add retained request result');
  const rollbackLink = ok(await rpc(clients[0], 'link_work_to_decision', rollbackCreate));

  const rollbackRemoveRequest = randomUUID();
  const rollbackRemove = removeArgs(workspace, rollbackLink, 'Removal should roll back if audit fails.', rollbackRemoveRequest);
  await sql.query(`create function wayfound.test_direction_remove_failure() returns trigger language plpgsql as $$begin if new.operation='work_item.direction_link_removed' then raise exception 'Injected direction remove audit failure'; end if; return new; end$$; create trigger test_direction_remove_failure before insert on wayfound.audit_events for each row execute function wayfound.test_direction_remove_failure()`);
  try {
    expectedError(await rpc(clients[0], 'remove_work_direction_link', rollbackRemove), 'direction remove audit failure did not fail');
  } finally {
    await sql.query('drop trigger test_direction_remove_failure on wayfound.audit_events; drop function wayfound.test_direction_remove_failure()');
  }
  assert.equal((await sql.query('select removed_at from wayfound.work_direction_links where id=$1', [rollbackLink])).rows[0].removed_at, null, 'failed direction remove changed active link');
  assert.equal((await sql.query('select count(*)::int n from wayfound.work_direction_link_remove_requests where actor_id=$1 and request_id=$2', [actor, rollbackRemoveRequest])).rows[0].n, 0, 'failed direction remove retained request result');
  assert.equal(ok(await rpc(clients[0], 'remove_work_direction_link', rollbackRemove)), rollbackLink, 'retry after rollback did not remove link');

  const removeRequest = randomUUID();
  const removeDecision = removeArgs(workspace, decisionLink, 'The work no longer relies on this decision.', removeRequest);
  assert.equal(ok(await rpc(clients[0], 'remove_work_direction_link', removeDecision)), decisionLink);
  assert.equal(ok(await rpc(clients[0], 'remove_work_direction_link', removeDecision)), decisionLink, 'identical remove replay changed result');
  expectedError(
    await rpc(clients[0], 'remove_work_direction_link', { ...removeDecision, p_reason: 'Changed remove replay.' }),
    'changed remove replay succeeded',
    '22023',
  );
  expectedError(
    await rpc(clients[0], 'remove_work_direction_link', removeArgs(workspace, decisionLink, 'Second distinct removal.')),
    'inactive direction link removed twice',
    '55000',
  );
  const removed = (await sql.query('select work_item_id,work_revision,target_kind,decision_id,decision_revision,reason,created_by_actor_id,created_at,removed_by_actor_id,removed_reason,removed_at from wayfound.work_direction_links where id=$1', [decisionLink])).rows[0];
  assert.equal(removed.work_item_id, work);
  assert.equal(removed.work_revision, 1);
  assert.equal(removed.target_kind, 'Decision');
  assert.equal(removed.decision_id, decision);
  assert.equal(removed.decision_revision, 1);
  assert.equal(removed.created_by_actor_id, actor);
  assert(removed.created_at && removed.removed_at);
  assert.equal(removed.removed_by_actor_id, actor);
  assert.equal(removed.removed_reason, removeDecision.p_reason);
  listed = await listWork(clients[0], workspace);
  workRecord = listed.find(item => item.id === work);
  assert.equal(workRecord.direction_links.some(link => link.id === decisionLink), false, 'removed decision link remained active in read model');
  assert(workRecord.direction_decision_candidates.some(item => item.id === decision), 'removed decision did not return to eligible candidates');
  const recreatedDecisionLink = ok(await rpc(clients[0], 'link_work_to_decision', decisionArgs(workspace, work, decision, 'The decision is relied on again after explicit removal.')));
  assert.notEqual(recreatedDecisionLink, decisionLink, 're-created decision link reused removed identity');

  const revokedWork = await createWork(clients[0], workspace, 'Revoked direction work');
  const revokedDecision = await createDecision(clients[0], workspace, 'Revoked direction target');
  await sql.query('delete from wayfound.memberships where workspace_id=$1 and actor_id=$2', [workspace, actor]);
  try {
    expectedError(
      await rpc(clients[0], 'link_work_to_decision', decisionArgs(workspace, revokedWork, revokedDecision, 'Must fail while membership is revoked.')),
      'revoked owner created direction link',
      '42501',
    );
    assert.deepEqual(await listWork(clients[0], workspace), [], 'revoked owner still listed work direction links');
  } finally {
    await sql.query("insert into wayfound.memberships(workspace_id,actor_id,role) values($1,$2,'owner')", [workspace, actor]);
  }

  ok(await clients[0].auth.signOut({ scope: 'local' }));
  ok(await clients[0].auth.signInWithPassword({ email: emails[0], password }));
  listed = await listWork(clients[0], workspace);
  workRecord = listed.find(item => item.id === work);
  assert(workRecord.direction_links.some(link => link.id === artifactLink), 'artifact direction link did not survive re-login');
  assert(workRecord.direction_links.some(link => link.id === recreatedDecisionLink), 're-created decision direction link did not survive re-login');
  assert((await sql.query('select removed_at from wayfound.work_direction_links where id=$1', [decisionLink])).rows[0].removed_at, 'removed direction history did not survive re-login');

  const uiWorkTitle = `UI direction work ${randomUUID().slice(0, 8)}`;
  const uiDecisionTitle = `UI accepted decision ${randomUUID().slice(0, 8)}`;
  const uiArtifactTitle = `UI accepted document ${randomUUID().slice(0, 8)}`;
  const uiWork = await createWork(clients[0], workspace, uiWorkTitle);
  const uiDecision = await createDecision(clients[0], workspace, uiDecisionTitle);
  const uiArtifact = await createArtifact(clients[0], workspace, uiArtifactTitle);
  await acceptArtifact(clients[0], workspace, uiArtifact.artifactId, uiArtifact.versionId);

  await startApp();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await login(page, emails[0]);
  await page.goto(`${base}/workspaces/${workspace}?view=work#work-item-${uiWork}`);
  const card = page.locator(`#work-item-${uiWork}`);
  await card.locator('summary').filter({ hasText: /^Link project direction$/ }).click();
  const target = card.getByLabel('What accepted project direction does this work rely on?');
  await target.selectOption(`decision:${uiDecision}`);
  await card.getByLabel('Why does this work rely on it?').fill('The UI work follows the accepted decision.');
  await card.getByRole('checkbox', { name: /I confirm that this work relies on the selected accepted project direction/i }).check();
  await card.getByRole('button', { name: 'Link project direction', exact: true }).click();
  await card.getByText('Relies on', { exact: true }).waitFor({ timeout: 30000 });
  assert(await card.getByText(uiDecisionTitle, { exact: true }).isVisible(), 'UI decision link is not visible');

  await card.locator('summary').filter({ hasText: /^Link project direction$/ }).click();
  await card.getByLabel('What accepted project direction does this work rely on?').selectOption(`artifact:${uiArtifact.artifactId}:${uiArtifact.versionId}`);
  await card.getByLabel('Why does this work rely on it?').fill('The UI work follows the accepted document.');
  await card.getByRole('checkbox', { name: /I confirm that this work relies on the selected accepted project direction/i }).check();
  await card.getByRole('button', { name: 'Link project direction', exact: true }).click();
  await card.getByText(uiArtifactTitle, { exact: true }).waitFor({ timeout: 30000 });
  assert.equal((await listWork(clients[0], workspace)).find(item => item.id === uiWork).status, 'Proposed', 'UI direction link changed work status');
  assert.equal(await card.getByText(/affected|stale|safe|verified|resolved/i).count(), 0, 'direction-link UI manufactured impact or verification state');

  const addSummary = card.locator('summary').filter({ hasText: /^Link project direction$/ });
  await addSummary.focus();
  assert(await addSummary.evaluate(element => element === document.activeElement), 'direction-link disclosure is not keyboard focusable');
  await assertUniqueIds(page);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'direction-link desktop view overflow');
  await page.screenshot({ path: `${outputDir}/work-direction-links-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await assertUniqueIds(page);
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'direction-link mobile view overflow');
  await page.screenshot({ path: `${outputDir}/work-direction-links-mobile.png`, fullPage: true });

  const decisionEntry = card.locator('.entry-note').filter({ hasText: uiDecisionTitle });
  const removeSummary = decisionEntry.locator('summary').filter({ hasText: /^Remove project-direction link$/ });
  await removeSummary.click();
  await decisionEntry.getByLabel('Why does this work no longer rely on this project direction?').fill('The UI decision is no longer required by this work.');
  await decisionEntry.getByRole('checkbox', { name: /I confirm that this reliance link no longer applies/i }).check();
  await decisionEntry.getByRole('button', { name: 'Remove project-direction link', exact: true }).click();
  await card.getByText(uiDecisionTitle, { exact: true }).waitFor({ state: 'hidden', timeout: 30000 });
  assert(await card.getByText(uiArtifactTitle, { exact: true }).isVisible(), 'removing one UI direction link removed another active link');

  console.log('PASS: durable work-to-project-direction links record owner-confirmed reliance on accepted decisions and exact accepted artifact versions without inventing impact state; target eligibility, authoritative snapshots, no lifecycle side effects, duplicate/concurrency denial, idempotency, audit rollback, reversible history, revocation, re-login persistence, unique IDs, keyboard focus, and desktop/390 px rendering passed.');
} finally {
  if (browser) await browser.close().catch(() => {});
  await stopApp().catch(() => {});
  await sql.end();
}
