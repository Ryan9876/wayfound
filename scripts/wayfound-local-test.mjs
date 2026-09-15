import { createHash, randomBytes } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STATE_DIR = resolve(ROOT, '.wayfound');
const OWNER_FILE = resolve(STATE_DIR, 'local-owner.json');
const PID_FILE = resolve(STATE_DIR, 'app.pid');
const LOG_FILE = resolve(STATE_DIR, 'app.log');
const LOCK_HASH_FILE = resolve(STATE_DIR, 'package-lock.sha256');
const TEST_BRANCH = process.env.WAYFOUND_TEST_BRANCH?.trim() || 'work/foundation-ui';
const APP_ORIGIN = 'http://127.0.0.1:3000';
const WORKSPACE_URL = `${APP_ORIGIN}/workspaces`;
const LM_STUDIO_BASE_URL = 'http://127.0.0.1:1234';
const OLLAMA_BASE_URL = 'http://127.0.0.1:11434';
const SUPABASE_EXCLUDES = 'realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor';

function plan() {
  return {
    runtime: { application: 'host-nextjs', backend: 'supabase-cli-docker' },
    branch: TEST_BRANCH,
    appOrigin: APP_ORIGIN,
    localProviders: { lmStudio: LM_STUDIO_BASE_URL, ollama: OLLAMA_BASE_URL, default: 'lm-studio' },
    refresh: {
      git: 'fetch-origin-then-ff-only',
      dependencies: 'npm-ci-when-lockfile-changed-or-missing',
      backend: `supabase start -x ${SUPABASE_EXCLUDES}`,
      migrations: 'supabase migration up --local',
      destructiveReset: false,
      preservesLocalData: true,
    },
    reset: { command: 'supabase db reset --local', destructive: true, explicitConfirmation: true, loopbackOnly: true },
    ai: { developmentConsole: true, publicProvider: 'explicit-only', silentCloudFallback: false },
    secrets: { printed: false, committed: false },
  };
}

function ensureStateDir() {
  mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
  try { chmodSync(STATE_DIR, 0o700); } catch {}
}

function fail(message) {
  throw new Error(message);
}

function command(name, args, options = {}) {
  const result = spawnSync(name, args, {
    cwd: ROOT,
    env: options.env ?? process.env,
    encoding: 'utf8',
    stdio: options.inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  });
  if (result.error) fail(`${options.label ?? name} could not start: ${result.error.message}`);
  if (result.status !== 0 && !options.allowFailure) {
    fail(`${options.label ?? name} failed. Review ${LOG_FILE} if this was an application startup operation.`);
  }
  return result;
}

function requireNode22() {
  const major = Number(process.versions.node.split('.')[0]);
  if (!Number.isInteger(major) || major < 22) fail(`Node.js 22 or later is required. Current version: ${process.version}`);
}

function requireDocker() {
  const result = command('docker', ['info'], { allowFailure: true, label: 'Docker' });
  if (result.status !== 0) fail('Docker is not running or is not available to this user. Start Docker Desktop and retry.');
}

function gitOutput(args, allowFailure = false) {
  const result = command('git', args, { allowFailure, label: 'Git' });
  return (result.stdout || '').trim();
}

function refreshGit() {
  const dirty = gitOutput(['status', '--porcelain']);
  if (dirty) fail('Local files have uncommitted changes. Commit or stash them before running local:refresh; Wayfound will not discard them.');
  const branch = gitOutput(['branch', '--show-current']);
  if (branch !== TEST_BRANCH) fail(`local:refresh updates only ${TEST_BRANCH}. Current branch: ${branch || '(detached)'}.`);
  command('git', ['fetch', 'origin', TEST_BRANCH], { inherit: true, label: 'Git fetch' });
  command('git', ['merge', '--ff-only', `origin/${TEST_BRANCH}`], { inherit: true, label: 'Git fast-forward' });
}

function lockHash() {
  const lockPath = resolve(ROOT, 'package-lock.json');
  if (!existsSync(lockPath)) fail('package-lock.json is required for the local test package.');
  return createHash('sha256').update(readFileSync(lockPath)).digest('hex');
}

function dependenciesReady() {
  return existsSync(resolve(ROOT, 'node_modules/.bin/supabase')) && existsSync(resolve(ROOT, 'node_modules/next/dist/bin/next'));
}

function ensureDependencies() {
  ensureStateDir();
  const current = lockHash();
  const recorded = existsSync(LOCK_HASH_FILE) ? readFileSync(LOCK_HASH_FILE, 'utf8').trim() : '';
  if (dependenciesReady() && recorded === current) return false;
  console.log('Installing repository dependencies for this lockfile…');
  command('npm', ['ci', '--no-audit', '--no-fund'], { inherit: true, label: 'npm ci' });
  writeFileSync(LOCK_HASH_FILE, `${current}\n`, { mode: 0o600 });
  try { chmodSync(LOCK_HASH_FILE, 0o600); } catch {}
  return true;
}

function supabaseCli() {
  const cli = resolve(ROOT, 'node_modules/.bin/supabase');
  if (!existsSync(cli)) fail('Supabase CLI dependency is unavailable. Run npm ci or local:refresh.');
  return cli;
}

function parseStatus(result) {
  if (result.status !== 0 || !result.stdout?.trim()) return null;
  try { return JSON.parse(result.stdout); } catch { return null; }
}

function localStatus() {
  return parseStatus(command(supabaseCli(), ['status', '-o', 'json'], { allowFailure: true, label: 'Supabase status' }));
}

function assertLoopback(value, label) {
  if (!value) fail(`${label} is missing from local Supabase status.`);
  const url = new URL(value);
  if (!['127.0.0.1', 'localhost'].includes(url.hostname)) fail(`${label} must be loopback-only; got ${url.hostname}.`);
  return value;
}

function startBackend() {
  let status = localStatus();
  if (!status) {
    console.log('Starting the local Supabase Docker stack…');
    command(supabaseCli(), ['start', '-x', SUPABASE_EXCLUDES], { label: 'Supabase start' });
    status = localStatus();
  }
  if (!status) fail('Local Supabase did not become available.');
  assertLoopback(status.API_URL, 'Supabase API URL');
  assertLoopback(status.DB_URL, 'Supabase database URL');
  if (!(status.PUBLISHABLE_KEY || status.ANON_KEY)) fail('Local Supabase publishable key is unavailable.');
  if (!(status.SECRET_KEY || status.SERVICE_ROLE_KEY)) fail('Local Supabase secret key is unavailable to local setup tooling.');
  console.log('Applying pending local migrations without resetting local data…');
  command(supabaseCli(), ['migration', 'up', '--local'], { label: 'Supabase migration up' });
  return status;
}

function ownerFromFile() {
  if (!existsSync(OWNER_FILE)) return null;
  let value;
  try { value = JSON.parse(readFileSync(OWNER_FILE, 'utf8')); } catch { fail(`Local owner configuration is unreadable: ${OWNER_FILE}`); }
  if (!value?.email || !value?.password || value.password.length < 12) fail(`Local owner configuration is invalid: ${OWNER_FILE}`);
  return { email: String(value.email), password: String(value.password), source: 'saved' };
}

function explicitOwner() {
  const email = process.env.WAYFOUND_SINGLE_USER_OWNER_EMAIL?.trim() || '';
  const password = process.env.WAYFOUND_SINGLE_USER_OWNER_PASSWORD || '';
  if (Boolean(email) !== Boolean(password)) fail('Set both WAYFOUND_SINGLE_USER_OWNER_EMAIL and WAYFOUND_SINGLE_USER_OWNER_PASSWORD, or neither.');
  if (!email) return null;
  if (password.length < 12) fail('WAYFOUND_SINGLE_USER_OWNER_PASSWORD must be at least 12 characters.');
  return { email, password, source: 'environment' };
}

function generateOwner() {
  return { email: 'owner@wayfound.local', password: randomBytes(24).toString('base64url'), source: 'generated' };
}

function saveOwner(owner) {
  ensureStateDir();
  writeFileSync(OWNER_FILE, `${JSON.stringify({ email: owner.email, password: owner.password }, null, 2)}\n`, { mode: 0o600 });
  try { chmodSync(OWNER_FILE, 0o600); } catch {}
}

async function clientsFor(status) {
  const { createClient } = await import('@supabase/supabase-js');
  const url = assertLoopback(status.API_URL, 'Supabase API URL');
  const publicKey = status.PUBLISHABLE_KEY || status.ANON_KEY;
  const secret = status.SECRET_KEY || status.SERVICE_ROLE_KEY;
  return {
    admin: createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } }),
    client: () => createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } }),
  };
}

async function ensureOwner(status) {
  const chosen = explicitOwner() ?? ownerFromFile();
  const clients = await clientsFor(status);
  const listed = await clients.admin.auth.admin.listUsers();
  if (listed.error) fail('Local Auth users could not be inspected.');
  const users = listed.data.users ?? [];

  if (!chosen) {
    if (users.length) {
      fail(`This local Supabase stack already has Auth users, but Wayfound has no saved launcher owner. Existing identities were preserved. Set WAYFOUND_SINGLE_USER_OWNER_EMAIL/PASSWORD for an existing test owner or run npm run local:reset for an explicit destructive reset.`);
    }
    const generated = generateOwner();
    const created = await clients.admin.auth.admin.createUser({ email: generated.email, password: generated.password, email_confirm: true });
    if (created.error) fail('The initial local Wayfound owner could not be created.');
    saveOwner(generated);
    console.log(`Created the local Wayfound test owner ${generated.email}. Credentials are stored only in ${OWNER_FILE}.`);
    return generated;
  }

  const match = users.find(user => user.email === chosen.email);
  if (!match) {
    if (users.length) fail(`The configured Wayfound owner ${chosen.email} is not present in the existing local Auth stack. Existing identities were preserved. Use matching credentials or run local:reset.`);
    const created = await clients.admin.auth.admin.createUser({ email: chosen.email, password: chosen.password, email_confirm: true });
    if (created.error) fail('The configured local Wayfound owner could not be created.');
    if (chosen.source !== 'environment') saveOwner(chosen);
    return chosen;
  }

  const signedIn = await clients.client().auth.signInWithPassword({ email: chosen.email, password: chosen.password });
  if (signedIn.error || !signedIn.data.user) fail(`The configured local owner exists but its saved password no longer authenticates. Existing local data was not changed. Supply the current credentials or run local:reset.`);
  return chosen;
}

function appPid() {
  if (!existsSync(PID_FILE)) return null;
  const pid = Number(readFileSync(PID_FILE, 'utf8').trim());
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function processAlive(pid) {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function stopApp() {
  const pid = appPid();
  if (!processAlive(pid)) {
    rmSync(PID_FILE, { force: true });
    return false;
  }
  try { process.kill(pid, 'SIGTERM'); } catch {}
  for (let attempt = 0; attempt < 30 && processAlive(pid); attempt++) await new Promise(resolveWait => setTimeout(resolveWait, 100));
  if (processAlive(pid)) {
    try { process.kill(pid, 'SIGKILL'); } catch {}
  }
  rmSync(PID_FILE, { force: true });
  return true;
}

async function waitForApp(pid) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (!processAlive(pid)) fail(`Wayfound stopped during startup. Review ${LOG_FILE}.`);
    try {
      const response = await fetch(WORKSPACE_URL, { redirect: 'manual', signal: AbortSignal.timeout(1000), cache: 'no-store' });
      if (response.status >= 200 && response.status < 500) return;
    } catch {}
    await new Promise(resolveWait => setTimeout(resolveWait, 250));
  }
  fail(`Wayfound did not become ready at ${WORKSPACE_URL}. Review ${LOG_FILE}.`);
}

async function startApp(status, owner, options = {}) {
  await stopApp();
  ensureStateDir();
  const logFd = openSync(LOG_FILE, 'a', 0o600);
  const env = {
    ...process.env,
    SUPABASE_URL: assertLoopback(status.API_URL, 'Supabase API URL'),
    SUPABASE_PUBLISHABLE_KEY: status.PUBLISHABLE_KEY || status.ANON_KEY,
    APP_ORIGIN,
    WAYFOUND_SINGLE_USER_MODE: 'true',
    WAYFOUND_SINGLE_USER_AUTO_SIGN_IN: 'true',
    WAYFOUND_LOCAL_TEST: '1',
    WAYFOUND_SINGLE_USER_OWNER_EMAIL: owner.email,
    WAYFOUND_SINGLE_USER_OWNER_PASSWORD: owner.password,
    WAYFOUND_AI_DEV_CONSOLE: 'true',
    LM_STUDIO_BASE_URL,
    OLLAMA_BASE_URL,
  };
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', '3000'], {
    cwd: ROOT,
    env,
    detached: true,
    stdio: ['ignore', logFd, logFd],
  });
  closeSync(logFd);
  child.unref();
  writeFileSync(PID_FILE, `${child.pid}\n`, { mode: 0o600 });
  await waitForApp(child.pid);
  console.log(`Wayfound is ready: ${WORKSPACE_URL}`);
  console.log(`Application log: ${LOG_FILE}`);
  if (!options.noOpen && process.platform === 'darwin' && !process.env.CI) {
    const opener = spawn('open', [WORKSPACE_URL], { detached: true, stdio: 'ignore' });
    opener.unref();
  }
}

async function startEnvironment(options = {}) {
  requireNode22();
  requireDocker();
  ensureDependencies();
  const status = startBackend();
  const owner = await ensureOwner(status);
  await startApp(status, owner, options);
}

async function resetEnvironment(options = {}) {
  requireNode22();
  requireDocker();
  ensureDependencies();
  let owner = explicitOwner() ?? ownerFromFile();
  if (!owner) {
    owner = generateOwner();
    saveOwner(owner);
  }
  if (!options.yes) {
    if (!process.stdin.isTTY) fail('local:reset is destructive. Re-run interactively or pass --yes only when an explicit reset is intended.');
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question('This deletes the isolated local Wayfound database and Auth users. Type RESET to continue: ');
    rl.close();
    if (answer !== 'RESET') fail('Reset cancelled. No local data was changed.');
  }
  const statusBefore = startBackend();
  assertLoopback(statusBefore.API_URL, 'Supabase API URL');
  assertLoopback(statusBefore.DB_URL, 'Supabase database URL');
  await stopApp();
  console.log('Resetting the isolated local Wayfound database…');
  command(supabaseCli(), ['db', 'reset', '--local'], { label: 'Supabase local reset' });
  const status = localStatus();
  if (!status) fail('Local Supabase did not return after reset.');
  command(process.execPath, ['scripts/seed-single-user-local.mjs'], {
    label: 'Single-user local seed',
    env: { ...process.env, WAYFOUND_LOCAL_TEST: '1', WAYFOUND_SEED_EMAIL: owner.email, WAYFOUND_SEED_PASSWORD: owner.password },
  });
  await startApp(status, owner, options);
}

function safeStatus() {
  requireNode22();
  const pid = appPid();
  let backend = 'unknown';
  if (dependenciesReady()) backend = localStatus() ? 'running' : 'stopped';
  return {
    branch: (() => { try { return gitOutput(['branch', '--show-current'], true) || 'detached'; } catch { return 'unknown'; } })(),
    application: processAlive(pid) ? 'running' : 'stopped',
    backend,
    appOrigin: APP_ORIGIN,
    log: LOG_FILE,
    savedOwnerConfigured: existsSync(OWNER_FILE),
  };
}

async function stopEnvironment() {
  const stopped = await stopApp();
  if (dependenciesReady()) command(supabaseCli(), ['stop'], { allowFailure: true, label: 'Supabase stop' });
  console.log(stopped ? 'Wayfound app stopped. Local Supabase volumes were preserved.' : 'Wayfound app was not running. Local Supabase volumes were preserved.');
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args.find(arg => !arg.startsWith('--')) || 'status';
  const json = args.includes('--json');
  const noOpen = args.includes('--no-open');
  const yes = args.includes('--yes');

  if (mode === 'plan') {
    process.stdout.write(`${JSON.stringify(plan(), null, json ? 0 : 2)}\n`);
    return;
  }
  if (mode === 'status') {
    process.stdout.write(`${JSON.stringify(safeStatus(), null, 2)}\n`);
    return;
  }
  if (mode === 'refresh') {
    requireNode22();
    refreshGit();
    await startEnvironment({ noOpen });
    return;
  }
  if (mode === 'start') {
    await startEnvironment({ noOpen });
    return;
  }
  if (mode === 'stop') {
    await stopEnvironment();
    return;
  }
  if (mode === 'reset') {
    await resetEnvironment({ noOpen, yes });
    return;
  }
  fail(`Unknown local test mode: ${mode}`);
}

main().catch(error => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Wayfound local test: ${message}`);
  process.exitCode = 1;
});
