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
const emails = [0,1].map(n => `owner-${n}-${randomUUID()}@example.test`);
const clients = [backend.client(),backend.client()];
const users=[];
let server, browser;
const base='http://127.0.0.1:3100';
const output='artifacts/workspace';mkdirSync(output,{recursive:true});
const args={p_name:'Workshop continuity',p_problem:'Volunteers need a reliable equipment record.',p_release:'Release 1.0',p_request:randomUUID()};
function ok(result){if(result.error) throw new Error(`${result.error.code}: ${result.error.message}`);return result.data;}
async function start(){
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'],{env:{...process.env,SUPABASE_URL:backend.url,SUPABASE_PUBLISHABLE_KEY:backend.key,APP_ORIGIN:base},stdio:'ignore'});
 for(let i=0;i<100;i++){try{if((await fetch(base+'/sign-in')).ok)return;}catch{} await new Promise(r=>setTimeout(r,200));}
 throw new Error('Application did not start');
}
async function stop(){if(server && server.exitCode===null){const closed=once(server,'exit');server.kill('SIGTERM');await closed;}server=null;}
async function login(page,email){await page.goto(base+'/sign-in');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(base+'/workspaces');}
async function inspect(page,name){
 for(const [label,width,height] of [['mobile',390,844],['desktop',1440,1200]]){
  await page.setViewportSize({width,height});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' overflow');
  await page.screenshot({path:`${output}/${name}-${label}.png`,fullPage:true});
  // Traverse visible links, buttons and fields and verify actual focus visibility.
  await page.evaluate(()=>document.activeElement?.blur());
  const targets=await page.locator('a[href],button:not([disabled]),input:not([type=hidden]),textarea').evaluateAll(elements=>elements.filter(e=>e.getBoundingClientRect().width>0).map((e,i)=>{e.dataset.focusId=String(i);return String(i)}));
  const seen=new Set();
  for(let i=0;i<targets.length+5;i++){
   await page.keyboard.press('Tab');
   const focused=await page.evaluate(()=>{const e=document.activeElement;const s=getComputedStyle(e);return{id:e?.getAttribute('data-focus-id'),width:parseFloat(s.outlineWidth),style:s.outlineStyle}});
   if(focused.id!==null){seen.add(focused.id);assert(focused.width>=1&&focused.style!=='none',name+' missing focus');}
  }
  assert.equal(seen.size,targets.length,name+' unreachable controls');
 }
}
try {
 for(let i=0;i<2;i++){
  users.push(ok(await backend.admin.auth.admin.createUser({email:emails[i],password,email_confirm:true})).user);
  ok(await clients[i].auth.signInWithPassword({email:emails[i],password}));
 }
 const id=ok(await clients[0].rpc('create_workspace',args));
 const duplicate=await Promise.all([clients[0].rpc('create_workspace',args),clients[0].rpc('create_workspace',args)]);
 duplicate.forEach(r=>assert.equal(ok(r),id));
 assert((await clients[0].rpc('create_workspace',{...args,p_name:'Changed'})).error);
 const saved=ok(await clients[0].rpc('open_workspace',{p_id:id}));
 assert.equal(saved.release.lifecycle,'Proposed');assert.equal(saved.release.current_stage,1);
 assert.equal(saved.stages.length,15);assert.deepEqual(saved.stages.map(s=>s.state),['active',...Array(14).fill('upcoming')]);
 assert.equal(ok(await clients[1].rpc('open_workspace',{p_id:id})),null);
 assert.deepEqual(ok(await clients[1].rpc('list_workspaces')),[]);
 assert((await backend.client().rpc('open_workspace',{p_id:id})).error);
 assert((await clients[0].schema('wayfound').from('workspaces').select('*')).error);
 assert((await clients[0].from('workspaces').insert({name:'bypass'})).error);
 const tables=['actors','workspaces','memberships','releases','release_stages','audit_events','creation_requests'];
 async function counts(){return Promise.all(tables.map(async t=>(await sql.query(`select count(*)::int n from wayfound.${t}`)).rows[0].n));}
 const before=await counts();
 await sql.query(`create function wayfound.test_failure() returns trigger language plpgsql as $$begin raise exception 'Injected audit failure'; end$$; create trigger test_failure before insert on wayfound.audit_events for each row execute function wayfound.test_failure()`);
 try{assert((await clients[0].rpc('create_workspace',{...args,p_request:randomUUID()})).error);assert.deepEqual(await counts(),before);}finally{await sql.query('drop trigger test_failure on wayfound.audit_events; drop function wayfound.test_failure()');}
 const membership=(await sql.query('delete from wayfound.memberships where workspace_id=$1 returning *',[id])).rows[0];
 assert.equal(ok(await clients[0].rpc('open_workspace',{p_id:id})),null);
 assert((await clients[0].rpc('create_workspace',args)).error);
 await sql.query('insert into wayfound.memberships(workspace_id,actor_id,role) values($1,$2,$3)',[id,membership.actor_id,membership.role]);
 // Revoked sessions cannot reuse a still-signed access token for data access.
 const access=ok(await clients[1].auth.getSession()).session.access_token;
 await sql.query('delete from auth.sessions where user_id=$1',[users[1].id]);
 const revoked=await fetch(backend.url+'/rest/v1/rpc/list_workspaces',{method:'POST',headers:{apikey:backend.key,Authorization:`Bearer ${access}`,'Content-Type':'application/json'},body:'{}'});
 assert(!revoked.ok,'revoked session read succeeded');
 await start();browser=await chromium.launch();
 let context=await browser.newContext();let page=await context.newPage();
 await page.goto(base+'/sign-in');await inspect(page,'sign-in');
 await login(page,emails[1]);await inspect(page,'empty-workspaces');
 await page.getByLabel('Project name',{exact:true}).fill('Community workshop');
 await page.getByLabel('What problem do you want to solve?').fill('Track the equipment that volunteers borrow.');
 await page.getByRole('button',{name:'Create workspace',exact:true}).click();
 await page.waitForURL(/\/workspaces\/[0-9a-f-]+$/);
 const resumeUrl=page.url();await inspect(page,'saved-workspace');
 assert(await page.getByText('Stage 1: Clarify',{exact:true}).isVisible());
 await page.getByRole('link',{name:'Your workspaces',exact:true}).click();await inspect(page,'workspace-list');
 await page.getByRole('button',{name:'Sign out',exact:true}).click();await page.waitForURL(base+'/sign-in');
 await page.goto(resumeUrl);await page.waitForURL(base+'/sign-in');
 await context.close();await stop();await start();
 context=await browser.newContext();page=await context.newPage();
 await login(page,emails[1]);await page.getByRole('link',{name:/Community workshop/}).click();assert.equal(page.url(),resumeUrl);
 assert(await page.getByText('Track the equipment that volunteers borrow.',{exact:true}).isVisible());
 // Different owner cannot retrieve this workspace through its route.
 const other=await browser.newContext();const otherPage=await other.newPage();await login(otherPage,emails[0]);await otherPage.goto(resumeUrl);assert(await otherPage.getByRole('heading',{name:'Workspace not available.'}).isVisible());await other.close();
 // Real database interruption: deny new reads and recover the same saved state.
 execFileSync('docker',['pause','supabase_db_wayfound'],{stdio:'ignore'});
 try{await page.goto(resumeUrl,{timeout:90000});await page.getByRole('heading',{name:'We could not load your workspace.'}).waitFor({timeout:60000});await page.screenshot({path:`${output}/database-unavailable.png`,fullPage:true});}
 finally{execFileSync('docker',['unpause','supabase_db_wayfound'],{stdio:'ignore'});}
 await page.reload();await page.getByRole('heading',{name:'Community workshop',exact:true}).waitFor({timeout:30000});
 assert.deepEqual(ok(await clients[0].rpc('open_workspace',{p_id:id})),saved);
 await context.close();
 console.log('PASS: real Supabase authentication, atomic PostgreSQL creation, duplicate retries, tenant isolation, revocation, failure rollback, restart/resume, sign-out, database interruption/recovery, keyboard focus and responsive screenshots.');
} finally {if(browser)await browser.close();await stop();await sql.end();}
