-- Assignment-scoped specialist review preserves the owner-only workspace membership boundary.

create table wayfound.specialist_review_assignments (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references wayfound.workspaces(id),
 artifact_id uuid not null,
 artifact_version_id uuid not null,
 reviewer_actor_id uuid not null references wayfound.actors(id),
 assigned_by_actor_id uuid not null references wayfound.actors(id),
 requested_competence text not null check (length(btrim(requested_competence)) between 1 and 500),
 review_question text not null check (length(btrim(review_question)) between 1 and 2000),
 status text not null default 'Pending' check (status in ('Pending','Reviewed')),
 revision integer not null default 1 check (revision > 0),
 assigned_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(workspace_id, artifact_id, artifact_version_id)
   references wayfound.artifact_versions(workspace_id, artifact_id, id),
 unique(artifact_version_id, reviewer_actor_id)
);
create index specialist_review_assignment_owner on wayfound.specialist_review_assignments(workspace_id, assigned_at desc);
create index specialist_review_assignment_reviewer on wayfound.specialist_review_assignments(reviewer_actor_id, assigned_at desc);

create table wayfound.specialist_reviews (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null unique references wayfound.specialist_review_assignments(id),
 workspace_id uuid not null references wayfound.workspaces(id),
 artifact_id uuid not null,
 artifact_version_id uuid not null,
 reviewer_actor_id uuid not null references wayfound.actors(id),
 reviewer_name text not null check (length(btrim(reviewer_name)) between 1 and 160),
 competence_statement text not null check (length(btrim(competence_statement)) between 1 and 500),
 conclusion text not null check (conclusion in ('No blocking finding','Changes required','Advisory')),
 summary text not null check (length(btrim(summary)) between 1 and 4000),
 findings text not null check (length(btrim(findings)) between 1 and 4000),
 artifact_revision integer not null check (artifact_revision > 0),
 artifact_version_revision integer not null check (artifact_version_revision > 0),
 revision integer not null default 1 check (revision > 0),
 reviewed_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(workspace_id, artifact_id, artifact_version_id)
   references wayfound.artifact_versions(workspace_id, artifact_id, id)
);
create index specialist_reviews_workspace on wayfound.specialist_reviews(workspace_id, reviewed_at desc);
create index specialist_reviews_reviewer on wayfound.specialist_reviews(reviewer_actor_id, reviewed_at desc);

create table wayfound.specialist_assignment_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 payload jsonb not null,
 assignment_id uuid not null references wayfound.specialist_review_assignments(id),
 primary key(actor_id, request_id)
);

create table wayfound.specialist_review_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 assignment_id uuid not null references wayfound.specialist_review_assignments(id),
 payload jsonb not null,
 review_id uuid not null references wayfound.specialist_reviews(id),
 primary key(actor_id, request_id)
);

alter table wayfound.specialist_review_assignments enable row level security;
create policy specialist_assignment_owner on wayfound.specialist_review_assignments for select to authenticated
 using(exists(
  select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
  where m.workspace_id=specialist_review_assignments.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()
 ));
create policy specialist_assignment_reviewer on wayfound.specialist_review_assignments for select to authenticated
 using(exists(
  select 1 from wayfound.actors a
  where a.id=specialist_review_assignments.reviewer_actor_id and a.provider_subject=wayfound.subject()
 ));
alter table wayfound.specialist_reviews enable row level security;
create policy specialist_review_owner on wayfound.specialist_reviews for select to authenticated
 using(exists(
  select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
  where m.workspace_id=specialist_reviews.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()
 ));
create policy specialist_review_reviewer on wayfound.specialist_reviews for select to authenticated
 using(exists(
  select 1 from wayfound.actors a
  where a.id=specialist_reviews.reviewer_actor_id and a.provider_subject=wayfound.subject()
 ));
alter table wayfound.specialist_assignment_requests enable row level security;
create policy specialist_assignment_request_owner on wayfound.specialist_assignment_requests for select to authenticated
 using(exists(
  select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
  where m.workspace_id=specialist_assignment_requests.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()
 ));
alter table wayfound.specialist_review_requests enable row level security;
create policy specialist_review_request_actor on wayfound.specialist_review_requests for select to authenticated
 using(exists(
  select 1 from wayfound.actors a
  where a.id=specialist_review_requests.actor_id and a.provider_subject=wayfound.subject()
 ));

-- Establishing a reviewer identity creates only an actor. It creates no workspace membership.
create function wayfound.ensure_specialist_reviewer_identity() returns uuid
language plpgsql security definer set search_path = '' as $$
declare subject_id uuid := wayfound.subject(); actor uuid;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('reviewer:' || subject_id::text,0));
 insert into wayfound.actors(provider_subject) values(subject_id) on conflict(provider_subject) do nothing;
 select id into actor from wayfound.actors where provider_subject=subject_id;
 if actor is null then raise exception 'Reviewer identity unavailable' using errcode='42501'; end if;
 return actor;
end $$;

create function wayfound.list_owner_specialist_reviews(p_workspace uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare subject_id uuid := wayfound.subject();
begin
 if not exists(
  select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
  where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id
 ) then return '[]'::jsonb; end if;
 return coalesce((
  select jsonb_agg(jsonb_build_object(
   'id',sa.id,
   'workspace_id',sa.workspace_id,
   'artifact_id',sa.artifact_id,
   'artifact_version_id',sa.artifact_version_id,
   'reviewer_actor_id',sa.reviewer_actor_id,
   'assigned_by_actor_id',sa.assigned_by_actor_id,
   'requested_competence',sa.requested_competence,
   'review_question',sa.review_question,
   'status',sa.status,
   'revision',sa.revision,
   'assigned_at',sa.assigned_at,
   'updated_at',sa.updated_at,
   'review',(
    select jsonb_build_object(
     'id',sr.id,
     'assignment_id',sr.assignment_id,
     'workspace_id',sr.workspace_id,
     'artifact_id',sr.artifact_id,
     'artifact_version_id',sr.artifact_version_id,
     'reviewer_actor_id',sr.reviewer_actor_id,
     'reviewer_name',sr.reviewer_name,
     'competence_statement',sr.competence_statement,
     'conclusion',sr.conclusion,
     'summary',sr.summary,
     'findings',sr.findings,
     'artifact_revision',sr.artifact_revision,
     'artifact_version_revision',sr.artifact_version_revision,
     'revision',sr.revision,
     'reviewed_at',sr.reviewed_at,
     'updated_at',sr.updated_at
    ) from wayfound.specialist_reviews sr where sr.assignment_id=sa.id
   )
  ) order by sa.assigned_at desc,sa.id)
  from wayfound.specialist_review_assignments sa where sa.workspace_id=p_workspace
 ),'[]'::jsonb);
end $$;

create function wayfound.list_my_specialist_reviews() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare subject_id uuid := wayfound.subject(); actor uuid;
begin
 select id into actor from wayfound.actors where provider_subject=subject_id;
 if actor is null then return '[]'::jsonb; end if;
 return coalesce((
  select jsonb_agg(jsonb_build_object(
   'id',sa.id,
   'workspace_id',sa.workspace_id,
   'workspace_name',w.name,
   'artifact_id',sa.artifact_id,
   'artifact_title',a.title,
   'artifact_kind',a.kind,
   'artifact_version_id',sa.artifact_version_id,
   'version_number',v.version_number,
   'version_lifecycle',v.lifecycle,
   'artifact_summary',v.summary,
   'reference_label',v.reference_label,
   'reference_url',v.reference_url,
   'requested_competence',sa.requested_competence,
   'review_question',sa.review_question,
   'status',sa.status,
   'revision',sa.revision,
   'assigned_at',sa.assigned_at,
   'review',(
    select jsonb_build_object(
     'id',sr.id,
     'assignment_id',sr.assignment_id,
     'workspace_id',sr.workspace_id,
     'artifact_id',sr.artifact_id,
     'artifact_version_id',sr.artifact_version_id,
     'reviewer_actor_id',sr.reviewer_actor_id,
     'reviewer_name',sr.reviewer_name,
     'competence_statement',sr.competence_statement,
     'conclusion',sr.conclusion,
     'summary',sr.summary,
     'findings',sr.findings,
     'artifact_revision',sr.artifact_revision,
     'artifact_version_revision',sr.artifact_version_revision,
     'revision',sr.revision,
     'reviewed_at',sr.reviewed_at,
     'updated_at',sr.updated_at
    ) from wayfound.specialist_reviews sr where sr.assignment_id=sa.id
   )
  ) order by sa.assigned_at desc,sa.id)
  from wayfound.specialist_review_assignments sa
  join wayfound.workspaces w on w.id=sa.workspace_id
  join wayfound.artifacts a on a.workspace_id=sa.workspace_id and a.id=sa.artifact_id
  join wayfound.artifact_versions v on v.workspace_id=sa.workspace_id and v.artifact_id=sa.artifact_id and v.id=sa.artifact_version_id
  where sa.reviewer_actor_id=actor
 ),'[]'::jsonb);
end $$;

create function wayfound.assign_specialist_review(
 p_workspace uuid,
 p_artifact uuid,
 p_version uuid,
 p_reviewer uuid,
 p_requested_competence text,
 p_review_question text,
 p_scope_confirm boolean,
 p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 owner_actor uuid;
 previous wayfound.specialist_assignment_requests;
 body jsonb;
 assignment uuid;
 current_accepted uuid;
 target_lifecycle text;
begin
 if p_workspace is null or p_artifact is null or p_version is null or p_reviewer is null or p_request is null or
    p_scope_confirm is distinct from true or
    p_requested_competence is null or length(btrim(p_requested_competence)) not between 1 and 500 or
    p_review_question is null or length(btrim(p_review_question)) not between 1 and 2000 then
  raise exception 'Invalid input' using errcode='22023';
 end if;

 select a.id into owner_actor
 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id;
 if owner_actor is null then raise exception 'Access denied' using errcode='42501'; end if;
 if owner_actor=p_reviewer then raise exception 'Owner cannot self-review' using errcode='22023'; end if;
 if not exists(select 1 from wayfound.actors a where a.id=p_reviewer) then
  raise exception 'Reviewer unavailable' using errcode='23503';
 end if;

 body := jsonb_build_object(
  'workspace',p_workspace,
  'artifact',p_artifact,
  'version',p_version,
  'reviewer',p_reviewer,
  'requested_competence',btrim(p_requested_competence),
  'review_question',btrim(p_review_question),
  'scope_confirm',true
 );

 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_actor::text || ':' || p_request::text,0));
 select * into previous from wayfound.specialist_assignment_requests
 where actor_id=owner_actor and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists(select 1 from wayfound.memberships m where m.workspace_id=previous.workspace_id and m.actor_id=owner_actor and m.role='owner') then
   raise exception 'Access denied' using errcode='42501';
  end if;
  return previous.assignment_id;
 end if;

 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('specialist-assignment:' || p_version::text || ':' || p_reviewer::text,0));
 select a.accepted_version_id,v.lifecycle into current_accepted,target_lifecycle
 from wayfound.artifacts a
 join wayfound.artifact_versions v on v.workspace_id=a.workspace_id and v.artifact_id=a.id
 where a.workspace_id=p_workspace and a.id=p_artifact and v.id=p_version
 for update of a,v;
 if not found then raise exception 'Artifact version unavailable' using errcode='23503'; end if;
 if current_accepted is distinct from p_version or target_lifecycle <> 'Accepted' then
  raise exception 'Artifact version is not current accepted direction' using errcode='55000';
 end if;
 if exists(select 1 from wayfound.specialist_review_assignments sa where sa.artifact_version_id=p_version and sa.reviewer_actor_id=p_reviewer) then
  raise exception 'Review assignment already exists' using errcode='55000';
 end if;

 insert into wayfound.specialist_review_assignments(
  workspace_id,artifact_id,artifact_version_id,reviewer_actor_id,assigned_by_actor_id,requested_competence,review_question
 ) values(
  p_workspace,p_artifact,p_version,p_reviewer,owner_actor,btrim(p_requested_competence),btrim(p_review_question)
 ) returning id into assignment;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,owner_actor,'specialist_review.assigned',assignment,p_request);
 insert into wayfound.specialist_assignment_requests(actor_id,request_id,workspace_id,payload,assignment_id)
 values(owner_actor,p_request,p_workspace,body,assignment);
 return assignment;
end $$;

create function wayfound.record_specialist_review(
 p_assignment uuid,
 p_reviewer_name text,
 p_competence_statement text,
 p_conclusion text,
 p_summary text,
 p_findings text,
 p_competence_confirm boolean,
 p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 reviewer uuid;
 previous wayfound.specialist_review_requests;
 assignment wayfound.specialist_review_assignments;
 body jsonb;
 review uuid;
 accepted_version uuid;
 artifact_rev integer;
 version_rev integer;
 version_lifecycle text;
begin
 if p_assignment is null or p_request is null or p_competence_confirm is distinct from true or
    p_reviewer_name is null or length(btrim(p_reviewer_name)) not between 1 and 160 or
    p_competence_statement is null or length(btrim(p_competence_statement)) not between 1 and 500 or
    p_conclusion not in ('No blocking finding','Changes required','Advisory') or
    p_summary is null or length(btrim(p_summary)) not between 1 and 4000 or
    p_findings is null or length(btrim(p_findings)) not between 1 and 4000 then
  raise exception 'Invalid input' using errcode='22023';
 end if;

 select id into reviewer from wayfound.actors where provider_subject=subject_id;
 if reviewer is null then raise exception 'Access denied' using errcode='42501'; end if;

 body := jsonb_build_object(
  'assignment',p_assignment,
  'reviewer_name',btrim(p_reviewer_name),
  'competence_statement',btrim(p_competence_statement),
  'conclusion',p_conclusion,
  'summary',btrim(p_summary),
  'findings',btrim(p_findings),
  'competence_confirm',true
 );

 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(reviewer::text || ':' || p_request::text,0));
 select * into previous from wayfound.specialist_review_requests
 where actor_id=reviewer and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists(select 1 from wayfound.specialist_review_assignments sa where sa.id=previous.assignment_id and sa.reviewer_actor_id=reviewer) then
   raise exception 'Access denied' using errcode='42501';
  end if;
  return previous.review_id;
 end if;

 select * into assignment
 from wayfound.specialist_review_assignments sa
 where sa.id=p_assignment and sa.reviewer_actor_id=reviewer
 for update;
 if not found then raise exception 'Access denied' using errcode='42501'; end if;
 if assignment.status <> 'Pending' then raise exception 'Review already completed' using errcode='55000'; end if;

 select a.accepted_version_id,a.revision,v.revision,v.lifecycle
 into accepted_version,artifact_rev,version_rev,version_lifecycle
 from wayfound.artifacts a
 join wayfound.artifact_versions v on v.workspace_id=a.workspace_id and v.artifact_id=a.id
 where a.workspace_id=assignment.workspace_id and a.id=assignment.artifact_id and v.id=assignment.artifact_version_id
 for update of a,v;
 if not found then raise exception 'Artifact version unavailable' using errcode='23503'; end if;
 if accepted_version is distinct from assignment.artifact_version_id or version_lifecycle <> 'Accepted' then
  raise exception 'Assigned artifact version is no longer current accepted direction' using errcode='55000';
 end if;

 insert into wayfound.specialist_reviews(
  assignment_id,workspace_id,artifact_id,artifact_version_id,reviewer_actor_id,reviewer_name,competence_statement,
  conclusion,summary,findings,artifact_revision,artifact_version_revision
 ) values(
  assignment.id,assignment.workspace_id,assignment.artifact_id,assignment.artifact_version_id,reviewer,btrim(p_reviewer_name),
  btrim(p_competence_statement),p_conclusion,btrim(p_summary),btrim(p_findings),artifact_rev,version_rev
 ) returning id into review;

 update wayfound.specialist_review_assignments
 set status='Reviewed',revision=revision+1,updated_at=now()
 where id=assignment.id;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(assignment.workspace_id,reviewer,'specialist_review.recorded',review,p_request);
 insert into wayfound.specialist_review_requests(actor_id,request_id,workspace_id,assignment_id,payload,review_id)
 values(reviewer,p_request,assignment.workspace_id,assignment.id,body,review);
 return review;
end $$;

revoke all on table wayfound.specialist_review_assignments,wayfound.specialist_reviews,wayfound.specialist_assignment_requests,wayfound.specialist_review_requests from public,anon,authenticated;
revoke all on function wayfound.ensure_specialist_reviewer_identity(),wayfound.list_owner_specialist_reviews(uuid),wayfound.list_my_specialist_reviews(),wayfound.assign_specialist_review(uuid,uuid,uuid,uuid,text,text,boolean,uuid),wayfound.record_specialist_review(uuid,text,text,text,text,text,boolean,uuid) from public,anon,authenticated;
grant execute on function wayfound.ensure_specialist_reviewer_identity(),wayfound.list_owner_specialist_reviews(uuid),wayfound.list_my_specialist_reviews(),wayfound.assign_specialist_review(uuid,uuid,uuid,uuid,text,text,boolean,uuid),wayfound.record_specialist_review(uuid,text,text,text,text,text,boolean,uuid) to authenticated;

create function public.ensure_specialist_reviewer_identity() returns uuid language sql security invoker set search_path = '' as $$select wayfound.ensure_specialist_reviewer_identity()$$;
create function public.list_owner_specialist_reviews(p_workspace uuid) returns jsonb language sql security invoker set search_path = '' as $$select wayfound.list_owner_specialist_reviews(p_workspace)$$;
create function public.list_my_specialist_reviews() returns jsonb language sql security invoker set search_path = '' as $$select wayfound.list_my_specialist_reviews()$$;
create function public.assign_specialist_review(p_workspace uuid,p_artifact uuid,p_version uuid,p_reviewer uuid,p_requested_competence text,p_review_question text,p_scope_confirm boolean,p_request uuid) returns uuid language sql security invoker set search_path = '' as $$select wayfound.assign_specialist_review(p_workspace,p_artifact,p_version,p_reviewer,p_requested_competence,p_review_question,p_scope_confirm,p_request)$$;
create function public.record_specialist_review(p_assignment uuid,p_reviewer_name text,p_competence_statement text,p_conclusion text,p_summary text,p_findings text,p_competence_confirm boolean,p_request uuid) returns uuid language sql security invoker set search_path = '' as $$select wayfound.record_specialist_review(p_assignment,p_reviewer_name,p_competence_statement,p_conclusion,p_summary,p_findings,p_competence_confirm,p_request)$$;

revoke all on function public.ensure_specialist_reviewer_identity(),public.list_owner_specialist_reviews(uuid),public.list_my_specialist_reviews(),public.assign_specialist_review(uuid,uuid,uuid,uuid,text,text,boolean,uuid),public.record_specialist_review(uuid,text,text,text,text,text,boolean,uuid) from public,anon;
grant execute on function public.ensure_specialist_reviewer_identity(),public.list_owner_specialist_reviews(uuid),public.list_my_specialist_reviews(),public.assign_specialist_review(uuid,uuid,uuid,uuid,text,text,boolean,uuid),public.record_specialist_review(uuid,text,text,text,text,text,boolean,uuid) to authenticated;
