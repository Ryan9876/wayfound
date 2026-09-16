-- Consequential technical requirements reuse ADR-0004 split authority and enter the canonical requirement model only after review and owner approval.

-- Preserve the owner-only product requirement command while allowing the separate reviewed technical path to create canonical requirements.
alter table wayfound.requirements drop constraint if exists requirements_kind_check;
alter table wayfound.requirements drop constraint if exists requirements_authority_check;
alter table wayfound.requirements add constraint requirements_kind_check check (kind in ('product','technical'));
alter table wayfound.requirements add constraint requirements_authority_check check (authority in ('owner','owner-after-specialist-review'));
alter table wayfound.requirements add constraint requirements_kind_authority_check check (
 (kind='product' and authority='owner') or
 (kind='technical' and authority='owner-after-specialist-review')
);

create table wayfound.technical_requirement_proposals (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references wayfound.workspaces(id),
 release_id uuid not null,
 stage_number integer not null check (stage_number between 1 and 15),
 title text not null check (length(btrim(title)) between 1 and 160),
 obligation text not null check (obligation in ('MUST','SHOULD','MAY')),
 requirement_statement text not null check (length(btrim(requirement_statement)) between 1 and 4000),
 acceptance_criterion text not null check (length(btrim(acceptance_criterion)) between 1 and 4000),
 requested_competence text not null check (length(btrim(requested_competence)) between 1 and 500),
 review_question text not null check (length(btrim(review_question)) between 1 and 2000),
 status text not null default 'Proposed' check (status in ('Proposed','Approved')),
 revision integer not null default 1 check (revision > 0),
 proposed_by_actor_id uuid not null references wayfound.actors(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(workspace_id, release_id) references wayfound.releases(workspace_id, id),
 foreign key(release_id, stage_number) references wayfound.release_stages(release_id, stage_number),
 unique(workspace_id, id)
);
create index technical_requirement_proposals_workspace on wayfound.technical_requirement_proposals(workspace_id, created_at desc);

create table wayfound.technical_requirement_review_assignments (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references wayfound.workspaces(id),
 proposal_id uuid not null,
 proposal_revision integer not null check (proposal_revision > 0),
 reviewer_actor_id uuid not null references wayfound.actors(id),
 assigned_by_actor_id uuid not null references wayfound.actors(id),
 requested_competence text not null check (length(btrim(requested_competence)) between 1 and 500),
 review_question text not null check (length(btrim(review_question)) between 1 and 2000),
 proposal_title text not null check (length(btrim(proposal_title)) between 1 and 160),
 obligation text not null check (obligation in ('MUST','SHOULD','MAY')),
 requirement_statement text not null check (length(btrim(requirement_statement)) between 1 and 4000),
 acceptance_criterion text not null check (length(btrim(acceptance_criterion)) between 1 and 4000),
 status text not null default 'Pending' check (status in ('Pending','Reviewed')),
 revision integer not null default 1 check (revision > 0),
 assigned_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(workspace_id, proposal_id) references wayfound.technical_requirement_proposals(workspace_id, id),
 unique(proposal_id, proposal_revision)
);
create index technical_requirement_assignment_owner on wayfound.technical_requirement_review_assignments(workspace_id, assigned_at desc);
create index technical_requirement_assignment_reviewer on wayfound.technical_requirement_review_assignments(reviewer_actor_id, assigned_at desc);

create table wayfound.technical_requirement_reviews (
 id uuid primary key default gen_random_uuid(),
 assignment_id uuid not null unique references wayfound.technical_requirement_review_assignments(id),
 workspace_id uuid not null references wayfound.workspaces(id),
 proposal_id uuid not null,
 proposal_revision integer not null check (proposal_revision > 0),
 reviewer_actor_id uuid not null references wayfound.actors(id),
 reviewer_name text not null check (length(btrim(reviewer_name)) between 1 and 160),
 competence_statement text not null check (length(btrim(competence_statement)) between 1 and 500),
 conclusion text not null check (conclusion in ('No blocking finding','Changes required','Advisory')),
 summary text not null check (length(btrim(summary)) between 1 and 4000),
 findings text not null check (length(btrim(findings)) between 1 and 4000),
 revision integer not null default 1 check (revision > 0),
 reviewed_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(workspace_id, proposal_id) references wayfound.technical_requirement_proposals(workspace_id, id)
);
create index technical_requirement_reviews_workspace on wayfound.technical_requirement_reviews(workspace_id, reviewed_at desc);
create index technical_requirement_reviews_reviewer on wayfound.technical_requirement_reviews(reviewer_actor_id, reviewed_at desc);

create table wayfound.technical_requirement_approvals (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references wayfound.workspaces(id),
 proposal_id uuid not null unique,
 proposal_revision integer not null check (proposal_revision > 0),
 assignment_id uuid not null unique references wayfound.technical_requirement_review_assignments(id),
 review_id uuid not null unique references wayfound.technical_requirement_reviews(id),
 reviewer_actor_id uuid not null references wayfound.actors(id),
 review_conclusion text not null check (review_conclusion='No blocking finding'),
 requirement_id uuid not null unique references wayfound.requirements(id),
 criterion_id uuid not null unique references wayfound.acceptance_criteria(id),
 approved_by_actor_id uuid not null references wayfound.actors(id),
 approved_at timestamptz not null default now(),
 created_at timestamptz not null default now(),
 foreign key(workspace_id, proposal_id) references wayfound.technical_requirement_proposals(workspace_id, id)
);
create index technical_requirement_approvals_workspace on wayfound.technical_requirement_approvals(workspace_id, approved_at desc);

create table wayfound.technical_requirement_create_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 payload jsonb not null,
 proposal_id uuid not null references wayfound.technical_requirement_proposals(id),
 primary key(actor_id, request_id)
);
create table wayfound.technical_requirement_revision_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 proposal_id uuid not null references wayfound.technical_requirement_proposals(id),
 payload jsonb not null,
 result_revision integer not null check (result_revision > 0),
 primary key(actor_id, request_id)
);
create table wayfound.technical_requirement_assignment_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 proposal_id uuid not null references wayfound.technical_requirement_proposals(id),
 payload jsonb not null,
 assignment_id uuid not null references wayfound.technical_requirement_review_assignments(id),
 primary key(actor_id, request_id)
);
create table wayfound.technical_requirement_review_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 assignment_id uuid not null references wayfound.technical_requirement_review_assignments(id),
 payload jsonb not null,
 review_id uuid not null references wayfound.technical_requirement_reviews(id),
 primary key(actor_id, request_id)
);
create table wayfound.technical_requirement_approval_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 proposal_id uuid not null references wayfound.technical_requirement_proposals(id),
 payload jsonb not null,
 requirement_id uuid not null references wayfound.requirements(id),
 primary key(actor_id, request_id)
);

alter table wayfound.technical_requirement_proposals enable row level security;
create policy technical_requirement_proposal_owner on wayfound.technical_requirement_proposals for select to authenticated
 using(exists(select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
  where m.workspace_id=technical_requirement_proposals.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()));
alter table wayfound.technical_requirement_review_assignments enable row level security;
create policy technical_requirement_assignment_owner on wayfound.technical_requirement_review_assignments for select to authenticated
 using(exists(select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
  where m.workspace_id=technical_requirement_review_assignments.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()));
create policy technical_requirement_assignment_reviewer on wayfound.technical_requirement_review_assignments for select to authenticated
 using(exists(select 1 from wayfound.actors a where a.id=technical_requirement_review_assignments.reviewer_actor_id and a.provider_subject=wayfound.subject()));
alter table wayfound.technical_requirement_reviews enable row level security;
create policy technical_requirement_review_owner on wayfound.technical_requirement_reviews for select to authenticated
 using(exists(select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
  where m.workspace_id=technical_requirement_reviews.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()));
create policy technical_requirement_review_reviewer on wayfound.technical_requirement_reviews for select to authenticated
 using(exists(select 1 from wayfound.actors a where a.id=technical_requirement_reviews.reviewer_actor_id and a.provider_subject=wayfound.subject()));
alter table wayfound.technical_requirement_approvals enable row level security;
create policy technical_requirement_approval_owner on wayfound.technical_requirement_approvals for select to authenticated
 using(exists(select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
  where m.workspace_id=technical_requirement_approvals.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()));
alter table wayfound.technical_requirement_create_requests enable row level security;
alter table wayfound.technical_requirement_revision_requests enable row level security;
alter table wayfound.technical_requirement_assignment_requests enable row level security;
alter table wayfound.technical_requirement_review_requests enable row level security;
alter table wayfound.technical_requirement_approval_requests enable row level security;

create function wayfound.list_owner_technical_requirements(p_workspace uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare subject_id uuid:=wayfound.subject();
begin
 if not exists(select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
  where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id) then return '[]'::jsonb; end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
  'id',p.id,'workspace_id',p.workspace_id,'release_id',p.release_id,'stage_number',p.stage_number,'title',p.title,
  'obligation',p.obligation,'requirement_statement',p.requirement_statement,'acceptance_criterion',p.acceptance_criterion,
  'requested_competence',p.requested_competence,'review_question',p.review_question,'status',p.status,'revision',p.revision,
  'proposed_by_actor_id',p.proposed_by_actor_id,'created_at',p.created_at,'updated_at',p.updated_at,
  'assignments',coalesce((select jsonb_agg(jsonb_build_object(
   'id',a.id,'workspace_id',a.workspace_id,'proposal_id',a.proposal_id,'proposal_revision',a.proposal_revision,
   'reviewer_actor_id',a.reviewer_actor_id,'assigned_by_actor_id',a.assigned_by_actor_id,'requested_competence',a.requested_competence,
   'review_question',a.review_question,'status',a.status,'revision',a.revision,'assigned_at',a.assigned_at,'updated_at',a.updated_at,
   'review',(select jsonb_build_object('id',r.id,'assignment_id',r.assignment_id,'workspace_id',r.workspace_id,'proposal_id',r.proposal_id,
    'proposal_revision',r.proposal_revision,'reviewer_actor_id',r.reviewer_actor_id,'reviewer_name',r.reviewer_name,
    'competence_statement',r.competence_statement,'conclusion',r.conclusion,'summary',r.summary,'findings',r.findings,
    'revision',r.revision,'reviewed_at',r.reviewed_at,'updated_at',r.updated_at)
    from wayfound.technical_requirement_reviews r where r.assignment_id=a.id)
  ) order by a.proposal_revision desc,a.assigned_at desc) from wayfound.technical_requirement_review_assignments a where a.proposal_id=p.id),'[]'::jsonb),
  'approval',(select jsonb_build_object('id',g.id,'workspace_id',g.workspace_id,'proposal_id',g.proposal_id,'proposal_revision',g.proposal_revision,
   'assignment_id',g.assignment_id,'review_id',g.review_id,'reviewer_actor_id',g.reviewer_actor_id,'review_conclusion',g.review_conclusion,
   'requirement_id',g.requirement_id,'criterion_id',g.criterion_id,'approved_by_actor_id',g.approved_by_actor_id,'approved_at',g.approved_at,'created_at',g.created_at)
   from wayfound.technical_requirement_approvals g where g.proposal_id=p.id)
 ) order by p.created_at desc,p.id) from wayfound.technical_requirement_proposals p where p.workspace_id=p_workspace),'[]'::jsonb);
end $$;

create function wayfound.list_my_technical_requirement_reviews() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare subject_id uuid:=wayfound.subject(); actor uuid;
begin
 select id into actor from wayfound.actors where provider_subject=subject_id;
 if actor is null then return '[]'::jsonb; end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
  'id',a.id,'workspace_id',a.workspace_id,'workspace_name',w.name,'proposal_id',a.proposal_id,'proposal_revision',a.proposal_revision,
  'reviewer_actor_id',a.reviewer_actor_id,'assigned_by_actor_id',a.assigned_by_actor_id,'requested_competence',a.requested_competence,
  'review_question',a.review_question,'proposal_title',a.proposal_title,'obligation',a.obligation,'requirement_statement',a.requirement_statement,
  'acceptance_criterion',a.acceptance_criterion,'status',a.status,'revision',a.revision,'assigned_at',a.assigned_at,'updated_at',a.updated_at,
  'review',(select jsonb_build_object('id',r.id,'assignment_id',r.assignment_id,'workspace_id',r.workspace_id,'proposal_id',r.proposal_id,
   'proposal_revision',r.proposal_revision,'reviewer_actor_id',r.reviewer_actor_id,'reviewer_name',r.reviewer_name,
   'competence_statement',r.competence_statement,'conclusion',r.conclusion,'summary',r.summary,'findings',r.findings,
   'revision',r.revision,'reviewed_at',r.reviewed_at,'updated_at',r.updated_at)
   from wayfound.technical_requirement_reviews r where r.assignment_id=a.id)
 ) order by a.assigned_at desc,a.id)
 from wayfound.technical_requirement_review_assignments a join wayfound.workspaces w on w.id=a.workspace_id
 where a.reviewer_actor_id=actor),'[]'::jsonb);
end $$;

create function wayfound.create_technical_requirement_proposal(
 p_workspace uuid,p_title text,p_obligation text,p_requirement text,p_acceptance_criterion text,
 p_requested_competence text,p_review_question text,p_proposal_confirm boolean,p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare subject_id uuid:=wayfound.subject(); owner_actor uuid; previous wayfound.technical_requirement_create_requests; body jsonb; proposal uuid; release uuid; stage integer;
begin
 if p_workspace is null or p_request is null or p_proposal_confirm is distinct from true or
  p_title is null or length(btrim(p_title)) not between 1 and 160 or p_obligation not in ('MUST','SHOULD','MAY') or
  p_requirement is null or length(btrim(p_requirement)) not between 1 and 4000 or
  p_acceptance_criterion is null or length(btrim(p_acceptance_criterion)) not between 1 and 4000 or
  p_requested_competence is null or length(btrim(p_requested_competence)) not between 1 and 500 or
  p_review_question is null or length(btrim(p_review_question)) not between 1 and 2000 then raise exception 'Invalid input' using errcode='22023'; end if;
 select a.id into owner_actor from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
  where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id for update of m;
 if owner_actor is null then raise exception 'Access denied' using errcode='42501'; end if;
 body:=jsonb_build_object('workspace',p_workspace,'title',btrim(p_title),'obligation',p_obligation,'requirement',btrim(p_requirement),
  'acceptance_criterion',btrim(p_acceptance_criterion),'requested_competence',btrim(p_requested_competence),'review_question',btrim(p_review_question),'proposal_confirm',true);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_actor::text || ':' || p_request::text,0));
 select * into previous from wayfound.technical_requirement_create_requests where actor_id=owner_actor and request_id=p_request;
 if found then
  if previous.payload<>body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists(select 1 from wayfound.memberships m where m.workspace_id=previous.workspace_id and m.actor_id=owner_actor and m.role='owner') then raise exception 'Access denied' using errcode='42501'; end if;
  return previous.proposal_id;
 end if;
 select r.id,r.current_stage into release,stage from wayfound.releases r where r.workspace_id=p_workspace for share;
 if release is null then raise exception 'Workspace release unavailable' using errcode='23503'; end if;
 insert into wayfound.technical_requirement_proposals(workspace_id,release_id,stage_number,title,obligation,requirement_statement,acceptance_criterion,requested_competence,review_question,proposed_by_actor_id)
 values(p_workspace,release,stage,btrim(p_title),p_obligation,btrim(p_requirement),btrim(p_acceptance_criterion),btrim(p_requested_competence),btrim(p_review_question),owner_actor)
 returning id into proposal;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id) values(p_workspace,owner_actor,'technical_requirement.proposed',proposal,p_request);
 insert into wayfound.technical_requirement_create_requests(actor_id,request_id,workspace_id,payload,proposal_id) values(owner_actor,p_request,p_workspace,body,proposal);
 return proposal;
end $$;

create function wayfound.revise_technical_requirement_proposal(
 p_workspace uuid,p_proposal uuid,p_expected_revision integer,p_title text,p_obligation text,p_requirement text,p_acceptance_criterion text,
 p_requested_competence text,p_review_question text,p_proposal_confirm boolean,p_request uuid
) returns integer language plpgsql security definer set search_path = '' as $$
declare subject_id uuid:=wayfound.subject(); owner_actor uuid; previous wayfound.technical_requirement_revision_requests; body jsonb; current wayfound.technical_requirement_proposals; next_revision integer;
begin
 if p_workspace is null or p_proposal is null or p_request is null or p_expected_revision is null or p_expected_revision<1 or p_proposal_confirm is distinct from true or
  p_title is null or length(btrim(p_title)) not between 1 and 160 or p_obligation not in ('MUST','SHOULD','MAY') or
  p_requirement is null or length(btrim(p_requirement)) not between 1 and 4000 or p_acceptance_criterion is null or length(btrim(p_acceptance_criterion)) not between 1 and 4000 or
  p_requested_competence is null or length(btrim(p_requested_competence)) not between 1 and 500 or p_review_question is null or length(btrim(p_review_question)) not between 1 and 2000
  then raise exception 'Invalid input' using errcode='22023'; end if;
 select a.id into owner_actor from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
  where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id for update of m;
 if owner_actor is null then raise exception 'Access denied' using errcode='42501'; end if;
 body:=jsonb_build_object('workspace',p_workspace,'proposal',p_proposal,'expected_revision',p_expected_revision,'title',btrim(p_title),'obligation',p_obligation,
  'requirement',btrim(p_requirement),'acceptance_criterion',btrim(p_acceptance_criterion),'requested_competence',btrim(p_requested_competence),
  'review_question',btrim(p_review_question),'proposal_confirm',true);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_actor::text || ':' || p_request::text,0));
 select * into previous from wayfound.technical_requirement_revision_requests where actor_id=owner_actor and request_id=p_request;
 if found then
  if previous.payload<>body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists(select 1 from wayfound.memberships m where m.workspace_id=previous.workspace_id and m.actor_id=owner_actor and m.role='owner') then raise exception 'Access denied' using errcode='42501'; end if;
  return previous.result_revision;
 end if;
 select * into current from wayfound.technical_requirement_proposals p where p.workspace_id=p_workspace and p.id=p_proposal for update;
 if not found then raise exception 'Technical requirement proposal unavailable' using errcode='23503'; end if;
 if current.status<>'Proposed' then raise exception 'Technical requirement proposal is not revisable' using errcode='55000'; end if;
 if current.revision<>p_expected_revision then raise exception 'Stale proposal revision' using errcode='55000'; end if;
 next_revision:=current.revision+1;
 update wayfound.technical_requirement_proposals set title=btrim(p_title),obligation=p_obligation,requirement_statement=btrim(p_requirement),acceptance_criterion=btrim(p_acceptance_criterion),
  requested_competence=btrim(p_requested_competence),review_question=btrim(p_review_question),revision=next_revision,updated_at=now() where id=current.id;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id) values(p_workspace,owner_actor,'technical_requirement.revised',current.id,p_request);
 insert into wayfound.technical_requirement_revision_requests(actor_id,request_id,workspace_id,proposal_id,payload,result_revision)
 values(owner_actor,p_request,p_workspace,current.id,body,next_revision);
 return next_revision;
end $$;

create function wayfound.assign_technical_requirement_review(
 p_workspace uuid,p_proposal uuid,p_expected_revision integer,p_reviewer uuid,p_scope_confirm boolean,p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare subject_id uuid:=wayfound.subject(); owner_actor uuid; previous wayfound.technical_requirement_assignment_requests; body jsonb; proposal wayfound.technical_requirement_proposals; assignment uuid;
begin
 if p_workspace is null or p_proposal is null or p_reviewer is null or p_request is null or p_expected_revision is null or p_expected_revision<1 or p_scope_confirm is distinct from true then raise exception 'Invalid input' using errcode='22023'; end if;
 select a.id into owner_actor from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
  where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id for update of m;
 if owner_actor is null then raise exception 'Access denied' using errcode='42501'; end if;
 if owner_actor=p_reviewer then raise exception 'Owner cannot self-review' using errcode='22023'; end if;
 if not exists(select 1 from wayfound.actors a where a.id=p_reviewer) then raise exception 'Reviewer unavailable' using errcode='23503'; end if;
 body:=jsonb_build_object('workspace',p_workspace,'proposal',p_proposal,'expected_revision',p_expected_revision,'reviewer',p_reviewer,'scope_confirm',true);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_actor::text || ':' || p_request::text,0));
 select * into previous from wayfound.technical_requirement_assignment_requests where actor_id=owner_actor and request_id=p_request;
 if found then
  if previous.payload<>body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists(select 1 from wayfound.memberships m where m.workspace_id=previous.workspace_id and m.actor_id=owner_actor and m.role='owner') then raise exception 'Access denied' using errcode='42501'; end if;
  return previous.assignment_id;
 end if;
 select * into proposal from wayfound.technical_requirement_proposals p where p.workspace_id=p_workspace and p.id=p_proposal for update;
 if not found then raise exception 'Technical requirement proposal unavailable' using errcode='23503'; end if;
 if proposal.status<>'Proposed' then raise exception 'Technical requirement proposal is not reviewable' using errcode='55000'; end if;
 if proposal.revision<>p_expected_revision then raise exception 'Stale proposal revision' using errcode='55000'; end if;
 if exists(select 1 from wayfound.technical_requirement_review_assignments a where a.proposal_id=proposal.id and a.proposal_revision=proposal.revision) then raise exception 'Review assignment already exists for this proposal revision' using errcode='55000'; end if;
 insert into wayfound.technical_requirement_review_assignments(workspace_id,proposal_id,proposal_revision,reviewer_actor_id,assigned_by_actor_id,requested_competence,review_question,proposal_title,obligation,requirement_statement,acceptance_criterion)
 values(p_workspace,proposal.id,proposal.revision,p_reviewer,owner_actor,proposal.requested_competence,proposal.review_question,proposal.title,proposal.obligation,proposal.requirement_statement,proposal.acceptance_criterion)
 returning id into assignment;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id) values(p_workspace,owner_actor,'technical_requirement.review_assigned',assignment,p_request);
 insert into wayfound.technical_requirement_assignment_requests(actor_id,request_id,workspace_id,proposal_id,payload,assignment_id) values(owner_actor,p_request,p_workspace,proposal.id,body,assignment);
 return assignment;
end $$;

create function wayfound.record_technical_requirement_review(
 p_assignment uuid,p_reviewer_name text,p_competence_statement text,p_conclusion text,p_summary text,p_findings text,p_competence_confirm boolean,p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare subject_id uuid:=wayfound.subject(); reviewer uuid; previous wayfound.technical_requirement_review_requests; assignment wayfound.technical_requirement_review_assignments; proposal wayfound.technical_requirement_proposals; body jsonb; review uuid;
begin
 if p_assignment is null or p_request is null or p_competence_confirm is distinct from true or p_reviewer_name is null or length(btrim(p_reviewer_name)) not between 1 and 160 or
  p_competence_statement is null or length(btrim(p_competence_statement)) not between 1 and 500 or p_conclusion not in ('No blocking finding','Changes required','Advisory') or
  p_summary is null or length(btrim(p_summary)) not between 1 and 4000 or p_findings is null or length(btrim(p_findings)) not between 1 and 4000 then raise exception 'Invalid input' using errcode='22023'; end if;
 select id into reviewer from wayfound.actors where provider_subject=subject_id;
 if reviewer is null then raise exception 'Access denied' using errcode='42501'; end if;
 body:=jsonb_build_object('assignment',p_assignment,'reviewer_name',btrim(p_reviewer_name),'competence_statement',btrim(p_competence_statement),'conclusion',p_conclusion,'summary',btrim(p_summary),'findings',btrim(p_findings),'competence_confirm',true);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(reviewer::text || ':' || p_request::text,0));
 select * into previous from wayfound.technical_requirement_review_requests where actor_id=reviewer and request_id=p_request;
 if found then
  if previous.payload<>body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists(select 1 from wayfound.technical_requirement_review_assignments a where a.id=previous.assignment_id and a.reviewer_actor_id=reviewer) then raise exception 'Access denied' using errcode='42501'; end if;
  return previous.review_id;
 end if;
 select * into assignment from wayfound.technical_requirement_review_assignments a where a.id=p_assignment and a.reviewer_actor_id=reviewer for update;
 if not found then raise exception 'Access denied' using errcode='42501'; end if;
 if assignment.status<>'Pending' then raise exception 'Review already completed' using errcode='55000'; end if;
 select * into proposal from wayfound.technical_requirement_proposals p where p.workspace_id=assignment.workspace_id and p.id=assignment.proposal_id for update;
 if not found then raise exception 'Technical requirement proposal unavailable' using errcode='23503'; end if;
 if proposal.status<>'Proposed' or proposal.revision<>assignment.proposal_revision then raise exception 'Stale proposal revision' using errcode='55000'; end if;
 insert into wayfound.technical_requirement_reviews(assignment_id,workspace_id,proposal_id,proposal_revision,reviewer_actor_id,reviewer_name,competence_statement,conclusion,summary,findings)
 values(assignment.id,assignment.workspace_id,assignment.proposal_id,assignment.proposal_revision,reviewer,btrim(p_reviewer_name),btrim(p_competence_statement),p_conclusion,btrim(p_summary),btrim(p_findings)) returning id into review;
 update wayfound.technical_requirement_review_assignments set status='Reviewed',revision=revision+1,updated_at=now() where id=assignment.id;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id) values(assignment.workspace_id,reviewer,'technical_requirement.review_recorded',review,p_request);
 insert into wayfound.technical_requirement_review_requests(actor_id,request_id,workspace_id,assignment_id,payload,review_id) values(reviewer,p_request,assignment.workspace_id,assignment.id,body,review);
 return review;
end $$;

create function wayfound.approve_technical_requirement(
 p_workspace uuid,p_proposal uuid,p_expected_revision integer,p_direction_confirm boolean,p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare subject_id uuid:=wayfound.subject(); owner_actor uuid; previous wayfound.technical_requirement_approval_requests; body jsonb;
 proposal wayfound.technical_requirement_proposals; assignment wayfound.technical_requirement_review_assignments; review wayfound.technical_requirement_reviews;
 requirement uuid:=gen_random_uuid(); criterion uuid:=gen_random_uuid(); approval uuid:=gen_random_uuid();
begin
 if p_workspace is null or p_proposal is null or p_request is null or p_expected_revision is null or p_expected_revision<1 or p_direction_confirm is distinct from true then raise exception 'Invalid input' using errcode='22023'; end if;
 select a.id into owner_actor from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
  where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id for update of m;
 if owner_actor is null then raise exception 'Access denied' using errcode='42501'; end if;
 body:=jsonb_build_object('workspace',p_workspace,'proposal',p_proposal,'expected_revision',p_expected_revision,'direction_confirm',true);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_actor::text || ':' || p_request::text,0));
 select * into previous from wayfound.technical_requirement_approval_requests where actor_id=owner_actor and request_id=p_request;
 if found then
  if previous.payload<>body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists(select 1 from wayfound.memberships m where m.workspace_id=previous.workspace_id and m.actor_id=owner_actor and m.role='owner') then raise exception 'Access denied' using errcode='42501'; end if;
  return previous.requirement_id;
 end if;
 select * into proposal from wayfound.technical_requirement_proposals p where p.workspace_id=p_workspace and p.id=p_proposal for update;
 if not found then raise exception 'Technical requirement proposal unavailable' using errcode='23503'; end if;
 if proposal.status<>'Proposed' then raise exception 'Technical requirement proposal is not eligible for approval' using errcode='55000'; end if;
 if proposal.revision<>p_expected_revision then raise exception 'Stale proposal revision' using errcode='55000'; end if;
 select * into assignment from wayfound.technical_requirement_review_assignments a where a.proposal_id=proposal.id and a.proposal_revision=proposal.revision for update;
 if not found or assignment.status<>'Reviewed' then raise exception 'Qualifying specialist review is required' using errcode='55000'; end if;
 select * into review from wayfound.technical_requirement_reviews r where r.assignment_id=assignment.id;
 if not found or review.proposal_revision<>proposal.revision or review.reviewer_actor_id<>assignment.reviewer_actor_id then raise exception 'Qualifying specialist review is unavailable' using errcode='55000'; end if;
 if review.conclusion<>'No blocking finding' then raise exception 'Specialist review does not permit approval' using errcode='55000'; end if;
 insert into wayfound.requirements(id,workspace_id,release_id,stage_number,title,obligation,requirement_statement,kind,authority,status,approving_actor_id)
 values(requirement,proposal.workspace_id,proposal.release_id,proposal.stage_number,proposal.title,proposal.obligation,proposal.requirement_statement,'technical','owner-after-specialist-review','Approved',owner_actor);
 insert into wayfound.acceptance_criteria(id,workspace_id,requirement_id,statement)
 values(criterion,proposal.workspace_id,requirement,proposal.acceptance_criterion);
 insert into wayfound.technical_requirement_approvals(id,workspace_id,proposal_id,proposal_revision,assignment_id,review_id,reviewer_actor_id,review_conclusion,requirement_id,criterion_id,approved_by_actor_id)
 values(approval,proposal.workspace_id,proposal.id,proposal.revision,assignment.id,review.id,review.reviewer_actor_id,review.conclusion,requirement,criterion,owner_actor);
 update wayfound.technical_requirement_proposals set status='Approved',revision=revision+1,updated_at=now() where id=proposal.id;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id) values(p_workspace,owner_actor,'technical_requirement.approved',requirement,p_request);
 insert into wayfound.technical_requirement_approval_requests(actor_id,request_id,workspace_id,proposal_id,payload,requirement_id)
 values(owner_actor,p_request,p_workspace,proposal.id,body,requirement);
 return requirement;
end $$;

revoke all on table wayfound.technical_requirement_proposals,wayfound.technical_requirement_review_assignments,wayfound.technical_requirement_reviews,
 wayfound.technical_requirement_approvals,wayfound.technical_requirement_create_requests,wayfound.technical_requirement_revision_requests,
 wayfound.technical_requirement_assignment_requests,wayfound.technical_requirement_review_requests,wayfound.technical_requirement_approval_requests
 from public,anon,authenticated;
revoke all on function wayfound.list_owner_technical_requirements(uuid),wayfound.list_my_technical_requirement_reviews(),
 wayfound.create_technical_requirement_proposal(uuid,text,text,text,text,text,text,boolean,uuid),
 wayfound.revise_technical_requirement_proposal(uuid,uuid,integer,text,text,text,text,text,text,boolean,uuid),
 wayfound.assign_technical_requirement_review(uuid,uuid,integer,uuid,boolean,uuid),
 wayfound.record_technical_requirement_review(uuid,text,text,text,text,text,boolean,uuid),
 wayfound.approve_technical_requirement(uuid,uuid,integer,boolean,uuid)
 from public,anon,authenticated;
grant execute on function wayfound.list_owner_technical_requirements(uuid),wayfound.list_my_technical_requirement_reviews(),
 wayfound.create_technical_requirement_proposal(uuid,text,text,text,text,text,text,boolean,uuid),
 wayfound.revise_technical_requirement_proposal(uuid,uuid,integer,text,text,text,text,text,text,boolean,uuid),
 wayfound.assign_technical_requirement_review(uuid,uuid,integer,uuid,boolean,uuid),
 wayfound.record_technical_requirement_review(uuid,text,text,text,text,text,boolean,uuid),
 wayfound.approve_technical_requirement(uuid,uuid,integer,boolean,uuid)
 to authenticated;

create function public.list_owner_technical_requirements(p_workspace uuid) returns jsonb language sql security invoker set search_path='' as $$select wayfound.list_owner_technical_requirements(p_workspace)$$;
create function public.list_my_technical_requirement_reviews() returns jsonb language sql security invoker set search_path='' as $$select wayfound.list_my_technical_requirement_reviews()$$;
create function public.create_technical_requirement_proposal(p_workspace uuid,p_title text,p_obligation text,p_requirement text,p_acceptance_criterion text,p_requested_competence text,p_review_question text,p_proposal_confirm boolean,p_request uuid) returns uuid language sql security invoker set search_path='' as $$select wayfound.create_technical_requirement_proposal(p_workspace,p_title,p_obligation,p_requirement,p_acceptance_criterion,p_requested_competence,p_review_question,p_proposal_confirm,p_request)$$;
create function public.revise_technical_requirement_proposal(p_workspace uuid,p_proposal uuid,p_expected_revision integer,p_title text,p_obligation text,p_requirement text,p_acceptance_criterion text,p_requested_competence text,p_review_question text,p_proposal_confirm boolean,p_request uuid) returns integer language sql security invoker set search_path='' as $$select wayfound.revise_technical_requirement_proposal(p_workspace,p_proposal,p_expected_revision,p_title,p_obligation,p_requirement,p_acceptance_criterion,p_requested_competence,p_review_question,p_proposal_confirm,p_request)$$;
create function public.assign_technical_requirement_review(p_workspace uuid,p_proposal uuid,p_expected_revision integer,p_reviewer uuid,p_scope_confirm boolean,p_request uuid) returns uuid language sql security invoker set search_path='' as $$select wayfound.assign_technical_requirement_review(p_workspace,p_proposal,p_expected_revision,p_reviewer,p_scope_confirm,p_request)$$;
create function public.record_technical_requirement_review(p_assignment uuid,p_reviewer_name text,p_competence_statement text,p_conclusion text,p_summary text,p_findings text,p_competence_confirm boolean,p_request uuid) returns uuid language sql security invoker set search_path='' as $$select wayfound.record_technical_requirement_review(p_assignment,p_reviewer_name,p_competence_statement,p_conclusion,p_summary,p_findings,p_competence_confirm,p_request)$$;
create function public.approve_technical_requirement(p_workspace uuid,p_proposal uuid,p_expected_revision integer,p_direction_confirm boolean,p_request uuid) returns uuid language sql security invoker set search_path='' as $$select wayfound.approve_technical_requirement(p_workspace,p_proposal,p_expected_revision,p_direction_confirm,p_request)$$;

revoke all on function public.list_owner_technical_requirements(uuid),public.list_my_technical_requirement_reviews(),
 public.create_technical_requirement_proposal(uuid,text,text,text,text,text,text,boolean,uuid),
 public.revise_technical_requirement_proposal(uuid,uuid,integer,text,text,text,text,text,text,boolean,uuid),
 public.assign_technical_requirement_review(uuid,uuid,integer,uuid,boolean,uuid),
 public.record_technical_requirement_review(uuid,text,text,text,text,text,boolean,uuid),
 public.approve_technical_requirement(uuid,uuid,integer,boolean,uuid)
 from public,anon;
grant execute on function public.list_owner_technical_requirements(uuid),public.list_my_technical_requirement_reviews(),
 public.create_technical_requirement_proposal(uuid,text,text,text,text,text,text,boolean,uuid),
 public.revise_technical_requirement_proposal(uuid,uuid,integer,text,text,text,text,text,text,boolean,uuid),
 public.assign_technical_requirement_review(uuid,uuid,integer,uuid,boolean,uuid),
 public.record_technical_requirement_review(uuid,text,text,text,text,text,boolean,uuid),
 public.approve_technical_requirement(uuid,uuid,integer,boolean,uuid)
 to authenticated;
