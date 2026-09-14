export type AcceptanceCriterionRecord = {
  id: string;
  workspace_id: string;
  requirement_id: string;
  statement: string;
  revision: number;
  created_at: string;
  updated_at: string;
};

export type RequirementRecord = {
  id: string;
  workspace_id: string;
  release_id: string;
  stage_number: number;
  title: string;
  obligation: "MUST" | "SHOULD" | "MAY";
  requirement: string;
  kind: "product" | "technical";
  authority: "owner" | "owner-after-specialist-review";
  status: "Approved";
  approving_actor_id: string;
  revision: number;
  acceptance_criteria: AcceptanceCriterionRecord[];
  created_at: string;
  updated_at: string;
};

export type CreateRequirementInput = {
  workspaceId: string;
  title: string;
  obligation: "MUST" | "SHOULD" | "MAY";
  requirement: string;
  acceptanceCriterion: string;
  confirmAuthority: boolean;
  requestId: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBLIGATIONS = new Set(["MUST", "SHOULD", "MAY"]);

export function validateCreateRequirement(input: CreateRequirementInput): CreateRequirementInput {
  const result = {
    ...input,
    title: input.title.trim(),
    requirement: input.requirement.trim(),
    acceptanceCriterion: input.acceptanceCriterion.trim(),
  };
  if (
    !UUID.test(result.workspaceId) ||
    !UUID.test(result.requestId) ||
    !result.confirmAuthority ||
    !OBLIGATIONS.has(result.obligation) ||
    !result.title || result.title.length > 160 ||
    !result.requirement || result.requirement.length > 4000 ||
    !result.acceptanceCriterion || result.acceptanceCriterion.length > 4000
  ) {
    throw new Error("INVALID_INPUT");
  }
  return result;
}
