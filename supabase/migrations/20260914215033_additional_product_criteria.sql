-- Add conditions within the existing product-owner boundary; never rewrite evidence.
create table wayfound.criterion_additions (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references wayfound.workspaces(id),
 requirement_id uuid not null references wayfound.requirements(id),
 criterion_id uuid not null unique references wayfound.acceptance_criteria(id),
 actor_id uuid not null references wayfound.actors(id),
 reason text not null check (length(btrim(reason)) between 1 and 2000),
 from_revision integer not null check (from_revision > 0),
 to_revision integer not null check (to_revision = from_revision + 1),
 created_at timestamptz not null default now(),
 unique(requirement_id,to_revision)
);
create index criterion_additions_workspace on wayfound.criterion_additions(workspace_id);
create table wayfound.criterion_add_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 payload jsonb not null,
 criterion_id uuid not null references wayfound.acceptance_criteria(id),
 primary key(actor_id,request_id)
);
create index criterion_add_requests_workspace on wayfound.criterion_add_requests(workspace_id);
alter table wayfound.criterion_additions enable row level security;
alter table wayfound.criterion_add_requests enable row level security;
create policy criterion_addition_member on wayfound.criterion_additions for select to authenticated using(wayfound.member(workspace_id));
create policy criterion_add_request_member on wayfound.criterion_add_requests for select to authenticated using(wayfound.member(workspace_id));
revoke all on wayfound.criterion_additions, wayfound.criterion_add_requests from public,anon,authenticated;

create function wayfound.add_owner_criterion(p_workspace uuid,p_requirement uuid,p_expected_revision integer,p_statement text,p_reason text,p_confirm boolean,p_request uuid)
returns uuid language plpgsql security definer set search_path='' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 target wayfound.requirements;
 previous wayfound.criterion_add_requests;
 body jsonb;
 criterion uuid := gen_random_uuid();
begin
 if p_workspace is null or p_requirement is null or p_expected_revision is null or p_expected_revision < 1 or p_request is null or
 p_statement is null or length(btrim(p_statement)) not between 1 and 4000 or
 p_reason is null or length(btrim(p_reason)) not between 1 and 2000 or p_confirm is distinct from true then
 raise exception 'Invalid input' using errcode='22023'; end if;
 select a.id into actor from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id for share of m;
 if actor is null then raise exception 'Access denied' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':criterion:' || p_request::text,0));
 select * into target from wayfound.requirements where workspace_id=p_workspace and id=p_requirement for update;
 if not found then raise exception 'Requirement unavailable' using errcode='23503'; end if;
 if target.kind <> 'product' or target.authority <> 'owner' or target.status <> 'Approved' then
 raise exception 'Owner product authority required' using errcode='42501'; end if;
 body := jsonb_build_object('workspace',p_workspace,'requirement',p_requirement,'revision',p_expected_revision,'statement',btrim(p_statement),'reason',btrim(p_reason));
 select * into previous from wayfound.criterion_add_requests where actor_id=actor and request_id=p_request;
 if found then
 if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
 return previous.criterion_id;
 end if;
 if target.revision <> p_expected_revision then raise exception 'Requirement changed' using errcode='55000'; end if;
 if exists(select 1 from wayfound.acceptance_criteria where requirement_id=p_requirement and statement=btrim(p_statement)) then
 raise exception 'Condition already exists' using errcode='55000'; end if;
 insert into wayfound.acceptance_criteria(id,workspace_id,requirement_id,statement) values(criterion,p_workspace,p_requirement,btrim(p_statement));
 update wayfound.requirements set revision=revision+1,updated_at=now() where id=p_requirement;
 insert into wayfound.criterion_additions(workspace_id,requirement_id,criterion_id,actor_id,reason,from_revision,to_revision)
 values(p_workspace,p_requirement,criterion,actor,btrim(p_reason),target.revision,target.revision+1);
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'criterion.added',criterion,p_request);
 insert into wayfound.criterion_add_requests(actor_id,request_id,workspace_id,payload,criterion_id) values(actor,p_request,p_workspace,body,criterion);
 return criterion;
end $$;
revoke all on function wayfound.add_owner_criterion(uuid,uuid,integer,text,text,boolean,uuid) from public,anon,authenticated;
grant execute on function wayfound.add_owner_criterion(uuid,uuid,integer,text,text,boolean,uuid) to authenticated;
create function public.add_owner_criterion(p_workspace uuid,p_requirement uuid,p_expected_revision integer,p_statement text,p_reason text,p_confirm boolean,p_request uuid)
returns uuid language sql security invoker set search_path='' as $$ select wayfound.add_owner_criterion(p_workspace,p_requirement,p_expected_revision,p_statement,p_reason,p_confirm,p_request) $$;
revoke all on function public.add_owner_criterion(uuid,uuid,integer,text,text,boolean,uuid) from public,anon;
grant execute on function public.add_owner_criterion(uuid,uuid,integer,text,text,boolean,uuid) to authenticated;

create or replace function wayfound.list_requirements(p_workspace uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
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
     'addition',(select jsonb_build_object('reason',a.reason,'from_revision',a.from_revision,'to_revision',a.to_revision,'actor_id',a.actor_id,'created_at',a.created_at) from wayfound.criterion_additions a where a.criterion_id=c.id),
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
