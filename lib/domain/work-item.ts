import type { AiReviewRecord } from "@/lib/domain/ai-review";

export type WorkItemRecord = {
  id: string;
  workspace_id: string;
  release_id: string;
  stage_number: number;
  title: string;
  outcome: string;
  completion_condition: string;
  evidence_expectation: string;
  owner_actor_id: string;
  status: WorkItemStatus;
  transitions: WorkItemTransition[];
  ai_reviews: AiReviewRecord[];
  dependencies: WorkItemDependencyRecord[];
  dependents: WorkItemDependencyRecord[];
  revision: number;
  created_at: string;
  updated_at: string;
};

export type CreateWorkItemInput = {
  workspaceId: string;
  title: string;
  outcome: string;
  completionCondition: string;
  evidenceExpectation: string;
  requestId: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateCreateWorkItem(input: CreateWorkItemInput): CreateWorkItemInput {
  const result = {
    ...input,
    title: input.title.trim(),
    outcome: input.outcome.trim(),
    completionCondition: input.completionCondition.trim(),
    evidenceExpectation: input.evidenceExpectation.trim(),
  };
  if (
    !UUID.test(result.workspaceId) ||
    !UUID.test(result.requestId) ||
    !result.title || result.title.length > 160 ||
    !result.outcome || result.outcome.length > 4000 ||
    !result.completionCondition || result.completionCondition.length > 4000 ||
    !result.evidenceExpectation || result.evidenceExpectation.length > 4000
  ) {
    throw new Error("INVALID_INPUT");
  }
  return result;
}

export type WorkItemStatus =
  | "Proposed"
  | "Approved"
  | "In progress"
  | "Blocked"
  | "Implemented";

export type WorkItemTransition = {
  id: string;
  actor_id: string;
  from_status: WorkItemStatus;
  to_status: WorkItemStatus;
  from_revision: number;
  to_revision: number;
  reason: string;
  created_at: string;
};

export type WorkItemDependencyRecord = {
  id: string;
  workspace_id: string;
  dependent_work_item_id: string;
  prerequisite_work_item_id: string;
  dependent_revision: number;
  prerequisite_revision: number;
  reason: string;
  created_by_actor_id: string;
  created_at: string;
  dependent_title: string;
  dependent_status: WorkItemStatus;
  dependent_current_revision: number;
  prerequisite_title: string;
  prerequisite_status: WorkItemStatus;
  prerequisite_current_revision: number;
};

export type TransitionWorkItemInput = {
  workspaceId: string;
  workItemId: string;
  expectedRevision: number;
  targetStatus: string;
  reason: string;
  confirm: boolean;
  requestId: string;
};

export function validateTransitionWorkItem(input: TransitionWorkItemInput): TransitionWorkItemInput {
  const result = { ...input, reason: input.reason.trim() };
  if (!UUID.test(result.workspaceId) || !UUID.test(result.workItemId) || !UUID.test(result.requestId) ||
      !Number.isSafeInteger(result.expectedRevision) || result.expectedRevision < 1 || result.expectedRevision > 2147483647 ||
      !["Approved", "In progress", "Blocked", "Implemented"].includes(result.targetStatus) ||
      !result.reason || result.reason.length > 2000 || result.confirm !== true) throw new Error("INVALID_INPUT");
  return result;
}

export type AddWorkItemDependencyInput = {
  workspaceId: string;
  dependentWorkItemId: string;
  prerequisiteWorkItemId: string;
  reason: string;
  confirm: boolean;
  requestId: string;
};

export function validateAddWorkItemDependency(input: AddWorkItemDependencyInput): AddWorkItemDependencyInput {
  const result = { ...input, reason: input.reason.trim() };
  if (
    !UUID.test(result.workspaceId) ||
    !UUID.test(result.dependentWorkItemId) ||
    !UUID.test(result.prerequisiteWorkItemId) ||
    result.dependentWorkItemId === result.prerequisiteWorkItemId ||
    !UUID.test(result.requestId) ||
    !result.reason || result.reason.length > 2000 ||
    result.confirm !== true
  ) throw new Error("INVALID_INPUT");
  return result;
}

export type RemoveWorkItemDependencyInput = {
  workspaceId: string;
  dependencyId: string;
  reason: string;
  confirm: boolean;
  requestId: string;
};

export function validateRemoveWorkItemDependency(input: RemoveWorkItemDependencyInput): RemoveWorkItemDependencyInput {
  const result = { ...input, reason: input.reason.trim() };
  if (
    !UUID.test(result.workspaceId) ||
    !UUID.test(result.dependencyId) ||
    !UUID.test(result.requestId) ||
    !result.reason || result.reason.length > 2000 ||
    result.confirm !== true
  ) throw new Error("INVALID_INPUT");
  return result;
}
