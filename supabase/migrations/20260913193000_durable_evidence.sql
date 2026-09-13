-- Durable criterion evidence extends the validated requirement-to-criterion boundary.
alter table wayfound.acceptance_criteria
  add constraint acceptance_criteria_workspace_id_key unique(workspace_id, id);

create table wayfound.evidence_records (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null,
 release_id uuid not null,
 stage_number integer not null check (stage_number between 1 and 15),
 requirement_id uuid not null,
 requirement_revision integer not null check (requirement_revision > 0),
 acceptance_criterion_id uuid not null,
 criterion_revision integer not null check (criterion_revision > 0),
 title text not null check (length(btrim(title)) between 1 and 160),
 result text not null check (length(btrim(result)) between 1 and 4000),
 source_note text not null check (length(btrim(source_note)) between 1 and 2000),
 effect text not null check (effect in ('Supports','Challenges','Inconclusive')),
 recorded_by_actor_id uuid not null references wayfound.actors(id),
 revision integer not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(workspace_id, release_id) references wayfound.releases(workspace_id, id),
 foreign key(release_id, stage_number) references wayfound.release_stages(release_id, stage_number),
 foreign key(workspace_id, requirement_id) references wayfound.requirements(workspace_id, id),
 foreign key(workspace_id, acceptance_criterion_id) references wayfound.acceptance_criteria(workspace_id, id),
 unique(workspace_id, id)
);
create index evidence_workspace_created on wayfound.evidence_records(workspace_id, created_at desc);
create index evidence_criterion_created on wayfound.evidence_records(acceptance_criterion_id, created_at, id);

create table wayfound.evidence_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 payload jsonb not null,
 evidence_id uuid not null references wayfound.evidence_records(id),
 primary key(actor_id, request_id)
);

alter table wayfound.evidence_records enable row level security;
create policy evidence_member on wayfound.evidence_records for select to authenticated using(wayfound.member(workspace_id));
alter table wayfound.evidence_requests enable row level security;
create policy evidence_request_member on wayfound.evidence_requests for select to authenticated using(wayfound.member(workspace_id));

create function wayfound.list_evidence(p_workspace uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare subject_id uuid := wayfound.subject();
begin
 if not exists (
  select 1 from wayfound.memberships m
  join wayfound.actors a on a.id=m.actor_id
  where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id
 ) then return '[]'::jsonb; end if;
 return coalesce((
  select jsonb_agg(jsonb_build_object(
   'id',e.id,
   'workspace_id',e.workspace_id,
   'release_id',e.release_id,
   'stage_number',e.stage_number,
   'requirement_id',e.requirement_id,
   'requirement_revision',e.requirement_revision,
   'acceptance_criterion_id',e.acceptance_criterion_id,
   'criterion_revision',e.criterion_revision,
   'title',e.title,
   'result',e.result,
   'source_note',e.source_note,
   'effect',e.effect,
   'recorded_by_actor_id',e.recorded_by_actor_id,
   'revision',e.revision,
   'created_at',e.created_at,
   'updated_at',e.updated_at
  ) order by e.created_at desc,e.id)
  from wayfound.evidence_records e where e.workspace_id=p_workspace
 ),'[]'::jsonb);
end $$;

create function wayfound.record_criterion_evidence(
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
 where c.id=p_acceptance_criterion and c.workspace_id=p_workspace;
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

revoke all on table wayfound.evidence_records, wayfound.evidence_requests from public, anon, authenticated;
revoke all on function wayfound.list_evidence(uuid), wayfound.record_criterion_evidence(uuid,uuid,text,text,text,text,uuid) from public, anon, authenticated;
grant execute on function wayfound.list_evidence(uuid), wayfound.record_criterion_evidence(uuid,uuid,text,text,text,text,uuid) to authenticated;

create function public.list_evidence(p_workspace uuid) returns jsonb language sql security invoker set search_path = '' as $$select wayfound.list_evidence(p_workspace)$$;
create function public.record_criterion_evidence(p_workspace uuid,p_acceptance_criterion uuid,p_title text,p_result text,p_source_note text,p_effect text,p_request uuid) returns uuid language sql security invoker set search_path = '' as $$select wayfound.record_criterion_evidence(p_workspace,p_acceptance_criterion,p_title,p_result,p_source_note,p_effect,p_request)$$;
revoke all on function public.list_evidence(uuid), public.record_criterion_evidence(uuid,uuid,text,text,text,text,uuid) from public, anon;
grant execute on function public.list_evidence(uuid), public.record_criterion_evidence(uuid,uuid,text,text,text,text,uuid) to authenticated;
