import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { localBackend } from './local-backend.mjs';

const backend = localBackend();
const sql = backend.sql;
await sql.connect();

const password = randomBytes(24).toString('base64url');
const emails = [0, 1].map(n => `owner-${n}-${randomUUID()}@example.test`);
const clients = [backend.client(), backend.client()];
const users = [];
let server, browser;
const base = 'http://127.0.0.1:3100';
const output = 'artifacts/workspace';
mkdirSync(output, { recursive: true });
const args = {
  p_name: 'Workshop continuity',
  p_problem: 'Volunteers need a reliable equipment record.',
  p_release: 'Release 1.0',
  p_request: randomUUID(),
};
const retryDelays = [150, 350, 750];

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

async function rpc(client, name, rpcArgs) {
  let result = await client.rpc(name, rpcArgs);
  for (const delay of retryDelays) {
    if (!jwtFuture(result.error)) return result;
    await new Promise(resolve => setTimeout(resolve, delay));
    result = await client.rpc(name, rpcArgs);
  }
  return result;
}

async function revokedRpc(access, name, body) {
  let response, responseBody;
  for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
    response = await fetch(`${backend.url}/rest/v1/rpc/${name}`, {
      method: 'POST',
      headers: {
        apikey: backend.key,
        Authorization: `Bearer ${access}`,
        'Content-Type': 'application/json',
      },
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
  server = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3100'],
    {
      env: {
        ...process.env,
        SUPABASE_URL: backend.url,
        SUPABASE_PUBLISHABLE_KEY: backend.key,
        APP_ORIGIN: base,
      },
      stdio: 'ignore',
    },
  );
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base + '/sign-in')).ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Application did not start');
}

async function stop() {
  if (server && server.exitCode === null) {
    const closed = once(server, 'exit');
    server.kill('SIGTERM');
    await closed;
  }
  server = null;
}

async function waitForWorkspaceList(page) {
  await page.getByRole('heading', { name: 'Continue with a clear next step.', exact: true }).waitFor({ timeout: 30000 });
}

async function login(page, email) {
  await page.goto(base + '/sign-in');
  await page.getByLabel('Email', { exact: true }).fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(base + '/workspaces');
  await waitForWorkspaceList(page);
}

async function inspect(page, name) {
  for (const [label, width, height] of [['mobile', 390, 844], ['desktop', 1440, 1200]]) {
    await page.setViewportSize({ width, height });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name + ' overflow');
    await page.screenshot({ path: `${output}/${name}-${label}.png`, fullPage: true });

    await page.evaluate(() => document.activeElement?.blur());
    const targets = await page.locator('a[href],button:not([disabled]),input:not([type=hidden]),textarea,select').evaluateAll(elements =>
      elements
        .filter(element => element.getBoundingClientRect().width > 0)
        .map((element, index) => {
          element.dataset.focusId = String(index);
          return String(index);
        }),
    );
    const seen = new Set();
    for (let i = 0; i < targets.length + 5; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const element = document.activeElement;
        const style = getComputedStyle(element);
        return {
          id: element?.getAttribute('data-focus-id'),
          width: parseFloat(style.outlineWidth),
          style: style.outlineStyle,
        };
      });
      if (focused.id !== null) {
        seen.add(focused.id);
        assert(focused.width >= 1 && focused.style !== 'none', name + ' missing focus');
      }
    }
    assert.equal(seen.size, targets.length, name + ' unreachable controls');
  }
}

try {
  for (let i = 0; i < 2; i++) {
    users.push(ok(await backend.admin.auth.admin.createUser({ email: emails[i], password, email_confirm: true })).user);
    ok(await clients[i].auth.signInWithPassword({ email: emails[i], password }));
  }

  const duplicate = await Promise.all([
    rpc(clients[0], 'create_workspace', args),
    rpc(clients[0], 'create_workspace', args),
  ]);
  const id = ok(duplicate[0]);
  expectedError(
    await backend.client().auth.signUp({ email: `uninvited-${randomUUID()}@example.test`, password }),
    'public signup unexpectedly succeeded',
  );
  duplicate.forEach(result => assert.equal(ok(result), id));
  expectedError(
    await clients[0].rpc('create_workspace', { ...args, p_name: 'Changed' }),
    'changed duplicate request unexpectedly succeeded',
  );

  const saved = ok(await rpc(clients[0], 'open_workspace', { p_id: id }));
  assert.equal(saved.release.lifecycle, 'Proposed');
  assert.equal(saved.release.current_stage, 1);
  assert.equal(saved.stages.length, 15);
  assert.deepEqual(saved.stages.map(stage => stage.state), ['active', ...Array(14).fill('upcoming')]);
  assert.equal(ok(await rpc(clients[1], 'open_workspace', { p_id: id })), null);
  assert.deepEqual(ok(await rpc(clients[1], 'list_workspaces')), []);
  expectedError(await backend.client().rpc('open_workspace', { p_id: id }), 'anonymous workspace read unexpectedly succeeded');
  expectedError(await clients[0].schema('wayfound').from('workspaces').select('*'), 'private schema read unexpectedly succeeded');
  expectedError(await clients[0].from('workspaces').insert({ name: 'bypass' }), 'direct table write unexpectedly succeeded');

  const decisionArgs = {
    p_workspace: id,
    p_title: 'Keep checkout staff-assisted',
    p_decision: 'Keep equipment checkout staff-assisted for Release 1.0.',
    p_rationale: 'The first release should preserve staff oversight while the workflow is still being clarified.',
    p_authority_confirm: true,
    p_request: randomUUID(),
  };
  const duplicateDecision = await Promise.all([
    rpc(clients[0], 'record_owner_decision', decisionArgs),
    rpc(clients[0], 'record_owner_decision', decisionArgs),
  ]);
  const decisionId = ok(duplicateDecision[0]);
  duplicateDecision.forEach(result => assert.equal(ok(result), decisionId));
  const savedDecisions = ok(await rpc(clients[0], 'list_decisions', { p_workspace: id }));
  assert.equal(savedDecisions.length, 1);
  assert.equal(savedDecisions[0].id, decisionId);
  assert.equal(savedDecisions[0].release_id, saved.release.id);
  assert.equal(savedDecisions[0].stage_number, 1);
  assert.equal(savedDecisions[0].title, decisionArgs.p_title);
  assert.equal(savedDecisions[0].decision, decisionArgs.p_decision);
  assert.equal(savedDecisions[0].rationale, decisionArgs.p_rationale);
  assert.equal(savedDecisions[0].authority, 'owner');
  assert.equal(savedDecisions[0].status, 'Accepted');
  expectedError(
    await clients[0].rpc('record_owner_decision', { ...decisionArgs, p_title: 'Changed' }),
    'changed duplicate decision request unexpectedly succeeded',
  );
  expectedError(
    await clients[0].rpc('record_owner_decision', { ...decisionArgs, p_request: randomUUID(), p_authority_confirm: false }),
    'decision without owner-authority confirmation unexpectedly succeeded',
  );
  assert.deepEqual(ok(await rpc(clients[1], 'list_decisions', { p_workspace: id })), []);
  expectedError(
    await clients[1].rpc('record_owner_decision', { ...decisionArgs, p_request: randomUUID() }),
    'non-member decision creation unexpectedly succeeded',
  );
  expectedError(await backend.client().rpc('list_decisions', { p_workspace: id }), 'anonymous decision read unexpectedly succeeded');
  expectedError(await clients[0].schema('wayfound').from('decisions').select('*'), 'private decision table read unexpectedly succeeded');
  expectedError(await clients[0].from('decisions').insert({ title: 'bypass' }), 'direct decision table write unexpectedly succeeded');

  const ownerActorId = (await sql.query('select id from wayfound.actors where provider_subject=$1', [users[0].id])).rows[0].id;
  const workArgs = {
    p_workspace: id,
    p_title: 'Observe one equipment checkout',
    p_outcome: 'Record how one real equipment checkout works in practice.',
    p_completion_condition: 'One checkout is observed and the findings are recorded.',
    p_evidence_expectation: 'Observation notes linked to this work item.',
    p_request: randomUUID(),
  };
  const duplicateWork = await Promise.all([
    rpc(clients[0], 'create_proposed_work_item', workArgs),
    rpc(clients[0], 'create_proposed_work_item', workArgs),
  ]);
  const workItemId = ok(duplicateWork[0]);
  duplicateWork.forEach(result => assert.equal(ok(result), workItemId));
  const savedWorkItems = ok(await rpc(clients[0], 'list_work_items', { p_workspace: id }));
  assert.equal(savedWorkItems.length, 1);
  assert.equal(savedWorkItems[0].id, workItemId);
  assert.equal(savedWorkItems[0].release_id, saved.release.id);
  assert.equal(savedWorkItems[0].stage_number, 1);
  assert.equal(savedWorkItems[0].title, workArgs.p_title);
  assert.equal(savedWorkItems[0].outcome, workArgs.p_outcome);
  assert.equal(savedWorkItems[0].completion_condition, workArgs.p_completion_condition);
  assert.equal(savedWorkItems[0].evidence_expectation, workArgs.p_evidence_expectation);
  assert.equal(savedWorkItems[0].owner_actor_id, ownerActorId);
  assert.equal(savedWorkItems[0].status, 'Proposed');
  expectedError(
    await clients[0].rpc('create_proposed_work_item', { ...workArgs, p_title: 'Changed' }),
    'changed duplicate work-item request unexpectedly succeeded',
  );
  expectedError(
    await clients[0].rpc('create_proposed_work_item', { ...workArgs, p_request: randomUUID(), p_completion_condition: ' ' }),
    'invalid proposed work item unexpectedly succeeded',
  );
  assert.deepEqual(ok(await rpc(clients[1], 'list_work_items', { p_workspace: id })), []);
  expectedError(
    await clients[1].rpc('create_proposed_work_item', { ...workArgs, p_request: randomUUID() }),
    'non-owner work-item creation unexpectedly succeeded',
  );
  expectedError(await backend.client().rpc('list_work_items', { p_workspace: id }), 'anonymous work-item read unexpectedly succeeded');
  expectedError(await clients[0].schema('wayfound').from('work_items').select('*'), 'private work-item table read unexpectedly succeeded');
  expectedError(await clients[0].from('work_items').insert({ title: 'bypass' }), 'direct work-item table write unexpectedly succeeded');

  const requirementArgs = {
    p_workspace: id,
    p_title: 'Identify the active borrower',
    p_obligation: 'MUST',
    p_requirement: 'The product records the person responsible for each active equipment checkout.',
    p_acceptance_criterion: 'Given an equipment checkout is active, when the checkout record is viewed, then the responsible borrower is visible.',
    p_authority_confirm: true,
    p_request: randomUUID(),
  };
  const duplicateRequirement = await Promise.all([
    rpc(clients[0], 'record_owner_requirement', requirementArgs),
    rpc(clients[0], 'record_owner_requirement', requirementArgs),
  ]);
  const requirementId = ok(duplicateRequirement[0]);
  duplicateRequirement.forEach(result => assert.equal(ok(result), requirementId));
  const savedRequirements = ok(await rpc(clients[0], 'list_requirements', { p_workspace: id }));
  assert.equal(savedRequirements.length, 1);
  assert.equal(savedRequirements[0].id, requirementId);
  assert.equal(savedRequirements[0].release_id, saved.release.id);
  assert.equal(savedRequirements[0].stage_number, 1);
  assert.equal(savedRequirements[0].title, requirementArgs.p_title);
  assert.equal(savedRequirements[0].obligation, 'MUST');
  assert.equal(savedRequirements[0].requirement, requirementArgs.p_requirement);
  assert.equal(savedRequirements[0].kind, 'product');
  assert.equal(savedRequirements[0].authority, 'owner');
  assert.equal(savedRequirements[0].status, 'Approved');
  assert.equal(savedRequirements[0].approving_actor_id, ownerActorId);
  assert.equal(savedRequirements[0].acceptance_criteria.length, 1);
  assert.equal(savedRequirements[0].acceptance_criteria[0].requirement_id, requirementId);
  assert.equal(savedRequirements[0].acceptance_criteria[0].workspace_id, id);
  assert.equal(savedRequirements[0].acceptance_criteria[0].statement, requirementArgs.p_acceptance_criterion);
  assert.notEqual(savedRequirements[0].acceptance_criteria[0].id, requirementId);
  expectedError(
    await clients[0].rpc('record_owner_requirement', { ...requirementArgs, p_title: 'Changed' }),
    'changed duplicate requirement request unexpectedly succeeded',
  );
  expectedError(
    await clients[0].rpc('record_owner_requirement', { ...requirementArgs, p_request: randomUUID(), p_authority_confirm: false }),
    'requirement without owner-authority confirmation unexpectedly succeeded',
  );
  expectedError(
    await clients[0].rpc('record_owner_requirement', { ...requirementArgs, p_request: randomUUID(), p_obligation: 'REQUIRED' }),
    'invalid requirement obligation unexpectedly succeeded',
  );
  assert.deepEqual(ok(await rpc(clients[1], 'list_requirements', { p_workspace: id })), []);
  expectedError(
    await clients[1].rpc('record_owner_requirement', { ...requirementArgs, p_request: randomUUID() }),
    'non-owner requirement creation unexpectedly succeeded',
  );
  expectedError(await backend.client().rpc('list_requirements', { p_workspace: id }), 'anonymous requirement read unexpectedly succeeded');
  expectedError(await clients[0].schema('wayfound').from('requirements').select('*'), 'private requirement table read unexpectedly succeeded');
  expectedError(await clients[0].schema('wayfound').from('acceptance_criteria').select('*'), 'private acceptance-criterion table read unexpectedly succeeded');
  expectedError(await clients[0].from('requirements').insert({ title: 'bypass' }), 'direct requirement table write unexpectedly succeeded');
  expectedError(await clients[0].from('acceptance_criteria').insert({ statement: 'bypass' }), 'direct acceptance-criterion table write unexpectedly succeeded');

  const tables = ['actors', 'workspaces', 'memberships', 'releases', 'release_stages', 'audit_events', 'creation_requests', 'decisions', 'decision_requests', 'work_items', 'work_item_requests', 'requirements', 'acceptance_criteria', 'requirement_requests'];
  async function counts() {
    return Promise.all(tables.map(async table => (await sql.query(`select count(*)::int n from wayfound.${table}`)).rows[0].n));
  }
  for (const invalid of [{ p_name: '' }, { p_problem: ' ' }, { p_release: 'x'.repeat(81) }, { p_request: null }]) {
    expectedError(
      await clients[0].rpc('create_workspace', { ...args, ...invalid }),
      'invalid workspace input unexpectedly succeeded',
    );
  }

  const before = await counts();
  await sql.query(`create function wayfound.test_failure() returns trigger language plpgsql as $$begin raise exception 'Injected audit failure'; end$$; create trigger test_failure before insert on wayfound.audit_events for each row execute function wayfound.test_failure()`);
  try {
    expectedError(
      await clients[0].rpc('create_workspace', { ...args, p_request: randomUUID() }),
      'injected workspace creation failure unexpectedly succeeded',
    );
    assert.deepEqual(await counts(), before);
  } finally {
    await sql.query('drop trigger test_failure on wayfound.audit_events; drop function wayfound.test_failure()');
  }

  const beforeDecisionFailure = await counts();
  await sql.query(`create function wayfound.test_decision_failure() returns trigger language plpgsql as $$begin if new.operation='decision.accepted' then raise exception 'Injected decision audit failure'; end if; return new; end$$; create trigger test_decision_failure before insert on wayfound.audit_events for each row execute function wayfound.test_decision_failure()`);
  try {
    expectedError(
      await clients[0].rpc('record_owner_decision', { ...decisionArgs, p_request: randomUUID(), p_title: 'Rollback decision' }),
      'injected decision creation failure unexpectedly succeeded',
    );
    assert.deepEqual(await counts(), beforeDecisionFailure);
  } finally {
    await sql.query('drop trigger test_decision_failure on wayfound.audit_events; drop function wayfound.test_decision_failure()');
  }

  const beforeWorkFailure = await counts();
  await sql.query(`create function wayfound.test_work_failure() returns trigger language plpgsql as $$begin if new.operation='work_item.proposed' then raise exception 'Injected work-item audit failure'; end if; return new; end$$; create trigger test_work_failure before insert on wayfound.audit_events for each row execute function wayfound.test_work_failure()`);
  try {
    expectedError(
      await clients[0].rpc('create_proposed_work_item', { ...workArgs, p_request: randomUUID(), p_title: 'Rollback work item' }),
      'injected work-item creation failure unexpectedly succeeded',
    );
    assert.deepEqual(await counts(), beforeWorkFailure);
  } finally {
    await sql.query('drop trigger test_work_failure on wayfound.audit_events; drop function wayfound.test_work_failure()');
  }

  const beforeRequirementFailure = await counts();
  await sql.query(`create function wayfound.test_requirement_failure() returns trigger language plpgsql as $$begin if new.operation='requirement.approved' then raise exception 'Injected requirement audit failure'; end if; return new; end$$; create trigger test_requirement_failure before insert on wayfound.audit_events for each row execute function wayfound.test_requirement_failure()`);
  try {
    expectedError(
      await clients[0].rpc('record_owner_requirement', { ...requirementArgs, p_request: randomUUID(), p_title: 'Rollback requirement' }),
      'injected requirement creation failure unexpectedly succeeded',
    );
    assert.deepEqual(await counts(), beforeRequirementFailure);
  } finally {
    await sql.query('drop trigger test_requirement_failure on wayfound.audit_events; drop function wayfound.test_requirement_failure()');
  }

  const membership = (await sql.query('delete from wayfound.memberships where workspace_id=$1 returning *', [id])).rows[0];
  assert.equal(ok(await rpc(clients[0], 'open_workspace', { p_id: id })), null);
  assert.deepEqual(ok(await rpc(clients[0], 'list_decisions', { p_workspace: id })), []);
  assert.deepEqual(ok(await rpc(clients[0], 'list_work_items', { p_workspace: id })), []);
  assert.deepEqual(ok(await rpc(clients[0], 'list_requirements', { p_workspace: id })), []);
  expectedError(await clients[0].rpc('record_owner_decision', decisionArgs), 'membership-revoked decision retry unexpectedly succeeded');
  expectedError(await clients[0].rpc('create_proposed_work_item', workArgs), 'membership-revoked work-item retry unexpectedly succeeded');
  expectedError(await clients[0].rpc('record_owner_requirement', requirementArgs), 'membership-revoked requirement retry unexpectedly succeeded');
  expectedError(await clients[0].rpc('create_workspace', args), 'membership-revoked workspace retry unexpectedly succeeded');
  await sql.query('insert into wayfound.memberships(workspace_id,actor_id,role) values($1,$2,$3)', [id, membership.actor_id, membership.role]);

  await sql.query("update auth.sessions set not_after=now()-interval '1 minute' where user_id=$1", [users[0].id]);
  expectedError(await clients[0].rpc('list_decisions', { p_workspace: id }), 'expired session decision read succeeded');
  expectedError(await clients[0].rpc('list_work_items', { p_workspace: id }), 'expired session work-item read succeeded');
  expectedError(await clients[0].rpc('list_requirements', { p_workspace: id }), 'expired session requirement read succeeded');
  await sql.query('update auth.sessions set not_after=null where user_id=$1', [users[0].id]);
  const protectedAccess = ok(await clients[0].auth.getSession()).session.access_token;
  await sql.query('delete from auth.sessions where user_id=$1', [users[0].id]);
  await revokedRpc(protectedAccess, 'list_decisions', { p_workspace: id });
  await revokedRpc(protectedAccess, 'list_work_items', { p_workspace: id });
  await revokedRpc(protectedAccess, 'list_requirements', { p_workspace: id });
  ok(await clients[0].auth.signInWithPassword({ email: emails[0], password }));

  await sql.query("update auth.sessions set not_after=now()-interval '1 minute' where user_id=$1", [users[1].id]);
  expectedError(await clients[1].rpc('list_workspaces'), 'expired session read succeeded');
  await sql.query('update auth.sessions set not_after=null where user_id=$1', [users[1].id]);

  const access = ok(await clients[1].auth.getSession()).session.access_token;
  await sql.query('delete from auth.sessions where user_id=$1', [users[1].id]);
  await revokedRpc(access, 'list_workspaces', {});

  await start();
  browser = await chromium.launch();
  let context = await browser.newContext();
  let page = await context.newPage();

  await page.goto(base + '/sign-in');
  await inspect(page, 'sign-in');
  await page.getByLabel('Email', { exact: true }).fill(emails[1]);
  await page.getByLabel('Password', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('alert').waitFor();
  assert(page.url().endsWith('/sign-in'));

  await login(page, emails[1]);
  await inspect(page, 'empty-workspaces');
  await page.getByLabel('Project name', { exact: true }).fill('Community workshop');
  await page.getByLabel('What problem do you want to solve?').fill('Track the equipment that volunteers borrow.');
  await page.getByRole('button', { name: 'Create workspace', exact: true }).click();
  await page.waitForURL(/\/workspaces\/[0-9a-f-]+$/);
  const resumeUrl = page.url();
  await page.getByRole('heading', { name: 'Community workshop', exact: true }).waitFor({ timeout: 30000 });
  await inspect(page, 'saved-workspace');
  assert(await page.getByText('Stage 1: Clarify', { exact: true }).isVisible());
  assert(await page.getByRole('heading', { name: 'No accepted decisions yet.', exact: true }).isVisible());
  assert(await page.getByRole('heading', { name: 'No proposed work yet.', exact: true }).isVisible());
  assert(await page.getByRole('heading', { name: 'No approved requirements yet.', exact: true }).isVisible());

  await page.getByLabel('Decision title', { exact: true }).fill('Keep checkout staff-assisted');
  await page.getByLabel('Decision statement', { exact: true }).fill('Keep equipment checkout staff-assisted for Release 1.0.');
  await page.getByLabel('Why this decision?', { exact: true }).fill('The first release should preserve staff oversight while the workflow is still being clarified.');
  await page.getByLabel(/I confirm this is a product-scope or business decision/).check();
  await page.getByRole('button', { name: 'Record accepted decision', exact: true }).click();
  await page.waitForURL(url => url.pathname === new URL(resumeUrl).pathname && url.hash === '#decisions');
  await page.getByRole('heading', { name: 'Keep checkout staff-assisted', exact: true }).waitFor({ timeout: 30000 });
  assert(await page.getByText('Status: Accepted', { exact: true }).isVisible());
  assert(await page.getByText('Authority: Product owner', { exact: true }).isVisible());
  await inspect(page, 'saved-decision');

  await page.getByLabel('Work-item title', { exact: true }).fill('Observe one equipment checkout');
  await page.getByLabel('Outcome', { exact: true }).fill('Record how one real equipment checkout works in practice.');
  await page.getByLabel('Complete when', { exact: true }).fill('One checkout is observed and the findings are recorded.');
  await page.getByLabel('Evidence expected', { exact: true }).fill('Observation notes linked to this work item.');
  await page.getByRole('button', { name: 'Add proposed work item', exact: true }).click();
  await page.waitForURL(url => url.pathname === new URL(resumeUrl).pathname && url.hash === '#work-items');
  await page.getByRole('heading', { name: 'Observe one equipment checkout', exact: true }).waitFor({ timeout: 30000 });
  assert(await page.getByText('Status: Proposed', { exact: true }).isVisible());
  assert(await page.getByText('Owner: Product owner', { exact: true }).isVisible());
  assert.equal(await page.getByText('Status: In progress', { exact: true }).count(), 0);
  assert.equal(await page.getByText('Status: Implemented', { exact: true }).count(), 0);
  assert.equal(await page.getByText('Status: Validated', { exact: true }).count(), 0);
  await inspect(page, 'saved-work-item');

  await page.getByLabel('Requirement title', { exact: true }).fill('Identify the active borrower');
  await page.locator('#requirement-obligation').selectOption('MUST');
  await page.getByLabel('Requirement statement', { exact: true }).fill('The product records the person responsible for each active equipment checkout.');
  await page.getByLabel('Acceptance criterion', { exact: true }).fill('Given an equipment checkout is active, when the checkout record is viewed, then the responsible borrower is visible.');
  await page.getByLabel(/I confirm this requirement states product or business behavior/).check();
  await page.getByRole('button', { name: 'Record approved requirement', exact: true }).click();
  await page.waitForURL(url => url.pathname === new URL(resumeUrl).pathname && url.hash === '#requirements');
  await page.getByRole('heading', { name: 'Identify the active borrower', exact: true }).waitFor({ timeout: 30000 });
  assert(await page.getByText('Status: Approved', { exact: true }).isVisible());
  assert(await page.getByText('Authority: Product owner', { exact: true }).isVisible());
  assert(await page.getByText('Acceptance criterion · Not verification evidence', { exact: true }).isVisible());
  assert(await page.getByText('Given an equipment checkout is active, when the checkout record is viewed, then the responsible borrower is visible.', { exact: true }).isVisible());
  assert(await page.getByText(/^Requirement ID: [0-9a-f-]{36}$/i).isVisible());
  assert(await page.getByText(/^Criterion ID: [0-9a-f-]{36}$/i).isVisible());
  await inspect(page, 'saved-requirement');

  await page.getByRole('link', { name: 'Your workspaces', exact: true }).click();
  await waitForWorkspaceList(page);
  await inspect(page, 'workspace-list');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.waitForURL(base + '/sign-in');
  await page.goto(resumeUrl);
  await page.waitForURL(base + '/sign-in');
  await context.close();

  await stop();
  await start();
  context = await browser.newContext();
  page = await context.newPage();
  await login(page, emails[1]);
  await page.getByRole('link', { name: /Community workshop/ }).click();
  await page.waitForURL(resumeUrl);
  await page.getByRole('heading', { name: 'Community workshop', exact: true }).waitFor({ timeout: 30000 });
  assert(await page.getByText('Track the equipment that volunteers borrow.', { exact: true }).isVisible());
  assert(await page.getByRole('heading', { name: 'Keep checkout staff-assisted', exact: true }).isVisible());
  assert(await page.getByText('Keep equipment checkout staff-assisted for Release 1.0.', { exact: true }).isVisible());
  assert(await page.getByRole('heading', { name: 'Observe one equipment checkout', exact: true }).isVisible());
  assert(await page.getByText('One checkout is observed and the findings are recorded.', { exact: true }).isVisible());
  assert(await page.getByText('Observation notes linked to this work item.', { exact: true }).isVisible());
  assert(await page.getByRole('heading', { name: 'Identify the active borrower', exact: true }).isVisible());
  assert(await page.getByText('The product records the person responsible for each active equipment checkout.', { exact: true }).isVisible());
  assert(await page.getByText('Given an equipment checkout is active, when the checkout record is viewed, then the responsible borrower is visible.', { exact: true }).isVisible());

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await login(otherPage, emails[0]);
  await otherPage.goto(resumeUrl);
  await otherPage.getByRole('heading', { name: 'Workspace not available.' }).waitFor({ timeout: 30000 });
  await other.close();

  execFileSync('docker', ['pause', 'supabase_db_wayfound'], { stdio: 'ignore' });
  try {
    await page.goto(resumeUrl, { timeout: 90000 });
    await page.getByRole('heading', { name: 'We could not load your workspace.' }).waitFor({ timeout: 60000 });
    await page.screenshot({ path: `${output}/database-unavailable.png`, fullPage: true });
  } finally {
    execFileSync('docker', ['unpause', 'supabase_db_wayfound'], { stdio: 'ignore' });
  }
  await page.reload();
  await page.getByRole('heading', { name: 'Community workshop', exact: true }).waitFor({ timeout: 30000 });
  assert(await page.getByRole('heading', { name: 'Keep checkout staff-assisted', exact: true }).isVisible());
  assert(await page.getByRole('heading', { name: 'Observe one equipment checkout', exact: true }).isVisible());
  assert(await page.getByRole('heading', { name: 'Identify the active borrower', exact: true }).isVisible());
  assert.deepEqual(ok(await rpc(clients[0], 'open_workspace', { p_id: id })), saved);
  assert.deepEqual(ok(await rpc(clients[0], 'list_decisions', { p_workspace: id })), savedDecisions);
  assert.deepEqual(ok(await rpc(clients[0], 'list_work_items', { p_workspace: id })), savedWorkItems);
  assert.deepEqual(ok(await rpc(clients[0], 'list_requirements', { p_workspace: id })), savedRequirements);
  await context.close();

  console.log('PASS: real Supabase authentication, atomic workspace, owner-decision, proposed work-item, and owner-approved requirement creation, idempotent retries, tenant isolation, authority boundaries, revocation, failure rollback, restart/resume, sign-out, database interruption/recovery, keyboard focus and responsive screenshots.');
} finally {
  if (browser) await browser.close();
  await stop();
  await sql.end();
}
