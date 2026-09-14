import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { localBackend } from './local-backend.mjs';

const backend = localBackend();
const sql = backend.sql;
await sql.connect();

const password = randomBytes(24).toString('base64url');
const emails = ['owner','specialist','outsider','owner-b'].map(label => `specialist-review-${label}-${randomUUID()}@example.test`);
const clients = emails.map(() => backend.client());
const users = [];
const retryDelays = [150, 350, 750];
const base = 'http://127.0.0.1:3104';
const output = 'artifacts/workspace';
mkdirSync(output, { recursive: true });
let server;
let browser;
let dbPaused = false;
let referenceHits = 0;

const referenceServer = createServer((request, response) => {
  referenceHits += 1;
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end(`Unexpected fetch: ${request.url}`);
});
await new Promise((resolve, reject) => {
  referenceServer.once('error', reject);
  referenceServer.listen(3197, '127.0.0.1', resolve);
});
const referenceUrl = 'http://127.0.0.1:3197/specialist-review-artifact';

function ok(result) {
  if (result.error) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}

function jwtFuture(error) {
  return error?.code === 'PGRST303' && error.message === 'JWT issued at future';
}

function expectedError(result, message, code) {
  assert(result.error, message);
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

async function revokedRpc(accessToken, name, body) {
  let response;
  let responseBody;
  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    response = await fetch(`${backend.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: { apikey: backend.key, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
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
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3104'], {
    env: { ...process.env, SUPABASE_URL: backend.url, SUPABASE_PUBLISHABLE_KEY: backend.key, APP_ORIGIN: base },
    stdio: 'ignore',
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(`${base}/sign-in`)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Specialist review validation application did not start');
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
    const targets = await page.locator('a[href],button:not([disabled]),input:not([type=hidden]),textarea,select').evaluateAll(elements =>
      elements.filter(element => element.getBoundingClientRect().width > 0).map((element, index) => {
        element.dataset.specialistReviewFocusId = String(index);
        return String(index);
      }),
    );
    const seen = new Set();
    for (let index = 0; index < targets.length + 5; index++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const element = document.activeElement;
        const style = getComputedStyle(element);
        return { id: element?.getAttribute('data-specialist-review-focus-id'), width: parseFloat(style.outlineWidth), style: style.outlineStyle };
      });
      if (focused.id !== null) {
        seen.add(focused.id);
        assert(focused.width >= 1 && focused.style !== 'none', `${name} ${label} missing focus`);
      }
    }
    assert.equal(seen.size, targets.length, `${name} ${label} unreachable controls`);
  }
}

async function createWorkspace(client, label) {
  return ok(await rpc(client, 'create_workspace', {
    p_name: `${label} specialist review workspace`,
    p_problem: 'Keep product-owner direction distinct from qualified specialist judgment.',
    p_release: 'Release 1.0',
    p_request: randomUUID(),
  }));
}

async function createArtifact(client, workspaceId, title, url = referenceUrl) {
  const artifactId = ok(await rpc(client, 'create_proposed_artifact', {
    p_workspace: workspaceId,
    p_title: title,
    p_kind: 'Architecture brief',
    p_summary: `${title} is bounded project direction that may require specialist judgment.`,
    p_reference_label: `${title} source`,
    p_reference_url: url,
    p_request: randomUUID(),
  }));
  const artifacts = ok(await rpc(client, 'list_artifacts', { p_workspace: workspaceId }));
  const artifact = artifacts.find(item => item.id === artifactId);
  assert(artifact);
  return { artifactId, version: artifact.versions[0] };
}

async function acceptArtifact(client, workspaceId, artifact) {
  ok(await rpc(client, 'accept_artifact_version', {
    p_workspace: workspaceId,
    p_artifact: artifact.artifactId,
    p_version: artifact.version.id,
    p_authority_confirm: true,
    p_request: randomUUID(),
  }));
  return ok(await rpc(client, 'list_artifacts', { p_workspace: workspaceId })).find(item => item.id === artifact.artifactId);
}

const validReview = assignmentId => ({
  p_assignment: assignmentId,
  p_reviewer_name: 'Alex Specialist',
  p_competence_statement: 'Application security engineer experienced in authorization boundaries and transactional access control.',
  p_conclusion: 'No blocking finding',
  p_summary: 'The accepted direction preserves the reviewed authorization boundary within the assigned scope.',
  p_findings: 'No blocking authorization finding was identified. Review is limited to the assigned access-control question.',
  p_competence_confirm: true,
  p_request: randomUUID(),
});

try {
  for (let index = 0; index < emails.length; index++) {
    users.push(ok(await backend.admin.auth.admin.createUser({ email: emails[index], password, email_confirm: true })).user);
    ok(await clients[index].auth.signInWithPassword({ email: emails[index], password }));
  }

  const ownerWorkspace = await createWorkspace(clients[0], 'Owner A');
  const otherWorkspace = await createWorkspace(clients[3], 'Owner B');
  const ownerActorId = (await sql.query('select id from wayfound.actors where provider_subject=$1', [users[0].id])).rows[0].id;
  const specialistCode = ok(await rpc(clients[1], 'ensure_specialist_reviewer_identity'));
  const outsiderCode = ok(await rpc(clients[2], 'ensure_specialist_reviewer_identity'));
  assert.equal(ok(await rpc(clients[1], 'ensure_specialist_reviewer_identity')), specialistCode, 'reviewer code changed');
  assert.equal((await sql.query('select count(*)::int n from wayfound.memberships where actor_id=$1', [specialistCode])).rows[0].n, 0, 'reviewer identity created workspace membership');
  assert.deepEqual(ok(await rpc(clients[1], 'list_workspaces')), [], 'specialist unexpectedly has workspace access');

  const primary = await createArtifact(clients[0], ownerWorkspace, 'Authorization architecture');
  const proposed = await createArtifact(clients[0], ownerWorkspace, 'Proposed follow-up');
  const uiArtifact = await createArtifact(clients[0], ownerWorkspace, 'Session boundary design');
  const rollbackArtifact = await createArtifact(clients[0], ownerWorkspace, 'Rollback review target');
  const foreign = await createArtifact(clients[3], otherWorkspace, 'Foreign architecture', 'https://example.test/foreign-specialist-review');
  await acceptArtifact(clients[0], ownerWorkspace, primary);
  await acceptArtifact(clients[0], ownerWorkspace, uiArtifact);
  await acceptArtifact(clients[0], ownerWorkspace, rollbackArtifact);
  await acceptArtifact(clients[3], otherWorkspace, foreign);
  const artifactBaseline = ok(await rpc(clients[0], 'list_artifacts', { p_workspace: ownerWorkspace }));
  const releaseBaseline = ok(await rpc(clients[0], 'open_workspace', { p_id: ownerWorkspace })).release;
  assert.equal(referenceHits, 0, 'artifact setup fetched external reference');

  const assignmentBase = {
    p_workspace: ownerWorkspace,
    p_artifact: primary.artifactId,
    p_version: primary.version.id,
    p_reviewer: specialistCode,
    p_requested_competence: 'Application security and authorization boundaries',
    p_review_question: 'Does this accepted direction preserve the intended owner and specialist authority boundaries?',
    p_scope_confirm: true,
  };

  expectedError(await clients[0].rpc('assign_specialist_review', { ...assignmentBase, p_scope_confirm: false, p_request: randomUUID() }), 'assignment without scope confirmation succeeded', '22023');
  expectedError(await clients[0].rpc('assign_specialist_review', { ...assignmentBase, p_reviewer: ownerActorId, p_request: randomUUID() }), 'owner self-assignment succeeded', '22023');
  expectedError(await clients[0].rpc('assign_specialist_review', { ...assignmentBase, p_reviewer: randomUUID(), p_request: randomUUID() }), 'unknown reviewer assignment succeeded', '23503');
  expectedError(await clients[0].rpc('assign_specialist_review', { ...assignmentBase, p_artifact: proposed.artifactId, p_version: proposed.version.id, p_request: randomUUID() }), 'proposed artifact assignment succeeded', '55000');
  expectedError(await clients[0].rpc('assign_specialist_review', { ...assignmentBase, p_version: uiArtifact.version.id, p_request: randomUUID() }), 'cross-artifact assignment succeeded', '23503');
  expectedError(await clients[0].rpc('assign_specialist_review', { ...assignmentBase, p_artifact: foreign.artifactId, p_version: foreign.version.id, p_request: randomUUID() }), 'cross-workspace assignment succeeded', '23503');
  expectedError(await clients[1].rpc('assign_specialist_review', { ...assignmentBase, p_request: randomUUID() }), 'specialist assigned owner workspace review', '42501');
  expectedError(await backend.client().rpc('assign_specialist_review', { ...assignmentBase, p_request: randomUUID() }), 'anonymous assignment succeeded');

  const assignmentRequest = randomUUID();
  const assignmentResults = await Promise.all([
    rpc(clients[0], 'assign_specialist_review', { ...assignmentBase, p_request: assignmentRequest }),
    rpc(clients[0], 'assign_specialist_review', { ...assignmentBase, p_request: assignmentRequest }),
  ]);
  const assignmentId = ok(assignmentResults[0]);
  assert.equal(ok(assignmentResults[1]), assignmentId, 'concurrent assignment retry produced different ID');
  expectedError(await clients[0].rpc('assign_specialist_review', { ...assignmentBase, p_review_question: 'Changed question', p_request: assignmentRequest }), 'changed assignment retry succeeded', '22023');
  expectedError(await clients[0].rpc('assign_specialist_review', { ...assignmentBase, p_request: randomUUID() }), 'second assignment for same reviewer/version succeeded', '55000');

  const ownerAssignments = ok(await rpc(clients[0], 'list_owner_specialist_reviews', { p_workspace: ownerWorkspace }));
  assert.equal(ownerAssignments.filter(item => item.id === assignmentId).length, 1);
  const specialistAssignments = ok(await rpc(clients[1], 'list_my_specialist_reviews'));
  assert(specialistAssignments.some(item => item.id === assignmentId));
  assert.deepEqual(ok(await rpc(clients[2], 'list_my_specialist_reviews')), [], 'unrelated reviewer can see assignment');
  assert.equal(specialistAssignments.find(item => item.id === assignmentId).reference_url, referenceUrl);
  assert.equal(referenceHits, 0, 'listing specialist assignment fetched external reference');

  expectedError(await clients[1].rpc('record_owner_decision', {
    p_workspace: ownerWorkspace,
    p_title: 'Unauthorized specialist decision',
    p_decision: 'Specialist should not have owner authority.',
    p_rationale: 'Authorization regression test.',
    p_authority_confirm: true,
    p_request: randomUUID(),
  }), 'specialist executed owner decision mutation', '42501');
  expectedError(await clients[1].rpc('accept_artifact_version', {
    p_workspace: ownerWorkspace,
    p_artifact: proposed.artifactId,
    p_version: proposed.version.id,
    p_authority_confirm: true,
    p_request: randomUUID(),
  }), 'specialist executed owner artifact acceptance', '42501');

  const invalidReview = validReview(assignmentId);
  expectedError(await clients[1].rpc('record_specialist_review', { ...invalidReview, p_competence_confirm: false }), 'review without competence confirmation succeeded', '22023');
  expectedError(await clients[1].rpc('record_specialist_review', { ...invalidReview, p_conclusion: 'Verified', p_request: randomUUID() }), 'invalid review conclusion succeeded', '22023');
  expectedError(await clients[0].rpc('record_specialist_review', validReview(assignmentId)), 'owner submitted specialist review', '42501');
  expectedError(await clients[2].rpc('record_specialist_review', validReview(assignmentId)), 'unassigned reviewer submitted specialist review', '42501');
  expectedError(await clients[1].rpc('record_specialist_review', validReview(randomUUID())), 'unknown assignment review succeeded', '42501');

  const reviewRequest = randomUUID();
  const reviewArgs = { ...validReview(assignmentId), p_request: reviewRequest };
  const reviewResults = await Promise.all([
    rpc(clients[1], 'record_specialist_review', reviewArgs),
    rpc(clients[1], 'record_specialist_review', reviewArgs),
  ]);
  const reviewId = ok(reviewResults[0]);
  assert.equal(ok(reviewResults[1]), reviewId, 'concurrent review retry produced different ID');
  expectedError(await clients[1].rpc('record_specialist_review', { ...reviewArgs, p_summary: 'Changed summary' }), 'changed review retry succeeded', '22023');
  expectedError(await clients[1].rpc('record_specialist_review', { ...validReview(assignmentId), p_request: randomUUID() }), 'second review for completed assignment succeeded', '55000');

  const reviewedAssignment = ok(await rpc(clients[0], 'list_owner_specialist_reviews', { p_workspace: ownerWorkspace })).find(item => item.id === assignmentId);
  assert.equal(reviewedAssignment.status, 'Reviewed');
  assert.equal(reviewedAssignment.review.id, reviewId);
  assert.equal(reviewedAssignment.review.reviewer_actor_id, specialistCode);
  assert.equal(reviewedAssignment.review.reviewer_name, 'Alex Specialist');
  assert.equal(reviewedAssignment.review.conclusion, 'No blocking finding');
  const baselinePrimary = artifactBaseline.find(item => item.id === primary.artifactId);
  assert.equal(reviewedAssignment.review.artifact_revision, baselinePrimary.revision);
  assert.equal(reviewedAssignment.review.artifact_version_revision, baselinePrimary.versions[0].revision);
  assert.deepEqual(ok(await rpc(clients[0], 'list_artifacts', { p_workspace: ownerWorkspace })), artifactBaseline, 'specialist review altered artifact state');
  assert.deepEqual(ok(await rpc(clients[0], 'open_workspace', { p_id: ownerWorkspace })).release, releaseBaseline, 'specialist review altered release state');
  assert.equal(referenceHits, 0, 'specialist review fetched external reference');

  expectedError(await clients[0].schema('wayfound').from('specialist_review_assignments').select('*'), 'private specialist assignment read succeeded');
  expectedError(await clients[1].schema('wayfound').from('specialist_reviews').select('*'), 'private specialist review read succeeded');
  expectedError(await clients[1].schema('wayfound').from('specialist_review_assignments').update({ status: 'Reviewed' }).eq('id', assignmentId), 'direct specialist assignment write succeeded');

  const assignmentAuditBefore = (await sql.query("select count(*)::int n from wayfound.audit_events where workspace_id=$1 and operation='specialist_review.assigned'", [ownerWorkspace])).rows[0].n;
  await sql.query(`create function wayfound.test_specialist_assignment_failure() returns trigger language plpgsql as $$begin if new.operation='specialist_review.assigned' then raise exception 'Injected specialist assignment audit failure'; end if; return new; end$$; create trigger test_specialist_assignment_failure before insert on wayfound.audit_events for each row execute function wayfound.test_specialist_assignment_failure()`);
  try {
    expectedError(await clients[0].rpc('assign_specialist_review', {
      ...assignmentBase,
      p_artifact: uiArtifact.artifactId,
      p_version: uiArtifact.version.id,
      p_request: randomUUID(),
    }), 'injected specialist assignment failure succeeded');
  } finally {
    await sql.query('drop trigger test_specialist_assignment_failure on wayfound.audit_events; drop function wayfound.test_specialist_assignment_failure()');
  }
  assert.equal((await sql.query("select count(*)::int n from wayfound.audit_events where workspace_id=$1 and operation='specialist_review.assigned'", [ownerWorkspace])).rows[0].n, assignmentAuditBefore);
  assert.equal((await sql.query('select count(*)::int n from wayfound.specialist_review_assignments where artifact_version_id=$1 and reviewer_actor_id=$2', [uiArtifact.version.id, specialistCode])).rows[0].n, 0, 'failed assignment left durable state');

  const rollbackAssignmentId = ok(await rpc(clients[0], 'assign_specialist_review', {
    ...assignmentBase,
    p_artifact: rollbackArtifact.artifactId,
    p_version: rollbackArtifact.version.id,
    p_request: randomUUID(),
  }));
  const reviewAuditBefore = (await sql.query("select count(*)::int n from wayfound.audit_events where workspace_id=$1 and operation='specialist_review.recorded'", [ownerWorkspace])).rows[0].n;
  await sql.query(`create function wayfound.test_specialist_review_failure() returns trigger language plpgsql as $$begin if new.operation='specialist_review.recorded' then raise exception 'Injected specialist review audit failure'; end if; return new; end$$; create trigger test_specialist_review_failure before insert on wayfound.audit_events for each row execute function wayfound.test_specialist_review_failure()`);
  try {
    expectedError(await clients[1].rpc('record_specialist_review', validReview(rollbackAssignmentId)), 'injected specialist review failure succeeded');
  } finally {
    await sql.query('drop trigger test_specialist_review_failure on wayfound.audit_events; drop function wayfound.test_specialist_review_failure()');
  }
  assert.equal((await sql.query("select count(*)::int n from wayfound.audit_events where workspace_id=$1 and operation='specialist_review.recorded'", [ownerWorkspace])).rows[0].n, reviewAuditBefore);
  assert.equal((await sql.query('select count(*)::int n from wayfound.specialist_reviews where assignment_id=$1', [rollbackAssignmentId])).rows[0].n, 0, 'failed review left review state');
  assert.equal((await sql.query('select status from wayfound.specialist_review_assignments where id=$1', [rollbackAssignmentId])).rows[0].status, 'Pending', 'failed review completed assignment');

  const revokedArtifact = await createArtifact(clients[0], ownerWorkspace, 'Revoked assignment target');
  await acceptArtifact(clients[0], ownerWorkspace, revokedArtifact);
  const revokedAssignmentId = ok(await rpc(clients[0], 'assign_specialist_review', {
    ...assignmentBase,
    p_artifact: revokedArtifact.artifactId,
    p_version: revokedArtifact.version.id,
    p_request: randomUUID(),
  }));
  await sql.query('delete from wayfound.specialist_assignment_requests where assignment_id=$1', [revokedAssignmentId]);
  await sql.query('delete from wayfound.specialist_review_assignments where id=$1', [revokedAssignmentId]);
  expectedError(await clients[1].rpc('record_specialist_review', validReview(revokedAssignmentId)), 'revoked assignment submitted review', '42501');

  const ownerMembership = (await sql.query('select actor_id,role from wayfound.memberships where workspace_id=$1 and actor_id=$2', [ownerWorkspace, ownerActorId])).rows[0];
  await sql.query('delete from wayfound.memberships where workspace_id=$1 and actor_id=$2', [ownerWorkspace, ownerActorId]);
  expectedError(await clients[0].rpc('assign_specialist_review', { ...assignmentBase, p_reviewer: outsiderCode, p_request: randomUUID() }), 'membership-revoked owner assigned review', '42501');
  await sql.query('insert into wayfound.memberships(workspace_id,actor_id,role) values($1,$2,$3)', [ownerWorkspace, ownerMembership.actor_id, ownerMembership.role]);

  await sql.query("update auth.sessions set not_after=now()-interval '1 minute' where user_id=$1", [users[1].id]);
  expectedError(await clients[1].rpc('record_specialist_review', validReview(rollbackAssignmentId)), 'expired specialist session submitted review');
  await sql.query('update auth.sessions set not_after=null where user_id=$1', [users[1].id]);

  const signedOut = backend.client();
  ok(await signedOut.auth.signInWithPassword({ email: emails[1], password }));
  ok(await signedOut.auth.signOut());
  expectedError(await signedOut.rpc('record_specialist_review', validReview(rollbackAssignmentId)), 'signed-out specialist submitted review');

  const protectedAccess = ok(await clients[1].auth.getSession()).session.access_token;
  await sql.query('delete from auth.sessions where user_id=$1', [users[1].id]);
  await revokedRpc(protectedAccess, 'record_specialist_review', validReview(rollbackAssignmentId));
  ok(await clients[1].auth.signInWithPassword({ email: emails[1], password }));

  await start();
  browser = await chromium.launch({ headless: true });
  let ownerContext = await browser.newContext();
  let ownerPage = await ownerContext.newPage();
  await login(ownerPage, emails[0]);
  const workspaceUrl = `${base}/workspaces/${ownerWorkspace}`;
  await ownerPage.goto(workspaceUrl);
  const uiCard = ownerPage.locator(`#artifact-${uiArtifact.artifactId}`);
  await uiCard.getByText('Status: Accepted', { exact: true }).waitFor({ timeout: 30000 });
  await uiCard.getByLabel('Reviewer code', { exact: true }).fill(specialistCode);
  await uiCard.getByLabel('Requested competence', { exact: true }).fill('Application security and session authorization');
  await uiCard.getByLabel('Review question', { exact: true }).fill('Does this accepted session-boundary design keep specialist authority separate from product-owner authority?');
  await uiCard.getByRole('checkbox').check();
  await uiCard.getByRole('button', { name: 'Assign specialist review', exact: true }).click();
  await ownerPage.waitForURL(url => url.pathname === new URL(workspaceUrl).pathname && url.hash === `#artifact-${uiArtifact.artifactId}`);

  let specialistMine = ok(await rpc(clients[1], 'list_my_specialist_reviews'));
  const uiAssignment = specialistMine.find(item => item.artifact_id === uiArtifact.artifactId);
  assert(uiAssignment, 'UI assignment was not persisted');

  let specialistContext = await browser.newContext();
  let specialistPage = await specialistContext.newPage();
  await login(specialistPage, emails[1]);
  await specialistPage.getByRole('link', { name: 'Specialist reviews', exact: true }).click();
  await specialistPage.waitForURL(`${base}/specialist-reviews`);
  await specialistPage.getByText(specialistCode, { exact: true }).waitFor({ timeout: 30000 });
  const assignmentCard = specialistPage.locator(`#assignment-${uiAssignment.id}`);
  await assignmentCard.getByText('Status: Pending', { exact: true }).waitFor({ timeout: 30000 });
  await assignmentCard.getByLabel('Reviewer name', { exact: true }).fill('Alex Specialist');
  await assignmentCard.getByLabel('Competence statement', { exact: true }).fill('Application security engineer with experience reviewing session authorization and access boundaries.');
  await assignmentCard.getByLabel('Specialist review conclusion', { exact: true }).selectOption('Advisory');
  await assignmentCard.getByLabel('Review summary', { exact: true }).fill('The session-boundary direction is coherent within the assigned security review scope.');
  await assignmentCard.getByLabel('Findings', { exact: true }).fill('Keep live-session validation and exact assignment authorization. This review does not verify end-to-end release behavior.');
  await assignmentCard.getByRole('checkbox').check();
  await assignmentCard.getByRole('button', { name: 'Record specialist review', exact: true }).click();
  await specialistPage.waitForURL(url => url.pathname === '/specialist-reviews' && url.hash === `#assignment-${uiAssignment.id}`);
  await specialistPage.locator(`#assignment-${uiAssignment.id}`).getByText('Advisory', { exact: true }).waitFor({ timeout: 30000 });
  assert.equal(referenceHits, 0, 'specialist UI fetched external reference');
  await inspect(specialistPage, 'specialist-review-workspace');

  await ownerPage.goto(workspaceUrl);
  const reviewedUiCard = ownerPage.locator(`#artifact-${uiArtifact.artifactId}`);
  await reviewedUiCard.getByText('Reviewer: Alex Specialist', { exact: true }).waitFor({ timeout: 30000 });
  assert(await reviewedUiCard.getByText('Advisory', { exact: true }).isVisible());
  assert((await reviewedUiCard.getByText('Review is not verification.', { exact: false }).count()) >= 1);
  assert.equal(await reviewedUiCard.getByText('Status: Verified', { exact: true }).count(), 0);
  await inspect(ownerPage, 'owner-specialist-review');

  specialistMine = ok(await rpc(clients[1], 'list_my_specialist_reviews'));
  const persistedUiAssignment = specialistMine.find(item => item.id === uiAssignment.id);
  assert.equal(persistedUiAssignment.status, 'Reviewed');
  const persistedUiReviewId = persistedUiAssignment.review.id;
  assert.equal(referenceHits, 0, 'completed review flow fetched external reference');

  await ownerContext.close();
  await specialistContext.close();
  await stop();
  await start();

  ownerContext = await browser.newContext();
  ownerPage = await ownerContext.newPage();
  await login(ownerPage, emails[0]);
  await ownerPage.goto(workspaceUrl);
  await ownerPage.getByText(`Review ID: ${persistedUiReviewId}`, { exact: true }).waitFor({ timeout: 30000 });

  specialistContext = await browser.newContext();
  specialistPage = await specialistContext.newPage();
  await login(specialistPage, emails[1]);
  await specialistPage.goto(`${base}/specialist-reviews`);
  await specialistPage.getByText(`Review ID: ${persistedUiReviewId}`, { exact: true }).waitFor({ timeout: 30000 });
  assert.equal(referenceHits, 0, 'restart/resume fetched external reference');

  execFileSync('docker', ['pause', 'supabase_db_wayfound'], { stdio: 'ignore' });
  dbPaused = true;
  try {
    await specialistPage.goto(`${base}/specialist-reviews`, { timeout: 90000 });
    await specialistPage.getByRole('heading', { name: 'We could not load your specialist reviews.' }).waitFor({ timeout: 60000 });
    await specialistPage.screenshot({ path: `${output}/specialist-review-database-unavailable.png`, fullPage: true });
  } finally {
    execFileSync('docker', ['unpause', 'supabase_db_wayfound'], { stdio: 'ignore' });
    dbPaused = false;
  }
  await new Promise(resolve => setTimeout(resolve, 5000));
  await specialistPage.reload();
  await specialistPage.getByText(`Review ID: ${persistedUiReviewId}`, { exact: true }).waitFor({ timeout: 30000 });
  assert.equal(referenceHits, 0, 'database recovery fetched external reference');

  console.log('PASS: assignment-scoped specialist review records authenticated qualified judgment on the exact accepted artifact version without granting workspace owner authority or creating verification state; target integrity, separation of duties, idempotency, tenant/session/revocation isolation, rollback, restart/resume, database interruption/recovery, external-reference non-fetch, keyboard focus, and responsive screenshots passed.');
} finally {
  if (dbPaused) {
    try { execFileSync('docker', ['unpause', 'supabase_db_wayfound'], { stdio: 'ignore' }); } catch {}
  }
  if (browser) await browser.close();
  await stop();
  await new Promise(resolve => referenceServer.close(resolve));
  await sql.end();
}
