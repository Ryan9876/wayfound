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

const base = 'http://127.0.0.1:3400';
const password = randomBytes(24).toString('base64url');
const email = `ai-console-${randomUUID()}@example.test`;
const client = backend.client();
const retryDelays = [150, 350, 750];
const outputDir = 'artifacts/workspace';
mkdirSync(outputDir, { recursive: true });

let appServer = null;
let lmServer = null;
let ollamaServer = null;
let browser = null;
const lmRequests = [];
const ollamaRequests = [];

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
    await new Promise(resolve => setTimeout(resolve, delay));
    result = await client.rpc(name, args);
  }
  return result;
}

async function createImplementedWork() {
  const workspace = ok(await rpc('create_workspace', {
    p_name: 'AI development console browser validation',
    p_problem: 'Observe exactly what Wayfound sends to and receives from selected AI providers during development.',
    p_release: 'Release 1.0',
    p_request: randomUUID(),
  }));
  const work = ok(await rpc('create_proposed_work_item', {
    p_workspace: workspace,
    p_title: 'Exercise selected AI provider traffic',
    p_outcome: 'A normal Wayfound AI review uses the provider/model selected in the development console.',
    p_completion_condition: 'The selected local provider receives the durable AI review request.',
    p_evidence_expectation: 'Browser, provider-stub, trace, and durable provenance checks agree on the selected provider/model.',
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
  await transition(1, 'Approved', 'Owner approves this bounded development-observability validation.');
  await transition(2, 'In progress', 'Owner starts the bounded validation work.');
  await transition(3, 'Implemented', 'The bounded implementation exists; this browser test validates its development behavior.');
  return { workspace, work };
}

async function readJsonRequest(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return JSON.parse(raw || '{}');
}

async function startLmStudioStub() {
  lmServer = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/api/v1/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        models: [
          { type: 'llm', key: 'lm-active', display_name: 'LM Active', loaded_instances: [{}] },
          { type: 'llm', key: 'lm-idle', display_name: 'LM Idle', loaded_instances: [] },
        ],
      }));
      return;
    }
    if (req.method === 'POST' && req.url === '/v1/chat/completions') {
      const body = await readJsonRequest(req);
      lmRequests.push(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        model: body.model || 'lm-active',
        choices: [{ message: { content: 'WAYFOUND_AI_DEV_OK' } }],
        usage: {
          prompt_tokens: 9,
          completion_tokens: 4,
          total_tokens: 13,
          completion_tokens_details: { reasoning_tokens: 0 },
        },
      }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
  lmServer.listen(1234, '127.0.0.1');
  await once(lmServer, 'listening');
}

async function startOllamaStub() {
  ollamaServer = createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/api/ps') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ models: [{ name: 'ollama-active', model: 'ollama-active' }] }));
      return;
    }
    if (req.method === 'GET' && req.url === '/api/tags') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        models: [
          { name: 'ollama-active', model: 'ollama-active' },
          { name: 'ollama-idle', model: 'ollama-idle' },
          { name: 'remote-cloud', model: 'remote-cloud' },
        ],
      }));
      return;
    }
    if (req.method === 'POST' && req.url === '/api/chat') {
      const body = await readJsonRequest(req);
      ollamaRequests.push(body);
      const messages = Array.isArray(body.messages) ? body.messages : [];
      const isConnectionTest = messages.some(message => typeof message?.content === 'string' && message.content.includes('WAYFOUND_AI_DEV_OK'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        model: body.model || 'ollama-active',
        message: {
          role: 'assistant',
          content: isConnectionTest
            ? 'WAYFOUND_AI_DEV_OK'
            : 'Assessment\nThe selected Ollama model received the saved work record.\n\nGaps or risks\nObjective verification remains separate.\n\nSuggested next action\nCollect evidence against the completion condition.',
        },
        prompt_eval_count: isConnectionTest ? 11 : 101,
        eval_count: isConnectionTest ? 7 : 33,
        eval_duration: isConnectionTest ? 500_000_000 : 1_500_000_000,
      }));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'not found' }));
  });
  ollamaServer.listen(11434, '127.0.0.1');
  await once(ollamaServer, 'listening');
}

async function closeServer(server) {
  if (!server) return;
  const closed = once(server, 'close');
  server.close();
  await closed;
}

async function startApp() {
  appServer = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3400'], {
    env: {
      ...process.env,
      SUPABASE_URL: backend.url,
      SUPABASE_PUBLISHABLE_KEY: backend.key,
      APP_ORIGIN: base,
      WAYFOUND_SINGLE_USER_MODE: 'true',
      WAYFOUND_SINGLE_USER_AUTO_SIGN_IN: 'false',
      WAYFOUND_LOCAL_TEST: '1',
      WAYFOUND_AI_DEV_CONSOLE: 'true',
      LM_STUDIO_BASE_URL: 'http://127.0.0.1:1234',
      OLLAMA_BASE_URL: 'http://127.0.0.1:11434',
      OPENAI_API_KEY: '',
    },
    stdio: 'ignore',
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(`${base}/sign-in`)).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('AI development console validation application did not start');
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
  assert(user?.id, 'development-console owner was not created');
  ok(await client.auth.signInWithPassword({ email, password }));
  const { workspace, work } = await createImplementedWork();

  await startLmStudioStub();
  await startOllamaStub();
  await startApp();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
  await login(page);
  await page.goto(`${base}/workspaces/${workspace}?view=work#work-item-${work}`);

  const consoleButton = page.getByRole('button', { name: /AI Console/ });
  await consoleButton.waitFor({ timeout: 30_000 });
  await consoleButton.click();
  const dialog = page.getByRole('dialog', { name: 'Development AI console' });
  await dialog.waitFor();

  const provider = dialog.getByLabel('Provider');
  const model = dialog.getByLabel('Model');
  await provider.waitFor();
  await assert.doesNotReject(async () => {
    await model.locator('option[value="lm-active"]').waitFor({ state: 'attached', timeout: 10_000 });
    await model.locator('option[value="lm-idle"]').waitFor({ state: 'attached', timeout: 10_000 });
  });
  assert.equal(await provider.inputValue(), 'lm-studio', 'development console did not default to LM Studio');
  assert.equal(await model.inputValue(), 'lm-active', 'running LM Studio model was not preferred');
  await dialog.getByText('Connected · LM Studio', { exact: true }).waitFor();

  await dialog.getByRole('button', { name: 'Test connection', exact: true }).click();
  await dialog.getByText('Connection passed', { exact: true }).waitFor({ timeout: 10_000 });
  assert.equal(lmRequests.length, 1, 'LM Studio connection test did not produce exactly one request');
  assert.equal(lmRequests[0].model, 'lm-active');
  assert.equal(await metricValue(dialog, 'Input').textContent(), '9');
  assert.equal(await metricValue(dialog, 'Output').textContent(), '4');
  assert.equal(await metricValue(dialog, 'Total').textContent(), '13');
  let exchanges = dialog.locator('.ai-dev-exchange');
  await assert.doesNotReject(async () => exchanges.nth(0).waitFor({ timeout: 10_000 }));
  assert.equal(await exchanges.count(), 1, 'LM Studio connection test did not produce one trace exchange');
  assert((await exchanges.nth(0).textContent()).includes('LM Studio / lm-active'), 'LM Studio trace omitted selected provider/model');
  assert((await exchanges.nth(0).textContent()).includes('HTTP 200'), 'LM Studio trace omitted HTTP status');
  assert((await exchanges.nth(0).textContent()).includes('in 9 · out 4 · total 13'), 'LM Studio trace omitted token metrics');

  await provider.selectOption('ollama');
  await model.locator('option[value="ollama-active"]').waitFor({ state: 'attached', timeout: 10_000 });
  await model.locator('option[value="ollama-idle"]').waitFor({ state: 'attached', timeout: 10_000 });
  assert.equal(await model.locator('option[value="remote-cloud"]').count(), 0, 'Ollama cloud-backed model leaked into local selection');
  assert.equal(await model.inputValue(), 'ollama-active', 'running Ollama model was not preferred');
  await dialog.getByText('Connected · Ollama', { exact: true }).waitFor();
  await dialog.getByRole('button', { name: 'Test connection', exact: true }).click();
  await dialog.getByText('Connection passed', { exact: true }).waitFor({ timeout: 10_000 });
  assert.equal(ollamaRequests.length, 1, 'Ollama connection test did not produce exactly one request');
  assert.equal(ollamaRequests[0].model, 'ollama-active');
  assert.equal(await metricValue(dialog, 'Input').textContent(), '11');
  assert.equal(await metricValue(dialog, 'Output').textContent(), '7');
  assert.equal(await metricValue(dialog, 'Total').textContent(), '18');
  assert.equal(await metricValue(dialog, 'Generation').textContent(), '14 tok/s');
  exchanges = dialog.locator('.ai-dev-exchange');
  await assert.doesNotReject(async () => exchanges.nth(1).waitFor({ timeout: 10_000 }));
  assert.equal(await exchanges.count(), 2, 'LM Studio + Ollama tests did not produce two trace exchanges');

  await provider.selectOption('openai');
  await dialog.getByText('Not configured · OpenAI', { exact: true }).waitFor();
  assert.equal(await model.inputValue(), '', 'OpenAI without a key exposed a selectable model');
  assert(await dialog.getByRole('button', { name: 'Test connection', exact: true }).isDisabled(), 'OpenAI test stayed enabled without configuration');
  assert.equal(await dialog.locator('.ai-dev-exchange').count(), 2, 'OpenAI no-key state created unexpected network trace');

  await provider.selectOption('ollama');
  await model.locator('option[value="ollama-active"]').waitFor({ state: 'attached', timeout: 10_000 });
  assert.equal(await model.inputValue(), 'ollama-active');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await consoleButton.click();
  await dialog.waitFor();
  await dialog.getByLabel('Provider').waitFor();
  assert.equal(await dialog.getByLabel('Provider').inputValue(), 'ollama', 'selected provider did not survive console reopen');
  assert.equal(await dialog.getByLabel('Model').inputValue(), 'ollama-active', 'selected model did not survive console reopen');
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();

  await page.getByText('Ask local AI to review', { exact: true }).click();
  await page.getByLabel('What should AI review about this implemented work?').fill('Confirm that the development console selection controls the real local AI review request.');
  await page.getByRole('checkbox', { name: /only this saved work record is sent to local AI/i }).check();
  await page.getByRole('button', { name: 'Run AI review', exact: true }).click();
  await page.locator('.ai-review-card').first().getByText('Completed', { exact: true }).waitFor({ timeout: 30_000 });
  assert.equal(ollamaRequests.length, 2, 'normal Wayfound AI review did not use selected Ollama provider');
  const durableRequest = ollamaRequests[1];
  assert.equal(durableRequest.model, 'ollama-active', 'normal Wayfound AI review did not use selected Ollama model');
  const durablePrompt = durableRequest.messages?.map(message => message?.content || '').join('\n') || '';
  assert(durablePrompt.includes(`Work item ID: ${work}`), 'normal Wayfound AI review trace request omitted target work item');

  const savedWork = ok(await rpc('list_work_items', { p_workspace: workspace })).find(item => item.id === work);
  const savedReview = savedWork.ai_reviews.find(review => review.purpose.startsWith('Confirm that the development console selection'));
  assert(savedReview, 'selected-provider durable AI review was not saved');
  assert.equal(savedReview.provider_id, 'ollama');
  assert.equal(savedReview.model, 'ollama-active');
  assert.equal(savedReview.prompt_tokens, 101);
  assert.equal(savedReview.completion_tokens, 33);
  assert.equal(savedReview.total_tokens, 134);

  await consoleButton.click();
  await dialog.waitFor();
  await dialog.getByText('3 exchanges', { exact: true }).waitFor({ timeout: 10_000 });
  exchanges = dialog.locator('.ai-dev-exchange');
  assert.equal(await exchanges.count(), 3, 'normal AI review did not add a development trace exchange');
  const durableTrace = exchanges.filter({ hasText: 'durable-work-review' }).first();
  await durableTrace.waitFor();
  const durableTraceText = await durableTrace.textContent();
  assert(durableTraceText.includes('Ollama / ollama-active'), 'durable trace omitted selected Ollama provider/model');
  assert(durableTraceText.includes('in 101 · out 33 · total 134'), 'durable trace omitted review token metrics');
  await durableTrace.getByText('Request', { exact: true }).click();
  assert((await durableTrace.locator('pre').first().textContent()).includes(`Work item ID: ${work}`), 'terminal request body omitted real Wayfound review traffic');
  await durableTrace.getByText('Response', { exact: true }).click();
  assert((await durableTrace.locator('pre').nth(1).textContent()).includes('selected Ollama model received the saved work record'), 'terminal response body omitted real model response traffic');

  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'AI development console desktop view overflow');
  await page.screenshot({ path: `${outputDir}/ai-development-console-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'AI development console mobile view overflow');
  assert(await dialog.isVisible(), 'AI development console disappeared on mobile');
  await page.screenshot({ path: `${outputDir}/ai-development-console-mobile.png`, fullPage: true });

  await dialog.getByRole('button', { name: 'Clear traffic', exact: true }).click();
  await dialog.getByText('No AI traffic captured yet. Run a connection test or an instrumented Wayfound AI operation.', { exact: true }).waitFor();
  assert.equal(await dialog.locator('.ai-dev-exchange').count(), 0, 'clear traffic did not clear transient trace');

  console.log('PASS: development AI console browser flow detects and selects LM Studio/Ollama models, shows explicit provider connection state, keeps OpenAI unconfigured without a key, exercises real request/response traffic with token/performance metrics, persists the selected local model in process memory, applies that selection to normal Wayfound AI review traffic, renders without desktop/mobile overflow, and clears transient trace data.');
} finally {
  if (browser) await browser.close().catch(() => {});
  await stopApp().catch(() => {});
  await closeServer(lmServer).catch(() => {});
  await closeServer(ollamaServer).catch(() => {});
  await sql.end();
}
