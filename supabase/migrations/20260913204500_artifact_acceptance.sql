-- Explicit owner artifact acceptance selects one existing proposed version as current project direction.
alter table wayfound.artifact_versions
  drop constraint artifact_versions_lifecycle_check;
alter table wayfound.artifact_versions
  add constraint artifact_versions_lifecycle_check check (lifecycle in ('Proposed','Accepted'));
alter table wayfound.artifact_versions
  add constraint artifact_versions_workspace_artifact_id_key unique(workspace_id, artifact_id, id);

alter table wayfound.artifacts
  add column accepted_version_id uuid,
  add column accepted_by_actor_id uuid references wayfound.actors(id),
  add column accepted_at timestamptz,
  add constraint artifact_acceptance_metadata_complete check (
    (accepted_version_id is null and accepted_by_actor_id is null and accepted_at is null)
    or
    (accepted_version_id is not null and accepted_by_actor_id is not null and accepted_at is not null)
  ),
  add constraint artifact_accepted_version_reference
    foreign key(workspace_id, id, accepted_version_id)
    references wayfound.artifact_versions(workspace_id, artifact_id, id);

create table wayfound.artifact_acceptance_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 artifact_id uuid not null,
 version_id uuid not null,
 payload jsonb not null,
 primary key(actor_id, request_id),
 foreign key(workspace_id, artifact_id, version_id)
   references wayfound.artifact_versions(workspace_id, artifact_id, id)
);

alter table wayfound.artifact_acceptance_requests enable row level security;
create policy artifact_acceptance_request_member on wayfound.artifact_acceptance_requests
 for select to authenticated using(wayfound.member(workspace_id));

create or replace function wayfound.list_artifacts(p_workspace uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare subject_id uuid := wayfound.subject();
begin
 if not exists (
  select 1 from wayfound.memberships m
  join wayfound.actors actor on actor.id=m.actor_id
  where m.workspace_id=p_workspace and m.role='owner' and actor.provider_subject=subject_id
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
   'accepted_version_id',a.accepted_version_id,
   'accepted_by_actor_id',a.accepted_by_actor_id,
   'accepted_at',a.accepted_at,
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

create function wayfound.accept_artifact_version(
 p_workspace uuid,
 p_artifact uuid,
 p_version uuid,
 p_authority_confirm boolean,
 p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 previous wayfound.artifact_acceptance_requests;
 body jsonb;
 target_lifecycle text;
 current_accepted uuid;
begin
 if p_workspace is null or p_artifact is null or p_version is null or p_request is null or p_authority_confirm is distinct from true then
  raise exception 'Invalid input' using errcode='22023';
 end if;

 select a.id into actor
 from wayfound.memberships m
 join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id;
 if actor is null then raise exception 'Access denied' using errcode='42501'; end if;

 body := jsonb_build_object(
  'workspace',p_workspace,
  'artifact',p_artifact,
  'version',p_version,
  'authority_confirm',true
 );

 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':' || p_request::text,0));
 select * into previous from wayfound.artifact_acceptance_requests
 where actor_id=actor and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists (
   select 1 from wayfound.memberships m
   where m.workspace_id=previous.workspace_id and m.actor_id=actor and m.role='owner'
  ) then raise exception 'Access denied' using errcode='42501'; end if;
  return previous.version_id;
 end if;

 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('artifact:' || p_artifact::text,0));
 select a.accepted_version_id,v.lifecycle
 into current_accepted,target_lifecycle
 from wayfound.artifacts a
 join wayfound.artifact_versions v
   on v.workspace_id=a.workspace_id and v.artifact_id=a.id
 where a.workspace_id=p_workspace and a.id=p_artifact and v.id=p_version
 for update of a,v;

 if not found then
  raise exception 'Artifact version unavailable' using errcode='23503';
 end if;
 if current_accepted is not null or target_lifecycle <> 'Proposed' then
  raise exception 'Artifact version is not proposed' using errcode='55000';
 end if;

 update wayfound.artifact_versions
 set lifecycle='Accepted', revision=revision+1, updated_at=now()
 where workspace_id=p_workspace and artifact_id=p_artifact and id=p_version;

 update wayfound.artifacts
 set accepted_version_id=p_version,
     accepted_by_actor_id=actor,
     accepted_at=now(),
     revision=revision+1,
     updated_at=now()
 where workspace_id=p_workspace and id=p_artifact;

 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'artifact.accepted',p_version,p_request);
 insert into wayfound.artifact_acceptance_requests(actor_id,request_id,workspace_id,artifact_id,version_id,payload)
 values(actor,p_request,p_workspace,p_artifact,p_version,body);
 return p_version;
end $$;

revoke all on table wayfound.artifact_acceptance_requests from public, anon, authenticated;
revoke all on function wayfound.accept_artifact_version(uuid,uuid,uuid,boolean,uuid) from public, anon, authenticated;
grant execute on function wayfound.accept_artifact_version(uuid,uuid,uuid,boolean,uuid) to authenticated;

create function public.accept_artifact_version(
 p_workspace uuid,
 p_artifact uuid,
 p_version uuid,
 p_authority_confirm boolean,
 p_request uuid
) returns uuid language sql security invoker set search_path = '' as $$
 select wayfound.accept_artifact_version(p_workspace,p_artifact,p_version,p_authority_confirm,p_request)
$$;
revoke all on function public.accept_artifact_version(uuid,uuid,uuid,boolean,uuid) from public, anon;
grant execute on function public.accept_artifact_version(uuid,uuid,uuid,boolean,uuid) to authenticated;
