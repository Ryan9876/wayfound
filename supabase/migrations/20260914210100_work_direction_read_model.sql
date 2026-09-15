-- Extend owner work reads with active project-direction links and eligible accepted-direction candidates.
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
 ) order by r.created_at desc,r.id) from wayfound.ai_reviews r where r.workspace_id=p_workspace and r.work_item_id=w.id),'[]'::jsonb),
 'dependencies',coalesce((select jsonb_agg(jsonb_build_object(
  'id',d.id,'workspace_id',d.workspace_id,'dependent_work_item_id',d.dependent_work_item_id,
  'prerequisite_work_item_id',d.prerequisite_work_item_id,'dependent_revision',d.dependent_revision,
  'prerequisite_revision',d.prerequisite_revision,'reason',d.reason,'created_by_actor_id',d.created_by_actor_id,
  'created_at',d.created_at,'dependent_title',dw.title,'dependent_status',dw.status,'dependent_current_revision',dw.revision,
  'prerequisite_title',pw.title,'prerequisite_status',pw.status,'prerequisite_current_revision',pw.revision
 ) order by d.created_at,d.id)
 from wayfound.work_item_dependencies d
 join wayfound.work_items dw on dw.workspace_id=d.workspace_id and dw.id=d.dependent_work_item_id
 join wayfound.work_items pw on pw.workspace_id=d.workspace_id and pw.id=d.prerequisite_work_item_id
 where d.workspace_id=p_workspace and d.dependent_work_item_id=w.id and d.removed_at is null),'[]'::jsonb),
 'dependents',coalesce((select jsonb_agg(jsonb_build_object(
  'id',d.id,'workspace_id',d.workspace_id,'dependent_work_item_id',d.dependent_work_item_id,
  'prerequisite_work_item_id',d.prerequisite_work_item_id,'dependent_revision',d.dependent_revision,
  'prerequisite_revision',d.prerequisite_revision,'reason',d.reason,'created_by_actor_id',d.created_by_actor_id,
  'created_at',d.created_at,'dependent_title',dw.title,'dependent_status',dw.status,'dependent_current_revision',dw.revision,
  'prerequisite_title',pw.title,'prerequisite_status',pw.status,'prerequisite_current_revision',pw.revision
 ) order by d.created_at,d.id)
 from wayfound.work_item_dependencies d
 join wayfound.work_items dw on dw.workspace_id=d.workspace_id and dw.id=d.dependent_work_item_id
 join wayfound.work_items pw on pw.workspace_id=d.workspace_id and pw.id=d.prerequisite_work_item_id
 where d.workspace_id=p_workspace and d.prerequisite_work_item_id=w.id and d.removed_at is null),'[]'::jsonb),
 'dependency_candidates',coalesce((select jsonb_agg(jsonb_build_object(
  'id',candidate.id,'title',candidate.title,'status',candidate.status,'revision',candidate.revision
 ) order by candidate.title,candidate.id)
 from wayfound.work_items candidate
 where candidate.workspace_id=p_workspace and candidate.id<>w.id),'[]'::jsonb),
 'direction_links',coalesce((select jsonb_agg(jsonb_build_object(
  'id',l.id,'workspace_id',l.workspace_id,'work_item_id',l.work_item_id,'work_revision',l.work_revision,
  'target_kind',l.target_kind,'decision_id',l.decision_id,'decision_revision',l.decision_revision,
  'artifact_id',l.artifact_id,'artifact_revision',l.artifact_revision,'artifact_version_id',l.artifact_version_id,
  'artifact_version_revision',l.artifact_version_revision,'reason',l.reason,'created_by_actor_id',l.created_by_actor_id,
  'created_at',l.created_at,
  'decision_title',d.title,'decision_status',d.status,'decision_current_revision',d.revision,
  'artifact_title',a.title,'artifact_current_revision',a.revision,'artifact_current_accepted_version_id',a.accepted_version_id,
  'artifact_version_number',v.version_number,'artifact_version_lifecycle',v.lifecycle,
  'artifact_version_current_revision',v.revision
 ) order by l.created_at,l.id)
 from wayfound.work_direction_links l
 left join wayfound.decisions d on l.target_kind='Decision' and d.workspace_id=l.workspace_id and d.id=l.decision_id
 left join wayfound.artifacts a on l.target_kind='Artifact' and a.workspace_id=l.workspace_id and a.id=l.artifact_id
 left join wayfound.artifact_versions v on l.target_kind='Artifact' and v.workspace_id=l.workspace_id and v.artifact_id=l.artifact_id and v.id=l.artifact_version_id
 where l.workspace_id=p_workspace and l.work_item_id=w.id and l.removed_at is null),'[]'::jsonb),
 'direction_decision_candidates',coalesce((select jsonb_agg(jsonb_build_object(
  'id',d.id,'title',d.title,'status',d.status,'revision',d.revision
 ) order by d.title,d.id)
 from wayfound.decisions d
 where d.workspace_id=p_workspace and d.status='Accepted'
 and not exists(select 1 from wayfound.work_direction_links l
  where l.workspace_id=p_workspace and l.work_item_id=w.id and l.target_kind='Decision'
   and l.decision_id=d.id and l.removed_at is null)),'[]'::jsonb),
 'direction_artifact_candidates',coalesce((select jsonb_agg(jsonb_build_object(
  'artifact_id',a.id,'artifact_title',a.title,'artifact_revision',a.revision,
  'version_id',v.id,'version_number',v.version_number,'version_revision',v.revision,'lifecycle',v.lifecycle
 ) order by a.title,a.id)
 from wayfound.artifacts a
 join wayfound.artifact_versions v on v.workspace_id=a.workspace_id and v.artifact_id=a.id and v.id=a.accepted_version_id
 where a.workspace_id=p_workspace and v.lifecycle='Accepted'
 and not exists(select 1 from wayfound.work_direction_links l
  where l.workspace_id=p_workspace and l.work_item_id=w.id and l.target_kind='Artifact'
   and l.artifact_id=a.id and l.removed_at is null)),'[]'::jsonb)
 ) order by w.created_at desc,w.id) from wayfound.work_items w where w.workspace_id=p_workspace),'[]'::jsonb);
end $$;
