import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { localBackend } from './local-backend.mjs';

const backend = localBackend();
const sql = backend.sql;
await sql.connect();

const password = randomBytes(24).toString('base64url');
const emails = [0, 1].map(index => `work-completion-${index}-${randomUUID()}@example.test`);
const clients = [backend.client(), backend.client()];
const users = [];
const retryDelays = [150, 350, 750];

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
async function createWorkspace(client, name) {
  return ok(await rpc(client, 'create_workspace', {
    p_name: name,
    p_problem: 'Keep implementation state separate from verification.',
    p_release: 'Release 1.0',
    p_request: randomUUID(),
  }));
}
async function createWork(client, workspace, title) {
  return ok(await rpc(client, 'create_proposed_work_item', {
    p_workspace: workspace,
    p_title: title,
    p_outcome: 'Produce one bounded result.',
    p_completion_condition: 'The bounded result exists.',
    p_evidence_expectation: 'A later check can verify the result.',
    p_request: randomUUID(),
  }));
}
function transitionArgs(workspace, work, revision, status, reason, request = randomUUID()) {
  return {
    p_workspace: workspace,
    p_work_item: work,
    p_expected_revision: revision,
    p_target_status: status,
    p_reason: reason,
    p_confirm: true,
    p_request: request,
  };
}
async function advanceToInProgress(client, workspace, work) {
  ok(await rpc(client, 'transition_work_item', transitionArgs(workspace, work, 1, 'Approved', 'Owner approves this bounded work.')));
  ok(await rpc(client, 'transition_work_item', transitionArgs(workspace, work, 2, 'In progress', 'Owner started the bounded work.')));
}
async function list(client, workspace) {
  return ok(await rpc(client, 'list_work_items', { p_workspace: workspace }));
}
async function projectSnapshot(workspace) {
  const release = (await sql.query('select lifecycle,current_stage,revision from wayfound.releases where workspace_id=$1', [workspace])).rows;
  const requirements = (await sql.query('select id,status,revision from wayfound.requirements where workspace_id=$1 order by id', [workspace])).rows;
  const criteria = (await sql.query('select id,requirement_id,revision from wayfound.acceptance_criteria where workspace_id=$1 order by id', [workspace])).rows;
  const evidence = (await sql.query('select id,effect,requirement_revision,criterion_revision from wayfound.evidence_records where workspace_id=$1 order by id', [workspace])).rows;
  return { release, requirements, criteria, evidence };
}

try {
  for (let index = 0; index < 2; index++) {
    users.push(ok(await backend.admin.auth.admin.createUser({ email: emails[index], password, email_confirm: true })).user);
    ok(await clients[index].auth.signInWithPassword({ email: emails[index], password }));
  }

  const workspace = await createWorkspace(clients[0], 'Work completion');
  const foreignWorkspace = await createWorkspace(clients[1], 'Foreign completion');
  const actor = (await sql.query('select id from wayfound.actors where provider_subject=$1', [users[0].id])).rows[0].id;

  ok(await rpc(clients[0], 'record_owner_requirement', {
    p_workspace: workspace,
    p_title: 'Keep verification separate',
    p_obligation: 'MUST',
    p_requirement: 'Show implementation and verification as separate states.',
    p_acceptance_criterion: 'Implemented work is not shown as verified.',
    p_authority_confirm: true,
    p_request: randomUUID(),
  }));
  const requirement = ok(await rpc(clients[0], 'list_requirements', { p_workspace: workspace }))[0];
  const criterion = requirement.acceptance_criteria[0];
  ok(await rpc(clients[0], 'record_criterion_evidence', {
    p_workspace: workspace,
    p_acceptance_criterion: criterion.id,
    p_title: 'Existing observation',
    p_result: 'One prior observation exists.',
    p_source_note: 'Manual observation before implementation completion.',
    p_effect: 'Supports',
    p_request: randomUUID(),
  }));

  const work = await createWork(clients[0], workspace, 'Complete the bounded implementation');
  const foreignWork = await createWork(clients[1], foreignWorkspace, 'Foreign work');
  await advanceToInProgress(clients[0], workspace, work);
  const before = await projectSnapshot(workspace);

  const completionRequest = randomUUID();
  const completion = transitionArgs(
    workspace,
    work,
    3,
    'Implemented',
    'The bounded implementation is complete; verification has not been performed.',
    completionRequest,
  );
  const identical = await Promise.all([
    rpc(clients[0], 'transition_work_item', completion),
    rpc(clients[0], 'transition_work_item', completion),
  ]);
  const completionId = ok(identical[0]);
  assert.equal(ok(identical[1]), completionId, 'identical completion retry returned a different transition');

  let saved = (await list(clients[0], workspace)).find(item => item.id === work);
  assert(saved, 'completed work missing');
  assert.equal(saved.status, 'Implemented');
  assert.equal(saved.revision, 4);
  assert.equal(saved.transitions.length, 3);
  assert.deepEqual(saved.transitions.at(-1), {
    ...saved.transitions.at(-1),
    id: completionId,
    actor_id: actor,
    from_status: 'In progress',
    to_status: 'Implemented',
    from_revision: 3,
    to_revision: 4,
    reason: completion.p_reason,
  });
  assert(saved.transitions.at(-1).created_at, 'completion timestamp missing');

  const completionEvents = (await sql.query("select count(*)::int n from wayfound.audit_events where workspace_id=$1 and operation='work_item.transitioned' and entity_id=$2", [workspace, completionId])).rows[0].n;
  assert.equal(completionEvents, 1, 'completion audit event count changed');
  const requestRows = (await sql.query('select count(*)::int n from wayfound.work_item_transition_requests where actor_id=$1 and request_id=$2', [actor, completionRequest])).rows[0].n;
  assert.equal(requestRows, 1, 'completion request history count changed');

  expectedError(await rpc(clients[0], 'transition_work_item', { ...completion, p_reason: 'Changed retry payload.' }), 'changed completion retry succeeded', '22023');
  expectedError(await rpc(clients[0], 'transition_work_item', transitionArgs(workspace, work, 4, 'Blocked', 'Implemented work cannot be blocked.')), 'post-implemented transition succeeded', '55000');
  expectedError(await rpc(clients[1], 'transition_work_item', completion), 'foreign actor completed owner work', '42501');
  expectedError(await rpc(clients[0], 'transition_work_item', { ...completion, p_work_item: foreignWork }), 'cross-workspace work target succeeded', '23503');
  expectedError(await clients[0].schema('wayfound').from('work_items').update({ status: 'Validated' }).eq('id', work), 'direct work status update succeeded');
  assert.deepEqual(await projectSnapshot(workspace), before, 'implementation completion changed verification or release records');

  const blockedWork = await createWork(clients[0], workspace, 'Blocked completion guard');
  await advanceToInProgress(clients[0], workspace, blockedWork);
  ok(await rpc(clients[0], 'transition_work_item', transitionArgs(workspace, blockedWork, 3, 'Blocked', 'A dependency blocks progress.')));
  expectedError(await rpc(clients[0], 'transition_work_item', transitionArgs(workspace, blockedWork, 4, 'Implemented', 'Attempt completion while blocked.')), 'blocked work was marked implemented', '22023');

  const rollbackWork = await createWork(clients[0], workspace, 'Completion rollback');
  await advanceToInProgress(clients[0], workspace, rollbackWork);
  const rollbackArgs = transitionArgs(workspace, rollbackWork, 3, 'Implemented', 'Completion should roll back with audit failure.');
  const beforeRollbackTransitions = (await sql.query('select count(*)::int n from wayfound.work_item_transitions where work_item_id=$1', [rollbackWork])).rows[0].n;
  await sql.query(`create function wayfound.test_work_completion_failure() returns trigger language plpgsql as $$begin if new.operation='work_item.transitioned' then raise exception 'Injected completion audit failure'; end if; return new; end$$; create trigger test_work_completion_failure before insert on wayfound.audit_events for each row execute function wayfound.test_work_completion_failure()`);
  try {
    expectedError(await rpc(clients[0], 'transition_work_item', rollbackArgs), 'completion audit failure did not fail');
  } finally {
    await sql.query('drop trigger test_work_completion_failure on wayfound.audit_events; drop function wayfound.test_work_completion_failure()');
  }
  saved = (await list(clients[0], workspace)).find(item => item.id === rollbackWork);
  assert.equal(saved.status, 'In progress');
  assert.equal(saved.revision, 3);
  assert.equal((await sql.query('select count(*)::int n from wayfound.work_item_transitions where work_item_id=$1', [rollbackWork])).rows[0].n, beforeRollbackTransitions);
  ok(await rpc(clients[0], 'transition_work_item', rollbackArgs));
  saved = (await list(clients[0], workspace)).find(item => item.id === rollbackWork);
  assert.equal(saved.status, 'Implemented');

  const revokedWork = await createWork(clients[0], workspace, 'Revoked completion guard');
  await advanceToInProgress(clients[0], workspace, revokedWork);
  const revokedArgs = transitionArgs(workspace, revokedWork, 3, 'Implemented', 'This must not save while membership is revoked.');
  await sql.query('delete from wayfound.memberships where workspace_id=$1 and actor_id=$2', [workspace, actor]);
  try {
    expectedError(await rpc(clients[0], 'transition_work_item', revokedArgs), 'revoked owner completed work', '42501');
    assert.deepEqual(await list(clients[0], workspace), [], 'revoked owner still listed work');
  } finally {
    await sql.query("insert into wayfound.memberships(workspace_id,actor_id,role) values($1,$2,'owner')", [workspace, actor]);
  }
  saved = (await list(clients[0], workspace)).find(item => item.id === revokedWork);
  assert.equal(saved.status, 'In progress');

  ok(await clients[0].auth.signOut({ scope: 'local' }));
  ok(await clients[0].auth.signInWithPassword({ email: emails[0], password }));
  saved = (await list(clients[0], workspace)).find(item => item.id === work);
  assert.equal(saved.status, 'Implemented');
  assert.equal(saved.transitions.at(-1).id, completionId);

  console.log('PASS: owner work completion records Implemented without verification; idempotency, concurrency, authority, target isolation, rollback, revocation, direct-write denial, durable history, and non-collateral release/evidence state passed.');
} finally {
  await sql.end();
}