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
const emails = [0, 1].map(index => `multiple-criteria-${index}-${randomUUID()}@example.test`);
const clients = [backend.client(), backend.client()];
const users = [];
const retryDelays = [150, 350, 750];
const base = 'http://127.0.0.1:3312';
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
  appServer = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3312'], {
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
  return ok(await rpc(client, 'create_workspace', { p_name: name, p_problem: 'Keep multiple product conditions and exact evidence links.', p_release: 'Release 1.0', p_request: randomUUID() }));
}
async function createRequirement(client, workspace, title) {
  return ok(await rpc(client, 'record_owner_requirement', { p_workspace: workspace, p_title: title, p_obligation: 'MUST', p_requirement: 'Keep checkout records understandable.', p_acceptance_criterion: 'The owner can see the borrower.', p_authority_confirm: true, p_request: randomUUID() }));
}
async function requirement(workspace, id) {
  return ok(await rpc(clients[0], 'list_requirements', { p_workspace: workspace })).find(r => r.id === id);
}
function args(workspace, id, revision, statement = 'The owner can see the return date.') {
  return { p_workspace: workspace, p_requirement: id, p_expected_revision: revision, p_statement: statement, p_reason: 'The owner needs a separate observable condition.', p_confirm: true, p_request: randomUUID() };
}
async function add(payload, client = clients[0]) { return rpc(client, 'add_owner_criterion', payload); }
async function evidence(workspace, criterion, title) {
  return ok(await rpc(clients[0], 'record_criterion_evidence', { p_workspace: workspace, p_acceptance_criterion: criterion, p_title: title, p_result: 'A recorded observation.', p_source_note: 'Manual observation in an isolated test.', p_effect: 'Supports', p_request: randomUUID() }));
}
async function rows(table, workspace) { return (await sql.query(`select * from wayfound.${table} where workspace_id=$1 order by id`, [workspace])).rows; }
try {
  for (let index = 0; index < 2; index++) {
    users.push(ok(await backend.admin.auth.admin.createUser({ email: emails[index], password, email_confirm: true })).user);
    ok(await clients[index].auth.signInWithPassword({ email: emails[index], password }));
  }
  const workspace = await createWorkspace(clients[0], 'Multiple acceptance criteria');
  const foreignWorkspace = await createWorkspace(clients[1], 'Foreign criteria');
  const id = await createRequirement(clients[0], workspace, 'Checkout clarity');
  const foreignId = await createRequirement(clients[1], foreignWorkspace, 'Foreign requirement');
  const initial = await requirement(workspace, id);
  assert.equal(initial.acceptance_criteria.length, 1, 'creation no longer creates exactly one initial criterion');
  const first = initial.acceptance_criteria[0];
  await evidence(workspace, first.id, 'Original evidence');
  const originalEvidence = await rows('evidence_records', workspace);
  const untouched = {};
  for (const table of ['work_items','decisions','artifacts','releases','release_stages']) {
    // release_stages is scoped by release, not workspace.
    if (table !== 'release_stages') untouched[table] = await rows(table, workspace);
  }
  const stages = (await sql.query('select * from wayfound.release_stages where release_id=$1 order by stage_number', [initial.release_id])).rows;
  const payload = args(workspace, id, 1);
  const same = await Promise.all([add(payload), add(payload)]);
  const secondId = ok(same[0]);
  assert.equal(ok(same[1]), secondId, 'exact concurrent replay created two criteria');
  expectedError(await add({ ...payload, p_reason: 'Changed request' }), 'changed replay accepted', '22023');
  let current = await requirement(workspace, id);
  assert.equal(current.revision, 2);
  assert.equal(current.acceptance_criteria.length, 2);
  assert.deepEqual(current.acceptance_criteria.find(c => c.id === first.id), first);
  assert.deepEqual(await rows('evidence_records', workspace), originalEvidence, 'addition rewrote evidence snapshots');
  const second = current.acceptance_criteria.find(c => c.id === secondId);
  assert.equal(second.addition.from_revision, 1); assert.equal(second.addition.to_revision, 2);
  assert.equal(second.addition.reason, payload.p_reason);
  assert.equal(second.revision, 1);
  assert.equal(current.status, 'Approved');
  for (const [key,value] of Object.entries(initial)) {
    if (!['acceptance_criteria','revision','updated_at'].includes(key)) assert.deepEqual(current[key],value, `addition changed requirement ${key}`);
  }
  for (const [table, snapshot] of Object.entries(untouched)) assert.deepEqual(await rows(table, workspace), snapshot, `addition changed ${table}`);
  assert.deepEqual((await sql.query('select * from wayfound.release_stages where release_id=$1 order by stage_number', [initial.release_id])).rows, stages);
  const newerEvidence = await evidence(workspace, secondId, 'Second criterion evidence');
  const savedEvidence = (await rows('evidence_records', workspace)).find(e => e.id === newerEvidence);
  assert.equal(savedEvidence.acceptance_criterion_id, secondId); assert.equal(savedEvidence.requirement_revision, 2); assert.equal(savedEvidence.criterion_revision, 1);
  for (const old of originalEvidence) assert.deepEqual((await rows('evidence_records', workspace)).find(e => e.id === old.id), old);
  for (const change of [{p_statement:''},{p_statement:'x'.repeat(4001)},{p_reason:''},{p_reason:'x'.repeat(2001)},{p_confirm:false},{p_expected_revision:0}]) {
    expectedError(await add({...args(workspace,id,2),...change}), 'invalid input accepted','22023');
  }
  expectedError(await add(args(workspace,id,1,'A stale addition.')), 'stale revision accepted','55000');
  expectedError(await add(args(workspace,id,2,first.statement)), 'duplicate criterion accepted','55000');
  expectedError(await add(args(workspace,foreignId,1)), 'foreign requirement accepted','23503');
  expectedError(await add(args(workspace,randomUUID(),1)), 'unknown requirement accepted','23503');
  expectedError(await add(args(workspace,id,2),clients[1]), 'foreign owner accepted','42501');
  expectedError(await add(args(workspace,id,2),backend.client()), 'anonymous accepted');
  for (const table of ['acceptance_criteria','criterion_additions','criterion_add_requests']) {
    expectedError(await clients[0].schema('wayfound').from(table).select('*'), 'direct read accepted');
    expectedError(await clients[0].schema('wayfound').from(table).insert({workspace_id:workspace}), 'direct write accepted');
  }
  const races = await Promise.all([add(args(workspace,id,2,'Condition three A.')), add(args(workspace,id,2,'Condition three B.'))]);
  assert.equal(races.filter(r => !r.error).length, 1, 'same-revision race had wrong number of winners');
  expectedError(races.find(r=>r.error),'missing stale loser','55000');
  current = await requirement(workspace,id);
  assert.equal(current.revision,3); assert.equal(current.acceptance_criteria.length,3);
  const beforeFailure = current;
  const failurePayload = args(workspace,id,3,'Condition after recovery.');
  await sql.query("create function wayfound.test_criterion_failure() returns trigger language plpgsql as $$begin if new.operation='criterion.added' then raise exception 'Injected failure'; end if; return new; end$$; create trigger test_criterion_failure before insert on wayfound.audit_events for each row execute function wayfound.test_criterion_failure()");
  try { expectedError(await add(failurePayload), 'audit failure did not fail'); }
  finally { await sql.query('drop trigger test_criterion_failure on wayfound.audit_events; drop function wayfound.test_criterion_failure()'); }
  assert.deepEqual(await requirement(workspace,id),beforeFailure,'audit failure changed requirement');
  assert.equal((await sql.query('select count(*)::int n from wayfound.criterion_add_requests where request_id=$1',[failurePayload.p_request])).rows[0].n,0);
  assert.equal((await sql.query('select count(*)::int n from wayfound.criterion_additions where requirement_id=$1',[id])).rows[0].n,2);
  ok(await add(failurePayload));
  const actor = initial.approving_actor_id;
  await sql.query('delete from wayfound.memberships where workspace_id=$1 and actor_id=$2',[workspace,actor]);
  try { expectedError(await add(payload),'revoked replay accepted','42501'); }
  finally { await sql.query("insert into wayfound.memberships(workspace_id,actor_id,role) values($1,$2,'owner')",[workspace,actor]); }
  await sql.query("update auth.sessions set not_after=now()-interval '1 minute' where user_id=$1",[users[0].id]);
  try { expectedError(await add(payload),'expired replay accepted','28000'); }
  finally { await sql.query('update auth.sessions set not_after=null where user_id=$1',[users[0].id]); }
  await sql.query('delete from auth.sessions where user_id=$1',[users[0].id]);
  expectedError(await add(payload),'revoked session replay accepted','28000');
  ok(await clients[0].auth.signInWithPassword({email:emails[0],password}));
  const persisted = await requirement(workspace,id);
  assert.equal(persisted.acceptance_criteria.length,4);

  const uiId = await createRequirement(clients[0],workspace,'UI product conditions');
  await startApp();
  browser = await chromium.launch({headless:true});
  let page = await browser.newPage({viewport:{width:1440,height:1200}});
  await login(page,emails[0]);
  await page.goto(`${base}/workspaces/${workspace}?view=records#requirement-${uiId}`);
  let card = page.locator(`#requirement-${uiId}`);
  let summary = card.locator('summary').filter({hasText:/^Add acceptance criterion$/});
  await summary.focus(); await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  assert(await card.getByLabel('What condition must be met?').evaluate(el=>el===document.activeElement),'condition field not next keyboard target');
  await card.getByLabel('What condition must be met?').fill('   ');
  await card.getByLabel('Why is this condition needed?').fill('We need a second observable product condition.');
  await card.getByRole('checkbox').check();
  await card.getByRole('button',{name:'Save acceptance criterion',exact:true}).click();
  await card.getByRole('alert').waitFor();
  assert.equal(await card.getByLabel('Why is this condition needed?').inputValue(),'We need a second observable product condition.','error discarded reason');
  await card.getByLabel('What condition must be met?').fill('The owner can see when equipment is due.');
  await card.getByRole('button',{name:'Save acceptance criterion',exact:true}).click();
  await card.getByText('The owner can see when equipment is due.',{exact:true}).waitFor({timeout:30000});
  const uiSaved = await requirement(workspace,uiId);
  assert.equal(uiSaved.acceptance_criteria.length,2);
  await evidence(workspace,uiSaved.acceptance_criteria[0].id,'Evidence for only the first condition');
  await page.reload();
  for (const disclosure of await card.locator('summary').all()) {
    if ((await disclosure.textContent()).trim() !== 'Add acceptance criterion') await disclosure.click();
  }
  await card.locator('summary').filter({hasText:/^Add acceptance criterion$/}).click();
  for (const [label,width,height] of [['desktop',1440,1200],['mobile',390,844]]) {
    await page.setViewportSize({width,height});
    await assertUniqueIds(page);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label} overflow`);
    await card.screenshot({path:`${outputDir}/multiple-criteria-${label}.png`});
  }
  await browser.close(); browser=null;
  await stopApp(); await startApp();
  browser=await chromium.launch({headless:true});
  page=await browser.newPage(); await login(page,emails[0]);
  await page.goto(`${base}/workspaces/${workspace}?view=records#requirement-${uiId}`);
  await page.locator(`#requirement-${uiId}`).getByText('The owner can see when equipment is due.',{exact:true}).waitFor();
  assert.deepEqual(await requirement(workspace,id),persisted,'restart/re-login changed saved criteria');
  console.log('PASS: multiple product criteria; exact evidence and revision preservation; owner/tenant/session/revocation gates; idempotency, concurrency, audit rollback/retry; persistence; browser failure retention, keyboard, unique IDs and desktop/390 px rendering.');
} finally {
  if (browser) await browser.close();
  await stopApp();
  await sql.end();
}
