-- Durable links from owner work to accepted project direction inside the existing workspace boundary.
alter table wayfound.decisions
 add constraint decisions_workspace_id_id_key unique(workspace_id,id);

create table wayfound.work_direction_links (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references wayfound.workspaces(id),
 work_item_id uuid not null,
 work_revision integer not null check(work_revision > 0),
 target_kind text not null check(target_kind in ('Decision','Artifact')),
 decision_id uuid,
 decision_revision integer check(decision_revision is null or decision_revision > 0),
 artifact_id uuid,
 artifact_revision integer check(artifact_revision is null or artifact_revision > 0),
 artifact_version_id uuid,
 artifact_version_revision integer check(artifact_version_revision is null or artifact_version_revision > 0),
 reason text not null check(length(btrim(reason)) between 1 and 2000),
 created_by_actor_id uuid not null references wayfound.actors(id),
 created_at timestamptz not null default now(),
 removed_by_actor_id uuid references wayfound.actors(id),
 removed_reason text check(removed_reason is null or length(btrim(removed_reason)) between 1 and 2000),
 removed_at timestamptz,
 foreign key(workspace_id,work_item_id) references wayfound.work_items(workspace_id,id),
 foreign key(workspace_id,decision_id) references wayfound.decisions(workspace_id,id),
 foreign key(workspace_id,artifact_id,artifact_version_id) references wayfound.artifact_versions(workspace_id,artifact_id,id),
 check(
  (target_kind='Decision' and decision_id is not null and decision_revision is not null
   and artifact_id is null and artifact_revision is null and artifact_version_id is null and artifact_version_revision is null)
  or
  (target_kind='Artifact' and decision_id is null and decision_revision is null
   and artifact_id is not null and artifact_revision is not null and artifact_version_id is not null and artifact_version_revision is not null)
 ),
 check(
  (removed_by_actor_id is null and removed_reason is null and removed_at is null)
  or
  (removed_by_actor_id is not null and removed_reason is not null and removed_at is not null)
 )
);
create unique index work_direction_active_decision
 on wayfound.work_direction_links(workspace_id,work_item_id,decision_id)
 where target_kind='Decision' and removed_at is null;
create unique index work_direction_active_artifact
 on wayfound.work_direction_links(workspace_id,work_item_id,artifact_id)
 where target_kind='Artifact' and removed_at is null;
create index work_direction_work
 on wayfound.work_direction_links(workspace_id,work_item_id,created_at desc);
create index work_direction_decision
 on wayfound.work_direction_links(workspace_id,decision_id,created_at desc)
 where target_kind='Decision';
create index work_direction_artifact
 on wayfound.work_direction_links(workspace_id,artifact_id,created_at desc)
 where target_kind='Artifact';

create table wayfound.work_direction_link_create_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 payload jsonb not null,
 link_id uuid not null references wayfound.work_direction_links(id),
 primary key(actor_id,request_id)
);
create index work_direction_link_create_workspace
 on wayfound.work_direction_link_create_requests(workspace_id);

create table wayfound.work_direction_link_remove_requests (
 actor_id uuid not null references wayfound.actors(id),
 request_id uuid not null,
 workspace_id uuid not null references wayfound.workspaces(id),
 payload jsonb not null,
 link_id uuid not null references wayfound.work_direction_links(id),
 primary key(actor_id,request_id)
);
create index work_direction_link_remove_workspace
 on wayfound.work_direction_link_remove_requests(workspace_id);

alter table wayfound.work_direction_links enable row level security;
alter table wayfound.work_direction_link_create_requests enable row level security;
alter table wayfound.work_direction_link_remove_requests enable row level security;

create policy work_direction_link_owner on wayfound.work_direction_links for select to authenticated
 using(exists(select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=work_direction_links.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()));
create policy work_direction_link_create_request_owner on wayfound.work_direction_link_create_requests for select to authenticated
 using(exists(select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=work_direction_link_create_requests.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()));
create policy work_direction_link_remove_request_owner on wayfound.work_direction_link_remove_requests for select to authenticated
 using(exists(select 1 from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=work_direction_link_remove_requests.workspace_id and m.role='owner' and a.provider_subject=wayfound.subject()));

create function wayfound.link_work_to_decision(
 p_workspace uuid,p_work_item uuid,p_decision uuid,p_reason text,p_confirm boolean,p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 target_work wayfound.work_items;
 target_decision wayfound.decisions;
 previous wayfound.work_direction_link_create_requests;
 body jsonb;
 link_id uuid;
begin
 if p_workspace is null or p_work_item is null or p_decision is null or p_request is null or
    p_reason is null or length(btrim(p_reason)) not between 1 and 2000 or p_confirm is distinct from true then
  raise exception 'Invalid input' using errcode='22023';
 end if;

 select a.id into actor from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id for share of m;
 if actor is null then raise exception 'Access denied' using errcode='42501'; end if;

 body := jsonb_build_object('workspace',p_workspace,'work_item',p_work_item,'target_kind','Decision',
  'decision',p_decision,'reason',btrim(p_reason),'confirm',true);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':' || p_request::text,0));
 select * into previous from wayfound.work_direction_link_create_requests where actor_id=actor and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists(select 1 from wayfound.memberships m where m.workspace_id=previous.workspace_id and m.actor_id=actor and m.role='owner') then
   raise exception 'Access denied' using errcode='42501';
  end if;
  return previous.link_id;
 end if;

 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'work-direction-decision:' || p_workspace::text || ':' || p_work_item::text || ':' || p_decision::text,0));
 select * into target_work from wayfound.work_items
 where workspace_id=p_workspace and id=p_work_item for share;
 if target_work.id is null or target_work.owner_actor_id<>actor then
  raise exception 'Work item unavailable' using errcode='23503';
 end if;
 select * into target_decision from wayfound.decisions
 where workspace_id=p_workspace and id=p_decision for share;
 if target_decision.id is null then raise exception 'Decision unavailable' using errcode='23503'; end if;
 if target_decision.status<>'Accepted' then raise exception 'Decision is not accepted' using errcode='55000'; end if;
 if exists(select 1 from wayfound.work_direction_links l
  where l.workspace_id=p_workspace and l.work_item_id=p_work_item and l.target_kind='Decision'
   and l.decision_id=p_decision and l.removed_at is null) then
  raise exception 'Active direction link already exists' using errcode='55000';
 end if;

 insert into wayfound.work_direction_links(
  workspace_id,work_item_id,work_revision,target_kind,decision_id,decision_revision,reason,created_by_actor_id
 ) values(
  p_workspace,target_work.id,target_work.revision,'Decision',target_decision.id,target_decision.revision,btrim(p_reason),actor
 ) returning id into link_id;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'work_item.direction_link_added',link_id,p_request);
 insert into wayfound.work_direction_link_create_requests(actor_id,request_id,workspace_id,payload,link_id)
 values(actor,p_request,p_workspace,body,link_id);
 return link_id;
end $$;

create function wayfound.link_work_to_artifact(
 p_workspace uuid,p_work_item uuid,p_artifact uuid,p_version uuid,p_reason text,p_confirm boolean,p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 target_work wayfound.work_items;
 target_artifact wayfound.artifacts;
 target_version wayfound.artifact_versions;
 previous wayfound.work_direction_link_create_requests;
 body jsonb;
 link_id uuid;
begin
 if p_workspace is null or p_work_item is null or p_artifact is null or p_version is null or p_request is null or
    p_reason is null or length(btrim(p_reason)) not between 1 and 2000 or p_confirm is distinct from true then
  raise exception 'Invalid input' using errcode='22023';
 end if;

 select a.id into actor from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id for share of m;
 if actor is null then raise exception 'Access denied' using errcode='42501'; end if;

 body := jsonb_build_object('workspace',p_workspace,'work_item',p_work_item,'target_kind','Artifact',
  'artifact',p_artifact,'version',p_version,'reason',btrim(p_reason),'confirm',true);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':' || p_request::text,0));
 select * into previous from wayfound.work_direction_link_create_requests where actor_id=actor and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists(select 1 from wayfound.memberships m where m.workspace_id=previous.workspace_id and m.actor_id=actor and m.role='owner') then
   raise exception 'Access denied' using errcode='42501';
  end if;
  return previous.link_id;
 end if;

 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
  'work-direction-artifact:' || p_workspace::text || ':' || p_work_item::text || ':' || p_artifact::text,0));
 select * into target_work from wayfound.work_items
 where workspace_id=p_workspace and id=p_work_item for share;
 if target_work.id is null or target_work.owner_actor_id<>actor then
  raise exception 'Work item unavailable' using errcode='23503';
 end if;
 select * into target_artifact from wayfound.artifacts
 where workspace_id=p_workspace and id=p_artifact for share;
 if target_artifact.id is null then raise exception 'Artifact unavailable' using errcode='23503'; end if;
 select * into target_version from wayfound.artifact_versions
 where workspace_id=p_workspace and artifact_id=p_artifact and id=p_version for share;
 if target_version.id is null then raise exception 'Artifact version unavailable' using errcode='23503'; end if;
 if target_artifact.accepted_version_id is distinct from target_version.id or target_version.lifecycle<>'Accepted' then
  raise exception 'Artifact version is not current accepted direction' using errcode='55000';
 end if;
 if exists(select 1 from wayfound.work_direction_links l
  where l.workspace_id=p_workspace and l.work_item_id=p_work_item and l.target_kind='Artifact'
   and l.artifact_id=p_artifact and l.removed_at is null) then
  raise exception 'Active direction link already exists' using errcode='55000';
 end if;

 insert into wayfound.work_direction_links(
  workspace_id,work_item_id,work_revision,target_kind,artifact_id,artifact_revision,
  artifact_version_id,artifact_version_revision,reason,created_by_actor_id
 ) values(
  p_workspace,target_work.id,target_work.revision,'Artifact',target_artifact.id,target_artifact.revision,
  target_version.id,target_version.revision,btrim(p_reason),actor
 ) returning id into link_id;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'work_item.direction_link_added',link_id,p_request);
 insert into wayfound.work_direction_link_create_requests(actor_id,request_id,workspace_id,payload,link_id)
 values(actor,p_request,p_workspace,body,link_id);
 return link_id;
end $$;

create function wayfound.remove_work_direction_link(
 p_workspace uuid,p_link uuid,p_reason text,p_confirm boolean,p_request uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
 subject_id uuid := wayfound.subject();
 actor uuid;
 target_link wayfound.work_direction_links;
 target_work wayfound.work_items;
 previous wayfound.work_direction_link_remove_requests;
 body jsonb;
begin
 if p_workspace is null or p_link is null or p_request is null or
    p_reason is null or length(btrim(p_reason)) not between 1 and 2000 or p_confirm is distinct from true then
  raise exception 'Invalid input' using errcode='22023';
 end if;

 select a.id into actor from wayfound.memberships m join wayfound.actors a on a.id=m.actor_id
 where m.workspace_id=p_workspace and m.role='owner' and a.provider_subject=subject_id for share of m;
 if actor is null then raise exception 'Access denied' using errcode='42501'; end if;
 body := jsonb_build_object('workspace',p_workspace,'link',p_link,'reason',btrim(p_reason),'confirm',true);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(actor::text || ':' || p_request::text,0));
 select * into previous from wayfound.work_direction_link_remove_requests where actor_id=actor and request_id=p_request;
 if found then
  if previous.payload <> body then raise exception 'Request key conflict' using errcode='22023'; end if;
  if not exists(select 1 from wayfound.memberships m where m.workspace_id=previous.workspace_id and m.actor_id=actor and m.role='owner') then
   raise exception 'Access denied' using errcode='42501';
  end if;
  return previous.link_id;
 end if;

 select * into target_link from wayfound.work_direction_links
 where workspace_id=p_workspace and id=p_link for update;
 if not found then raise exception 'Direction link unavailable' using errcode='23503'; end if;
 if target_link.removed_at is not null then raise exception 'Direction link is already inactive' using errcode='55000'; end if;
 select * into target_work from wayfound.work_items
 where workspace_id=p_workspace and id=target_link.work_item_id for share;
 if target_work.id is null or target_work.owner_actor_id<>actor then
  raise exception 'Work item unavailable' using errcode='23503';
 end if;

 update wayfound.work_direction_links
 set removed_by_actor_id=actor,removed_reason=btrim(p_reason),removed_at=now()
 where id=target_link.id;
 insert into wayfound.audit_events(workspace_id,actor_id,operation,entity_id,correlation_id)
 values(p_workspace,actor,'work_item.direction_link_removed',target_link.id,p_request);
 insert into wayfound.work_direction_link_remove_requests(actor_id,request_id,workspace_id,payload,link_id)
 values(actor,p_request,p_workspace,body,target_link.id);
 return target_link.id;
end $$;

revoke all on table wayfound.work_direction_links,wayfound.work_direction_link_create_requests,wayfound.work_direction_link_remove_requests from public,anon,authenticated;
revoke all on function wayfound.link_work_to_decision(uuid,uuid,uuid,text,boolean,uuid) from public,anon,authenticated;
revoke all on function wayfound.link_work_to_artifact(uuid,uuid,uuid,uuid,text,boolean,uuid) from public,anon,authenticated;
revoke all on function wayfound.remove_work_direction_link(uuid,uuid,text,boolean,uuid) from public,anon,authenticated;
grant execute on function wayfound.link_work_to_decision(uuid,uuid,uuid,text,boolean,uuid) to authenticated;
grant execute on function wayfound.link_work_to_artifact(uuid,uuid,uuid,uuid,text,boolean,uuid) to authenticated;
grant execute on function wayfound.remove_work_direction_link(uuid,uuid,text,boolean,uuid) to authenticated;

create function public.link_work_to_decision(p_workspace uuid,p_work_item uuid,p_decision uuid,p_reason text,p_confirm boolean,p_request uuid)
 returns uuid language sql security invoker set search_path = '' as $$
 select wayfound.link_work_to_decision(p_workspace,p_work_item,p_decision,p_reason,p_confirm,p_request)
$$;
create function public.link_work_to_artifact(p_workspace uuid,p_work_item uuid,p_artifact uuid,p_version uuid,p_reason text,p_confirm boolean,p_request uuid)
 returns uuid language sql security invoker set search_path = '' as $$
 select wayfound.link_work_to_artifact(p_workspace,p_work_item,p_artifact,p_version,p_reason,p_confirm,p_request)
$$;
create function public.remove_work_direction_link(p_workspace uuid,p_link uuid,p_reason text,p_confirm boolean,p_request uuid)
 returns uuid language sql security invoker set search_path = '' as $$
 select wayfound.remove_work_direction_link(p_workspace,p_link,p_reason,p_confirm,p_request)
$$;
revoke all on function public.link_work_to_decision(uuid,uuid,uuid,text,boolean,uuid) from public,anon;
revoke all on function public.link_work_to_artifact(uuid,uuid,uuid,uuid,text,boolean,uuid) from public,anon;
revoke all on function public.remove_work_direction_link(uuid,uuid,text,boolean,uuid) from public,anon;
grant execute on function public.link_work_to_decision(uuid,uuid,uuid,text,boolean,uuid) to authenticated;
grant execute on function public.link_work_to_artifact(uuid,uuid,uuid,uuid,text,boolean,uuid) to authenticated;
grant execute on function public.remove_work_direction_link(uuid,uuid,text,boolean,uuid) to authenticated;
