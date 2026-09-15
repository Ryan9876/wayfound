import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { localBackend } from './local-backend.mjs';

const backend = localBackend();
const sql = backend.sql;
await sql.connect();

const base = 'http://127.0.0.1:3410';
const password = randomBytes(24).toString('base64url');
const email = `ai-openai-${randomUUID()}@example.test`;
const apiKey = `wayfound-openai-test-${randomUUID()}`;
const client = backend.client();
const retryDelays = [150, 350, 750];
const openAiRequests = [];
const localRequests = [];
let openAiServer = null;
let lmServer = null;
let appServer = null;
let browser = null;

function ok(result) {
  if (result.error) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}

function jwtFuture(error) {
  return error?.code === 'PGRST303' && error.message === 'JWT issued at future';
}

async function rpc(name, args) {
  let result = await client.rpc(name, args);
  for (const delay of retryDelays) {
    if (!jwtFuture(result.error)) return result;
    await new Promise(resolveDelay => setTimeout(resolveDelay, delay));
    result = await client.rpc(name, args);
  }
  return result;
}

async function createImplementedWork() {
  const workspace = ok(await rpc('create_workspace', {
    p_name: 'Configured OpenAI development validation',
    p_problem: 'Validate explicit cloud connectivity without widening durable cloud-review authority.',
    p_release: 'Release 1.0',
    p_request: randomUUID(),
  }));
  const work = ok(await rpc('create_proposed_work_item', {
    p_workspace: workspace,
    p_title: 'Exercise configured OpenAI development connection',
    p_outcome: 'OpenAI can be tested explicitly while durable project review remains local-only.',
    p_completion_condition: 'Configured OpenAI discovery and connection testing work without leaking the key or receiving durable project review.',
    p_evidence_expectation: 'Browser state, provider stubs, trace data, and durable review failure agree.',
    p_request: randomUUID(),
  }));
  const transition = async (revision, status, reason) => ok(await rpc('transition_work_item', {
    p_workspace: workspace,
    p_work_item: work,
    p_expected_revision: revision,
    p_target_status: status,
    p_reason: reason,
    p_confirm: true,
    p_request: randomUUID(),
  }));
  await transition(1, 'Approved', 'Owner approves the bounded configured-provider validation.');
  await transition(2, 'In progress', 'Owner starts the configured-provider validation.');
  await transition(3, 'Implemented', 'The configured-provider path exists; the browser validation checks its boundary.');
  return { workspace, work };
}

async function readJsonRequest(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return JSON.parse(raw || '{}');
}

async function startOpenAiStub() {
  openAiServer = createServer(async (req, res) => {
    const authorization = req.headers.authorization || '';
    if (req.method === 'GET' && req.url === '/v1/models') {
      openAiRequests.push({ kind: 'models', authorization });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        data: [
          { id: 'gpt-5.6-test' },
          { id: 'o4-mini-test' },
          { id: 'text-embedding-test' },
        ],
      }));
      return;
    }
    if (req.method === 'POST' && req.url === '/v1/responses') {
      const body = await readJsonRequest(req);
      openAiRequests.push({ kind: 'responses', authorization, body });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        model: body.model || 'gpt-5.6-test',
        output_text: 'WAYFOUND_AI_DEV_OK',
        usage: {
          input_tokens: 12,
          output_tokens: 5,
          total_tokens: 17,
          output_tokens_details: { reasoning_tokens: 2 },
        },
      }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
  openAiServer.listen(4545, '127.0.0.1');
  await once(openAiServer, 'listening');
}

async function startLocalReviewStub() {
  lmServer = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/api/v1/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        models: [{ type: 'llm', key: 'local-boundary-model', display_name: 'Local Boundary Model', loaded_instances: [{}] }],
      }));
      return;
    }
    if (req.method === 'POST') {
      const body = await readJsonRequest(req);
      localRequests.push({ url: req.url, body });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        model_instance_id: 'local-boundary-model',
        output: [{ type: 'message', content: 'This response must never be used while OpenAI is explicitly selected.' }],
        stats: { input_tokens: 1, total_output_tokens: 1, reasoning_output_tokens: 0, tokens_per_second: 1 },
      }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
  lmServer.listen(1234, '127.0.0.1');
  await once(lmServer, 'listening');
}

async function closeServer(server) {
  if (!server) return;
  const closed = once(server, 'close');
  server.close();
  await closed;
}

async function startApp() {
  const hook = pathToFileURL(resolve('scripts/openai-test-fetch-hook.mjs')).href;
  const inheritedNodeOptions = process.env.NODE_OPTIONS?.trim();
  appServer = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3410'], {
    env: {
      ...process.env,
      SUPABASE_URL: backend.url,
      SUPABASE_PUBLISHABLE_KEY: backend.key,
      APP_ORIGIN: base,
      WAYFOUND_SINGLE_USER_MODE: 'true',
      WAYFOUND_SINGLE_USER_AUTO_SIGN_IN: 'false',
      WAYFOUND_LOCAL_TEST: '1',
      WAYFOUND_AI_DEV_CONSOLE: 'true',
      OPENAI_API_KEY: apiKey,
      WAYFOUND_OPENAI_TEST_PROXY: 'http://127.0.0.1:4545',
      NODE_OPTIONS: `${inheritedNodeOptions ? `${inheritedNodeOptions} ` : ''}--import=${hook}`,
    },
    stdio: 'ignore',
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(`${base}/sign-in`)).ok) return;
    } catch {}
    await new Promise(resolveDelay => setTimeout(resolveDelay, 200));
  }
  throw new Error('Configured OpenAI validation application did not start');
}

async function stopApp() {
  if (appServer && appServer.exitCode === null) {
    const exited = once(appServer, 'exit');
    appServer.kill('SIGTERM');
    await exited;
  }
  appServer = null;
}

async function login(page) {
  await page.goto(`${base}/sign-in`);
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(`${base}/workspaces`);
}

function metricValue(dialog, label) {
  return dialog.locator('.ai-dev-result dl div').filter({ hasText: label }).locator('dd');
}

try {
  const user = ok(await backend.admin.auth.admin.createUser({ email, password, email_confirm: true })).user;
  assert(user?.id, 'configured-provider owner was not created');
  ok(await client.auth.signInWithPassword({ email, password }));
  const { workspace, work } = await createImplementedWork();

  await startOpenAiStub();
  await startLocalReviewStub();
  await startApp();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await login(page);
  await page.goto(`${base}/workspaces/${workspace}?view=work#work-item-${work}`);

  const reviewDisclosure = page.getByText('Ask local AI to review', { exact: true });
  await reviewDisclosure.waitFor({ timeout: 30_000 });

  const consoleButton = page.getByRole('button', { name: /AI Console/ });
  await consoleButton.waitFor({ timeout: 30_000 });
  await consoleButton.click();
  const dialog = page.getByRole('dialog', { name: 'Development AI console' });
  await dialog.waitFor();

  const provider = dialog.getByLabel('Provider');
  const model = dialog.getByLabel('Model');
  await provider.selectOption('openai');
  await model.locator('option[value="gpt-5.6-test"]').waitFor({ state: 'attached', timeout: 10_000 });
  await model.locator('option[value="o4-mini-test"]').waitFor({ state: 'attached', timeout: 10_000 });
  assert.equal(await model.locator('option[value="text-embedding-test"]').count(), 0, 'non-text OpenAI model leaked into the selectable list');
  await dialog.getByText('Connected · OpenAI', { exact: true }).waitFor({ timeout: 10_000 });
  assert.equal(await model.inputValue(), 'gpt-5.6-test', 'configured OpenAI did not select the first supported discovered model');

  await dialog.getByRole('button', { name: 'Test connection', exact: true }).click();
  await dialog.getByText('Connection passed', { exact: true }).waitFor({ timeout: 10_000 });
  const responseCalls = openAiRequests.filter(request => request.kind === 'responses');
  assert.equal(responseCalls.length, 1, 'configured OpenAI connection test did not send exactly one inference request');
  assert.equal(responseCalls[0].authorization, `Bearer ${apiKey}`, 'configured OpenAI connection test omitted or changed server-side authorization');
  assert.equal(responseCalls[0].body.model, 'gpt-5.6-test', 'configured OpenAI connection test did not use the selected model');
  assert.equal(await metricValue(dialog, 'Input').textContent(), '12');
  assert.equal(await metricValue(dialog, 'Output').textContent(), '5');
  assert.equal(await metricValue(dialog, 'Reasoning').textContent(), '2');
  assert.equal(await metricValue(dialog, 'Total').textContent(), '17');

  const trace = await page.evaluate(async () => {
    const response = await fetch('/api/ai-dev/trace', { cache: 'no-store' });
    return response.json();
  });
  assert.equal(trace.entries.length, 1, 'configured OpenAI connection test did not create one transient trace entry');
  assert.equal(trace.entries[0].provider, 'openai');
  assert.equal(trace.entries[0].model, 'gpt-5.6-test');
  assert.equal(trace.entries[0].endpoint, 'https://api.openai.com/v1/responses', 'trace did not preserve the real public OpenAI endpoint');
  assert(!JSON.stringify(trace).includes(apiKey), 'OpenAI API key leaked into development trace data');
  assert(!(await page.content()).includes(apiKey), 'OpenAI API key leaked into rendered browser content');

  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await reviewDisclosure.click();
  const purpose = 'Confirm configured OpenAI remains connection-test only for durable project review.';
  await page.getByLabel('What should AI review about this implemented work?').fill(purpose);
  await page.getByRole('checkbox', { name: /only this saved work record is sent to local AI/i }).check();
  await page.getByRole('button', { name: 'Run AI review', exact: true }).click();

  const failedCard = page.locator('.ai-review-card').filter({ hasText: purpose }).first();
  await failedCard.getByText('Failed', { exact: true }).waitFor({ timeout: 30_000 });
  assert.equal(openAiRequests.filter(request => request.kind === 'responses').length, 1, 'durable project review was sent to OpenAI after the explicit boundary should have blocked it');
  assert.equal(localRequests.length, 0, 'durable project review silently fell back to local inference after OpenAI was explicitly selected');

  const savedWork = ok(await rpc('list_work_items', { p_workspace: workspace })).find(item => item.id === work);
  const savedReview = savedWork.ai_reviews.find(review => review.purpose === purpose);
  assert(savedReview, 'blocked configured-OpenAI durable review was not recorded');
  assert.equal(savedReview.status, 'Failed');
  assert((savedReview.failure_detail || '').includes('durable project AI review remains local-only'), 'blocked durable OpenAI review did not retain the explicit local-only failure reason');

  console.log('PASS: configured OpenAI development discovery and connection testing execute through the fixed public-provider path with server-side authorization, supported model filtering, transient sanitized trace and reported token metrics; the key is absent from browser/trace data, and durable project review fails visibly before OpenAI inference or local fallback.');
} finally {
  if (browser) await browser.close().catch(() => {});
  await stopApp().catch(() => {});
  await closeServer(openAiServer).catch(() => {});
  await closeServer(lmServer).catch(() => {});
  await sql.end();
}
