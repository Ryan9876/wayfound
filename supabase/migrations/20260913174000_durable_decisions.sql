-- Durable owner-approved decisions extend the existing private workspace boundary.
create table wayfound.decisions (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null,
 release_id uuid not null,
 stage_number integer not null check (stage_number between 1 and 15),
 title text not null check (length(btrim(title)) between 1 and 160),
 decision_statement text not null check (length(btrim(decision_statement)) between 1 and 4000),
 rationale text not null check (length(btrim(rationale)) between 1 and 4000),
 authority text not null default 'owner' check (authority = 'owner'),
 status text not null default 'Accepted' check (status = 'Accepted'),
 actor_id uuid not null references wayfound.actors(id),
 revision integer not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(workspace_id, release_id) references wayfound.releases(workspace_id, id),
 foreign key(release_id, stage_number) references wayfound.release_stages(release_id, stage_number)
);
create index decision_workspace_created on wayfound.decisions(workspace_id, created_at desc);

create table wayfound.decision_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 payload jsonb not null,
 decision_id uuid not null references wayfound.decisions(id),
 primary key(actor_id, request_id)
);

alter table wayfound.decisions enable row level security;
create policy decision_member on wayfound.decisions for select to authenticated using(wayfound.member(workspace_id));
alter table wayfound.decision_requests enable row level security;
create policy decision_request_member on wayfound.decision_requests for select to authenticated using(wayfound.member(workspace_id));

create function wayfound.list_decisions(p_workspace uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
 perform wayfound.subject();
 if not wayfound.member(p_workspace) then return '[]'::jsonb; end if;
 return coalesce((
  select jsonb_agg(jsonb_build_object(
   'id',d.id,
   'workspace_id',d.workspace_id,
   'release_id',d.release_id,
   'stage_number',d.stage_number,
   'title',d.title,
   'decision',d.decision_statement,
   'rationale',d.rationale,
   'authority',d.authority,
   'status',d.status,
   'revision',d.revision,
   'created_at',d.created_at,
   'updated_at',d.updated_at
  ) order by d.created_at desc, d.id)
  from wayfound.decisions d
  where d.workspace_id=p_workspace
 ),'[]'::jsonb);
end $$;

create function wayfound.record_owner_decision(
 p_workspace uuid,
 p_title text,
 p_decision text,
 p_rationale text,
 p_authority_confirm boolean,
 p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 release uuid;
 stage integer;
 decision_id uuid;
 previous wayfound.decision_requests;
 body jsonb;
begin
 if p_workspace is null or p_request is null or p_authority_confirm is distinct from true or
    p_title is null or length(btrim(p_title)) not between 1 and 160 or
    p_decision is null or length(btrim(p_decision)) not between 1 and 4000 or
    p_rationale is null or length(btrim(p_rationale)) not between 1 and 4000 then
  raise exception 'Invalid input' using errcode='22023';
 end if;
 if not wayfound.member(p_workspace) then
  raise exception 'Access denied' using errcode='42501';
 end if;
 select a.id into actor from wayfound.actors a where a.provider_subject=subject_id;
 if actor is null then raise exception 'Access denied' using errcode='42501'; end if;
 body := jsonb_build_object(
  'workspace',p_workspace,
  'title',btrim(p_title),
  'decision',btrim(p_decision),
  'rationale',btrim(p_rationale),
  'authority','owner'
 );
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':' || p_request::text,0));
 select * into previous from wayfound.decision_requests where actor_id=actor and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not wayfound.member(previous.workspace_id) then raise exception 'Access denied' using errcode='42501'; end if;
  return previous.decision_id;
 end if;
 select r.id,r.current_stage into release,stage from wayfound.releases r where r.workspace_id=p_workspace;
 if release is null then raise exception 'Workspace release missing' using errcode='23503'; end if;
 insert into wayfound.decisions(workspace_id,release_id,stage_number,title,decision_statement,rationale,authority,status,actor_id)
 values(p_workspace,release,stage,btrim(p_title),btrim(p_decision),btrim(p_rationale),'owner','Accepted',actor)
 returning id into decision_id;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'decision.accepted',decision_id,p_request);
 insert into wayfound.decision_requests(actor_id,request_id,workspace_id,payload,decision_id)
 values(actor,p_request,p_workspace,body,decision_id);
 return decision_id;
end $$;

revoke all on table wayfound.decisions, wayfound.decision_requests from public, anon, authenticated;
revoke all on function wayfound.list_decisions(uuid), wayfound.record_owner_decision(uuid,text,text,text,boolean,uuid) from public, anon, authenticated;
grant execute on function wayfound.list_decisions(uuid), wayfound.record_owner_decision(uuid,text,text,text,boolean,uuid) to authenticated;

create function public.list_decisions(p_workspace uuid) returns jsonb language sql security invoker set search_path = '' as $$select wayfound.list_decisions(p_workspace)$$;
create function public.record_owner_decision(p_workspace uuid,p_title text,p_decision text,p_rationale text,p_authority_confirm boolean,p_request uuid) returns uuid language sql security invoker set search_path = '' as $$select wayfound.record_owner_decision(p_workspace,p_title,p_decision,p_rationale,p_authority_confirm,p_request)$$;
revoke all on function public.list_decisions(uuid), public.record_owner_decision(uuid,text,text,text,boolean,uuid) from public, anon;
grant execute on function public.list_decisions(uuid), public.record_owner_decision(uuid,text,text,text,boolean,uuid) to authenticated;
