-- Add owner-recorded implementation completion without implying verification.
alter table wayfound.work_items drop constraint work_items_status_check;
alter table wayfound.work_items add constraint work_items_status_check
 check(status in ('Proposed','Approved','In progress','Blocked','Implemented'));

alter table wayfound.work_item_transitions drop constraint if exists work_item_transitions_check;
alter table wayfound.work_item_transitions drop constraint if exists work_item_transitions_state_check;
alter table wayfound.work_item_transitions add constraint work_item_transitions_state_check
 check ((from_status='Proposed' and to_status='Approved') or
        (from_status='Approved' and to_status='In progress') or
        (from_status='In progress' and to_status='Blocked') or
        (from_status='Blocked' and to_status='In progress') or
        (from_status='In progress' and to_status='Implemented'));

create or replace function wayfound.transition_work_item(
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
    p_target_status is null or p_target_status not in ('Approved','In progress','Blocked','Implemented') or
    p_reason is null or length(btrim(p_reason)) not between 1 and 2000 or p_confirm is distinct from true then
  raise exception 'Invalid input' using errcode='22023';
 end if;

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
    (target.status='Blocked' and p_target_status='In progress') or
    (target.status='In progress' and p_target_status='Implemented')) then
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