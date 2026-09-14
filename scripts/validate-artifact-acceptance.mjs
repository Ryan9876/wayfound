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
const emails = [0, 1].map(index => `artifact-accept-owner-${index}-${randomUUID()}@example.test`);
const clients = [backend.client(), backend.client()];
const users = [];
const retryDelays = [150, 350, 750];
const base = 'http://127.0.0.1:3103';
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
  referenceServer.listen(3198, '127.0.0.1', resolve);
});
const referenceUrl = 'http://127.0.0.1:3198/accepted-problem-brief';

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
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3103'], {
    env: { ...process.env, SUPABASE_URL: backend.url, SUPABASE_PUBLISHABLE_KEY: backend.key, APP_ORIGIN: base },
    stdio: 'ignore',
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(`${base}/sign-in`)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Artifact acceptance validation application did not start');
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
        element.dataset.artifactAcceptFocusId = String(index);
        return String(index);
      }),
    );
    const seen = new Set();
    for (let index = 0; index < targets.length + 5; index++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const element = document.activeElement;
        const style = getComputedStyle(element);
        return { id: element?.getAttribute('data-artifact-accept-focus-id'), width: parseFloat(style.outlineWidth), style: style.outlineStyle };
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
    p_name: `${label} artifact acceptance workspace`,
    p_problem: 'Preserve explicit project direction when artifact versions change.',
    p_release: 'Release 1.0',
    p_request: randomUUID(),
  }));
}

async function createArtifact(client, workspaceId, title, url = referenceUrl) {
  const artifactId = ok(await rpc(client, 'create_proposed_artifact', {
    p_workspace: workspaceId,
    p_title: title,
    p_kind: 'Problem brief',
    p_summary: `${title} records a bounded project output before owner acceptance.`,
    p_reference_label: `${title} source`,
    p_reference_url: url,
    p_request: randomUUID(),
  }));
  const artifacts = ok(await rpc(client, 'list_artifacts', { p_workspace: workspaceId }));
  const artifact = artifacts.find(item => item.id === artifactId);
  assert(artifact, `${title} artifact missing after creation`);
  assert.equal(artifact.versions.length, 1);
  return { artifactId, artifact, version: artifact.versions[0] };
}

try {
  for (let index = 0; index < 2; index++) {
    users.push(ok(await backend.admin.auth.admin.createUser({ email: emails[index], password, email_confirm: true })).user);
    ok(await clients[index].auth.signInWithPassword({ email: emails[index], password }));
  }

  const ownerWorkspace = await createWorkspace(clients[0], 'Owner A');
  const otherWorkspace = await createWorkspace(clients[1], 'Owner B');
  const ownerActorId = (await sql.query('select id from wayfound.actors where provider_subject=$1', [users[0].id])).rows[0].id;
  const releaseBefore = ok(await rpc(clients[0], 'open_workspace', { p_id: ownerWorkspace })).release;

  const primary = await createArtifact(clients[0], ownerWorkspace, 'Problem brief');
  const secondary = await createArtifact(clients[0], ownerWorkspace, 'Observation plan');
  const foreign = await createArtifact(clients[1], otherWorkspace, 'Foreign brief', 'https://example.test/foreign-brief');

  assert.equal(primary.artifact.accepted_version_id, null);
  assert.equal(primary.artifact.accepted_by_actor_id, null);
  assert.equal(primary.artifact.accepted_at, null);
  assert.equal(primary.artifact.revision, 1);
  assert.equal(primary.version.lifecycle, 'Proposed');
  assert.equal(primary.version.revision, 1);
  assert.equal(referenceHits, 0, 'artifact creation unexpectedly fetched external reference');

  expectedError(await clients[0].rpc('accept_artifact_version', {
    p_workspace: ownerWorkspace,
    p_artifact: primary.artifactId,
    p_version: primary.version.id,
    p_authority_confirm: false,
    p_request: randomUUID(),
  }), 'false authority confirmation unexpectedly accepted artifact', '22023');

  expectedError(await clients[0].rpc('accept_artifact_version', {
    p_workspace: ownerWorkspace,
    p_artifact: primary.artifactId,
    p_version: randomUUID(),
    p_authority_confirm: true,
    p_request: randomUUID(),
  }), 'unknown artifact version unexpectedly accepted', '23503');

  expectedError(await clients[0].rpc('accept_artifact_version', {
    p_workspace: ownerWorkspace,
    p_artifact: primary.artifactId,
    p_version: secondary.version.id,
    p_authority_confirm: true,
    p_request: randomUUID(),
  }), 'cross-artifact version unexpectedly accepted', '23503');

  expectedError(await clients[0].rpc('accept_artifact_version', {
    p_workspace: ownerWorkspace,
    p_artifact: foreign.artifactId,
    p_version: foreign.version.id,
    p_authority_confirm: true,
    p_request: randomUUID(),
  }), 'cross-workspace artifact version unexpectedly accepted', '23503');

  const acceptanceArgs = {
    p_workspace: ownerWorkspace,
    p_artifact: primary.artifactId,
    p_version: primary.version.id,
    p_authority_confirm: true,
    p_request: randomUUID(),
  };
  const duplicateAcceptance = await Promise.all([
    rpc(clients[0], 'accept_artifact_version', acceptanceArgs),
    rpc(clients[0], 'accept_artifact_version', acceptanceArgs),
  ]);
  duplicateAcceptance.forEach(result => assert.equal(ok(result), primary.version.id));

  let ownerArtifacts = ok(await rpc(clients[0], 'list_artifacts', { p_workspace: ownerWorkspace }));
  let acceptedPrimary = ownerArtifacts.find(item => item.id === primary.artifactId);
  assert(acceptedPrimary);
  let acceptedPrimaryVersion = acceptedPrimary.versions.find(item => item.id === primary.version.id);
  assert(acceptedPrimaryVersion);
  assert.equal(acceptedPrimary.accepted_version_id, primary.version.id);
  assert.equal(acceptedPrimary.accepted_by_actor_id, ownerActorId);
  assert(acceptedPrimary.accepted_at, 'accepted artifact missing acceptance time');
  assert.equal(acceptedPrimary.revision, 2);
  assert.equal(acceptedPrimaryVersion.lifecycle, 'Accepted');
  assert.equal(acceptedPrimaryVersion.revision, 2);
  assert.equal(acceptedPrimaryVersion.reference_url, referenceUrl);
  assert.equal(ok(await rpc(clients[0], 'open_workspace', { p_id: ownerWorkspace })).release.lifecycle, releaseBefore.lifecycle);
  assert.equal(referenceHits, 0, 'artifact acceptance unexpectedly fetched external reference');

  const acceptedAuditRows = (await sql.query("select entity_id,actor_id from wayfound.audit_events where workspace_id=$1 and operation='artifact.accepted'", [ownerWorkspace])).rows;
  assert.equal(acceptedAuditRows.length, 1);
  assert.equal(acceptedAuditRows[0].entity_id, primary.version.id);
  assert.equal(acceptedAuditRows[0].actor_id, ownerActorId);
  assert.equal((await sql.query('select count(*)::int n from wayfound.artifact_acceptance_requests where workspace_id=$1', [ownerWorkspace])).rows[0].n, 1);

  expectedError(await clients[0].rpc('accept_artifact_version', { ...acceptanceArgs, p_artifact: secondary.artifactId }), 'changed duplicate acceptance request unexpectedly succeeded', '22023');
  expectedError(await clients[0].rpc('accept_artifact_version', { ...acceptanceArgs, p_request: randomUUID() }), 'already accepted version unexpectedly accepted again', '55000');
  expectedError(await clients[1].rpc('accept_artifact_version', { ...acceptanceArgs, p_request: randomUUID() }), 'non-member artifact acceptance unexpectedly succeeded', '42501');
  expectedError(await backend.client().rpc('accept_artifact_version', { ...acceptanceArgs, p_request: randomUUID() }), 'anonymous artifact acceptance unexpectedly succeeded');

  expectedError(await clients[0].schema('wayfound').from('artifact_acceptance_requests').select('*'), 'private artifact acceptance request read unexpectedly succeeded');
  expectedError(await clients[0].schema('wayfound').from('artifacts').update({ accepted_version_id: secondary.version.id }).eq('id', secondary.artifactId), 'direct private artifact acceptance write unexpectedly succeeded');
  expectedError(await clients[0].schema('wayfound').from('artifact_versions').update({ lifecycle: 'Accepted' }).eq('id', secondary.version.id), 'direct private artifact lifecycle write unexpectedly succeeded');

  const acceptanceCounts = async () => ({
    requests: (await sql.query('select count(*)::int n from wayfound.artifact_acceptance_requests where workspace_id=$1', [ownerWorkspace])).rows[0].n,
    audits: (await sql.query("select count(*)::int n from wayfound.audit_events where workspace_id=$1 and operation='artifact.accepted'", [ownerWorkspace])).rows[0].n,
  });
  const beforeFailure = await acceptanceCounts();
  await sql.query(`create function wayfound.test_artifact_acceptance_failure() returns trigger language plpgsql as $$begin if new.operation='artifact.accepted' then raise exception 'Injected artifact acceptance audit failure'; end if; return new; end$$; create trigger test_artifact_acceptance_failure before insert on wayfound.audit_events for each row execute function wayfound.test_artifact_acceptance_failure()`);
  try {
    expectedError(await clients[0].rpc('accept_artifact_version', {
      p_workspace: ownerWorkspace,
      p_artifact: secondary.artifactId,
      p_version: secondary.version.id,
      p_authority_confirm: true,
      p_request: randomUUID(),
    }), 'injected artifact acceptance failure unexpectedly succeeded');
  } finally {
    await sql.query('drop trigger test_artifact_acceptance_failure on wayfound.audit_events; drop function wayfound.test_artifact_acceptance_failure()');
  }
  assert.deepEqual(await acceptanceCounts(), beforeFailure, 'failed artifact acceptance left audit or request state');
  ownerArtifacts = ok(await rpc(clients[0], 'list_artifacts', { p_workspace: ownerWorkspace }));
  let proposedSecondary = ownerArtifacts.find(item => item.id === secondary.artifactId);
  assert.equal(proposedSecondary.accepted_version_id, null);
  assert.equal(proposedSecondary.revision, 1);
  assert.equal(proposedSecondary.versions[0].lifecycle, 'Proposed');
  assert.equal(proposedSecondary.versions[0].revision, 1);

  const membership = (await sql.query('select actor_id,role from wayfound.memberships where workspace_id=$1 and actor_id=$2', [ownerWorkspace, ownerActorId])).rows[0];
  await sql.query('delete from wayfound.memberships where workspace_id=$1 and actor_id=$2', [ownerWorkspace, ownerActorId]);
  assert.deepEqual(ok(await rpc(clients[0], 'list_artifacts', { p_workspace: ownerWorkspace })), []);
  expectedError(await clients[0].rpc('accept_artifact_version', {
    p_workspace: ownerWorkspace,
    p_artifact: secondary.artifactId,
    p_version: secondary.version.id,
    p_authority_confirm: true,
    p_request: randomUUID(),
  }), 'membership-revoked artifact acceptance unexpectedly succeeded', '42501');
  await sql.query('insert into wayfound.memberships(workspace_id,actor_id,role) values($1,$2,$3)', [ownerWorkspace, membership.actor_id, membership.role]);

  await sql.query("update auth.sessions set not_after=now()-interval '1 minute' where user_id=$1", [users[0].id]);
  expectedError(await clients[0].rpc('accept_artifact_version', {
    p_workspace: ownerWorkspace,
    p_artifact: secondary.artifactId,
    p_version: secondary.version.id,
    p_authority_confirm: true,
    p_request: randomUUID(),
  }), 'expired session artifact acceptance unexpectedly succeeded');
  await sql.query('update auth.sessions set not_after=null where user_id=$1', [users[0].id]);

  const signedOut = backend.client();
  ok(await signedOut.auth.signInWithPassword({ email: emails[0], password }));
  ok(await signedOut.auth.signOut());
  expectedError(await signedOut.rpc('accept_artifact_version', {
    p_workspace: ownerWorkspace,
    p_artifact: secondary.artifactId,
    p_version: secondary.version.id,
    p_authority_confirm: true,
    p_request: randomUUID(),
  }), 'signed-out artifact acceptance unexpectedly succeeded');

  const protectedAccess = ok(await clients[0].auth.getSession()).session.access_token;
  await sql.query('delete from auth.sessions where user_id=$1', [users[0].id]);
  await revokedRpc(protectedAccess, 'accept_artifact_version', {
    p_workspace: ownerWorkspace,
    p_artifact: secondary.artifactId,
    p_version: secondary.version.id,
    p_authority_confirm: true,
    p_request: randomUUID(),
  });
  ok(await clients[0].auth.signInWithPassword({ email: emails[0], password }));

  await start();
  browser = await chromium.launch({ headless: true });
  let context = await browser.newContext();
  let page = await context.newPage();
  await login(page, emails[0]);
  const workspaceUrl = `${base}/workspaces/${ownerWorkspace}`;
  await page.goto(workspaceUrl);
  const artifactSection = page.getByLabel('Artifacts');
  const primaryCard = page.locator(`#artifact-${primary.artifactId}`);
  await primaryCard.getByRole('heading', { name: 'Problem brief', exact: true }).waitFor({ timeout: 30000 });
  assert(await primaryCard.getByText('Status: Accepted', { exact: true }).isVisible());
  assert((await primaryCard.getByText('Accepted project direction', { exact: true }).count()) >= 1);
  assert.equal(await primaryCard.getByRole('button', { name: 'Accept version 1 as project direction', exact: true }).count(), 0);
  assert(await primaryCard.getByText(`Artifact ID: ${primary.artifactId}`, { exact: true }).isVisible());
  assert(await primaryCard.getByText(`Version ID: ${primary.version.id}`, { exact: true }).isVisible());
  assert.equal(await primaryCard.getByText('Status: Verified', { exact: true }).count(), 0);

  const secondaryCard = page.locator(`#artifact-${secondary.artifactId}`);
  await secondaryCard.getByRole('heading', { name: 'Observation plan', exact: true }).waitFor({ timeout: 30000 });
  assert(await secondaryCard.getByText('Status: Proposed', { exact: true }).isVisible());
  await secondaryCard.getByRole('checkbox').check();
  await secondaryCard.getByRole('button', { name: 'Accept version 1 as project direction', exact: true }).click();
  await page.waitForURL(url => url.pathname === new URL(workspaceUrl).pathname && url.hash === `#artifact-${secondary.artifactId}`);
  const acceptedSecondaryCard = page.locator(`#artifact-${secondary.artifactId}`);
  await acceptedSecondaryCard.getByText('Status: Accepted', { exact: true }).waitFor({ timeout: 30000 });
  assert((await acceptedSecondaryCard.getByText('Accepted project direction', { exact: true }).count()) >= 1);
  assert.equal(await acceptedSecondaryCard.getByRole('button', { name: 'Accept version 1 as project direction', exact: true }).count(), 0);
  assert.equal(referenceHits, 0, 'artifact acceptance UI unexpectedly fetched external reference');
  await inspect(page, 'accepted-artifact');

  const persisted = ok(await rpc(clients[0], 'list_artifacts', { p_workspace: ownerWorkspace }));
  const persistedSecondary = persisted.find(item => item.id === secondary.artifactId);
  assert.equal(persistedSecondary.accepted_version_id, secondary.version.id);
  assert.equal(persistedSecondary.versions[0].lifecycle, 'Accepted');
  assert.equal((await sql.query("select count(*)::int n from wayfound.audit_events where workspace_id=$1 and operation='artifact.accepted'", [ownerWorkspace])).rows[0].n, 2);

  await context.close();
  await stop();
  await start();
  context = await browser.newContext();
  page = await context.newPage();
  await login(page, emails[0]);
  await page.goto(workspaceUrl);
  await page.locator(`#artifact-${primary.artifactId}`).getByText('Status: Accepted', { exact: true }).waitFor({ timeout: 30000 });
  await page.locator(`#artifact-${secondary.artifactId}`).getByText('Status: Accepted', { exact: true }).waitFor({ timeout: 30000 });
  assert.deepEqual(ok(await rpc(clients[0], 'list_artifacts', { p_workspace: ownerWorkspace })), persisted);
  assert.equal(referenceHits, 0, 'artifact acceptance restart/resume unexpectedly fetched external reference');

  const otherContext = await browser.newContext();
  const otherPage = await otherContext.newPage();
  await login(otherPage, emails[1]);
  await otherPage.goto(workspaceUrl);
  await otherPage.getByRole('heading', { name: 'Workspace not available.' }).waitFor({ timeout: 30000 });
  await otherContext.close();

  execFileSync('docker', ['pause', 'supabase_db_wayfound'], { stdio: 'ignore' });
  dbPaused = true;
  try {
    await page.goto(workspaceUrl, { timeout: 90000 });
    await page.getByRole('heading', { name: 'We could not load your workspace.' }).waitFor({ timeout: 60000 });
    await page.screenshot({ path: `${output}/artifact-acceptance-database-unavailable.png`, fullPage: true });
  } finally {
    execFileSync('docker', ['unpause', 'supabase_db_wayfound'], { stdio: 'ignore' });
    dbPaused = false;
  }
  await new Promise(resolve => setTimeout(resolve, 5000));
  await page.reload();
  await page.locator(`#artifact-${primary.artifactId}`).getByText('Status: Accepted', { exact: true }).waitFor({ timeout: 30000 });
  await page.locator(`#artifact-${secondary.artifactId}`).getByText('Status: Accepted', { exact: true }).waitFor({ timeout: 30000 });
  assert.deepEqual(ok(await rpc(clients[0], 'list_artifacts', { p_workspace: ownerWorkspace })), persisted);
  assert.equal(referenceHits, 0, 'artifact acceptance recovery unexpectedly fetched external reference');

  console.log('PASS: explicit owner artifact acceptance selects one proposed version as accepted project direction without implying specialist review or verification; authority confirmation, target integrity, idempotency, invalid-state rejection, tenant/session/revocation isolation, rollback, restart/resume, database interruption/recovery, external-reference non-fetch, keyboard focus, and responsive screenshots passed.');
} finally {
  if (dbPaused) {
    try { execFileSync('docker', ['unpause', 'supabase_db_wayfound'], { stdio: 'ignore' }); } catch {}
  }
  if (browser) await browser.close();
  await stop();
  await new Promise(resolve => referenceServer.close(resolve));
  await sql.end();
}
