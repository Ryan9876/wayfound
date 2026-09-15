-- Private storage is not exposed through the Data API. Only bounded RPCs are public.
create schema if not exists wayfound;
revoke all on schema wayfound from public, anon, authenticated;
grant usage on schema wayfound to authenticated;

create table wayfound.actors (
 id uuid primary key default gen_random_uuid(),
 provider text not null default 'supabase' check (provider = 'supabase'),
 provider_subject uuid not null unique references auth.users(id),
 created_at timestamptz not null default now()
);
create table wayfound.workspaces (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(btrim(name)) between 1 and 120),
 problem_statement text not null check (length(btrim(problem_statement)) between 1 and 2000),
 revision integer not null default 1 check (revision > 0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table wayfound.memberships (
 workspace_id uuid not null references wayfound.workspaces(id),
 actor_id uuid not null references wayfound.actors(id),
 role text not null check (role = 'owner'), created_at timestamptz not null default now(),
 primary key(workspace_id, actor_id)
);
create table wayfound.releases (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null unique references wayfound.workspaces(id),
 label text not null check (length(btrim(label)) between 1 and 80),
 lifecycle text not null default 'Proposed' check (lifecycle in ('Proposed','Approved','In progress','Blocked','Implemented','Validated','Released','Deprecated','Retired')),
 current_stage integer not null default 1 check (current_stage between 1 and 15),
 revision integer not null default 1,
 unique(workspace_id, id)
);
create table wayfound.release_stages (
 workspace_id uuid not null,
 release_id uuid not null,
 stage_number integer not null check (stage_number between 1 and 15),
 state text not null check (state in ('complete','active','upcoming','reopened','blocked')),
 revision integer not null default 1,
 primary key(release_id, stage_number),
 foreign key(workspace_id, release_id) references wayfound.releases(workspace_id, id)
);
alter table wayfound.releases add constraint current_stage_reference
 foreign key(id, current_stage) references wayfound.release_stages(release_id, stage_number) deferrable initially deferred;
create table wayfound.audit_events (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references wayfound.workspaces(id),
 actor_id uuid not null references wayfound.actors(id), operation text not null,
 entity_id uuid not null, correlation_id uuid not null, created_at timestamptz not null default now()
);
create table wayfound.creation_requests (
 actor_id uuid not null references wayfound.actors(id), request_id uuid not null,
 payload jsonb not null, workspace_id uuid not null references wayfound.workspaces(id),
 primary key(actor_id, request_id)
);
create index membership_actor on wayfound.memberships(actor_id);

-- Authenticated means a current, non-anonymous provider session, not just a valid JWT signature.
create function wayfound.subject() returns uuid language plpgsql stable security definer set search_path = '' as $$
declare subject_id uuid := auth.uid();
begin
 if subject_id is null or not exists (
  select 1 from auth.sessions s join auth.users u on u.id = s.user_id
  where s.id = (auth.jwt()->>'session_id')::uuid and s.user_id = subject_id
    and (s.not_after is null or s.not_after > now()) and not coalesce(u.is_anonymous, false)
 ) then raise exception 'Authentication required' using errcode = '28000'; end if;
 return subject_id;
end $$;
create function wayfound.member(p_workspace uuid) returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and a.provider_subject=wayfound.subject())
$$;
-- RLS is defense in depth. No direct table grants are given to client roles.
alter table wayfound.actors enable row level security;
create policy actor_self on wayfound.actors for select to authenticated using(provider_subject=wayfound.subject());
alter table wayfound.workspaces enable row level security;
create policy workspace_member on wayfound.workspaces for select to authenticated using(wayfound.member(id));
alter table wayfound.memberships enable row level security;
create policy membership_self on wayfound.memberships for select to authenticated using(wayfound.member(workspace_id));
alter table wayfound.releases enable row level security;
create policy release_member on wayfound.releases for select to authenticated using(wayfound.member(workspace_id));
alter table wayfound.release_stages enable row level security;
create policy stage_member on wayfound.release_stages for select to authenticated using(wayfound.member(workspace_id));
alter table wayfound.audit_events enable row level security;
create policy audit_member on wayfound.audit_events for select to authenticated using(wayfound.member(workspace_id));
alter table wayfound.creation_requests enable row level security;
create policy request_member on wayfound.creation_requests for select to authenticated using(wayfound.member(workspace_id));

create function wayfound.open_workspace(p_id uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
 perform wayfound.subject();
 if not wayfound.member(p_id) then return null; end if;
 return (select jsonb_build_object('id',w.id,'name',w.name,'problem_statement',w.problem_statement,'revision',w.revision,
  'release',jsonb_build_object('id',r.id,'label',r.label,'lifecycle',r.lifecycle,'current_stage',r.current_stage),
  'stages',(select jsonb_agg(jsonb_build_object('stage_number',s.stage_number,'state',s.state) order by s.stage_number) from wayfound.release_stages s where s.release_id=r.id))
 from wayfound.workspaces w join wayfound.releases r on r.workspace_id=w.id where w.id=p_id);
end $$;
create function wayfound.list_workspaces() returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare subject_id uuid := wayfound.subject();
begin
 return coalesce((select jsonb_agg(wayfound.open_workspace(m.workspace_id) order by w.created_at desc)
 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id join wayfound.workspaces w on w.id=m.workspace_id
 where a.provider_subject=subject_id),'[]'::jsonb);
end $$;

-- Privileged transaction is intentional: clients cannot partially create or alter lifecycle.
-- Caller identity is derived from the verified session; no owner argument exists.
create function wayfound.create_workspace(p_name text,p_problem text,p_release text,p_request uuid) returns uuid language plpgsql security definer set search_path = '' as $$
declare subject_id uuid := wayfound.subject(); actor uuid; workspace uuid; release uuid; previous wayfound.creation_requests; body jsonb;
begin
 if p_name is null or length(btrim(p_name)) not between 1 and 120 or p_problem is null or length(btrim(p_problem)) not between 1 and 2000 or p_release is null or length(btrim(p_release)) not between 1 and 80 or p_request is null then
 raise exception 'Invalid input' using errcode='22023'; end if;
 body := jsonb_build_object('name',btrim(p_name),'problem',btrim(p_problem),'release',btrim(p_release));
 -- Serialize same-actor requests to cover actor creation and duplicate retries together.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(subject_id::text,0));
 insert into wayfound.actors(provider_subject) values(subject_id) on conflict(provider_subject) do nothing;
 select id into actor from wayfound.actors where provider_subject=subject_id;
 select * into previous from wayfound.creation_requests where actor_id=actor and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not wayfound.member(previous.workspace_id) then raise exception 'Access denied' using errcode='42501'; end if;
  return previous.workspace_id;
 end if;
 insert into wayfound.workspaces(name,problem_statement) values(btrim(p_name),btrim(p_problem)) returning id into workspace;
 insert into wayfound.memberships(workspace_id,actor_id,role) values(workspace,actor,'owner');
 insert into wayfound.releases(workspace_id,label) values(workspace,btrim(p_release)) returning id into release;
 insert into wayfound.release_stages(workspace_id,release_id,stage_number,state)
 select workspace,release,n,case when n=1 then 'active' else 'upcoming' end from generate_series(1,15) n;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id) values(workspace,actor,'workspace.created',workspace,p_request);
 insert into wayfound.creation_requests(actor_id,request_id,payload,workspace_id) values(actor,p_request,body,workspace);
 return workspace;
end $$;

revoke all on all tables in schema wayfound from public, anon, authenticated;
revoke all on all functions in schema wayfound from public, anon, authenticated;
grant execute on function wayfound.subject(), wayfound.member(uuid), wayfound.open_workspace(uuid), wayfound.list_workspaces(), wayfound.create_workspace(text,text,text,uuid) to authenticated;
-- Exposed wrappers are invoker functions; all privileged code remains in the private schema.
create function public.open_workspace(p_id uuid) returns jsonb language sql security invoker set search_path = '' as $$select wayfound.open_workspace(p_id)$$;
create function public.list_workspaces() returns jsonb language sql security invoker set search_path = '' as $$select wayfound.list_workspaces()$$;
create function public.create_workspace(p_name text,p_problem text,p_release text,p_request uuid) returns uuid language sql security invoker set search_path = '' as $$select wayfound.create_workspace(p_name,p_problem,p_release,p_request)$$;
revoke all on function public.open_workspace(uuid),public.list_workspaces(),public.create_workspace(text,text,text,uuid) from public,anon;
grant execute on function public.open_workspace(uuid),public.list_workspaces(),public.create_workspace(text,text,text,uuid) to authenticated;
