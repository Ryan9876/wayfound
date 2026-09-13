export type TechnicalReviewConclusion = "No blocking finding" | "Changes required" | "Advisory";

export type TechnicalChoiceReviewRecord = {
  id: string;
  assignment_id: string;
  workspace_id: string;
  proposal_id: string;
  proposal_revision: number;
  reviewer_actor_id: string;
  reviewer_name: string;
  competence_statement: string;
  conclusion: TechnicalReviewConclusion;
  summary: string;
  findings: string;
  revision: number;
  reviewed_at: string;
  updated_at: string;
};

export type TechnicalChoiceOwnerAssignment = {
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
  review: TechnicalChoiceReviewRecord | null;
};

export type AcceptedTechnicalDecisionRecord = {
  id: string;
  workspace_id: string;
  release_id: string;
  stage_number: number;
  proposal_id: string;
  proposal_revision: number;
  assignment_id: string;
  review_id: string;
  reviewer_actor_id: string;
  review_conclusion: "No blocking finding";
  accepted_by_actor_id: string;
  title: string;
  decision: string;
  rationale: string;
  alternatives: string;
  consequences: string;
  authority: "owner-after-specialist-review";
  status: "Accepted";
  revision: number;
  accepted_at: string;
  created_at: string;
  updated_at: string;
};

export type TechnicalChoiceProposalRecord = {
  id: string;
  workspace_id: string;
  release_id: string;
  stage_number: number;
  title: string;
  choice_statement: string;
  rationale: string;
  alternatives: string;
  consequences: string;
  requested_competence: string;
  review_question: string;
  status: "Proposed" | "Accepted";
  revision: number;
  proposed_by_actor_id: string;
  created_at: string;
  updated_at: string;
  assignments: TechnicalChoiceOwnerAssignment[];
  decision: AcceptedTechnicalDecisionRecord | null;
};

export type TechnicalChoiceSpecialistAssignment = TechnicalChoiceOwnerAssignment & {
  workspace_name: string;
  proposal_title: string;
  choice_statement: string;
  rationale: string;
  alternatives: string;
  consequences: string;
};

export type CreateTechnicalChoiceInput = {
  workspaceId: string;
  title: string;
  choiceStatement: string;
  rationale: string;
  alternatives: string;
  consequences: string;
  requestedCompetence: string;
  reviewQuestion: string;
  confirmProposal: boolean;
  requestId: string;
};

export type ReviseTechnicalChoiceInput = CreateTechnicalChoiceInput & {
  proposalId: string;
  expectedRevision: number;
};

export type AssignTechnicalChoiceReviewInput = {
  workspaceId: string;
  proposalId: string;
  expectedRevision: number;
  reviewerCode: string;
  confirmScope: boolean;
  requestId: string;
};

export type SubmitTechnicalChoiceReviewInput = {
  assignmentId: string;
  reviewerName: string;
  competenceStatement: string;
  conclusion: TechnicalReviewConclusion;
  summary: string;
  findings: string;
  confirmCompetence: boolean;
  requestId: string;
};

export type AcceptTechnicalChoiceInput = {
  workspaceId: string;
  proposalId: string;
  expectedRevision: number;
  confirmDirection: boolean;
  requestId: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONCLUSIONS = new Set<TechnicalReviewConclusion>(["No blocking finding", "Changes required", "Advisory"]);

function cleanText(value: string, max: number) {
  const cleaned = value.trim();
  if (!cleaned || cleaned.length > max) throw new Error("INVALID_INPUT");
  return cleaned;
}

export function validateCreateTechnicalChoice(input: CreateTechnicalChoiceInput): CreateTechnicalChoiceInput {
  if (!UUID.test(input.workspaceId) || !UUID.test(input.requestId) || input.confirmProposal !== true) throw new Error("INVALID_INPUT");
  return {
    ...input,
    title: cleanText(input.title, 160),
    choiceStatement: cleanText(input.choiceStatement, 4000),
    rationale: cleanText(input.rationale, 4000),
    alternatives: cleanText(input.alternatives, 4000),
    consequences: cleanText(input.consequences, 4000),
    requestedCompetence: cleanText(input.requestedCompetence, 500),
    reviewQuestion: cleanText(input.reviewQuestion, 2000),
  };
}

export function validateReviseTechnicalChoice(input: ReviseTechnicalChoiceInput): ReviseTechnicalChoiceInput {
  const validated = validateCreateTechnicalChoice(input);
  if (!UUID.test(input.proposalId) || !Number.isInteger(input.expectedRevision) || input.expectedRevision < 1) throw new Error("INVALID_INPUT");
  return { ...validated, proposalId: input.proposalId, expectedRevision: input.expectedRevision };
}

export function validateAssignTechnicalChoiceReview(input: AssignTechnicalChoiceReviewInput): AssignTechnicalChoiceReviewInput {
  const reviewerCode = input.reviewerCode.trim();
  if (
    !UUID.test(input.workspaceId) || !UUID.test(input.proposalId) || !UUID.test(reviewerCode) || !UUID.test(input.requestId) ||
    !Number.isInteger(input.expectedRevision) || input.expectedRevision < 1 || input.confirmScope !== true
  ) throw new Error("INVALID_INPUT");
  return { ...input, reviewerCode };
}

export function validateSubmitTechnicalChoiceReview(input: SubmitTechnicalChoiceReviewInput): SubmitTechnicalChoiceReviewInput {
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

export function validateAcceptTechnicalChoice(input: AcceptTechnicalChoiceInput): AcceptTechnicalChoiceInput {
  if (
    !UUID.test(input.workspaceId) || !UUID.test(input.proposalId) || !UUID.test(input.requestId) ||
    !Number.isInteger(input.expectedRevision) || input.expectedRevision < 1 || input.confirmDirection !== true
  ) throw new Error("INVALID_INPUT");
  return input;
}
