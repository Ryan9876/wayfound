import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { localBackend } from './local-backend.mjs';

const backend = localBackend();
const sql = backend.sql;
await sql.connect();
const password = randomBytes(24).toString('base64url');
const emails = [0, 1].map(index => `ai-review-${index}-${randomUUID()}@example.test`);
const clients = [backend.client(), backend.client()];
const users = [];
const retryDelays = [150, 350, 750];
const base = 'http://127.0.0.1:3300';
const outputDir = 'artifacts/workspace';
mkdirSync(outputDir, { recursive: true });
let appServer = null;
let browser = null;
let modelServer = null;
let modelRequests = [];

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
    p_problem: 'Use local AI advice without confusing it with verification.',
    p_release: 'Release 1.0',
    p_request: randomUUID(),
  }));
}
async function createWork(client, workspace, title) {
  return ok(await rpc(client, 'create_proposed_work_item', {
    p_workspace: workspace,
    p_title: title,
    p_outcome: 'Produce one bounded implementation result.',
    p_completion_condition: 'The bounded implementation result exists.',
    p_evidence_expectation: 'Independent evidence can later verify the result.',
    p_request: randomUUID(),
  }));
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
async function implementWork(client, workspace, work) {
  ok(await rpc(client, 'transition_work_item', transitionArgs(workspace, work, 1, 'Approved', 'Owner approves the bounded work.')));
  ok(await rpc(client, 'transition_work_item', transitionArgs(workspace, work, 2, 'In progress', 'Owner starts the bounded work.')));
  ok(await rpc(client, 'transition_work_item', transitionArgs(workspace, work, 3, 'Implemented', 'The bounded implementation is complete; verification remains separate.')));
}
async function listWork(client, workspace) {
  return ok(await rpc(client, 'list_work_items', { p_workspace: workspace }));
}
function reviewArgs(workspace, work, revision, purpose, request = randomUUID()) {
  return {
    p_workspace: workspace,
    p_work_item: work,
    p_expected_revision: revision,
    p_purpose: purpose,
    p_confirm: true,
    p_request: request,
  };
}
function completeArgs(workspace, review, result = 'Assessment\nThe saved record reports implementation.\n\nGaps or risks\nVerification evidence is not included.\n\nSuggested next action\nCollect objective evidence against the completion condition.') {
  return {
    p_workspace: workspace,
    p_review: review,
    p_provider_id: 'lm-studio',
    p_provider_label: 'LM Studio',
    p_model: 'wayfound-test-model',
    p_result: result,
    p_response_time_ms: 42,
    p_prompt_tokens: 100,
    p_completion_tokens: 50,
    p_reasoning_tokens: 0,
    p_total_tokens: 150,
    p_tokens_per_second: 25,
  };
}
function dispositionArgs(workspace, review, disposition, note, request = randomUUID()) {
  return {
    p_workspace: workspace,
    p_review: review,
    p_disposition: disposition,
    p_note: note,
    p_confirm: true,
    p_request: request,
  };
}
async function snapshotProject(workspace, work) {
  const release = (await sql.query('select lifecycle,current_stage,revision from wayfound.releases where workspace_id=$1', [workspace])).rows;
  const workRows = (await sql.query('select id,status,revision from wayfound.work_items where workspace_id=$1 and id=$2', [workspace, work])).rows;
  const requirements = (await sql.query('select id,status,revision from wayfound.requirements where workspace_id=$1 order by id', [workspace])).rows;
  const evidence = (await sql.query('select id,effect from wayfound.evidence_records where workspace_id=$1 order by id', [workspace])).rows;
  const artifacts = (await sql.query('select id,revision,accepted_version_id from wayfound.artifacts where workspace_id=$1 order by id', [workspace])).rows;
  return { release, workRows, requirements, evidence, artifacts };
}

async function startModelStub() {
  modelRequests = [];
  modelServer = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/api/v1/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ models: [{ type: 'llm', key: 'wayfound-test-model', display_name: 'Wayfound Test Model', loaded_instances: [{}] }] }));
      return;
    }
    if (req.method === 'POST' && req.url === '/api/v1/chat') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw || '{}');
      modelRequests.push(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        model_instance_id: 'wayfound-test-model',
        output: [{ type: 'message', content: 'Assessment\nThe saved work record reports implementation.\n\nGaps or risks\nThe supplied record does not contain objective verification evidence.\n\nSuggested next action\nCollect evidence that directly checks the completion condition.' }],
        stats: { input_tokens: 123, total_output_tokens: 44, reasoning_output_tokens: 0, tokens_per_second: 22.5 },
      }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
  modelServer.listen(1234, '127.0.0.1');
  await once(modelServer, 'listening');
}
async function stopModelStub() {
  if (!modelServer) return;
  const closing = once(modelServer, 'close');
  modelServer.close();
  await closing;
  modelServer = null;
}
async function startApp() {
  appServer = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3300'], {
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

  const workspace = await createWorkspace(clients[0], 'Durable AI review');
  const foreignWorkspace = await createWorkspace(clients[1], 'Foreign AI review');
  const actor = (await sql.query('select id from wayfound.actors where provider_subject=$1', [users[0].id])).rows[0].id;
  const work = await createWork(clients[0], workspace, 'Implement bounded work for AI review');
  const foreignWork = await createWork(clients[1], foreignWorkspace, 'Foreign AI review work');
  const proposed = await createWork(clients[0], workspace, 'Proposed AI review guard');

  expectedError(await rpc(clients[0], 'request_ai_work_review', reviewArgs(workspace, proposed, 1, 'Review proposed work.')), 'proposed work received AI review', '55000');
  await implementWork(clients[0], workspace, work);

  const before = await snapshotProject(workspace, work);
  const requestId = randomUUID();
  const purpose = 'Identify gaps between the implementation claim and the evidence that would be needed to verify it.';
  const first = ok(await rpc(clients[0], 'request_ai_work_review', reviewArgs(workspace, work, 4, purpose, requestId)));
  assert.equal(first.status, 'Pending');
  assert.equal(first.target_snapshot.work_item_id, work);
  assert.equal(first.target_snapshot.revision, 4);
  assert.equal(first.target_snapshot.status, 'Implemented');
  assert.equal(first.target_snapshot.implementation_note, 'The bounded implementation is complete; verification remains separate.');
  assert.equal(first.target_snapshot.evidence_expectation, 'Independent evidence can later verify the result.');

  const replay = ok(await rpc(clients[0], 'request_ai_work_review', reviewArgs(workspace, work, 4, purpose, requestId)));
  assert.equal(replay.id, first.id, 'identical AI-review request produced a second review');
  expectedError(await rpc(clients[0], 'request_ai_work_review', reviewArgs(workspace, work, 4, 'Changed purpose.', requestId)), 'changed AI-review replay succeeded', '22023');
  expectedError(await rpc(clients[0], 'request_ai_work_review', reviewArgs(workspace, work, 3, 'Review stale revision.')), 'stale revision received AI review', '55000');
  expectedError(await rpc(clients[1], 'request_ai_work_review', reviewArgs(workspace, work, 4, purpose)), 'non-owner requested AI review', '42501');
  expectedError(await rpc(clients[0], 'request_ai_work_review', reviewArgs(workspace, foreignWork, 1, purpose)), 'cross-workspace target received AI review', '23503');
  expectedError(await clients[0].schema('wayfound').from('ai_reviews').select('*'), 'direct AI-review table read succeeded');

  const completedId = ok(await rpc(clients[0], 'complete_ai_review', completeArgs(workspace, first.id)));
  assert.equal(completedId, first.id);
  let savedWork = (await listWork(clients[0], workspace)).find(item => item.id === work);
  let savedReview = savedWork.ai_reviews.find(review => review.id === first.id);
  assert(savedReview, 'completed AI review missing from work record');
  assert.equal(savedReview.status, 'Completed');
  assert.equal(savedReview.provider_id, 'lm-studio');
  assert.equal(savedReview.model, 'wayfound-test-model');
  assert(savedReview.advisory_result.toLowerCase().includes('verification evidence'), 'advisory result missing');
  assert.deepEqual(await snapshotProject(workspace, work), before, 'AI review completion changed project state outside AI review records');
  expectedError(await rpc(clients[0], 'fail_ai_review', {
    p_workspace: workspace, p_review: first.id, p_provider_id: 'lm-studio', p_provider_label: 'LM Studio', p_model: 'wayfound-test-model', p_failure_detail: 'Changed terminal state.',
  }), 'completed review was changed to failed', '55000');

  const failedContext = ok(await rpc(clients[0], 'request_ai_work_review', reviewArgs(workspace, work, 4, 'Exercise durable local inference failure.')));
  ok(await rpc(clients[0], 'fail_ai_review', {
    p_workspace: workspace,
    p_review: failedContext.id,
    p_provider_id: null,
    p_provider_label: null,
    p_model: null,
    p_failure_detail: 'No supported local AI server was detected. Wayfound will not fall back to cloud AI.',
  }));
  savedWork = (await listWork(clients[0], workspace)).find(item => item.id === work);
  const failedReview = savedWork.ai_reviews.find(review => review.id === failedContext.id);
  assert.equal(failedReview.status, 'Failed');
  assert.equal(failedReview.provider_id, null);
  expectedError(await rpc(clients[0], 'disposition_ai_review', dispositionArgs(workspace, failedContext.id, 'Do not use', 'Failed review has no advisory result.')), 'failed review accepted owner disposition', '55000');

  const dispositionRequest = randomUUID();
  ok(await rpc(clients[0], 'disposition_ai_review', dispositionArgs(workspace, first.id, 'Use as input', 'Use this advice to plan objective verification.', dispositionRequest)));
  assert.equal(ok(await rpc(clients[0], 'disposition_ai_review', dispositionArgs(workspace, first.id, 'Use as input', 'Use this advice to plan objective verification.', dispositionRequest))), first.id);
  expectedError(await rpc(clients[0], 'disposition_ai_review', dispositionArgs(workspace, first.id, 'Do not use', 'Changed replay.', dispositionRequest)), 'changed disposition replay succeeded', '22023');
  savedWork = (await listWork(clients[0], workspace)).find(item => item.id === work);
  savedReview = savedWork.ai_reviews.find(review => review.id === first.id);
  assert.equal(savedReview.disposition, 'Use as input');
  assert.equal(savedReview.disposition_actor_id, actor);
  assert.deepEqual(await snapshotProject(workspace, work), before, 'AI-review disposition changed implementation or verification state');

  const concurrentContext = ok(await rpc(clients[0], 'request_ai_work_review', reviewArgs(workspace, work, 4, 'Exercise disposition concurrency.')));
  ok(await rpc(clients[0], 'complete_ai_review', completeArgs(workspace, concurrentContext.id)));
  const concurrent = await Promise.all([
    rpc(clients[0], 'disposition_ai_review', dispositionArgs(workspace, concurrentContext.id, 'Use as input', 'Concurrent disposition A.')),
    rpc(clients[0], 'disposition_ai_review', dispositionArgs(workspace, concurrentContext.id, 'Needs follow-up', 'Concurrent disposition B.')),
  ]);
  assert.equal(concurrent.filter(result => !result.error).length, 1, 'distinct concurrent dispositions did not produce one winner');

  const rollbackContext = ok(await rpc(clients[0], 'request_ai_work_review', reviewArgs(workspace, work, 4, 'Exercise disposition rollback.')));
  ok(await rpc(clients[0], 'complete_ai_review', completeArgs(workspace, rollbackContext.id)));
  const rollbackRequest = randomUUID();
  await sql.query(`create function wayfound.test_ai_disposition_failure() returns trigger language plpgsql as $$begin if new.operation='ai_review.disposition_recorded' then raise exception 'Injected AI disposition audit failure'; end if; return new; end$$; create trigger test_ai_disposition_failure before insert on wayfound.audit_events for each row execute function wayfound.test_ai_disposition_failure()`);
  try {
    expectedError(await rpc(clients[0], 'disposition_ai_review', dispositionArgs(workspace, rollbackContext.id, 'Needs follow-up', 'This must roll back.', rollbackRequest)), 'AI disposition audit failure did not fail');
  } finally {
    await sql.query('drop trigger test_ai_disposition_failure on wayfound.audit_events; drop function wayfound.test_ai_disposition_failure()');
  }
  let rollbackRow = (await sql.query('select disposition from wayfound.ai_reviews where id=$1', [rollbackContext.id])).rows[0];
  assert.equal(rollbackRow.disposition, null, 'failed AI disposition committed');
  assert.equal((await sql.query('select count(*)::int n from wayfound.ai_review_disposition_requests where actor_id=$1 and request_id=$2', [actor, rollbackRequest])).rows[0].n, 0, 'failed AI disposition retained request result');
  ok(await rpc(clients[0], 'disposition_ai_review', dispositionArgs(workspace, rollbackContext.id, 'Needs follow-up', 'This must roll back.', rollbackRequest)));

  const revokedContext = ok(await rpc(clients[0], 'request_ai_work_review', reviewArgs(workspace, work, 4, 'Exercise membership revocation.')));
  await sql.query('delete from wayfound.memberships where workspace_id=$1 and actor_id=$2', [workspace, actor]);
  try {
    expectedError(await rpc(clients[0], 'complete_ai_review', completeArgs(workspace, revokedContext.id)), 'revoked owner completed AI review', '42501');
  } finally {
    await sql.query("insert into wayfound.memberships(workspace_id,actor_id,role) values($1,$2,'owner')", [workspace, actor]);
  }

  await startModelStub();
  await startApp();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await login(page, emails[0]);
  await page.goto(`${base}/workspaces/${workspace}?view=work#work-item-${work}`);
  await page.getByText('Ask local AI to review', { exact: true }).waitFor({ timeout: 30000 });
  await page.getByText('Ask local AI to review', { exact: true }).click();
  await page.getByLabel('What should AI review about this implemented work?').fill('Review whether the saved implementation claim is ready for objective verification planning.');
  await page.getByRole('checkbox', { name: /only this saved work record is sent to local AI/i }).check();
  await page.getByRole('button', { name: 'Run AI review', exact: true }).click();
  await page.locator('.ai-review-card').first().getByText('Completed', { exact: true }).waitFor({ timeout: 30000 });
  assert.equal(modelRequests.length, 1, 'server action did not invoke exactly one local model review');
  assert(String(modelRequests[0].input).includes(`Work item ID: ${work}`), 'local model did not receive target work ID');
  assert(String(modelRequests[0].input).includes('Context boundary: work-item record only.'), 'local model prompt omitted context boundary');
  assert(String(modelRequests[0].system_prompt).includes('Do not claim that you inspected source code'), 'local model system instruction omitted inspection boundary');
  assert(String(modelRequests[0].system_prompt).includes('Do not label the work Verified'), 'local model system instruction omitted verification boundary');

  const uiReview = (await listWork(clients[0], workspace)).find(item => item.id === work).ai_reviews.find(review => review.purpose.startsWith('Review whether'));
  assert(uiReview, 'UI-created AI review missing');
  assert.equal(uiReview.status, 'Completed');
  assert.equal(uiReview.provider_label, 'LM Studio');
  assert.equal(uiReview.model, 'wayfound-test-model');
  assert.equal(uiReview.prompt_tokens, 123);
  assert.equal(uiReview.completion_tokens, 44);
  assert.equal(uiReview.total_tokens, 167);
  assert(uiReview.advisory_result.includes('does not contain objective verification evidence'));

  const uiCard = page.locator('.ai-review-card').filter({ hasText: uiReview.purpose });
  await uiCard.getByText('Record how you will use this review', { exact: true }).click();
  await uiCard.getByLabel('How will you use this advice?').selectOption({ label: 'Needs follow-up' });
  await uiCard.getByLabel('Why?').fill('Collect objective evidence before making any verification claim.');
  await uiCard.getByRole('checkbox', { name: /records my treatment of AI advice only/i }).check();
  await uiCard.getByRole('button', { name: 'Save disposition', exact: true }).click();
  await page.getByText('Owner disposition · Needs follow-up', { exact: true }).waitFor({ timeout: 30000 });

  const afterUi = (await listWork(clients[0], workspace)).find(item => item.id === work).ai_reviews.find(review => review.id === uiReview.id);
  assert.equal(afterUi.disposition, 'Needs follow-up');
  assert.equal(afterUi.disposition_note, 'Collect objective evidence before making any verification claim.');
  assert.deepEqual(await snapshotProject(workspace, work), before, 'UI AI review/disposition changed project state outside AI review records');

  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'AI review desktop view overflow');
  await page.screenshot({ path: `${outputDir}/ai-review-disposition-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'AI review mobile view overflow');
  await page.screenshot({ path: `${outputDir}/ai-review-disposition-mobile.png`, fullPage: true });

  await stopModelStub();
  await page.reload();
  await page.getByText(/Start a supported local AI model in LM Studio or Ollama/).waitFor({ timeout: 10000 });
  assert.equal(await page.getByText('Ask local AI to review', { exact: true }).count(), 0, 'AI-review action remained available with local AI offline');
  assert(await page.getByText('Owner disposition · Needs follow-up', { exact: true }).isVisible(), 'saved AI review disappeared while local provider was offline');

  ok(await clients[0].auth.signOut({ scope: 'local' }));
  ok(await clients[0].auth.signInWithPassword({ email: emails[0], password }));
  savedWork = (await listWork(clients[0], workspace)).find(item => item.id === work);
  assert(savedWork.ai_reviews.some(review => review.id === uiReview.id && review.disposition === 'Needs follow-up'), 'AI review did not survive re-login');
  console.log('PASS: durable AI work review preserves exact target provenance, uses loopback local inference, remains advisory, records one owner disposition, denies invalid/foreign/revoked paths, preserves idempotency/concurrency/rollback, survives re-login, and keeps project verification/release state unchanged.');
} finally {
  if (browser) await browser.close().catch(() => {});
  await stopApp().catch(() => {});
  await stopModelStub().catch(() => {});
  await sql.end();
}