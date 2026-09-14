-- Durable advisory AI review of exact Implemented work revisions.
create table wayfound.ai_reviews (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references wayfound.workspaces(id),
 release_id uuid not null references wayfound.releases(id),
 stage_number integer not null check(stage_number between 1 and 15),
 requested_by_actor_id uuid not null references wayfound.actors(id),
 target_kind text not null default 'work_item' check(target_kind='work_item'),
 work_item_id uuid not null,
 target_revision integer not null check(target_revision > 0),
 target_snapshot jsonb not null,
 purpose text not null check(length(btrim(purpose)) between 1 and 2000),
 context_boundary text not null default 'work-item-record-only' check(context_boundary='work-item-record-only'),
 status text not null default 'Pending' check(status in ('Pending','Completed','Failed')),
 provider_id text check(provider_id is null or provider_id in ('lm-studio','ollama')),
 provider_label text check(provider_label is null or length(provider_label) between 1 and 120),
 model text check(model is null or length(model) between 1 and 500),
 advisory_result text check(advisory_result is null or length(advisory_result) between 1 and 12000),
 response_time_ms integer check(response_time_ms is null or response_time_ms >= 0),
 prompt_tokens integer check(prompt_tokens is null or prompt_tokens >= 0),
 completion_tokens integer check(completion_tokens is null or completion_tokens >= 0),
 reasoning_tokens integer check(reasoning_tokens is null or reasoning_tokens >= 0),
 total_tokens integer check(total_tokens is null or total_tokens >= 0),
 tokens_per_second numeric check(tokens_per_second is null or tokens_per_second >= 0),
 failure_detail text check(failure_detail is null or length(failure_detail) between 1 and 2000),
 completed_at timestamptz,
 disposition text check(disposition is null or disposition in ('Use as input','Needs follow-up','Do not use')),
 disposition_note text check(disposition_note is null or length(btrim(disposition_note)) between 1 and 2000),
 disposition_actor_id uuid references wayfound.actors(id),
 disposition_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(workspace_id,work_item_id) references wayfound.work_items(workspace_id,id),
 check (
  (status='Pending' and completed_at is null and advisory_result is null and failure_detail is null)
  or
  (status='Completed' and completed_at is not null and provider_id is not null and provider_label is not null and model is not null and advisory_result is not null and failure_detail is null)
  or
  (status='Failed' and completed_at is not null and advisory_result is null and failure_detail is not null)
 ),
 check (
  (disposition is null and disposition_note is null and disposition_actor_id is null and disposition_at is null)
  or
  (status='Completed' and disposition is not null and disposition_note is not null and disposition_actor_id is not null and disposition_at is not null)
 )
);
create index ai_reviews_workspace on wayfound.ai_reviews(workspace_id,created_at desc);
create index ai_reviews_work_item on wayfound.ai_reviews(work_item_id,created_at desc);

create table wayfound.ai_review_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 review_id uuid not null references wayfound.ai_reviews(id),
 payload jsonb not null,
 primary key(actor_id,request_id)
);
create index ai_review_requests_workspace on wayfound.ai_review_requests(workspace_id);

create table wayfound.ai_review_disposition_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 review_id uuid not null references wayfound.ai_reviews(id),
 payload jsonb not null,
 primary key(actor_id,request_id)
);
create index ai_review_disposition_requests_workspace on wayfound.ai_review_disposition_requests(workspace_id);

alter table wayfound.ai_reviews enable row level security;
alter table wayfound.ai_review_requests enable row level security;
alter table wayfound.ai_review_disposition_requests enable row level security;

create policy ai_review_owner on wayfound.ai_reviews for select to authenticated
 using(exists(select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=ai_reviews.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()));
create policy ai_review_request_owner on wayfound.ai_review_requests for select to authenticated
 using(exists(select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=ai_review_requests.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()));
create policy ai_review_disposition_request_owner on wayfound.ai_review_disposition_requests for select to authenticated
 using(exists(select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=ai_review_disposition_requests.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()));

create function wayfound.request_ai_work_review(
 p_workspace uuid,p_work_item uuid,p_expected_revision integer,p_purpose text,p_confirm boolean,p_request uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 target wayfound.work_items;
 previous wayfound.ai_review_requests;
 review wayfound.ai_reviews;
 body jsonb;
 snapshot jsonb;
 implementation_note text;
begin
 if p_workspace is null or p_work_item is null or p_request is null or p_expected_revision is null or
    p_expected_revision < 1 or p_purpose is null or length(btrim(p_purpose)) not between 1 and 2000 or
    p_confirm is distinct from true then
  raise exception 'Invalid input' using errcode='22023';
 end if;

 select a.id into actor from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id for share of m;
 if actor is null then raise exception 'Access denied' using errcode='42501'; end if;

 body := jsonb_build_object('workspace',p_workspace,'work_item',p_work_item,'expected_revision',p_expected_revision,
   'purpose',btrim(p_purpose),'confirm',true);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':' || p_request::text,0));

 select * into previous from wayfound.ai_review_requests where actor_id=actor and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists(select 1 from wayfound.memberships m where m.workspace_id=previous.workspace_id and m.actor_id=actor and m.role='owner') then
   raise exception 'Access denied' using errcode='42501';
  end if;
  select * into review from wayfound.ai_reviews where id=previous.review_id;
  return jsonb_build_object('id',review.id,'status',review.status,'purpose',review.purpose,'target_snapshot',review.target_snapshot);
 end if;

 select * into target from wayfound.work_items where workspace_id=p_workspace and id=p_work_item for update;
 if not found then raise exception 'Work item unavailable' using errcode='23503'; end if;
 if target.owner_actor_id <> actor then raise exception 'Access denied' using errcode='42501'; end if;
 if target.status <> 'Implemented' or target.revision <> p_expected_revision then
  raise exception 'Work item is not an exact current Implemented revision' using errcode='55000';
 end if;

 select t.reason into implementation_note from wayfound.work_item_transitions t
 where t.workspace_id=p_workspace and t.work_item_id=target.id and t.to_status='Implemented' and t.to_revision=target.revision
 order by t.created_at desc limit 1;
 snapshot := jsonb_build_object(
  'work_item_id',target.id,'revision',target.revision,'stage_number',target.stage_number,'title',target.title,
  'outcome',target.outcome,'completion_condition',target.completion_condition,'evidence_expectation',target.evidence_expectation,
  'status',target.status,'implementation_note',implementation_note
 );

 insert into wayfound.ai_reviews(workspace_id,release_id,stage_number,requested_by_actor_id,work_item_id,target_revision,target_snapshot,purpose)
 values(p_workspace,target.release_id,target.stage_number,actor,target.id,target.revision,snapshot,btrim(p_purpose)) returning * into review;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'ai_review.requested',review.id,p_request);
 insert into wayfound.ai_review_requests(actor_id,request_id,workspace_id,review_id,payload)
 values(actor,p_request,p_workspace,review.id,body);
 return jsonb_build_object('id',review.id,'status',review.status,'purpose',review.purpose,'target_snapshot',review.target_snapshot);
end $$;

create function wayfound.complete_ai_review(
 p_workspace uuid,p_review uuid,p_provider_id text,p_provider_label text,p_model text,p_result text,
 p_response_time_ms integer,p_prompt_tokens integer,p_completion_tokens integer,p_reasoning_tokens integer,
 p_total_tokens integer,p_tokens_per_second numeric
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 review wayfound.ai_reviews;
begin
 if p_workspace is null or p_review is null or p_provider_id not in ('lm-studio','ollama') or
    p_provider_label is null or length(btrim(p_provider_label)) not between 1 and 120 or
    p_model is null or length(btrim(p_model)) not between 1 and 500 or
    p_result is null or length(btrim(p_result)) not between 1 and 12000 or
    (p_response_time_ms is not null and p_response_time_ms < 0) or
    (p_prompt_tokens is not null and p_prompt_tokens < 0) or
    (p_completion_tokens is not null and p_completion_tokens < 0) or
    (p_reasoning_tokens is not null and p_reasoning_tokens < 0) or
    (p_total_tokens is not null and p_total_tokens < 0) or
    (p_tokens_per_second is not null and p_tokens_per_second < 0) then
  raise exception 'Invalid input' using errcode='22023';
 end if;
 select a.id into actor from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id for share of m;
 if actor is null then raise exception 'Access denied' using errcode='42501'; end if;
 select * into review from wayfound.ai_reviews where workspace_id=p_workspace and id=p_review for update;
 if not found then raise exception 'AI review unavailable' using errcode='23503'; end if;
 if review.requested_by_actor_id <> actor then raise exception 'Access denied' using errcode='42501'; end if;
 if review.status='Completed' and review.provider_id=p_provider_id and review.provider_label=btrim(p_provider_label) and
    review.model=btrim(p_model) and review.advisory_result=btrim(p_result) and review.response_time_ms is not distinct from p_response_time_ms and
    review.prompt_tokens is not distinct from p_prompt_tokens and review.completion_tokens is not distinct from p_completion_tokens and
    review.reasoning_tokens is not distinct from p_reasoning_tokens and review.total_tokens is not distinct from p_total_tokens and
    review.tokens_per_second is not distinct from p_tokens_per_second then return review.id; end if;
 if review.status <> 'Pending' then raise exception 'AI review is no longer pending' using errcode='55000'; end if;
 update wayfound.ai_reviews set status='Completed',provider_id=p_provider_id,provider_label=btrim(p_provider_label),model=btrim(p_model),
  advisory_result=btrim(p_result),response_time_ms=p_response_time_ms,prompt_tokens=p_prompt_tokens,completion_tokens=p_completion_tokens,
  reasoning_tokens=p_reasoning_tokens,total_tokens=p_total_tokens,tokens_per_second=p_tokens_per_second,completed_at=now(),updated_at=now()
 where id=review.id;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'ai_review.completed',review.id,review.id);
 return review.id;
end $$;

create function wayfound.fail_ai_review(
 p_workspace uuid,p_review uuid,p_provider_id text,p_provider_label text,p_model text,p_failure_detail text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 review wayfound.ai_reviews;
begin
 if p_workspace is null or p_review is null or
    (p_provider_id is not null and p_provider_id not in ('lm-studio','ollama')) or
    (p_provider_label is not null and length(btrim(p_provider_label)) not between 1 and 120) or
    (p_model is not null and length(btrim(p_model)) not between 1 and 500) or
    p_failure_detail is null or length(btrim(p_failure_detail)) not between 1 and 2000 then
  raise exception 'Invalid input' using errcode='22023';
 end if;
 select a.id into actor from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id for share of m;
 if actor is null then raise exception 'Access denied' using errcode='42501'; end if;
 select * into review from wayfound.ai_reviews where workspace_id=p_workspace and id=p_review for update;
 if not found then raise exception 'AI review unavailable' using errcode='23503'; end if;
 if review.requested_by_actor_id <> actor then raise exception 'Access denied' using errcode='42501'; end if;
 if review.status='Failed' and review.provider_id is not distinct from p_provider_id and review.provider_label is not distinct from nullif(btrim(p_provider_label),'') and
    review.model is not distinct from nullif(btrim(p_model),'') and review.failure_detail=btrim(p_failure_detail) then return review.id; end if;
 if review.status <> 'Pending' then raise exception 'AI review is no longer pending' using errcode='55000'; end if;
 update wayfound.ai_reviews set status='Failed',provider_id=p_provider_id,provider_label=nullif(btrim(p_provider_label),''),model=nullif(btrim(p_model),''),
  failure_detail=btrim(p_failure_detail),completed_at=now(),updated_at=now() where id=review.id;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'ai_review.failed',review.id,review.id);
 return review.id;
end $$;

create function wayfound.disposition_ai_review(
 p_workspace uuid,p_review uuid,p_disposition text,p_note text,p_confirm boolean,p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 review wayfound.ai_reviews;
 previous wayfound.ai_review_disposition_requests;
 body jsonb;
begin
 if p_workspace is null or p_review is null or p_request is null or
    p_disposition not in ('Use as input','Needs follow-up','Do not use') or
    p_note is null or length(btrim(p_note)) not between 1 and 2000 or p_confirm is distinct from true then
  raise exception 'Invalid input' using errcode='22023';
 end if;
 select a.id into actor from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id for share of m;
 if actor is null then raise exception 'Access denied' using errcode='42501'; end if;
 body := jsonb_build_object('workspace',p_workspace,'review',p_review,'disposition',p_disposition,'note',btrim(p_note),'confirm',true);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':' || p_request::text,0));
 select * into previous from wayfound.ai_review_disposition_requests where actor_id=actor and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists(select 1 from wayfound.memberships m where m.workspace_id=previous.workspace_id and m.actor_id=actor and m.role='owner') then
   raise exception 'Access denied' using errcode='42501';
  end if;
  return previous.review_id;
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('ai-review:' || p_review::text,0));
 select * into review from wayfound.ai_reviews where workspace_id=p_workspace and id=p_review for update;
 if not found then raise exception 'AI review unavailable' using errcode='23503'; end if;
 if review.requested_by_actor_id <> actor then raise exception 'Access denied' using errcode='42501'; end if;
 if review.status <> 'Completed' or review.disposition is not null then raise exception 'AI review is not eligible for disposition' using errcode='55000'; end if;
 update wayfound.ai_reviews set disposition=p_disposition,disposition_note=btrim(p_note),disposition_actor_id=actor,disposition_at=now(),updated_at=now()
 where id=review.id;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'ai_review.disposition_recorded',review.id,p_request);
 insert into wayfound.ai_review_disposition_requests(actor_id,request_id,workspace_id,review_id,payload)
 values(actor,p_request,p_workspace,review.id,body);
 return review.id;
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
 ) order by r.created_at desc,r.id) from wayfound.ai_reviews r where r.workspace_id=p_workspace and r.work_item_id=w.id),'[]'::jsonb)
 ) order by w.created_at desc,w.id) from wayfound.work_items w where w.workspace_id=p_workspace),'[]'::jsonb);
end $$;

revoke all on table wayfound.ai_reviews,wayfound.ai_review_requests,wayfound.ai_review_disposition_requests from public,anon,authenticated;
revoke all on function wayfound.request_ai_work_review(uuid,uuid,integer,text,boolean,uuid) from public,anon,authenticated;
revoke all on function wayfound.complete_ai_review(uuid,uuid,text,text,text,text,integer,integer,integer,integer,integer,numeric) from public,anon,authenticated;
revoke all on function wayfound.fail_ai_review(uuid,uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function wayfound.disposition_ai_review(uuid,uuid,text,text,boolean,uuid) from public,anon,authenticated;

grant execute on function wayfound.request_ai_work_review(uuid,uuid,integer,text,boolean,uuid) to authenticated;
grant execute on function wayfound.complete_ai_review(uuid,uuid,text,text,text,text,integer,integer,integer,integer,integer,numeric) to authenticated;
grant execute on function wayfound.fail_ai_review(uuid,uuid,text,text,text,text) to authenticated;
grant execute on function wayfound.disposition_ai_review(uuid,uuid,text,text,boolean,uuid) to authenticated;

create function public.request_ai_work_review(p_workspace uuid,p_work_item uuid,p_expected_revision integer,p_purpose text,p_confirm boolean,p_request uuid)
 returns jsonb language sql security invoker set search_path = '' as $$
 select wayfound.request_ai_work_review(p_workspace,p_work_item,p_expected_revision,p_purpose,p_confirm,p_request)
$$;
create function public.complete_ai_review(p_workspace uuid,p_review uuid,p_provider_id text,p_provider_label text,p_model text,p_result text,
 p_response_time_ms integer,p_prompt_tokens integer,p_completion_tokens integer,p_reasoning_tokens integer,p_total_tokens integer,p_tokens_per_second numeric)
 returns uuid language sql security invoker set search_path = '' as $$
 select wayfound.complete_ai_review(p_workspace,p_review,p_provider_id,p_provider_label,p_model,p_result,p_response_time_ms,p_prompt_tokens,p_completion_tokens,p_reasoning_tokens,p_total_tokens,p_tokens_per_second)
$$;
create function public.fail_ai_review(p_workspace uuid,p_review uuid,p_provider_id text,p_provider_label text,p_model text,p_failure_detail text)
 returns uuid language sql security invoker set search_path = '' as $$
 select wayfound.fail_ai_review(p_workspace,p_review,p_provider_id,p_provider_label,p_model,p_failure_detail)
$$;
create function public.disposition_ai_review(p_workspace uuid,p_review uuid,p_disposition text,p_note text,p_confirm boolean,p_request uuid)
 returns uuid language sql security invoker set search_path = '' as $$
 select wayfound.disposition_ai_review(p_workspace,p_review,p_disposition,p_note,p_confirm,p_request)
$$;
revoke all on function public.request_ai_work_review(uuid,uuid,integer,text,boolean,uuid) from public,anon;
revoke all on function public.complete_ai_review(uuid,uuid,text,text,text,text,integer,integer,integer,integer,integer,numeric) from public,anon;
revoke all on function public.fail_ai_review(uuid,uuid,text,text,text,text) from public,anon;
revoke all on function public.disposition_ai_review(uuid,uuid,text,text,boolean,uuid) from public,anon;
grant execute on function public.request_ai_work_review(uuid,uuid,integer,text,boolean,uuid) to authenticated;
grant execute on function public.complete_ai_review(uuid,uuid,text,text,text,text,integer,integer,integer,integer,integer,numeric) to authenticated;
grant execute on function public.fail_ai_review(uuid,uuid,text,text,text,text) to authenticated;
grant execute on function public.disposition_ai_review(uuid,uuid,text,text,boolean,uuid) to authenticated;
