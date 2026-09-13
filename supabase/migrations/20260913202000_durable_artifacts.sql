-- Durable proposed artifacts establish stable artifact and version identities without accepting project direction.
create table wayfound.artifacts (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null,
 release_id uuid not null,
 stage_number integer not null check (stage_number between 1 and 15),
 title text not null check (length(btrim(title)) between 1 and 160),
 kind text not null check (length(btrim(kind)) between 1 and 80),
 created_by_actor_id uuid not null references wayfound.actors(id),
 revision integer not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(workspace_id, release_id) references wayfound.releases(workspace_id, id),
 foreign key(release_id, stage_number) references wayfound.release_stages(release_id, stage_number),
 unique(workspace_id, id)
);
create index artifacts_workspace_created on wayfound.artifacts(workspace_id, created_at desc);

create table wayfound.artifact_versions (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null,
 artifact_id uuid not null,
 release_id uuid not null,
 stage_number integer not null check (stage_number between 1 and 15),
 version_number integer not null check (version_number > 0),
 lifecycle text not null default 'Proposed' check (lifecycle = 'Proposed'),
 summary text not null check (length(btrim(summary)) between 1 and 4000),
 source_kind text not null default 'ExternalReference' check (source_kind = 'ExternalReference'),
 reference_label text not null check (length(btrim(reference_label)) between 1 and 160),
 reference_url text not null check (length(btrim(reference_url)) between 1 and 2048 and btrim(reference_url) ~* '^https?://[^[:space:]]+$'),
 created_by_actor_id uuid not null references wayfound.actors(id),
 revision integer not null default 1 check (revision > 0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 foreign key(workspace_id, artifact_id) references wayfound.artifacts(workspace_id, id),
 foreign key(workspace_id, release_id) references wayfound.releases(workspace_id, id),
 foreign key(release_id, stage_number) references wayfound.release_stages(release_id, stage_number),
 unique(artifact_id, version_number),
 unique(workspace_id, id)
);
create index artifact_versions_artifact_created on wayfound.artifact_versions(artifact_id, version_number desc);

create table wayfound.artifact_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 payload jsonb not null,
 artifact_id uuid not null references wayfound.artifacts(id),
 version_id uuid not null references wayfound.artifact_versions(id),
 primary key(actor_id, request_id)
);

alter table wayfound.artifacts enable row level security;
create policy artifact_member on wayfound.artifacts for select to authenticated using(wayfound.member(workspace_id));
alter table wayfound.artifact_versions enable row level security;
create policy artifact_version_member on wayfound.artifact_versions for select to authenticated using(wayfound.member(workspace_id));
alter table wayfound.artifact_requests enable row level security;
create policy artifact_request_member on wayfound.artifact_requests for select to authenticated using(wayfound.member(workspace_id));

create function wayfound.list_artifacts(p_workspace uuid) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare subject_id uuid := wayfound.subject();
begin
 if not exists (
  select 1 from wayfound.memberships m
  join wayfound.actors a on a.id=m.actor_id
  where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id
 ) then return '[]'::jsonb; end if;

 return coalesce((
  select jsonb_agg(jsonb_build_object(
   'id',a.id,
   'workspace_id',a.workspace_id,
   'release_id',a.release_id,
   'stage_number',a.stage_number,
   'title',a.title,
   'kind',a.kind,
   'created_by_actor_id',a.created_by_actor_id,
   'revision',a.revision,
   'created_at',a.created_at,
   'updated_at',a.updated_at,
   'versions',coalesce((
    select jsonb_agg(jsonb_build_object(
     'id',v.id,
     'workspace_id',v.workspace_id,
     'artifact_id',v.artifact_id,
     'release_id',v.release_id,
     'stage_number',v.stage_number,
     'version_number',v.version_number,
     'lifecycle',v.lifecycle,
     'summary',v.summary,
     'source_kind',v.source_kind,
     'reference_label',v.reference_label,
     'reference_url',v.reference_url,
     'created_by_actor_id',v.created_by_actor_id,
     'revision',v.revision,
     'created_at',v.created_at,
     'updated_at',v.updated_at
    ) order by v.version_number desc)
    from wayfound.artifact_versions v where v.artifact_id=a.id
   ),'[]'::jsonb)
  ) order by a.created_at desc,a.id)
  from wayfound.artifacts a where a.workspace_id=p_workspace
 ),'[]'::jsonb);
end $$;

create function wayfound.create_proposed_artifact(
 p_workspace uuid,
 p_title text,
 p_kind text,
 p_summary text,
 p_reference_label text,
 p_reference_url text,
 p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 release uuid;
 stage integer;
 artifact_id uuid := gen_random_uuid();
 version_id uuid := gen_random_uuid();
 previous wayfound.artifact_requests;
 body jsonb;
begin
 if p_workspace is null or p_request is null or
    p_title is null or length(btrim(p_title)) not between 1 and 160 or
    p_kind is null or length(btrim(p_kind)) not between 1 and 80 or
    p_summary is null or length(btrim(p_summary)) not between 1 and 4000 or
    p_reference_label is null or length(btrim(p_reference_label)) not between 1 and 160 or
    p_reference_url is null or length(btrim(p_reference_url)) not between 1 and 2048 or
    btrim(p_reference_url) !~* '^https?://[^[:space:]]+$' then
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
  'kind',btrim(p_kind),
  'summary',btrim(p_summary),
  'reference_label',btrim(p_reference_label),
  'reference_url',btrim(p_reference_url)
 );

 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':' || p_request::text,0));
 select * into previous from wayfound.artifact_requests where actor_id=actor and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists (
   select 1 from wayfound.memberships m
   where m.workspace_id=previous.workspace_id and m.actor_id=actor and m.role='owner'
  ) then raise exception 'Access denied' using errcode='42501'; end if;
  return previous.artifact_id;
 end if;

 select r.id,r.current_stage into release,stage
 from wayfound.releases r where r.workspace_id=p_workspace;
 if release is null then raise exception 'Workspace unavailable' using errcode='42501'; end if;

 insert into wayfound.artifacts(id,workspace_id,release_id,stage_number,title,kind,created_by_actor_id)
 values(artifact_id,p_workspace,release,stage,btrim(p_title),btrim(p_kind),actor);
 insert into wayfound.artifact_versions(
  id,workspace_id,artifact_id,release_id,stage_number,version_number,lifecycle,summary,source_kind,
  reference_label,reference_url,created_by_actor_id
 ) values(
  version_id,p_workspace,artifact_id,release,stage,1,'Proposed',btrim(p_summary),'ExternalReference',
  btrim(p_reference_label),btrim(p_reference_url),actor
 );
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'artifact.proposed',artifact_id,p_request);
 insert into wayfound.artifact_requests(actor_id,request_id,workspace_id,payload,artifact_id,version_id)
 values(actor,p_request,p_workspace,body,artifact_id,version_id);
 return artifact_id;
end $$;

revoke all on table wayfound.artifacts, wayfound.artifact_versions, wayfound.artifact_requests from public, anon, authenticated;
revoke all on function wayfound.list_artifacts(uuid), wayfound.create_proposed_artifact(uuid,text,text,text,text,text,uuid) from public, anon, authenticated;
grant execute on function wayfound.list_artifacts(uuid), wayfound.create_proposed_artifact(uuid,text,text,text,text,text,uuid) to authenticated;

create function public.list_artifacts(p_workspace uuid) returns jsonb language sql security invoker set search_path = '' as $$select wayfound.list_artifacts(p_workspace)$$;
create function public.create_proposed_artifact(p_workspace uuid,p_title text,p_kind text,p_summary text,p_reference_label text,p_reference_url text,p_request uuid) returns uuid language sql security invoker set search_path = '' as $$select wayfound.create_proposed_artifact(p_workspace,p_title,p_kind,p_summary,p_reference_label,p_reference_url,p_request)$$;
revoke all on function public.list_artifacts(uuid), public.create_proposed_artifact(uuid,text,text,text,text,text,uuid) from public, anon;
grant execute on function public.list_artifacts(uuid), public.create_proposed_artifact(uuid,text,text,text,text,text,uuid) to authenticated;
