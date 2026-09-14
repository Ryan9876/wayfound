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
const emails = [0, 1].map(index => `work-lifecycle-owner-${index}-${randomUUID()}@example.test`);
const clients = [backend.client(), backend.client()];
const users = [];
const retryDelays = [150, 350, 750];
const base = 'http://127.0.0.1:3105';
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
  referenceServer.listen(3196, '127.0.0.1', resolve);
});
const referenceUrl = 'http://127.0.0.1:3196/work-lifecycle-reference';

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
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3105'], {
    env: { ...process.env, SUPABASE_URL: backend.url, SUPABASE_PUBLISHABLE_KEY: backend.key, APP_ORIGIN: base },
    stdio: 'ignore',
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(`${base}/sign-in`)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Work lifecycle validation application did not start');
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
    await page.locator('#work-items').screenshot({ path: `${output}/${name}-${label}-work.png` });
    await page.evaluate(() => document.activeElement?.blur());
    const targets = await page.locator('a[href],button:not([disabled]),input:not([type=hidden]),textarea,select,summary').evaluateAll(elements =>
      elements.filter(element => element.checkVisibility() && element.getBoundingClientRect().width > 0).map((element, index) => {
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
  return ok(await rpc(client, 'create_workspace', { p_name: label, p_problem: 'Keep work state and responsibility clear.', p_release: 'Release 1.0', p_request: randomUUID() }));
}
async function createWork(client, workspace, title) {
  return ok(await rpc(client, 'create_proposed_work_item', { p_workspace: workspace, p_title: title, p_outcome: 'Observe a checkout.', p_completion_condition: 'An observation is recorded.', p_evidence_expectation: 'Observation notes.', p_request: randomUUID() }));
}
function args(workspace, work, revision, status, reason = 'Owner records the next work state.') {
  return { p_workspace: workspace, p_work_item: work, p_expected_revision: revision, p_target_status: status, p_reason: reason, p_confirm: true, p_request: randomUUID() };
}
const mutate = (client, input) => rpc(client, 'transition_work_item', input);
const list = async (client, workspace) => ok(await rpc(client, 'list_work_items', { p_workspace: workspace }));

try {
  for (let index = 0; index < 2; index++) {
    users.push(ok(await backend.admin.auth.admin.createUser({ email: emails[index], password, email_confirm: true })).user);
    ok(await clients[index].auth.signInWithPassword({ email: emails[index], password }));
  }
  const workspace = await createWorkspace(clients[0], 'Owner work lifecycle');
  const foreignWorkspace = await createWorkspace(clients[1], 'Other owner work');
  const actor = (await sql.query('select id from wayfound.actors where provider_subject=$1', [users[0].id])).rows[0].id;
  const otherActor = (await sql.query('select id from wayfound.actors where provider_subject=$1', [users[1].id])).rows[0].id;
  const work = await createWork(clients[0], workspace, 'Observe an equipment checkout');
  const foreignWork = await createWork(clients[1], foreignWorkspace, 'Other workspace work');
  const initial = (await list(clients[0], workspace))[0];
  assert.equal(initial.status, 'Proposed');
  assert.equal(initial.revision, 1);
  assert.deepEqual(initial.transitions, []);

  // Set up real prior records so no collateral lifecycle changes can hide behind empty arrays.
  ok(await rpc(clients[0], 'record_owner_decision', { p_workspace: workspace, p_title: 'Observe first', p_decision: 'Observe before planning.', p_rationale: 'Use direct context.', p_authority_confirm: true, p_request: randomUUID() }));
  ok(await rpc(clients[0], 'record_owner_requirement', { p_workspace: workspace, p_title: 'Visible owner', p_obligation: 'MUST', p_requirement: 'Show the work owner.', p_acceptance_criterion: 'A named owner is visible.', p_authority_confirm: true, p_request: randomUUID() }));
  const criterion = ok(await rpc(clients[0], 'list_requirements', { p_workspace: workspace }))[0].acceptance_criteria[0].id;
  ok(await rpc(clients[0], 'record_criterion_evidence', { p_workspace: workspace, p_acceptance_criterion: criterion, p_title: 'Observed owner', p_result: 'Owner was visible.', p_source_note: 'Manual observation.', p_effect: 'Supports', p_request: randomUUID() }));
  const artifact = ok(await rpc(clients[0], 'create_proposed_artifact', { p_workspace: workspace, p_title: 'Observation brief', p_kind: 'Brief', p_summary: 'Context for work.', p_reference_label: 'Source', p_reference_url: referenceUrl, p_request: randomUUID() }));
  const version = ok(await rpc(clients[0], 'list_artifacts', { p_workspace: workspace }))[0].versions[0].id;
  ok(await rpc(clients[0], 'accept_artifact_version', { p_workspace: workspace, p_artifact: artifact, p_version: version, p_authority_confirm: true, p_request: randomUUID() }));
  // Actor B receives an actual review assignment, which must confer no owner authority.
  const reviewer = ok(await rpc(clients[1], 'ensure_specialist_reviewer_identity'));
  const assignment = ok(await rpc(clients[0], 'assign_specialist_review', { p_workspace: workspace, p_artifact: artifact, p_version: version, p_reviewer: reviewer, p_requested_competence: 'Operations', p_review_question: 'Is the observation bounded?', p_scope_confirm: true, p_request: randomUUID() }));
  assert(assignment);
  const snapshot = async () => {
    const result = {};
    for (const table of ['decisions','requirements','acceptance_criteria','evidence_records','artifacts','artifact_versions','specialist_review_assignments','specialist_reviews','releases','release_stages']) {
      // release_stages has no workspace column.
      const where = table === 'release_stages' ? 'release_id in (select id from wayfound.releases where workspace_id=$1)' : 'workspace_id=$1';
      result[table] = (await sql.query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) records from wayfound.${table} t where ${where}`, [workspace])).rows[0].records;
    }
    return result;
  };
  const unaffected = await snapshot();
  const approval = args(workspace, work, 1, 'Approved');
  for (const patch of [{ p_confirm: false }, { p_confirm: null }, { p_reason: ' ' }, { p_reason: 'x'.repeat(2001) }, { p_expected_revision: 0 }, { p_target_status: 'Implemented' }, { p_target_status: 'Validated' }, { p_target_status: 'Released' }]) {
    expectedError(await mutate(clients[0], { ...approval, ...patch }), 'invalid input accepted', '22023');
  }
  for (const patch of [{ p_target_status: 'In progress' }, { p_target_status: 'Blocked' }, { p_expected_revision: 2 }]) {
    expectedError(await mutate(clients[0], { ...approval, ...patch }), 'invalid transition or stale revision accepted', '55000');
  }
  for (const target of [randomUUID(), foreignWork]) expectedError(await mutate(clients[0], { ...approval, p_work_item: target }), 'invalid target accepted', '23503');
  expectedError(await mutate(clients[1], approval), 'assigned specialist changed owner work', '42501');
  expectedError(await mutate(backend.client(), approval), 'anonymous mutation accepted');
  assert.deepEqual(await list(clients[1], workspace), []);
  // Even explicit owner membership cannot replace the stored responsible actor.
  await sql.query("insert into wayfound.memberships(workspace_id,actor_id,role) values($1,$2,'owner')", [workspace, otherActor]);
  try { expectedError(await mutate(clients[1], approval), 'another owner changed responsible actor work', '42501'); }
  finally { await sql.query('delete from wayfound.memberships where workspace_id=$1 and actor_id=$2', [workspace, otherActor]); }
  assert.deepEqual((await list(clients[0], workspace))[0], initial);

  const duplicates = await Promise.all([mutate(clients[0], approval), mutate(clients[0], approval)]);
  const transition = ok(duplicates[0]);
  assert.equal(ok(duplicates[1]), transition);
  let saved = (await list(clients[0], workspace))[0];
  assert.equal(saved.status, 'Approved');
  assert.equal(saved.revision, 2);
  assert.equal(saved.transitions.length, 1);
  assert.equal(saved.transitions[0].id, transition);
  assert.equal(saved.transitions[0].actor_id, actor);
  assert(saved.transitions[0].created_at);
  assert.equal(saved.transitions[0].from_status, 'Proposed');
  assert.equal(saved.transitions[0].to_status, 'Approved');
  expectedError(await mutate(clients[0], { ...approval, p_reason: 'Changed payload' }), 'changed retry accepted', '22023');
  expectedError(await mutate(clients[0], args(workspace, work, 2, 'Approved')), 'same-state update accepted', '55000');
  const starters = await Promise.all([mutate(clients[0], args(workspace, work, 2, 'In progress')), mutate(clients[0], args(workspace, work, 2, 'In progress'))]);
  assert.equal(starters.filter(x => !x.error).length, 1);
  expectedError(starters.find(x => x.error), 'concurrent stale writer succeeded', '55000');
  assert.equal(ok(await mutate(clients[0], approval)), transition, 'original replay after progression changed result');
  saved = (await list(clients[0], workspace))[0];
  assert.equal(saved.status, 'In progress');
  assert.equal(saved.revision, 3);

  const counts = async () => ({
    events: (await sql.query("select count(*)::int n from wayfound.audit_events where workspace_id=$1 and operation='work_item.transitioned'", [workspace])).rows[0].n,
    requests: (await sql.query('select count(*)::int n from wayfound.work_item_transition_requests where workspace_id=$1', [workspace])).rows[0].n,
    transitions: (await sql.query('select count(*)::int n from wayfound.work_item_transitions where workspace_id=$1', [workspace])).rows[0].n,
  });
  assert.deepEqual(await counts(), { events: 2, requests: 2, transitions: 2 });
  const block = args(workspace, work, 3, 'Blocked', 'Equipment access approval is missing from the operations owner.');
  await sql.query(`create function wayfound.test_work_state_failure() returns trigger language plpgsql as $$begin if new.operation='work_item.transitioned' then raise exception 'Injected work-state audit failure'; end if; return new; end$$; create trigger test_work_state_failure before insert on wayfound.audit_events for each row execute function wayfound.test_work_state_failure()`);
  try { expectedError(await mutate(clients[0], block), 'audit failure did not roll back'); }
  finally { await sql.query('drop trigger test_work_state_failure on wayfound.audit_events; drop function wayfound.test_work_state_failure()'); }
  assert.deepEqual((await list(clients[0], workspace))[0], saved);
  assert.deepEqual(await counts(), { events: 2, requests: 2, transitions: 2 });
  ok(await mutate(clients[0], block));
  saved = (await list(clients[0], workspace))[0];
  assert.equal(saved.status, 'Blocked');
  assert.equal(saved.transitions.at(-1).reason, block.p_reason);
  const resume = args(workspace, work, 4, 'In progress', 'Operations owner granted access; observation resumed.');
  const resumed = await Promise.all([mutate(clients[0], resume), mutate(clients[0], resume)]);
  assert.equal(ok(resumed[0]), ok(resumed[1]));
  assert.deepEqual(await counts(), { events: 4, requests: 4, transitions: 4 });
  assert.deepEqual(await snapshot(), unaffected, 'work state mutated other lifecycle records');
  const workNow = (await list(clients[0], workspace))[0];
  for (const key of ['id','workspace_id','release_id','stage_number','title','outcome','completion_condition','evidence_expectation','owner_actor_id','created_at']) assert.deepEqual(workNow[key], initial[key]);

  for (const table of ['work_items','work_item_transitions','work_item_transition_requests']) {
    expectedError(await clients[0].schema('wayfound').from(table).select('*'), `direct ${table} read succeeded`);
    expectedError(await clients[0].schema('wayfound').from(table).delete().eq('workspace_id', workspace), `direct ${table} delete succeeded`);
    for (const privilege of ['SELECT','INSERT','UPDATE','DELETE']) assert.equal((await sql.query('select has_table_privilege($1,$2,$3) allowed', ['authenticated',`wayfound.${table}`,privilege])).rows[0].allowed, false);
    assert.equal((await sql.query("select relrowsecurity from pg_class where oid=$1::regclass", [`wayfound.${table}`])).rows[0].relrowsecurity, true);
  }
  expectedError(await clients[0].schema('wayfound').from('work_items').update({status:'Validated'}).eq('id',work), 'direct status write succeeded');
  const pendingBlock = args(workspace, work, 5, 'Blocked', 'A second dependency prevents progress.');
  await sql.query('delete from wayfound.memberships where workspace_id=$1 and actor_id=$2', [workspace, actor]);
  try {
    expectedError(await mutate(clients[0], pendingBlock), 'revoked owner mutation succeeded', '42501');
    expectedError(await mutate(clients[0], approval), 'revoked owner replay succeeded', '42501');
    assert.deepEqual(await list(clients[0], workspace), []);
  } finally { await sql.query("insert into wayfound.memberships(workspace_id,actor_id,role) values($1,$2,'owner')", [workspace, actor]); }
  await sql.query("update auth.sessions set not_after=now()-interval '1 minute' where user_id=$1", [users[0].id]);
  try {
    expectedError(await mutate(clients[0], pendingBlock), 'expired mutation succeeded');
    expectedError(await mutate(clients[0], approval), 'expired replay succeeded');
    expectedError(await rpc(clients[0], 'list_work_items', {p_workspace:workspace}), 'expired read succeeded');
  } finally { await sql.query('update auth.sessions set not_after=null where user_id=$1', [users[0].id]); }
  const signedOut = backend.client();
  const signedSession = ok(await signedOut.auth.signInWithPassword({email:emails[0],password})).session;
  ok(await signedOut.auth.signOut({scope:'local'}));
  expectedError(await mutate(signedOut, pendingBlock), 'signed-out client succeeded');
  await revokedRpc(signedSession.access_token, 'transition_work_item', pendingBlock);
  const access = ok(await clients[0].auth.getSession()).session.access_token;
  await sql.query('delete from auth.sessions where user_id=$1', [users[0].id]);
  await revokedRpc(access, 'transition_work_item', pendingBlock);
  await revokedRpc(access, 'transition_work_item', approval);
  await revokedRpc(access, 'list_work_items', {p_workspace:workspace});
  ok(await clients[0].auth.signInWithPassword({email:emails[0],password}));

  // Exercise every transition through the built owner UI, including a real stale form.
  const uiWork = await createWork(clients[0], workspace, 'Record the checkout observation');
  await start();
  browser = await chromium.launch({ headless: true });
  let context = await browser.newContext();
  let page = await context.newPage();
  await login(page, emails[0]);
  const workspaceUrl = `${base}/workspaces/${workspace}`;
  await page.goto(workspaceUrl);
  const card = () => page.locator(`#work-item-${uiWork}`);
  await card().getByText('Status: Proposed', {exact:true}).waitFor({timeout:30000});
  const stalePage = await context.newPage();
  await stalePage.goto(workspaceUrl);
  const staleCard = stalePage.locator(`#work-item-${uiWork}`);
  await staleCard.getByRole('textbox').fill('Approval from a stale tab.');
  await staleCard.getByRole('checkbox').check();
  for (const [button, reason, status] of [
    ['Approve work','This observation is within my responsibility.','Approved'],
    ['Start work','I have started the observation.','In progress'],
    ['Block work','Operations access approval is required.','Blocked'],
    ['Resume work','Operations approved access and I resumed observation.','In progress'],
  ]) {
    await card().getByRole('textbox').fill(reason);
    await card().getByRole('checkbox').check();
    await card().getByRole('button',{name:button,exact:true}).click();
    await card().getByText(`Status: ${status}`,{exact:true}).waitFor({timeout:30000});
    await card().getByText(reason,{exact:true}).first().waitFor();
    if (button==='Approve work') {
      await staleCard.getByRole('button',{name:'Approve work',exact:true}).click();
      await staleCard.getByRole('alert').getByText('This work changed or the transition is not allowed. Reload the workspace and review its current state.',{exact:true}).waitFor({timeout:30000});
      await stalePage.screenshot({path:`${output}/work-lifecycle-stale-error.png`,fullPage:true});
      await stalePage.close();
    }
    if (status==='Blocked') {
      await card().getByText('Current blocker',{exact:true}).waitFor();
      await inspect(page,'work-lifecycle-blocked');
    }
  }
  await card().locator('summary').click();
  assert.equal(await card().locator('.work-transition-history li').count(),4);
  await inspect(page,'work-lifecycle-resumed');
  const persisted = await list(clients[0],workspace);
  assert.equal(persisted.find(x=>x.id===uiWork).revision,5);
  assert.deepEqual(await snapshot(),unaffected);
  assert.equal(referenceHits,0,'work lifecycle fetched an external reference');
  await context.close();
  await stop();
  await start();
  context=await browser.newContext(); page=await context.newPage();
  await login(page,emails[0]);
  await page.goto(workspaceUrl);
  await card().getByText('Status: In progress',{exact:true}).waitFor({timeout:30000});
  assert.deepEqual(await list(clients[0],workspace),persisted);
  const otherContext=await browser.newContext();const otherPage=await otherContext.newPage();
  await login(otherPage,emails[1]);await otherPage.goto(workspaceUrl);
  await otherPage.getByRole('heading',{name:'Workspace not available.'}).waitFor({timeout:30000});
  await otherContext.close();
  execFileSync('docker',['pause','supabase_db_wayfound'],{stdio:'ignore'});dbPaused=true;
  try {
    await page.goto(workspaceUrl,{timeout:90000});
    await page.getByRole('heading',{name:'We could not load your workspace.'}).waitFor({timeout:60000});
    await page.screenshot({path:`${output}/work-lifecycle-database-unavailable.png`,fullPage:true});
  } finally {execFileSync('docker',['unpause','supabase_db_wayfound'],{stdio:'ignore'});dbPaused=false;}
  await new Promise(resolve=>setTimeout(resolve,5000));
  await page.reload();await card().getByText('Status: In progress',{exact:true}).waitFor({timeout:30000});
  assert.deepEqual(await list(clients[0],workspace),persisted);
  assert.deepEqual(await snapshot(),unaffected);
  assert.equal(referenceHits,0);
  console.log('PASS: owner work approval/start/block/resume preserves responsibility and qualified-review boundaries; exact-state concurrency, transactional history/audit/idempotency, invalid-state/target denial, tenant/specialist/session/revocation isolation, direct-table denial, rollback/retry, restart/re-login persistence, database interruption/recovery, external-reference non-fetch, stale-form errors, keyboard access, and desktop/390 px rendering passed.');
} finally {
  if(dbPaused){try{execFileSync('docker',['unpause','supabase_db_wayfound'],{stdio:'ignore'});}catch{}}
  if(browser)await browser.close();
  await stop();
  await new Promise(resolve=>referenceServer.close(resolve));
  await sql.end();
}
