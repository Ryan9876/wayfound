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
  status: "Proposed";
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
