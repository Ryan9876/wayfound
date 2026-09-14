-- Extend the work-item read model with same-workspace dependency candidates for the owner UI.
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
 where candidate.workspace_id=p_workspace and candidate.id<>w.id),'[]'::jsonb)
 ) order by w.created_at desc,w.id) from wayfound.work_items w where w.workspace_id=p_workspace),'[]'::jsonb);
end $$;
