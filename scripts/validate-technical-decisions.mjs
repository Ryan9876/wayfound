import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { chromium } from 'playwright';
import { localBackend } from './local-backend.mjs';

const backend = localBackend();
const sql = backend.sql;
await sql.connect();

const password = randomBytes(24).toString('base64url');
const emails = ['owner','specialist','outsider','owner-b'].map(label => `technical-decision-${label}-${randomUUID()}@example.test`);
const clients = emails.map(() => backend.client());
const users = [];
const retryDelays = [150, 350, 750];
const base = 'http://127.0.0.1:3105';
const output = 'artifacts/workspace';
mkdirSync(output, { recursive: true });
let server;
let browser;
let dbPaused = false;

function ok(result) {
  if (result.error) throw new Error(`${result.error.code}: ${result.error.message}`);
  return result.data;
}
function jwtFuture(error) { return error?.code === 'PGRST303' && error.message === 'JWT issued at future'; }
function expectedError(result, message, code) {
  assert(result.error, message);
  assert(!jwtFuture(result.error), `${message}: transient PostgREST JWT clock failure`);
  if (code) assert.equal(result.error.code, code, `${message}: wrong error code: ${result.error.code} ${result.error.message}`);
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
  throw new Error('Technical decision validation application did not start');
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
  await page.getByRole('heading', { name: 'Continue with a clear next step.', exact: true }).waitFor({ timeout: 30000 });
}
async function inspect(page, name) {
  for (const [label, width, height] of [['mobile',390,844],['desktop',1440,1200]]) {
    await page.setViewportSize({ width, height });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} ${label} overflow`);
    await page.screenshot({ path: `${output}/${name}-${label}.png`, fullPage: true });
    await page.evaluate(() => document.activeElement?.blur());
    const targets = await page.locator('a[href],button:not([disabled]),input:not([type=hidden]),textarea,select,summary').evaluateAll(elements =>
      elements.filter(element => {
        if (element.getBoundingClientRect().width <= 0) return false;
        if (element.matches('summary')) return true;
        return element.closest('details:not([open])') === null;
      }).map((element,index) => { element.dataset.technicalDecisionFocusId=String(index); return String(index); }));
    const seen = new Set();
    for (let index=0; index<targets.length+8; index++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const element=document.activeElement; const style=getComputedStyle(element);
        return {id:element?.getAttribute('data-technical-decision-focus-id'),width:parseFloat(style.outlineWidth),style:style.outlineStyle};
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
  return ok(await rpc(client,'create_workspace',{
    p_name:`${label} technical decision workspace`,
    p_problem:'Preserve qualified technical judgment and explicit owner project-direction acceptance.',
    p_release:'Release 1.0',p_request:randomUUID(),
  }));
}
function proposalArgs(workspace, title, request = randomUUID()) {
  return {
    p_workspace:workspace,p_title:title,p_choice:`Use ${title} as the bounded technical direction.`,
    p_rationale:`${title} best fits the current architecture and operating constraints.`,
    p_alternatives:`Alternative A for ${title}; Alternative B for ${title}.`,
    p_consequences:`${title} affects authorization, reliability, and maintainability and requires qualified review.`,
    p_requested_competence:'Enterprise application architecture, security, and transactional authorization',
    p_review_question:`Does ${title} introduce a blocking technical risk within the stated architecture and authorization boundary?`,
    p_proposal_confirm:true,p_request:request,
  };
}
function reviewArgs(assignment, conclusion='No blocking finding', request=randomUUID()) {
  return {
    p_assignment:assignment,p_reviewer_name:'Alex Specialist',
    p_competence_statement:'Enterprise application architect experienced in authorization, PostgreSQL transaction design, and service boundaries.',
    p_conclusion:conclusion,p_summary:`${conclusion} for the exact assigned proposal revision within the declared scope.`,
    p_findings: conclusion === 'Changes required' ? 'A blocking issue must be corrected before this revision proceeds.' : conclusion === 'Advisory' ? 'Guidance is recorded, but no gate conclusion is provided.' : 'No blocking technical finding was identified within the assigned scope.',
    p_competence_confirm:true,p_request:request,
  };
}
async function createProposal(client, workspace, title, request=randomUUID()) {
  return ok(await rpc(client,'create_technical_choice_proposal',proposalArgs(workspace,title,request)));
}
async function assign(client, workspace, proposal, revision, reviewer, request=randomUUID()) {
  return ok(await rpc(client,'assign_technical_choice_review',{
    p_workspace:workspace,p_proposal:proposal,p_expected_revision:revision,p_reviewer:reviewer,p_scope_confirm:true,p_request:request,
  }));
}
async function accept(client, workspace, proposal, revision, request=randomUUID()) {
  return rpc(client,'accept_technical_choice',{p_workspace:workspace,p_proposal:proposal,p_expected_revision:revision,p_direction_confirm:true,p_request:request});
}
async function list(client, workspace) { return ok(await rpc(client,'list_owner_technical_choices',{p_workspace:workspace})); }

try {
  for (let index=0; index<emails.length; index++) {
    users.push(ok(await backend.admin.auth.admin.createUser({email:emails[index],password,email_confirm:true})).user);
    ok(await clients[index].auth.signInWithPassword({email:emails[index],password}));
  }
  const workspace=await createWorkspace(clients[0],'Owner A');
  await createWorkspace(clients[3],'Owner B');
  const ownerActor=(await sql.query('select id from wayfound.actors where provider_subject=$1',[users[0].id])).rows[0].id;
  const specialistCode=ok(await rpc(clients[1],'ensure_specialist_reviewer_identity'));
  const outsiderCode=ok(await rpc(clients[2],'ensure_specialist_reviewer_identity'));
  assert.equal((await sql.query('select count(*)::int n from wayfound.memberships where actor_id=$1',[specialistCode])).rows[0].n,0,'technical reviewer received membership');
  assert.deepEqual(ok(await rpc(clients[1],'list_workspaces')),[],'technical reviewer gained workspace access');

  const request=randomUUID();
  const primaryArgs=proposalArgs(workspace,'transaction-scoped authorization',request);
  const primary=ok(await rpc(clients[0],'create_technical_choice_proposal',primaryArgs));
  assert.equal(ok(await rpc(clients[0],'create_technical_choice_proposal',primaryArgs)),primary,'identical proposal retry changed result');
  expectedError(await rpc(clients[0],'create_technical_choice_proposal',{...primaryArgs,p_title:'Changed retry'}),'changed proposal retry succeeded','22023');
  expectedError(await rpc(clients[2],'create_technical_choice_proposal',proposalArgs(workspace,'outsider proposal')),'outsider proposal succeeded','42501');
  expectedError(await rpc(clients[3],'create_technical_choice_proposal',proposalArgs(workspace,'cross tenant proposal')),'cross-tenant proposal succeeded','42501');
  let saved=(await list(clients[0],workspace)).find(x=>x.id===primary);
  assert.equal(saved.status,'Proposed'); assert.equal(saved.revision,1); assert.equal(saved.decision,null);

  const assignmentRequest=randomUUID();
  const assignmentArgs={p_workspace:workspace,p_proposal:primary,p_expected_revision:1,p_reviewer:specialistCode,p_scope_confirm:true,p_request:assignmentRequest};
  const primaryAssignment=ok(await rpc(clients[0],'assign_technical_choice_review',assignmentArgs));
  assert.equal(ok(await rpc(clients[0],'assign_technical_choice_review',assignmentArgs)),primaryAssignment,'identical assignment retry changed result');
  expectedError(await rpc(clients[0],'assign_technical_choice_review',{...assignmentArgs,p_reviewer:outsiderCode}),'changed assignment retry succeeded','22023');
  expectedError(await rpc(clients[0],'assign_technical_choice_review',{...assignmentArgs,p_request:randomUUID(),p_reviewer:ownerActor}),'owner self-review succeeded','22023');
  expectedError(await rpc(clients[3],'assign_technical_choice_review',{...assignmentArgs,p_request:randomUUID()}),'foreign owner assigned review','42501');
  const specialistAssignments=ok(await rpc(clients[1],'list_my_technical_choice_reviews'));
  const specialistAssignment=specialistAssignments.find(x=>x.id===primaryAssignment);
  assert(specialistAssignment); assert.equal(specialistAssignment.proposal_revision,1); assert.equal(specialistAssignment.choice_statement,saved.choice_statement);
  assert.deepEqual(ok(await rpc(clients[2],'list_my_technical_choice_reviews')),[],'unassigned specialist saw technical assignment');
  expectedError(await rpc(clients[2],'record_technical_choice_review',reviewArgs(primaryAssignment)),'unassigned specialist review succeeded','42501');

  const reviewRequest=randomUUID();
  const noBlock=reviewArgs(primaryAssignment,'No blocking finding',reviewRequest);
  const reviewId=ok(await rpc(clients[1],'record_technical_choice_review',noBlock));
  assert.equal(ok(await rpc(clients[1],'record_technical_choice_review',noBlock)),reviewId,'identical review retry changed result');
  expectedError(await rpc(clients[1],'record_technical_choice_review',{...noBlock,p_summary:'Changed retry'}),'changed review retry succeeded','22023');
  saved=(await list(clients[0],workspace)).find(x=>x.id===primary);
  assert.equal(saved.status,'Proposed','specialist review automatically accepted proposal');
  assert.equal(saved.decision,null,'specialist review created accepted decision');
  assert.equal(saved.assignments[0].review.conclusion,'No blocking finding');

  const acceptRequest=randomUUID();
  const accepted=ok(await accept(clients[0],workspace,primary,1,acceptRequest));
  assert.equal(ok(await accept(clients[0],workspace,primary,1,acceptRequest)),accepted,'identical acceptance replay changed result');
  expectedError(await accept(clients[0],workspace,primary,2,acceptRequest),'changed acceptance retry succeeded','22023');
  saved=(await list(clients[0],workspace)).find(x=>x.id===primary);
  assert.equal(saved.status,'Accepted'); assert.equal(saved.revision,2); assert.equal(saved.decision.id,accepted);
  assert.equal(saved.decision.proposal_revision,1); assert.equal(saved.decision.review_id,reviewId); assert.equal(saved.decision.review_conclusion,'No blocking finding');
  assert.equal(saved.decision.accepted_by_actor_id,ownerActor);

  for (const conclusion of ['Advisory','Changes required']) {
    const proposal=await createProposal(clients[0],workspace,`${conclusion} gate`);
    const assignment=await assign(clients[0],workspace,proposal,1,specialistCode);
    ok(await rpc(clients[1],'record_technical_choice_review',reviewArgs(assignment,conclusion)));
    expectedError(await accept(clients[0],workspace,proposal,1),`${conclusion} permitted acceptance`,'55000');
    const record=(await list(clients[0],workspace)).find(x=>x.id===proposal);
    assert.equal(record.status,'Proposed'); assert.equal(record.decision,null);
  }

  const revised=await createProposal(clients[0],workspace,'revision freshness');
  const revisedAssignment=await assign(clients[0],workspace,revised,1,specialistCode);
  ok(await rpc(clients[1],'record_technical_choice_review',reviewArgs(revisedAssignment)));
  const beforeRevision=(await list(clients[0],workspace)).find(x=>x.id===revised);
  const revisionRequest=randomUUID();
  const revisionArgs={
    p_workspace:workspace,p_proposal:revised,p_expected_revision:1,p_title:beforeRevision.title,
    p_choice:`${beforeRevision.choice_statement} Revised material boundary.`,p_rationale:beforeRevision.rationale,p_alternatives:beforeRevision.alternatives,
    p_consequences:beforeRevision.consequences,p_requested_competence:beforeRevision.requested_competence,p_review_question:beforeRevision.review_question,
    p_proposal_confirm:true,p_request:revisionRequest,
  };
  assert.equal(ok(await rpc(clients[0],'revise_technical_choice_proposal',revisionArgs)),2);
  assert.equal(ok(await rpc(clients[0],'revise_technical_choice_proposal',revisionArgs)),2,'identical revision retry changed result');
  expectedError(await accept(clients[0],workspace,revised,1),'stale reviewed revision accepted','55000');
  let revisedRecord=(await list(clients[0],workspace)).find(x=>x.id===revised);
  assert.equal(revisedRecord.revision,2); assert.equal(revisedRecord.status,'Proposed');
  const revisedAssignment2=await assign(clients[0],workspace,revised,2,specialistCode);
  ok(await rpc(clients[1],'record_technical_choice_review',reviewArgs(revisedAssignment2)));
  ok(await accept(clients[0],workspace,revised,2));
  revisedRecord=(await list(clients[0],workspace)).find(x=>x.id===revised);
  assert.equal(revisedRecord.decision.proposal_revision,2);

  const staleReviewProposal=await createProposal(clients[0],workspace,'stale review submission');
  const staleAssignment=await assign(clients[0],workspace,staleReviewProposal,1,specialistCode);
  const staleRecord=(await list(clients[0],workspace)).find(x=>x.id===staleReviewProposal);
  ok(await rpc(clients[0],'revise_technical_choice_proposal',{
    p_workspace:workspace,p_proposal:staleReviewProposal,p_expected_revision:1,p_title:staleRecord.title,p_choice:`${staleRecord.choice_statement} Changed before review.`,
    p_rationale:staleRecord.rationale,p_alternatives:staleRecord.alternatives,p_consequences:staleRecord.consequences,
    p_requested_competence:staleRecord.requested_competence,p_review_question:staleRecord.review_question,p_proposal_confirm:true,p_request:randomUUID(),
  }));
  expectedError(await rpc(clients[1],'record_technical_choice_review',reviewArgs(staleAssignment)),'stale assignment review succeeded','55000');

  const concurrent=await createProposal(clients[0],workspace,'concurrent acceptance');
  const concurrentAssignment=await assign(clients[0],workspace,concurrent,1,specialistCode);
  ok(await rpc(clients[1],'record_technical_choice_review',reviewArgs(concurrentAssignment)));
  const concurrentResults=await Promise.all([accept(clients[0],workspace,concurrent,1,randomUUID()),accept(clients[0],workspace,concurrent,1,randomUUID())]);
  assert.equal(concurrentResults.filter(x=>!x.error).length,1,'concurrent distinct acceptances did not produce one winner');
  expectedError(concurrentResults.find(x=>x.error),'concurrent loser missing');
  assert.equal((await sql.query('select count(*)::int n from wayfound.technical_decisions where proposal_id=$1',[concurrent])).rows[0].n,1);

  const rollback=await createProposal(clients[0],workspace,'audit rollback acceptance');
  const rollbackAssignment=await assign(clients[0],workspace,rollback,1,specialistCode);
  ok(await rpc(clients[1],'record_technical_choice_review',reviewArgs(rollbackAssignment)));
  const rollbackRequest=randomUUID();
  await sql.query(`create function wayfound.test_technical_decision_failure() returns trigger language plpgsql as $$begin if new.operation='technical_decision.accepted' then raise exception 'Injected technical decision audit failure'; end if; return new; end$$; create trigger test_technical_decision_failure before insert on wayfound.audit_events for each row execute function wayfound.test_technical_decision_failure()`);
  try { expectedError(await accept(clients[0],workspace,rollback,1,rollbackRequest),'audit failure did not roll back'); }
  finally { await sql.query('drop trigger test_technical_decision_failure on wayfound.audit_events; drop function wayfound.test_technical_decision_failure()'); }
  assert.equal((await sql.query('select count(*)::int n from wayfound.technical_decisions where proposal_id=$1',[rollback])).rows[0].n,0);
  assert.equal((await sql.query('select count(*)::int n from wayfound.technical_choice_acceptance_requests where request_id=$1',[rollbackRequest])).rows[0].n,0);
  assert.equal(((await list(clients[0],workspace)).find(x=>x.id===rollback)).status,'Proposed');
  ok(await accept(clients[0],workspace,rollback,1,rollbackRequest));

  for (const table of ['technical_choice_proposals','technical_choice_review_assignments','technical_choice_reviews','technical_decisions','technical_choice_create_requests','technical_choice_revision_requests','technical_choice_assignment_requests','technical_choice_review_requests','technical_choice_acceptance_requests']) {
    expectedError(await clients[0].schema('wayfound').from(table).select('*'),`direct ${table} read succeeded`);
    expectedError(await clients[0].schema('wayfound').from(table).delete().neq('workspace_id',randomUUID()),`direct ${table} delete succeeded`);
    for (const privilege of ['SELECT','INSERT','UPDATE','DELETE']) assert.equal((await sql.query('select has_table_privilege($1,$2,$3) allowed',['authenticated',`wayfound.${table}`,privilege])).rows[0].allowed,false,`${table} ${privilege} granted`);
    assert.equal((await sql.query('select relrowsecurity from pg_class where oid=$1::regclass',[`wayfound.${table}`])).rows[0].relrowsecurity,true,`${table} RLS disabled`);
  }

  const protectedProposal=await createProposal(clients[0],workspace,'revocation target');
  const protectedAssignment=await assign(clients[0],workspace,protectedProposal,1,specialistCode);
  ok(await rpc(clients[1],'record_technical_choice_review',reviewArgs(protectedAssignment)));
  await sql.query('delete from wayfound.memberships where workspace_id=$1 and actor_id=$2',[workspace,ownerActor]);
  try {
    expectedError(await accept(clients[0],workspace,protectedProposal,1),'revoked owner acceptance succeeded','42501');
    assert.deepEqual(await list(clients[0],workspace),[],'revoked owner read succeeded');
  } finally { await sql.query("insert into wayfound.memberships(workspace_id,actor_id,role) values($1,$2,'owner')",[workspace,ownerActor]); }
  await sql.query("update auth.sessions set not_after=now()-interval '1 minute' where user_id=$1",[users[0].id]);
  try { expectedError(await accept(clients[0],workspace,protectedProposal,1),'expired owner acceptance succeeded'); }
  finally { await sql.query('update auth.sessions set not_after=null where user_id=$1',[users[0].id]); }
  const signedOut=backend.client();
  const signedSession=ok(await signedOut.auth.signInWithPassword({email:emails[0],password})).session;
  ok(await signedOut.auth.signOut({scope:'local'}));
  expectedError(await accept(signedOut,workspace,protectedProposal,1),'signed-out acceptance succeeded');
  await revokedRpc(signedSession.access_token,'accept_technical_choice',{p_workspace:workspace,p_proposal:protectedProposal,p_expected_revision:1,p_direction_confirm:true,p_request:randomUUID()});
  const access=ok(await clients[0].auth.getSession()).session.access_token;
  await sql.query('delete from auth.sessions where user_id=$1',[users[0].id]);
  await revokedRpc(access,'accept_technical_choice',{p_workspace:workspace,p_proposal:protectedProposal,p_expected_revision:1,p_direction_confirm:true,p_request:randomUUID()});
  await revokedRpc(access,'list_owner_technical_choices',{p_workspace:workspace});
  ok(await clients[0].auth.signInWithPassword({email:emails[0],password}));

  await start();
  browser=await chromium.launch({headless:true});
  let ownerContext=await browser.newContext();
  let ownerPage=await ownerContext.newPage();
  await login(ownerPage,emails[0]);
  const workspaceUrl=`${base}/workspaces/${workspace}`;
  await ownerPage.goto(workspaceUrl);
  await ownerPage.locator('#technical-choice-title').fill('UI authorization boundary');
  await ownerPage.locator('#technical-choice-statement').fill('Use exact-resource authorization and transaction-scoped acceptance for consequential technical decisions.');
  await ownerPage.locator('#technical-choice-rationale').fill('This preserves explicit authority while keeping qualified review separate.');
  await ownerPage.locator('#technical-choice-alternatives').fill('Automatic specialist acceptance; owner-only acceptance without a hard review gate.');
  await ownerPage.locator('#technical-choice-consequences').fill('Adds one explicit specialist step and one owner acceptance step.');
  await ownerPage.locator('#technical-choice-competence').fill('Application security and authorization architecture');
  await ownerPage.locator('#technical-choice-question').fill('Does this exact authorization boundary have a blocking technical flaw?');
  await ownerPage.locator('#technical-choice-confirm').check();
  await ownerPage.getByRole('button',{name:'Record technical choice proposal',exact:true}).click();
  const uiCard=ownerPage.locator('#technical-decisions article').filter({has:ownerPage.getByRole('heading',{name:'UI authorization boundary',exact:true})}).first();
  await uiCard.getByText('Status: Proposed',{exact:true}).waitFor({timeout:30000});
  await uiCard.getByLabel('Reviewer code',{exact:true}).fill(specialistCode);
  await uiCard.getByRole('checkbox',{name:/I confirm this assignment is limited to revision/}).check();
  await uiCard.getByRole('button',{name:'Assign technical review',exact:true}).click();
  await uiCard.getByText('Exact-revision specialist review · Pending',{exact:true}).waitFor({timeout:30000});
  await inspect(ownerPage,'technical-decision-proposed-owner');

  const specialistContext=await browser.newContext();
  const specialistPage=await specialistContext.newPage();
  await login(specialistPage,emails[1]);
  await specialistPage.goto(`${base}/specialist-reviews`);
  const specialistCard=specialistPage.locator('article').filter({has:specialistPage.getByRole('heading',{name:'UI authorization boundary',exact:true})}).first();
  await specialistCard.getByText('Technical choice review · Pending',{exact:true}).waitFor({timeout:30000});
  await specialistCard.getByLabel('Reviewer name',{exact:true}).fill('Alex Specialist');
  await specialistCard.getByLabel('Competence statement',{exact:true}).fill('Application security architect experienced in authorization boundaries.');
  await specialistCard.getByLabel('Technical choice review conclusion',{exact:true}).selectOption('No blocking finding');
  await specialistCard.getByLabel('Review summary',{exact:true}).fill('No blocking authorization flaw was found within the assigned scope.');
  await specialistCard.getByLabel('Findings',{exact:true}).fill('The exact-resource checks and separate acceptance action preserve the required authority boundary.');
  await specialistCard.getByRole('checkbox',{name:/I confirm this review is within my declared competence/}).check();
  await specialistCard.getByRole('button',{name:'Record technical review',exact:true}).click();
  await specialistCard.getByText('No blocking finding',{exact:true}).waitFor({timeout:30000});
  await inspect(specialistPage,'technical-decision-specialist-reviewed');

  await ownerPage.reload();
  const reviewedCard=ownerPage.locator('#technical-decisions article').filter({has:ownerPage.getByRole('heading',{name:'UI authorization boundary',exact:true})}).first();
  await reviewedCard.getByText('No blocking finding',{exact:true}).waitFor({timeout:30000});
  await reviewedCard.getByRole('checkbox',{name:/I accept this exact specialist-reviewed technical choice as project direction/}).check();
  await reviewedCard.getByRole('button',{name:'Accept reviewed technical choice',exact:true}).click();
  await reviewedCard.getByText('Accepted project direction after qualified review.',{exact:false}).waitFor({timeout:30000});
  await inspect(ownerPage,'technical-decision-accepted-owner');
  const uiPersisted=(await list(clients[0],workspace)).find(x=>x.title==='UI authorization boundary');
  assert.equal(uiPersisted.status,'Accepted'); assert.equal(uiPersisted.decision.review_conclusion,'No blocking finding');

  await specialistContext.close(); await ownerContext.close(); await stop(); await start();
  ownerContext=await browser.newContext(); ownerPage=await ownerContext.newPage();
  await login(ownerPage,emails[0]); await ownerPage.goto(workspaceUrl);
  const restartedCard=ownerPage.locator('#technical-decisions article').filter({has:ownerPage.getByRole('heading',{name:'UI authorization boundary',exact:true,level:3})}).first();
  await restartedCard.waitFor({state:'visible',timeout:30000});
  await restartedCard.getByText('Accepted project direction after qualified review.',{exact:false}).waitFor();
  const afterRestart=(await list(clients[0],workspace)).find(x=>x.id===uiPersisted.id);
  assert.equal(afterRestart.decision.id,uiPersisted.decision.id,'restart changed accepted technical decision');
  const otherContext=await browser.newContext(); const otherPage=await otherContext.newPage();
  await login(otherPage,emails[3]); await otherPage.goto(workspaceUrl);
  await otherPage.getByRole('heading',{name:'Workspace not available.'}).waitFor({timeout:30000});
  await otherContext.close();

  execFileSync('docker',['pause','supabase_db_wayfound'],{stdio:'ignore'}); dbPaused=true;
  try {
    await ownerPage.goto(workspaceUrl,{timeout:90000});
    await ownerPage.getByRole('heading',{name:'We could not load your workspace.'}).waitFor({timeout:60000});
    await ownerPage.screenshot({path:`${output}/technical-decision-database-unavailable.png`,fullPage:true});
  } finally { execFileSync('docker',['unpause','supabase_db_wayfound'],{stdio:'ignore'}); dbPaused=false; }
  await new Promise(resolve=>setTimeout(resolve,5000));
  await ownerPage.reload();
  await restartedCard.waitFor({state:'visible',timeout:30000});
  await restartedCard.getByText('Accepted project direction after qualified review.',{exact:false}).waitFor();
  assert.equal(((await list(clients[0],workspace)).find(x=>x.id===uiPersisted.id)).decision.id,uiPersisted.decision.id,'database recovery changed accepted technical decision');

  console.log('PASS: consequential technical choices preserve split authority; exact-revision specialist review gates separate owner acceptance; blocking/advisory findings, stale revisions, tenant/session/membership violations, direct-table access, duplicate/concurrent requests, injected audit failure, restart/re-login, database interruption/recovery, keyboard access, and desktop/390 px rendering passed.');
} finally {
  if (dbPaused) { try { execFileSync('docker',['unpause','supabase_db_wayfound'],{stdio:'ignore'}); } catch {} }
  if (browser) await browser.close();
  await stop();
  await sql.end();
}
