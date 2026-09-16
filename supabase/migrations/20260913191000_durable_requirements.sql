-- Durable owner-approved product requirements extend the existing private workspace boundary.
create table wayfound.requirements (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null,
 release_id uuid not null,
 stage_number integer not null check (stage_number between 1 and 15),
 title text not null check (length(btrim(title)) between 1 and 160),
 obligation text not null check (obligation in ('MUST','SHOULD','MAY')),
 requirement_statement text not null check (length(btrim(requirement_statement)) between 1 and 4000),
 kind text not null default 'product' check (kind = 'product'),
 authority text not null default 'owner' check (authority = 'owner'),
 status text not null default 'Approved' check (status = 'Approved'),
 approving_actor_id uuid not null references wayfound.actors(id),
 revision integer not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(workspace_id, release_id) references wayfound.releases(workspace_id, id),
 foreign key(release_id, stage_number) references wayfound.release_stages(release_id, stage_number),
 unique(workspace_id, id)
);
create index requirement_workspace_created on wayfound.requirements(workspace_id, created_at desc);

create table wayfound.acceptance_criteria (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null,
 requirement_id uuid not null,
 statement text not null check (length(btrim(statement)) between 1 and 4000),
 revision integer not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(workspace_id, requirement_id) references wayfound.requirements(workspace_id, id)
);
create index acceptance_criterion_requirement on wayfound.acceptance_criteria(requirement_id, created_at);

create table wayfound.requirement_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 payload jsonb not null,
 requirement_id uuid not null references wayfound.requirements(id),
 primary key(actor_id, request_id)
);

alter table wayfound.requirements enable row level security;
create policy requirement_member on wayfound.requirements for select to authenticated using(wayfound.member(workspace_id));
alter table wayfound.acceptance_criteria enable row level security;
create policy acceptance_criterion_member on wayfound.acceptance_criteria for select to authenticated using(wayfound.member(workspace_id));
alter table wayfound.requirement_requests enable row level security;
create policy requirement_request_member on wayfound.requirement_requests for select to authenticated using(wayfound.member(workspace_id));

create function wayfound.list_requirements(p_workspace uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare subject_id uuid := wayfound.subject();
begin
 if not exists (
  select 1 from wayfound.memberships m
  join wayfound.actors a on a.id=m.actor_id
  where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id
 ) then return '[]'::jsonb; end if;
 return coalesce((
  select jsonb_agg(jsonb_build_object(
   'id',r.id,
   'workspace_id',r.workspace_id,
   'release_id',r.release_id,
   'stage_number',r.stage_number,
   'title',r.title,
   'obligation',r.obligation,
   'requirement',r.requirement_statement,
   'kind',r.kind,
   'authority',r.authority,
   'status',r.status,
   'approving_actor_id',r.approving_actor_id,
   'revision',r.revision,
   'acceptance_criteria',coalesce((
    select jsonb_agg(jsonb_build_object(
     'id',c.id,
     'workspace_id',c.workspace_id,
     'requirement_id',c.requirement_id,
     'statement',c.statement,
     'revision',c.revision,
     'created_at',c.created_at,
     'updated_at',c.updated_at
    ) order by c.created_at,c.id)
    from wayfound.acceptance_criteria c where c.requirement_id=r.id
   ),'[]'::jsonb),
   'created_at',r.created_at,
   'updated_at',r.updated_at
  ) order by r.created_at desc,r.id)
  from wayfound.requirements r where r.workspace_id=p_workspace
 ),'[]'::jsonb);
end $$;

create function wayfound.record_owner_requirement(
 p_workspace uuid,
 p_title text,
 p_obligation text,
 p_requirement text,
 p_acceptance_criterion text,
 p_authority_confirm boolean,
 p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 release uuid;
 stage integer;
 requirement_id uuid := gen_random_uuid();
 criterion_id uuid := gen_random_uuid();
 previous wayfound.requirement_requests;
 body jsonb;
begin
 if p_workspace is null or p_request is null or p_authority_confirm is distinct from true or
    p_title is null or length(btrim(p_title)) not between 1 and 160 or
    p_obligation is null or p_obligation not in ('MUST','SHOULD','MAY') or
    p_requirement is null or length(btrim(p_requirement)) not between 1 and 4000 or
    p_acceptance_criterion is null or length(btrim(p_acceptance_criterion)) not between 1 and 4000 then
  raise exception 'Invalid input' using errcode='22023';
 end if;
 select a.id into actor
 from wayfound.memberships m
 join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id;
 if actor is null then raise exception 'Access denied' using errcode='42501'; end if;
 body := jsonb_build_object(
  'workspace',p_workspace,
  'title',btrim(p_title),
  'obligation',p_obligation,
  'requirement',btrim(p_requirement),
  'acceptance_criterion',btrim(p_acceptance_criterion),
  'kind','product',
  'authority','owner'
 );
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':' || p_request::text,0));
 select * into previous from wayfound.requirement_requests where actor_id=actor and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists (
   select 1 from wayfound.memberships m
   where m.workspace_id=previous.workspace_id and m.actor_id=actor and m.role='owner'
  ) then raise exception 'Access denied' using errcode='42501'; end if;
  return previous.requirement_id;
 end if;
 select r.id,r.current_stage into release,stage from wayfound.releases r where r.workspace_id=p_workspace;
 if release is null then raise exception 'Workspace release missing' using errcode='23503'; end if;
 insert into wayfound.requirements(id,workspace_id,release_id,stage_number,title,obligation,requirement_statement,kind,authority,status,approving_actor_id)
 values(requirement_id,p_workspace,release,stage,btrim(p_title),p_obligation,btrim(p_requirement),'product','owner','Approved',actor);
 insert into wayfound.acceptance_criteria(id,workspace_id,requirement_id,statement)
 values(criterion_id,p_workspace,requirement_id,btrim(p_acceptance_criterion));
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'requirement.approved',requirement_id,p_request);
 insert into wayfound.requirement_requests(actor_id,request_id,workspace_id,payload,requirement_id)
 values(actor,p_request,p_workspace,body,requirement_id);
 return requirement_id;
end $$;

revoke all on table wayfound.requirements, wayfound.acceptance_criteria, wayfound.requirement_requests from public, anon, authenticated;
revoke all on function wayfound.list_requirements(uuid), wayfound.record_owner_requirement(uuid,text,text,text,text,boolean,uuid) from public, anon, authenticated;
grant execute on function wayfound.list_requirements(uuid), wayfound.record_owner_requirement(uuid,text,text,text,text,boolean,uuid) to authenticated;

create function public.list_requirements(p_workspace uuid) returns jsonb language sql security invoker set search_path = '' as $$select wayfound.list_requirements(p_workspace)$$;
create function public.record_owner_requirement(p_workspace uuid,p_title text,p_obligation text,p_requirement text,p_acceptance_criterion text,p_authority_confirm boolean,p_request uuid) returns uuid language sql security invoker set search_path = '' as $$select wayfound.record_owner_requirement(p_workspace,p_title,p_obligation,p_requirement,p_acceptance_criterion,p_authority_confirm,p_request)$$;
revoke all on function public.list_requirements(uuid), public.record_owner_requirement(uuid,text,text,text,text,boolean,uuid) from public, anon;
grant execute on function public.list_requirements(uuid), public.record_owner_requirement(uuid,text,text,text,text,boolean,uuid) to authenticated;
