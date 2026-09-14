-- Durable work-item dependency graph inside the existing owner workspace boundary.
create table wayfound.work_item_dependencies (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references wayfound.workspaces(id),
 dependent_work_item_id uuid not null,
 prerequisite_work_item_id uuid not null,
 dependent_revision integer not null check(dependent_revision > 0),
 prerequisite_revision integer not null check(prerequisite_revision > 0),
 reason text not null check(length(btrim(reason)) between 1 and 2000),
 created_by_actor_id uuid not null references wayfound.actors(id),
 created_at timestamptz not null default now(),
 removed_by_actor_id uuid references wayfound.actors(id),
 removed_reason text check(removed_reason is null or length(btrim(removed_reason)) between 1 and 2000),
 removed_at timestamptz,
 foreign key(workspace_id,dependent_work_item_id) references wayfound.work_items(workspace_id,id),
 foreign key(workspace_id,prerequisite_work_item_id) references wayfound.work_items(workspace_id,id),
 check(dependent_work_item_id <> prerequisite_work_item_id),
 check(
  (removed_by_actor_id is null and removed_reason is null and removed_at is null)
  or
  (removed_by_actor_id is not null and removed_reason is not null and removed_at is not null)
 )
);
create unique index work_item_dependency_active_pair
 on wayfound.work_item_dependencies(workspace_id,dependent_work_item_id,prerequisite_work_item_id)
 where removed_at is null;
create index work_item_dependency_dependent
 on wayfound.work_item_dependencies(workspace_id,dependent_work_item_id,created_at desc);
create index work_item_dependency_prerequisite
 on wayfound.work_item_dependencies(workspace_id,prerequisite_work_item_id,created_at desc);

create table wayfound.work_item_dependency_create_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 payload jsonb not null,
 dependency_id uuid not null references wayfound.work_item_dependencies(id),
 primary key(actor_id,request_id)
);
create index work_item_dependency_create_request_workspace
 on wayfound.work_item_dependency_create_requests(workspace_id);

create table wayfound.work_item_dependency_remove_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 payload jsonb not null,
 dependency_id uuid not null references wayfound.work_item_dependencies(id),
 primary key(actor_id,request_id)
);
create index work_item_dependency_remove_request_workspace
 on wayfound.work_item_dependency_remove_requests(workspace_id);

alter table wayfound.work_item_dependencies enable row level security;
alter table wayfound.work_item_dependency_create_requests enable row level security;
alter table wayfound.work_item_dependency_remove_requests enable row level security;

create policy work_item_dependency_owner on wayfound.work_item_dependencies for select to authenticated
 using(exists(select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=work_item_dependencies.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()));
create policy work_item_dependency_create_request_owner on wayfound.work_item_dependency_create_requests for select to authenticated
 using(exists(select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=work_item_dependency_create_requests.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()));
create policy work_item_dependency_remove_request_owner on wayfound.work_item_dependency_remove_requests for select to authenticated
 using(exists(select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=work_item_dependency_remove_requests.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()));

create function wayfound.add_work_item_dependency(
 p_workspace uuid,p_dependent_work_item uuid,p_prerequisite_work_item uuid,
 p_reason text,p_confirm boolean,p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 dependent wayfound.work_items;
 prerequisite wayfound.work_items;
 previous wayfound.work_item_dependency_create_requests;
 body jsonb;
 dependency_id uuid;
begin
 if p_workspace is null or p_dependent_work_item is null or p_prerequisite_work_item is null or p_request is null or
    p_dependent_work_item=p_prerequisite_work_item or
    p_reason is null or length(btrim(p_reason)) not between 1 and 2000 or p_confirm is distinct from true then
  raise exception 'Invalid input' using errcode='22023';
 end if;

 select a.id into actor from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id for share of m;
 if actor is null then raise exception 'Access denied' using errcode='42501'; end if;

 body := jsonb_build_object(
  'workspace',p_workspace,'dependent_work_item',p_dependent_work_item,
  'prerequisite_work_item',p_prerequisite_work_item,'reason',btrim(p_reason),'confirm',true
 );
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':' || p_request::text,0));
 select * into previous from wayfound.work_item_dependency_create_requests where actor_id=actor and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists(select 1 from wayfound.memberships m where m.workspace_id=previous.workspace_id and m.actor_id=actor and m.role='owner') then
   raise exception 'Access denied' using errcode='42501';
  end if;
  return previous.dependency_id;
 end if;

 -- Serialize all dependency-graph changes in one workspace so concurrent requests cannot create an unseen cycle.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('work-dependency-graph:' || p_workspace::text,0));

 -- Lock both work rows in stable ID order so revision snapshots cannot change while the relationship is created.
 perform 1 from wayfound.work_items w
 where w.workspace_id=p_workspace and w.id in (p_dependent_work_item,p_prerequisite_work_item)
 order by w.id for share;

 select * into dependent from wayfound.work_items where workspace_id=p_workspace and id=p_dependent_work_item;
 select * into prerequisite from wayfound.work_items where workspace_id=p_workspace and id=p_prerequisite_work_item;
 if dependent.id is null or prerequisite.id is null then
  raise exception 'Work item unavailable' using errcode='23503';
 end if;

 if exists(select 1 from wayfound.work_item_dependencies d
  where d.workspace_id=p_workspace and d.dependent_work_item_id=p_dependent_work_item
    and d.prerequisite_work_item_id=p_prerequisite_work_item and d.removed_at is null) then
  raise exception 'Active dependency already exists' using errcode='55000';
 end if;

 if exists(
  with recursive dependency_chain(work_item_id) as (
   select d.prerequisite_work_item_id
   from wayfound.work_item_dependencies d
   where d.workspace_id=p_workspace and d.dependent_work_item_id=p_prerequisite_work_item and d.removed_at is null
   union
   select d.prerequisite_work_item_id
   from wayfound.work_item_dependencies d
   join dependency_chain c on d.dependent_work_item_id=c.work_item_id
   where d.workspace_id=p_workspace and d.removed_at is null
  )
  select 1 from dependency_chain where work_item_id=p_dependent_work_item
 ) then
  raise exception 'Dependency would create a cycle' using errcode='55000';
 end if;

 insert into wayfound.work_item_dependencies(
  workspace_id,dependent_work_item_id,prerequisite_work_item_id,dependent_revision,prerequisite_revision,
  reason,created_by_actor_id
 ) values(
  p_workspace,dependent.id,prerequisite.id,dependent.revision,prerequisite.revision,btrim(p_reason),actor
 ) returning id into dependency_id;

 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'work_item.dependency_added',dependency_id,p_request);
 insert into wayfound.work_item_dependency_create_requests(actor_id,request_id,workspace_id,payload,dependency_id)
 values(actor,p_request,p_workspace,body,dependency_id);
 return dependency_id;
end $$;

create function wayfound.remove_work_item_dependency(
 p_workspace uuid,p_dependency uuid,p_reason text,p_confirm boolean,p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 dependency wayfound.work_item_dependencies;
 previous wayfound.work_item_dependency_remove_requests;
 body jsonb;
begin
 if p_workspace is null or p_dependency is null or p_request is null or
    p_reason is null or length(btrim(p_reason)) not between 1 and 2000 or p_confirm is distinct from true then
  raise exception 'Invalid input' using errcode='22023';
 end if;

 select a.id into actor from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id for share of m;
 if actor is null then raise exception 'Access denied' using errcode='42501'; end if;

 body := jsonb_build_object('workspace',p_workspace,'dependency',p_dependency,'reason',btrim(p_reason),'confirm',true);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':' || p_request::text,0));
 select * into previous from wayfound.work_item_dependency_remove_requests where actor_id=actor and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists(select 1 from wayfound.memberships m where m.workspace_id=previous.workspace_id and m.actor_id=actor and m.role='owner') then
   raise exception 'Access denied' using errcode='42501';
  end if;
  return previous.dependency_id;
 end if;

 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('work-dependency-graph:' || p_workspace::text,0));
 select * into dependency from wayfound.work_item_dependencies
 where workspace_id=p_workspace and id=p_dependency for update;
 if not found then raise exception 'Dependency unavailable' using errcode='23503'; end if;
 if dependency.removed_at is not null then raise exception 'Dependency is already inactive' using errcode='55000'; end if;

 update wayfound.work_item_dependencies
 set removed_by_actor_id=actor,removed_reason=btrim(p_reason),removed_at=now()
 where id=dependency.id;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'work_item.dependency_removed',dependency.id,p_request);
 insert into wayfound.work_item_dependency_remove_requests(actor_id,request_id,workspace_id,payload,dependency_id)
 values(actor,p_request,p_workspace,body,dependency.id);
 return dependency.id;
end $$;

create or replace function wayfound.list_work_items(p_workspace uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare subject_id uuid := wayfound.subject();
begin
 if not exists (select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id) then return '[]'::jsonb; end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
 'id',w.id,'workspace_id',w.workspace_id,'release_id',w.release_id,'stage_number',w.stage_number,
 'title',w.title,'outcome',w.outcome,'completion_condition',w.completion_condition,
 'evidence_expectation',w.evidence_expectation,'owner_actor_id',w.owner_actor_id,'status',w.status,
 'revision',w.revision,'created_at',w.created_at,'updated_at',w.updated_at,
 'transitions',coalesce((select jsonb_agg(jsonb_build_object(
 'id',t.id,'actor_id',t.actor_id,'from_status',t.from_status,'to_status',t.to_status,
 'from_revision',t.from_revision,'to_revision',t.to_revision,'reason',t.reason,'created_at',t.created_at
 ) order by t.to_revision) from wayfound.work_item_transitions t where t.workspace_id=p_workspace and t.work_item_id=w.id),'[]'::jsonb),
 'ai_reviews',coalesce((select jsonb_agg(jsonb_build_object(
 'id',r.id,'workspace_id',r.workspace_id,'release_id',r.release_id,'stage_number',r.stage_number,
 'requested_by_actor_id',r.requested_by_actor_id,'target_kind',r.target_kind,'work_item_id',r.work_item_id,
 'target_revision',r.target_revision,'target_snapshot',r.target_snapshot,'purpose',r.purpose,'context_boundary',r.context_boundary,
 'status',r.status,'provider_id',r.provider_id,'provider_label',r.provider_label,'model',r.model,'advisory_result',r.advisory_result,
 'response_time_ms',r.response_time_ms,'prompt_tokens',r.prompt_tokens,'completion_tokens',r.completion_tokens,
 'reasoning_tokens',r.reasoning_tokens,'total_tokens',r.total_tokens,'tokens_per_second',r.tokens_per_second,
 'failure_detail',r.failure_detail,'completed_at',r.completed_at,'disposition',r.disposition,'disposition_note',r.disposition_note,
 'disposition_actor_id',r.disposition_actor_id,'disposition_at',r.disposition_at,'created_at',r.created_at,'updated_at',r.updated_at
 ) order by r.created_at desc,r.id) from wayfound.ai_reviews r where r.workspace_id=p_workspace and r.work_item_id=w.id),'[]'::jsonb),
 'dependencies',coalesce((select jsonb_agg(jsonb_build_object(
  'id',d.id,'workspace_id',d.workspace_id,'dependent_work_item_id',d.dependent_work_item_id,
  'prerequisite_work_item_id',d.prerequisite_work_item_id,'dependent_revision',d.dependent_revision,
  'prerequisite_revision',d.prerequisite_revision,'reason',d.reason,'created_by_actor_id',d.created_by_actor_id,
  'created_at',d.created_at,'dependent_title',dw.title,'dependent_status',dw.status,'dependent_current_revision',dw.revision,
  'prerequisite_title',pw.title,'prerequisite_status',pw.status,'prerequisite_current_revision',pw.revision
 ) order by d.created_at,d.id)
 from wayfound.work_item_dependencies d
 join wayfound.work_items dw on dw.workspace_id=d.workspace_id and dw.id=d.dependent_work_item_id
 join wayfound.work_items pw on pw.workspace_id=d.workspace_id and pw.id=d.prerequisite_work_item_id
 where d.workspace_id=p_workspace and d.dependent_work_item_id=w.id and d.removed_at is null),'[]'::jsonb),
 'dependents',coalesce((select jsonb_agg(jsonb_build_object(
  'id',d.id,'workspace_id',d.workspace_id,'dependent_work_item_id',d.dependent_work_item_id,
  'prerequisite_work_item_id',d.prerequisite_work_item_id,'dependent_revision',d.dependent_revision,
  'prerequisite_revision',d.prerequisite_revision,'reason',d.reason,'created_by_actor_id',d.created_by_actor_id,
  'created_at',d.created_at,'dependent_title',dw.title,'dependent_status',dw.status,'dependent_current_revision',dw.revision,
  'prerequisite_title',pw.title,'prerequisite_status',pw.status,'prerequisite_current_revision',pw.revision
 ) order by d.created_at,d.id)
 from wayfound.work_item_dependencies d
 join wayfound.work_items dw on dw.workspace_id=d.workspace_id and dw.id=d.dependent_work_item_id
 join wayfound.work_items pw on pw.workspace_id=d.workspace_id and pw.id=d.prerequisite_work_item_id
 where d.workspace_id=p_workspace and d.prerequisite_work_item_id=w.id and d.removed_at is null),'[]'::jsonb)
 ) order by w.created_at desc,w.id) from wayfound.work_items w where w.workspace_id=p_workspace),'[]'::jsonb);
end $$;

revoke all on table wayfound.work_item_dependencies,wayfound.work_item_dependency_create_requests,wayfound.work_item_dependency_remove_requests from public,anon,authenticated;
revoke all on function wayfound.add_work_item_dependency(uuid,uuid,uuid,text,boolean,uuid) from public,anon,authenticated;
revoke all on function wayfound.remove_work_item_dependency(uuid,uuid,text,boolean,uuid) from public,anon,authenticated;
grant execute on function wayfound.add_work_item_dependency(uuid,uuid,uuid,text,boolean,uuid) to authenticated;
grant execute on function wayfound.remove_work_item_dependency(uuid,uuid,text,boolean,uuid) to authenticated;

create function public.add_work_item_dependency(p_workspace uuid,p_dependent_work_item uuid,p_prerequisite_work_item uuid,p_reason text,p_confirm boolean,p_request uuid)
 returns uuid language sql security invoker set search_path = '' as $$
 select wayfound.add_work_item_dependency(p_workspace,p_dependent_work_item,p_prerequisite_work_item,p_reason,p_confirm,p_request)
$$;
create function public.remove_work_item_dependency(p_workspace uuid,p_dependency uuid,p_reason text,p_confirm boolean,p_request uuid)
 returns uuid language sql security invoker set search_path = '' as $$
 select wayfound.remove_work_item_dependency(p_workspace,p_dependency,p_reason,p_confirm,p_request)
$$;
revoke all on function public.add_work_item_dependency(uuid,uuid,uuid,text,boolean,uuid) from public,anon;
revoke all on function public.remove_work_item_dependency(uuid,uuid,text,boolean,uuid) from public,anon;
grant execute on function public.add_work_item_dependency(uuid,uuid,uuid,text,boolean,uuid) to authenticated;
grant execute on function public.remove_work_item_dependency(uuid,uuid,text,boolean,uuid) to authenticated;
