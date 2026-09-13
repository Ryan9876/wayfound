-- Owner work state; ADR-0002 transactions and ADR-0003 authority remain intact.
alter table wayfound.work_items drop constraint work_items_status_check;
alter table wayfound.work_items add constraint work_items_status_check
 check(status in ('Proposed','Approved','In progress','Blocked'));
alter table wayfound.work_items add constraint work_items_workspace_id_id_key unique(workspace_id,id);

create table wayfound.work_item_transitions (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null,
 work_item_id uuid not null,
 actor_id uuid not null references wayfound.actors(id),
 from_status text not null,
 to_status text not null,
 from_revision integer not null check(from_revision > 0),
 to_revision integer not null check(to_revision = from_revision + 1),
 reason text not null check(length(btrim(reason)) between 1 and 2000),
 created_at timestamptz not null default now(),
 foreign key(workspace_id,work_item_id) references wayfound.work_items(workspace_id,id),
 unique(work_item_id,to_revision),
 check ((from_status='Proposed' and to_status='Approved') or
        (from_status='Approved' and to_status='In progress') or
        (from_status='In progress' and to_status='Blocked') or
        (from_status='Blocked' and to_status='In progress'))
);
create index work_item_transition_workspace on wayfound.work_item_transitions(workspace_id);
create index work_item_transition_actor on wayfound.work_item_transitions(actor_id);
create table wayfound.work_item_transition_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 payload jsonb not null,
 transition_id uuid not null references wayfound.work_item_transitions(id),
 primary key(actor_id,request_id)
);
create index work_item_transition_request_workspace on wayfound.work_item_transition_requests(workspace_id);
create index work_item_transition_request_result on wayfound.work_item_transition_requests(transition_id);
alter table wayfound.work_item_transitions enable row level security;
alter table wayfound.work_item_transition_requests enable row level security;
-- No direct access is granted; policies remain defense in depth.
create policy work_transition_owner on wayfound.work_item_transitions for select to authenticated
 using(exists(select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=work_item_transitions.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()));
create policy work_transition_request_owner on wayfound.work_item_transition_requests for select to authenticated
 using(exists(select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=work_item_transition_requests.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()));

create function wayfound.transition_work_item(
 p_workspace uuid,p_work_item uuid,p_expected_revision integer,p_target_status text,
 p_reason text,p_confirm boolean,p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 target wayfound.work_items;
 previous wayfound.work_item_transition_requests;
 body jsonb;
 transition_id uuid;
begin
 if p_workspace is null or p_work_item is null or p_request is null or
    p_expected_revision is null or p_expected_revision < 1 or
    p_target_status is null or p_target_status not in ('Approved','In progress','Blocked') or
    p_reason is null or length(btrim(p_reason)) not between 1 and 2000 or p_confirm is distinct from true then
  raise exception 'Invalid input' using errcode='22023';
 end if;
 -- A revocation and a mutation serialize on the actual membership row.
 select a.id into actor from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id for share of m;
 if actor is null then raise exception 'Access denied' using errcode='42501'; end if;
 body := jsonb_build_object('workspace',p_workspace,'work_item',p_work_item,
 'expected_revision',p_expected_revision,'target_status',p_target_status,'reason',btrim(p_reason),'confirm',p_confirm);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':' || p_request::text,0));
 select * into target from wayfound.work_items where workspace_id=p_workspace and id=p_work_item for update;
 if not found then raise exception 'Work item unavailable' using errcode='23503'; end if;
 if target.owner_actor_id <> actor then raise exception 'Access denied' using errcode='42501'; end if;
 select * into previous from wayfound.work_item_transition_requests where actor_id=actor and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  return previous.transition_id;
 end if;
 if target.revision <> p_expected_revision or not (
    (target.status='Proposed' and p_target_status='Approved') or
    (target.status='Approved' and p_target_status='In progress') or
    (target.status='In progress' and p_target_status='Blocked') or
    (target.status='Blocked' and p_target_status='In progress')) then
  raise exception 'Work state changed or transition not allowed' using errcode='55000';
 end if;
 update wayfound.work_items set status=p_target_status,revision=revision+1,updated_at=now() where id=target.id;
 insert into wayfound.work_item_transitions(workspace_id,work_item_id,actor_id,from_status,to_status,from_revision,to_revision,reason)
 values(p_workspace,target.id,actor,target.status,p_target_status,target.revision,target.revision+1,btrim(p_reason)) returning id into transition_id;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'work_item.transitioned',transition_id,p_request);
 insert into wayfound.work_item_transition_requests(actor_id,request_id,workspace_id,payload,transition_id)
 values(actor,p_request,p_workspace,body,transition_id);
 return transition_id;
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
 ) order by t.to_revision) from wayfound.work_item_transitions t where t.workspace_id=p_workspace and t.work_item_id=w.id),'[]'::jsonb)
 ) order by w.created_at desc,w.id) from wayfound.work_items w where w.workspace_id=p_workspace),'[]'::jsonb);
end $$;

revoke all on table wayfound.work_item_transitions,wayfound.work_item_transition_requests from public,anon,authenticated;
revoke all on function wayfound.transition_work_item(uuid,uuid,integer,text,text,boolean,uuid) from public,anon,authenticated;
grant execute on function wayfound.transition_work_item(uuid,uuid,integer,text,text,boolean,uuid) to authenticated;
create function public.transition_work_item(p_workspace uuid,p_work_item uuid,p_expected_revision integer,p_target_status text,p_reason text,p_confirm boolean,p_request uuid)
 returns uuid language sql security invoker set search_path = '' as $$
 select wayfound.transition_work_item(p_workspace,p_work_item,p_expected_revision,p_target_status,p_reason,p_confirm,p_request)
$$;
revoke all on function public.transition_work_item(uuid,uuid,integer,text,text,boolean,uuid) from public,anon;
grant execute on function public.transition_work_item(uuid,uuid,integer,text,text,boolean,uuid) to authenticated;
