-- Withdraw an owner product acceptance criterion without deleting its record or evidence.
alter table wayfound.acceptance_criteria
  add column lifecycle text not null default 'Active' check (lifecycle in ('Active','Withdrawn'));

create table wayfound.criterion_withdrawals (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references wayfound.workspaces(id),
 requirement_id uuid not null references wayfound.requirements(id),
 criterion_id uuid not null unique references wayfound.acceptance_criteria(id),
 actor_id uuid not null references wayfound.actors(id),
 reason text not null check (length(btrim(reason)) between 1 and 2000),
 from_requirement_revision integer not null check (from_requirement_revision > 0),
 to_requirement_revision integer not null check (to_requirement_revision = from_requirement_revision + 1),
 from_criterion_revision integer not null check (from_criterion_revision > 0),
 to_criterion_revision integer not null check (to_criterion_revision = from_criterion_revision + 1),
 created_at timestamptz not null default now()
);
create index criterion_withdrawals_workspace on wayfound.criterion_withdrawals(workspace_id);

create table wayfound.criterion_withdraw_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 payload jsonb not null,
 withdrawal_id uuid not null references wayfound.criterion_withdrawals(id),
 primary key(actor_id,request_id)
);
create index criterion_withdraw_requests_workspace on wayfound.criterion_withdraw_requests(workspace_id);

alter table wayfound.criterion_withdrawals enable row level security;
alter table wayfound.criterion_withdraw_requests enable row level security;
create policy criterion_withdrawal_member on wayfound.criterion_withdrawals for select to authenticated using(wayfound.member(workspace_id));
create policy criterion_withdraw_request_member on wayfound.criterion_withdraw_requests for select to authenticated using(wayfound.member(workspace_id));
revoke all on wayfound.criterion_withdrawals, wayfound.criterion_withdraw_requests from public,anon,authenticated;

create function wayfound.withdraw_owner_criterion(
 p_workspace uuid,
 p_requirement uuid,
 p_criterion uuid,
 p_expected_requirement_revision integer,
 p_expected_criterion_revision integer,
 p_reason text,
 p_confirm boolean,
 p_request uuid
) returns uuid language plpgsql security definer set search_path='' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 target_requirement wayfound.requirements;
 target_criterion wayfound.acceptance_criteria;
 previous wayfound.criterion_withdraw_requests;
 body jsonb;
 withdrawal uuid := gen_random_uuid();
 active_count integer;
begin
 if p_workspace is null or p_requirement is null or p_criterion is null or p_request is null or
    p_expected_requirement_revision is null or p_expected_requirement_revision < 1 or
    p_expected_criterion_revision is null or p_expected_criterion_revision < 1 or
    p_reason is null or length(btrim(p_reason)) not between 1 and 2000 or
    p_confirm is distinct from true then
  raise exception 'Invalid input' using errcode='22023';
 end if;

 select a.id into actor
 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id
 for share of m;
 if actor is null then raise exception 'Access denied' using errcode='42501'; end if;

 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':criterion-withdraw:' || p_request::text,0));

 select * into target_requirement
 from wayfound.requirements
 where workspace_id=p_workspace and id=p_requirement
 for update;
 if not found then raise exception 'Requirement unavailable' using errcode='23503'; end if;
 if target_requirement.kind <> 'product' or target_requirement.authority <> 'owner' or target_requirement.status <> 'Approved' then
  raise exception 'Owner product authority required' using errcode='42501';
 end if;

 select * into target_criterion
 from wayfound.acceptance_criteria
 where workspace_id=p_workspace and requirement_id=p_requirement and id=p_criterion
 for update;
 if not found then raise exception 'Acceptance criterion unavailable' using errcode='23503'; end if;

 body := jsonb_build_object(
  'workspace',p_workspace,
  'requirement',p_requirement,
  'criterion',p_criterion,
  'requirement_revision',p_expected_requirement_revision,
  'criterion_revision',p_expected_criterion_revision,
  'reason',btrim(p_reason)
 );
 select * into previous
 from wayfound.criterion_withdraw_requests
 where actor_id=actor and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  return previous.withdrawal_id;
 end if;

 if target_requirement.revision <> p_expected_requirement_revision then
  raise exception 'Requirement changed' using errcode='55000';
 end if;
 if target_criterion.revision <> p_expected_criterion_revision then
  raise exception 'Acceptance criterion changed' using errcode='55000';
 end if;
 if target_criterion.lifecycle <> 'Active' then
  raise exception 'Acceptance criterion is not active' using errcode='55000';
 end if;

 select count(*)::integer into active_count
 from wayfound.acceptance_criteria
 where requirement_id=p_requirement and lifecycle='Active';
 if active_count <= 1 then
  raise exception 'Approved product requirement must keep one active criterion' using errcode='55000';
 end if;

 update wayfound.acceptance_criteria
 set lifecycle='Withdrawn',revision=revision+1,updated_at=now()
 where id=p_criterion;
 update wayfound.requirements
 set revision=revision+1,updated_at=now()
 where id=p_requirement;

 insert into wayfound.criterion_withdrawals(
  id,workspace_id,requirement_id,criterion_id,actor_id,reason,
  from_requirement_revision,to_requirement_revision,from_criterion_revision,to_criterion_revision
 ) values(
  withdrawal,p_workspace,p_requirement,p_criterion,actor,btrim(p_reason),
  target_requirement.revision,target_requirement.revision+1,target_criterion.revision,target_criterion.revision+1
 );
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'criterion.withdrawn',p_criterion,p_request);
 insert into wayfound.criterion_withdraw_requests(actor_id,request_id,workspace_id,payload,withdrawal_id)
 values(actor,p_request,p_workspace,body,withdrawal);
 return withdrawal;
end $$;

revoke all on function wayfound.withdraw_owner_criterion(uuid,uuid,uuid,integer,integer,text,boolean,uuid) from public,anon,authenticated;
grant execute on function wayfound.withdraw_owner_criterion(uuid,uuid,uuid,integer,integer,text,boolean,uuid) to authenticated;
create function public.withdraw_owner_criterion(
 p_workspace uuid,p_requirement uuid,p_criterion uuid,p_expected_requirement_revision integer,
 p_expected_criterion_revision integer,p_reason text,p_confirm boolean,p_request uuid
) returns uuid language sql security invoker set search_path='' as $$
 select wayfound.withdraw_owner_criterion(
  p_workspace,p_requirement,p_criterion,p_expected_requirement_revision,
  p_expected_criterion_revision,p_reason,p_confirm,p_request
 )
$$;
revoke all on function public.withdraw_owner_criterion(uuid,uuid,uuid,integer,integer,text,boolean,uuid) from public,anon;
grant execute on function public.withdraw_owner_criterion(uuid,uuid,uuid,integer,integer,text,boolean,uuid) to authenticated;

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
     'lifecycle',c.lifecycle,
     'addition',(select jsonb_build_object(
       'reason',a.reason,'from_revision',a.from_revision,'to_revision',a.to_revision,
       'actor_id',a.actor_id,'created_at',a.created_at
      ) from wayfound.criterion_additions a where a.criterion_id=c.id),
     'withdrawal',(select jsonb_build_object(
       'reason',w.reason,
       'from_requirement_revision',w.from_requirement_revision,
       'to_requirement_revision',w.to_requirement_revision,
       'from_criterion_revision',w.from_criterion_revision,
       'to_criterion_revision',w.to_criterion_revision,
       'actor_id',w.actor_id,'created_at',w.created_at
      ) from wayfound.criterion_withdrawals w where w.criterion_id=c.id),
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

create or replace function wayfound.record_criterion_evidence(
 p_workspace uuid,
 p_acceptance_criterion uuid,
 p_title text,
 p_result text,
 p_source_note text,
 p_effect text,
 p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 requirement uuid;
 release uuid;
 stage integer;
 requirement_revision integer;
 criterion_revision integer;
 evidence_id uuid := gen_random_uuid();
 previous wayfound.evidence_requests;
 body jsonb;
begin
 if p_workspace is null or p_acceptance_criterion is null or p_request is null or
    p_title is null or length(btrim(p_title)) not between 1 and 160 or
    p_result is null or length(btrim(p_result)) not between 1 and 4000 or
    p_source_note is null or length(btrim(p_source_note)) not between 1 and 2000 or
    p_effect is null or p_effect not in ('Supports','Challenges','Inconclusive') then
  raise exception 'Invalid input' using errcode='22023';
 end if;

 select a.id into actor
 from wayfound.memberships m
 join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id;
 if actor is null then raise exception 'Access denied' using errcode='42501'; end if;

 body := jsonb_build_object(
  'workspace',p_workspace,
  'acceptance_criterion',p_acceptance_criterion,
  'title',btrim(p_title),
  'result',btrim(p_result),
  'source_note',btrim(p_source_note),
  'effect',p_effect
 );

 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':' || p_request::text,0));
 select * into previous from wayfound.evidence_requests where actor_id=actor and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists (
   select 1 from wayfound.memberships m
   where m.workspace_id=previous.workspace_id and m.actor_id=actor and m.role='owner'
  ) then raise exception 'Access denied' using errcode='42501'; end if;
  return previous.evidence_id;
 end if;

 select r.id,r.release_id,r.stage_number,r.revision,c.revision
 into requirement,release,stage,requirement_revision,criterion_revision
 from wayfound.acceptance_criteria c
 join wayfound.requirements r on r.id=c.requirement_id and r.workspace_id=c.workspace_id
 where c.id=p_acceptance_criterion and c.workspace_id=p_workspace and c.lifecycle='Active'
 for share of c,r;
 if requirement is null then raise exception 'Acceptance criterion unavailable' using errcode='23503'; end if;

 insert into wayfound.evidence_records(
  id,workspace_id,release_id,stage_number,requirement_id,requirement_revision,
  acceptance_criterion_id,criterion_revision,title,result,source_note,effect,recorded_by_actor_id
 ) values(
  evidence_id,p_workspace,release,stage,requirement,requirement_revision,
  p_acceptance_criterion,criterion_revision,btrim(p_title),btrim(p_result),btrim(p_source_note),p_effect,actor
 );
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'evidence.recorded',evidence_id,p_request);
 insert into wayfound.evidence_requests(actor_id,request_id,workspace_id,payload,evidence_id)
 values(actor,p_request,p_workspace,body,evidence_id);
 return evidence_id;
end $$;