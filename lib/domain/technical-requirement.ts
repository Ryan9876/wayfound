export type TechnicalRequirementReviewConclusion = "No blocking finding" | "Changes required" | "Advisory";
export type TechnicalRequirementObligation = "MUST" | "SHOULD" | "MAY";

export type TechnicalRequirementReviewRecord = {
  id: string;
  assignment_id: string;
  workspace_id: string;
  proposal_id: string;
  proposal_revision: number;
  reviewer_actor_id: string;
  reviewer_name: string;
  competence_statement: string;
  conclusion: TechnicalRequirementReviewConclusion;
  summary: string;
  findings: string;
  revision: number;
  reviewed_at: string;
  updated_at: string;
};

export type TechnicalRequirementOwnerAssignment = {
  id: string;
  workspace_id: string;
  proposal_id: string;
  proposal_revision: number;
  reviewer_actor_id: string;
  assigned_by_actor_id: string;
  requested_competence: string;
  review_question: string;
  status: "Pending" | "Reviewed";
  revision: number;
  assigned_at: string;
  updated_at: string;
  review: TechnicalRequirementReviewRecord | null;
};

export type TechnicalRequirementApprovalRecord = {
  id: string;
  workspace_id: string;
  proposal_id: string;
  proposal_revision: number;
  assignment_id: string;
  review_id: string;
  reviewer_actor_id: string;
  review_conclusion: "No blocking finding";
  requirement_id: string;
  criterion_id: string;
  approved_by_actor_id: string;
  approved_at: string;
  created_at: string;
};

export type TechnicalRequirementProposalRecord = {
  id: string;
  workspace_id: string;
  release_id: string;
  stage_number: number;
  title: string;
  obligation: TechnicalRequirementObligation;
  requirement_statement: string;
  acceptance_criterion: string;
  requested_competence: string;
  review_question: string;
  status: "Proposed" | "Approved";
  revision: number;
  proposed_by_actor_id: string;
  created_at: string;
  updated_at: string;
  assignments: TechnicalRequirementOwnerAssignment[];
  approval: TechnicalRequirementApprovalRecord | null;
};

export type TechnicalRequirementSpecialistAssignment = TechnicalRequirementOwnerAssignment & {
  workspace_name: string;
  proposal_title: string;
  obligation: TechnicalRequirementObligation;
  requirement_statement: string;
  acceptance_criterion: string;
};

export type CreateTechnicalRequirementInput = {
  workspaceId: string;
  title: string;
  obligation: TechnicalRequirementObligation;
  requirementStatement: string;
  acceptanceCriterion: string;
  requestedCompetence: string;
  reviewQuestion: string;
  confirmProposal: boolean;
  requestId: string;
};

export type ReviseTechnicalRequirementInput = CreateTechnicalRequirementInput & {
  proposalId: string;
  expectedRevision: number;
};

export type AssignTechnicalRequirementReviewInput = {
  workspaceId: string;
  proposalId: string;
  expectedRevision: number;
  reviewerCode: string;
  confirmScope: boolean;
  requestId: string;
};

export type SubmitTechnicalRequirementReviewInput = {
  assignmentId: string;
  reviewerName: string;
  competenceStatement: string;
  conclusion: TechnicalRequirementReviewConclusion;
  summary: string;
  findings: string;
  confirmCompetence: boolean;
  requestId: string;
};

export type ApproveTechnicalRequirementInput = {
  workspaceId: string;
  proposalId: string;
  expectedRevision: number;
  confirmDirection: boolean;
  requestId: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const OBLIGATIONS = new Set<TechnicalRequirementObligation>(["MUST", "SHOULD", "MAY"]);
const CONCLUSIONS = new Set<TechnicalRequirementReviewConclusion>(["No blocking finding", "Changes required", "Advisory"]);

function cleanText(value: string, max: number) {
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > max) throw new Error("INVALID_INPUT");
  return cleaned;
}

export function validateCreateTechnicalRequirement(input: CreateTechnicalRequirementInput): CreateTechnicalRequirementInput {
  if (!UUID.test(input.workspaceId) || !UUID.test(input.requestId) || input.confirmProposal !== true || !OBLIGATIONS.has(input.obligation)) {
    throw new Error("INVALID_INPUT");
  }
  return {
    ...input,
    title: cleanText(input.title, 160),
    requirementStatement: cleanText(input.requirementStatement, 4000),
    acceptanceCriterion: cleanText(input.acceptanceCriterion, 4000),
    requestedCompetence: cleanText(input.requestedCompetence, 500),
    reviewQuestion: cleanText(input.reviewQuestion, 2000),
  };
}

export function validateReviseTechnicalRequirement(input: ReviseTechnicalRequirementInput): ReviseTechnicalRequirementInput {
  const validated = validateCreateTechnicalRequirement(input);
  if (!UUID.test(input.proposalId) || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 1) throw new Error("INVALID_INPUT");
  return { ...validated, proposalId: input.proposalId, expectedRevision: input.expectedRevision };
}

export function validateAssignTechnicalRequirementReview(input: AssignTechnicalRequirementReviewInput): AssignTechnicalRequirementReviewInput {
  const reviewerCode = input.reviewerCode.trim();
  if (
    !UUID.test(input.workspaceId) || !UUID.test(input.proposalId) || !UUID.test(reviewerCode) || !UUID.test(input.requestId) ||
    !Number.isInteger(input.expectedRevision) || input.expectedRevision < 1 || input.confirmScope !== true
  ) throw new Error("INVALID_INPUT");
  return { ...input, reviewerCode };
}

export function validateSubmitTechnicalRequirementReview(input: SubmitTechnicalRequirementReviewInput): SubmitTechnicalRequirementReviewInput {
  const reviewerName = input.reviewerName.trim();
  const competenceStatement = input.competenceStatement.trim();
  const summary = input.summary.trim();
  const findings = input.findings.trim();
  if (
    !UUID.test(input.assignmentId) || !UUID.test(input.requestId) ||
    !reviewerName || reviewerName.length > 160 ||
    !competenceStatement || competenceStatement.length > 500 ||
    !CONCLUSIONS.has(input.conclusion) ||
    !summary || summary.length > 4000 || !findings || findings.length > 4000 ||
    input.confirmCompetence !== true
  ) throw new Error("INVALID_INPUT");
  return { ...input, reviewerName, competenceStatement, summary, findings };
}

export function validateApproveTechnicalRequirement(input: ApproveTechnicalRequirementInput): ApproveTechnicalRequirementInput {
  if (
    !UUID.test(input.workspaceId) || !UUID.test(input.proposalId) || !UUID.test(input.requestId) ||
    !Number.isInteger(input.expectedRevision) || input.expectedRevision < 1 || input.confirmDirection !== true
  ) throw new Error("INVALID_INPUT");
  return input;
}
