export type AcceptanceCriterionRecord = {
  addition?: { reason: string; from_revision: number; to_revision: number; actor_id: string; created_at: string } | null;
  withdrawal?: {
    reason: string;
    from_requirement_revision: number;
    to_requirement_revision: number;
    from_criterion_revision: number;
    to_criterion_revision: number;
    actor_id: string;
    created_at: string;
  } | null;
  id: string;
  workspace_id: string;
  requirement_id: string;
  statement: string;
  lifecycle: "Active" | "Withdrawn";
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

export type AddCriterionInput = {
  workspaceId: string;
  requirementId: string;
  expectedRevision: number;
  statement: string;
  reason: string;
  confirm: boolean;
  requestId: string;
};

export function validateAddCriterion(input: AddCriterionInput): AddCriterionInput {
  const result = { ...input, statement: input.statement.trim(), reason: input.reason.trim() };
  if (!UUID.test(result.workspaceId) || !UUID.test(result.requirementId) || !UUID.test(result.requestId) ||
      !Number.isSafeInteger(result.expectedRevision) || result.expectedRevision < 1 || !result.confirm ||
      !result.statement || result.statement.length > 4000 || !result.reason || result.reason.length > 2000) {
    throw new Error("INVALID_INPUT");
  }
  return result;
}

export type WithdrawCriterionInput = {
  workspaceId: string;
  requirementId: string;
  criterionId: string;
  expectedRequirementRevision: number;
  expectedCriterionRevision: number;
  reason: string;
  confirm: boolean;
  requestId: string;
};

export function validateWithdrawCriterion(input: WithdrawCriterionInput): WithdrawCriterionInput {
  const result = { ...input, reason: input.reason.trim() };
  if (!UUID.test(result.workspaceId) || !UUID.test(result.requirementId) || !UUID.test(result.criterionId) ||
      !UUID.test(result.requestId) || !Number.isSafeInteger(result.expectedRequirementRevision) ||
      result.expectedRequirementRevision < 1 || !Number.isSafeInteger(result.expectedCriterionRevision) ||
      result.expectedCriterionRevision < 1 || !result.confirm || !result.reason || result.reason.length > 2000) {
    throw new Error("INVALID_INPUT");
  }
  return result;
}
