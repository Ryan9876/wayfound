export type DecisionRecord = {
  id: string;
  workspace_id: string;
  release_id: string;
  stage_number: number;
  title: string;
  decision: string;
  rationale: string;
  authority: "owner";
  status: "Accepted";
  revision: number;
  created_at: string;
  updated_at: string;
};

export type CreateDecisionInput = {
  workspaceId: string;
  title: string;
  decision: string;
  rationale: string;
  confirmAuthority: boolean;
  requestId: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateCreateDecision(input: CreateDecisionInput): CreateDecisionInput {
  const result = {
    ...input,
    title: input.title.trim(),
    decision: input.decision.trim(),
    rationale: input.rationale.trim(),
  };
  if (
    !UUID.test(result.workspaceId) ||
    !UUID.test(result.requestId) ||
    !result.title || result.title.length > 160 ||
    !result.decision || result.decision.length > 4000 ||
    !result.rationale || result.rationale.length > 4000 ||
    !result.confirmAuthority
  ) {
    throw new Error("INVALID_INPUT");
  }
  return result;
}
