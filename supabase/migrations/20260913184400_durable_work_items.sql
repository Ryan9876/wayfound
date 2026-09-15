-- Durable proposed work items extend the existing private workspace boundary.
create table wayfound.work_items (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null,
 release_id uuid not null,
 stage_number integer not null check (stage_number between 1 and 15),
 title text not null check (length(btrim(title)) between 1 and 160),
 outcome text not null check (length(btrim(outcome)) between 1 and 4000),
 completion_condition text not null check (length(btrim(completion_condition)) between 1 and 4000),
 evidence_expectation text not null check (length(btrim(evidence_expectation)) between 1 and 4000),
 owner_actor_id uuid not null references wayfound.actors(id),
 status text not null default 'Proposed' check (status = 'Proposed'),
 revision integer not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(workspace_id, release_id) references wayfound.releases(workspace_id, id),
 foreign key(release_id, stage_number) references wayfound.release_stages(release_id, stage_number)
);
create index work_item_workspace_created on wayfound.work_items(workspace_id, created_at desc);

create table wayfound.work_item_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 payload jsonb not null,
 work_item_id uuid not null references wayfound.work_items(id),
 primary key(actor_id, request_id)
);

alter table wayfound.work_items enable row level security;
create policy work_item_member on wayfound.work_items for select to authenticated using(wayfound.member(workspace_id));
alter table wayfound.work_item_requests enable row level security;
create policy work_item_request_member on wayfound.work_item_requests for select to authenticated using(wayfound.member(workspace_id));

create function wayfound.list_work_items(p_workspace uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare subject_id uuid := wayfound.subject();
begin
 if not exists (
  select 1 from wayfound.memberships m
  join wayfound.actors a on a.id=m.actor_id
  where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id
 ) then return '[]'::jsonb; end if;
 return coalesce((
  select jsonb_agg(jsonb_build_object(
   'id',w.id,
   'workspace_id',w.workspace_id,
   'release_id',w.release_id,
   'stage_number',w.stage_number,
   'title',w.title,
   'outcome',w.outcome,
   'completion_condition',w.completion_condition,
   'evidence_expectation',w.evidence_expectation,
   'owner_actor_id',w.owner_actor_id,
   'status',w.status,
   'revision',w.revision,
   'created_at',w.created_at,
   'updated_at',w.updated_at
  ) order by w.created_at desc, w.id)
  from wayfound.work_items w
  where w.workspace_id=p_workspace
 ),'[]'::jsonb);
end $$;

create function wayfound.create_proposed_work_item(
 p_workspace uuid,
 p_title text,
 p_outcome text,
 p_completion_condition text,
 p_evidence_expectation text,
 p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 release uuid;
 stage integer;
 work_item_id uuid;
 previous wayfound.work_item_requests;
 body jsonb;
begin
 if p_workspace is null or p_request is null or
    p_title is null or length(btrim(p_title)) not between 1 and 160 or
    p_outcome is null or length(btrim(p_outcome)) not between 1 and 4000 or
    p_completion_condition is null or length(btrim(p_completion_condition)) not between 1 and 4000 or
    p_evidence_expectation is null or length(btrim(p_evidence_expectation)) not between 1 and 4000 then
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
  'outcome',btrim(p_outcome),
  'completion_condition',btrim(p_completion_condition),
  'evidence_expectation',btrim(p_evidence_expectation)
 );
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':' || p_request::text,0));
 select * into previous from wayfound.work_item_requests where actor_id=actor and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists (
   select 1 from wayfound.memberships m
   where m.workspace_id=previous.workspace_id and m.actor_id=actor and m.role='owner'
  ) then raise exception 'Access denied' using errcode='42501'; end if;
  return previous.work_item_id;
 end if;
 select r.id,r.current_stage into release,stage from wayfound.releases r where r.workspace_id=p_workspace;
 if release is null then raise exception 'Workspace release missing' using errcode='23503'; end if;
 insert into wayfound.work_items(workspace_id,release_id,stage_number,title,outcome,completion_condition,evidence_expectation,owner_actor_id,status)
 values(p_workspace,release,stage,btrim(p_title),btrim(p_outcome),btrim(p_completion_condition),btrim(p_evidence_expectation),actor,'Proposed')
 returning id into work_item_id;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'work_item.proposed',work_item_id,p_request);
 insert into wayfound.work_item_requests(actor_id,request_id,workspace_id,payload,work_item_id)
 values(actor,p_request,p_workspace,body,work_item_id);
 return work_item_id;
end $$;

revoke all on table wayfound.work_items, wayfound.work_item_requests from public, anon, authenticated;
revoke all on function wayfound.list_work_items(uuid), wayfound.create_proposed_work_item(uuid,text,text,text,text,uuid) from public, anon, authenticated;
grant execute on function wayfound.list_work_items(uuid), wayfound.create_proposed_work_item(uuid,text,text,text,text,uuid) to authenticated;

create function public.list_work_items(p_workspace uuid) returns jsonb language sql security invoker set search_path = '' as $$select wayfound.list_work_items(p_workspace)$$;
create function public.create_proposed_work_item(p_workspace uuid,p_title text,p_outcome text,p_completion_condition text,p_evidence_expectation text,p_request uuid) returns uuid language sql security invoker set search_path = '' as $$select wayfound.create_proposed_work_item(p_workspace,p_title,p_outcome,p_completion_condition,p_evidence_expectation,p_request)$$;
revoke all on function public.list_work_items(uuid), public.create_proposed_work_item(uuid,text,text,text,text,uuid) from public, anon;
grant execute on function public.list_work_items(uuid), public.create_proposed_work_item(uuid,text,text,text,text,uuid) to authenticated;
