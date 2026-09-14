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
const emails = [0, 1].map(index => `artifact-owner-${index}-${randomUUID()}@example.test`);
const clients = [backend.client(), backend.client()];
const users = [];
const retryDelays = [150, 350, 750];
const base = 'http://127.0.0.1:3102';
const output = 'artifacts/workspace';
mkdirSync(output, { recursive: true });
let server;
let browser;
let referenceHits = 0;
let dbPaused = false;

const referenceServer = createServer((request, response) => {
  referenceHits += 1;
  response.writeHead(200, { 'Content-Type': 'text/plain' });
  response.end(`Unexpected fetch: ${request.url}`);
});
await new Promise((resolve, reject) => {
  referenceServer.once('error', reject);
  referenceServer.listen(3199, '127.0.0.1', resolve);
});
const referenceUrl = 'http://127.0.0.1:3199/proposed-problem-brief';

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
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3102'], {
    env: { ...process.env, SUPABASE_URL: backend.url, SUPABASE_PUBLISHABLE_KEY: backend.key, APP_ORIGIN: base },
    stdio: 'ignore',
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(`${base}/sign-in`)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Artifact validation application did not start');
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
        element.dataset.artifactFocusId = String(index);
        return String(index);
      }),
    );
    const seen = new Set();
    for (let index = 0; index < targets.length + 5; index++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const element = document.activeElement;
        const style = getComputedStyle(element);
        return { id: element?.getAttribute('data-artifact-focus-id'), width: parseFloat(style.outlineWidth), style: style.outlineStyle };
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
    p_name: `${label} artifact workspace`,
    p_problem: 'Keep versioned project outputs connected to durable project direction.',
    p_release: 'Release 1.0',
    p_request: randomUUID(),
  }));
}

try {
  for (let index = 0; index < 2; index++) {
    users.push(ok(await backend.admin.auth.admin.createUser({ email: emails[index], password, email_confirm: true })).user);
    ok(await clients[index].auth.signInWithPassword({ email: emails[index], password }));
  }

  const ownerWorkspace = await createWorkspace(clients[0], 'Owner A');
  const otherWorkspace = await createWorkspace(clients[1], 'Owner B');
  const ownerActorId = (await sql.query('select id from wayfound.actors where provider_subject=$1', [users[0].id])).rows[0].id;
  const workspace = ok(await rpc(clients[0], 'open_workspace', { p_id: ownerWorkspace }));

  const artifactArgs = {
    p_workspace: ownerWorkspace,
    p_title: 'Problem brief',
    p_kind: 'Problem brief',
    p_summary: 'A proposed problem brief that records the checkout continuity problem and current scope.',
    p_reference_label: 'Problem brief source',
    p_reference_url: referenceUrl,
    p_request: randomUUID(),
  };

  const duplicate = await Promise.all([
    rpc(clients[0], 'create_proposed_artifact', artifactArgs),
    rpc(clients[0], 'create_proposed_artifact', artifactArgs),
  ]);
  const artifactId = ok(duplicate[0]);
  duplicate.forEach(result => assert.equal(ok(result), artifactId));

  const saved = ok(await rpc(clients[0], 'list_artifacts', { p_workspace: ownerWorkspace }));
  assert.equal(saved.length, 1);
  const artifact = saved[0];
  assert.equal(artifact.id, artifactId);
  assert.equal(artifact.workspace_id, ownerWorkspace);
  assert.equal(artifact.release_id, workspace.release.id);
  assert.equal(artifact.stage_number, workspace.release.current_stage);
  assert.equal(artifact.title, artifactArgs.p_title);
  assert.equal(artifact.kind, artifactArgs.p_kind);
  assert.equal(artifact.created_by_actor_id, ownerActorId);
  assert.equal(artifact.versions.length, 1);
  const version = artifact.versions[0];
  assert.equal(version.version_number, 1);
  assert.equal(version.lifecycle, 'Proposed');
  assert.equal(version.source_kind, 'ExternalReference');
  assert.equal(version.summary, artifactArgs.p_summary);
  assert.equal(version.reference_label, artifactArgs.p_reference_label);
  assert.equal(version.reference_url, referenceUrl);
  assert.equal(version.release_id, workspace.release.id);
  assert.equal(version.stage_number, workspace.release.current_stage);
  assert.equal(version.created_by_actor_id, ownerActorId);
  assert.equal(artifact.accepted_version_id, null);
  assert.equal(artifact.accepted_by_actor_id, null);
  assert.equal(artifact.accepted_at, null);
  assert.equal(referenceHits, 0, 'artifact RPC unexpectedly fetched external reference');

  expectedError(await clients[0].rpc('create_proposed_artifact', { ...artifactArgs, p_title: 'Changed duplicate' }), 'changed duplicate artifact request unexpectedly succeeded');
  expectedError(await clients[0].rpc('create_proposed_artifact', { ...artifactArgs, p_request: randomUUID(), p_reference_url: 'file:///tmp/not-allowed' }), 'non-http artifact reference unexpectedly succeeded');
  expectedError(await clients[0].rpc('create_proposed_artifact', { ...artifactArgs, p_request: randomUUID(), p_reference_url: 'javascript:alert(1)' }), 'javascript artifact reference unexpectedly succeeded');

  assert.deepEqual(ok(await rpc(clients[1], 'list_artifacts', { p_workspace: ownerWorkspace })), []);
  expectedError(await clients[1].rpc('create_proposed_artifact', { ...artifactArgs, p_request: randomUUID() }), 'non-member artifact creation unexpectedly succeeded');
  assert.deepEqual(ok(await rpc(clients[0], 'list_artifacts', { p_workspace: otherWorkspace })), []);
  expectedError(await backend.client().rpc('list_artifacts', { p_workspace: ownerWorkspace }), 'anonymous artifact read unexpectedly succeeded');
  expectedError(await clients[0].schema('wayfound').from('artifacts').select('*'), 'private artifact table read unexpectedly succeeded');
  expectedError(await clients[0].schema('wayfound').from('artifact_versions').select('*'), 'private artifact-version table read unexpectedly succeeded');
  expectedError(await clients[0].from('artifacts').insert({ title: 'bypass' }), 'direct artifact table write unexpectedly succeeded');
  expectedError(await clients[0].from('artifact_versions').insert({ summary: 'bypass' }), 'direct artifact-version table write unexpectedly succeeded');

  const counts = async () => ({
    artifacts: (await sql.query('select count(*)::int n from wayfound.artifacts')).rows[0].n,
    versions: (await sql.query('select count(*)::int n from wayfound.artifact_versions')).rows[0].n,
    requests: (await sql.query('select count(*)::int n from wayfound.artifact_requests')).rows[0].n,
    audits: (await sql.query("select count(*)::int n from wayfound.audit_events where operation='artifact.proposed'")).rows[0].n,
  });
  const beforeFailure = await counts();
  await sql.query(`create function wayfound.test_artifact_failure() returns trigger language plpgsql as $$begin if new.operation='artifact.proposed' then raise exception 'Injected artifact audit failure'; end if; return new; end$$; create trigger test_artifact_failure before insert on wayfound.audit_events for each row execute function wayfound.test_artifact_failure()`);
  try {
    expectedError(await clients[0].rpc('create_proposed_artifact', { ...artifactArgs, p_request: randomUUID(), p_title: 'Rollback artifact' }), 'injected artifact failure unexpectedly succeeded');
  } finally {
    await sql.query('drop trigger test_artifact_failure on wayfound.audit_events; drop function wayfound.test_artifact_failure()');
  }
  assert.deepEqual(await counts(), beforeFailure, 'failed artifact transaction left partial durable state');

  const membership = (await sql.query('select actor_id,role from wayfound.memberships where workspace_id=$1 and actor_id=$2', [ownerWorkspace, ownerActorId])).rows[0];
  await sql.query('delete from wayfound.memberships where workspace_id=$1 and actor_id=$2', [ownerWorkspace, ownerActorId]);
  assert.deepEqual(ok(await rpc(clients[0], 'list_artifacts', { p_workspace: ownerWorkspace })), []);
  expectedError(await clients[0].rpc('create_proposed_artifact', artifactArgs), 'membership-revoked artifact retry unexpectedly succeeded');
  await sql.query('insert into wayfound.memberships(workspace_id,actor_id,role) values($1,$2,$3)', [ownerWorkspace, membership.actor_id, membership.role]);

  await sql.query("update auth.sessions set not_after=now()-interval '1 minute' where user_id=$1", [users[0].id]);
  expectedError(await clients[0].rpc('list_artifacts', { p_workspace: ownerWorkspace }), 'expired session artifact read succeeded');
  await sql.query('update auth.sessions set not_after=null where user_id=$1', [users[0].id]);

  const signedOut = backend.client();
  ok(await signedOut.auth.signInWithPassword({ email: emails[0], password }));
  ok(await signedOut.auth.signOut());
  expectedError(await signedOut.rpc('list_artifacts', { p_workspace: ownerWorkspace }), 'signed-out artifact read unexpectedly succeeded');

  const protectedAccess = ok(await clients[0].auth.getSession()).session.access_token;
  await sql.query('delete from auth.sessions where user_id=$1', [users[0].id]);
  await revokedRpc(protectedAccess, 'list_artifacts', { p_workspace: ownerWorkspace });
  ok(await clients[0].auth.signInWithPassword({ email: emails[0], password }));

  await start();
  browser = await chromium.launch({ headless: true });
  let context = await browser.newContext();
  let page = await context.newPage();
  await login(page, emails[0]);
  const workspaceUrl = `${base}/workspaces/${ownerWorkspace}`;
  await page.goto(workspaceUrl);
  const artifactSection = page.getByLabel('Artifacts');
  await artifactSection.getByRole('heading', { name: artifactArgs.p_title, exact: true }).waitFor({ timeout: 30000 });
  assert(await artifactSection.getByText('Status: Proposed', { exact: true }).isVisible());
  assert(await artifactSection.getByText('Not accepted project direction.', { exact: true }).isVisible());
  assert(await artifactSection.getByText(referenceUrl, { exact: true }).isVisible());
  assert(await artifactSection.getByText(`Artifact ID: ${artifact.id}`, { exact: true }).isVisible());
  assert(await artifactSection.getByText(`Version ID: ${version.id}`, { exact: true }).isVisible());
  assert.equal(referenceHits, 0, 'workspace render unexpectedly fetched external artifact reference');

  await artifactSection.getByLabel('Artifact title', { exact: true }).fill('Observation plan');
  await artifactSection.getByLabel('Artifact kind', { exact: true }).fill('Observation plan');
  await artifactSection.getByLabel('Summary', { exact: true }).fill('A proposed observation plan for one real equipment checkout.');
  await artifactSection.getByLabel('Reference label', { exact: true }).fill('Observation plan source');
  await artifactSection.getByLabel('Reference URL', { exact: true }).fill('https://example.test/observation-plan');
  await artifactSection.getByRole('button', { name: 'Record proposed artifact', exact: true }).click();
  await page.waitForURL(url => url.pathname === new URL(workspaceUrl).pathname && url.hash === '#artifacts');
  await artifactSection.getByRole('heading', { name: 'Observation plan', exact: true }).waitFor({ timeout: 30000 });
  assert(await artifactSection.getByText('0 accepted · 2 proposed', { exact: true }).isVisible());
  await inspect(page, 'saved-artifact');
  assert.equal(referenceHits, 0, 'artifact UI save unexpectedly fetched external reference');

  const persisted = ok(await rpc(clients[0], 'list_artifacts', { p_workspace: ownerWorkspace }));
  assert.equal(persisted.length, 2);
  persisted.forEach(item => {
    assert.equal(item.versions.length, 1);
    assert.equal(item.versions[0].version_number, 1);
    assert.equal(item.versions[0].lifecycle, 'Proposed');
  });

  await context.close();
  await stop();
  await start();
  context = await browser.newContext();
  page = await context.newPage();
  await login(page, emails[0]);
  await page.goto(workspaceUrl);
  await page.getByLabel('Artifacts').getByRole('heading', { name: artifactArgs.p_title, exact: true }).waitFor({ timeout: 30000 });
  assert(await page.getByLabel('Artifacts').getByRole('heading', { name: 'Observation plan', exact: true }).isVisible());
  assert.equal(referenceHits, 0, 'restart/resume unexpectedly fetched external reference');

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
    await page.screenshot({ path: `${output}/artifact-database-unavailable.png`, fullPage: true });
  } finally {
    execFileSync('docker', ['unpause', 'supabase_db_wayfound'], { stdio: 'ignore' });
    dbPaused = false;
  }
  await new Promise(resolve => setTimeout(resolve, 5000));
  await page.reload();
  await page.getByLabel('Artifacts').getByRole('heading', { name: artifactArgs.p_title, exact: true }).waitFor({ timeout: 30000 });
  assert.equal(referenceHits, 0, 'database recovery unexpectedly fetched external reference');
  assert.deepEqual(ok(await rpc(clients[0], 'list_artifacts', { p_workspace: ownerWorkspace })), persisted);

  console.log('PASS: durable proposed artifact records create stable artifact/version identities without accepting project direction; external references remain unfetched; idempotency, tenant/session/revocation isolation, rollback, restart/resume, database interruption/recovery, keyboard focus, and responsive screenshots passed.');
} finally {
  if (dbPaused) {
    try { execFileSync('docker', ['unpause', 'supabase_db_wayfound'], { stdio: 'ignore' }); } catch {}
  }
  if (browser) await browser.close();
  await stop();
  await new Promise(resolve => referenceServer.close(resolve));
  await sql.end();
}
