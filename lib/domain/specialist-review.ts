export type SpecialistReviewConclusion = "No blocking finding" | "Changes required" | "Advisory";

export type SpecialistReviewRecord = {
  id: string;
  assignment_id: string;
  workspace_id: string;
  artifact_id: string;
  artifact_version_id: string;
  reviewer_actor_id: string;
  reviewer_name: string;
  competence_statement: string;
  conclusion: SpecialistReviewConclusion;
  summary: string;
  findings: string;
  artifact_revision: number;
  artifact_version_revision: number;
  revision: number;
  reviewed_at: string;
  updated_at: string;
};

export type OwnerSpecialistReviewAssignment = {
  id: string;
  workspace_id: string;
  artifact_id: string;
  artifact_version_id: string;
  reviewer_actor_id: string;
  assigned_by_actor_id: string;
  requested_competence: string;
  review_question: string;
  status: "Pending" | "Reviewed";
  revision: number;
  assigned_at: string;
  updated_at: string;
  review: SpecialistReviewRecord | null;
};

export type SpecialistReviewAssignment = OwnerSpecialistReviewAssignment & {
  workspace_name: string;
  artifact_title: string;
  artifact_kind: string;
  version_number: number;
  version_lifecycle: "Accepted";
  artifact_summary: string;
  reference_label: string;
  reference_url: string;
};

export type AssignSpecialistReviewInput = {
  workspaceId: string;
  artifactId: string;
  versionId: string;
  reviewerCode: string;
  requestedCompetence: string;
  reviewQuestion: string;
  confirmScope: boolean;
  requestId: string;
};

export type SubmitSpecialistReviewInput = {
  assignmentId: string;
  reviewerName: string;
  competenceStatement: string;
  conclusion: SpecialistReviewConclusion;
  summary: string;
  findings: string;
  confirmCompetence: boolean;
  requestId: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONCLUSIONS = new Set<SpecialistReviewConclusion>(["No blocking finding", "Changes required", "Advisory"]);

export function validateAssignSpecialistReview(input: AssignSpecialistReviewInput): AssignSpecialistReviewInput {
  const result = {
    ...input,
    reviewerCode: input.reviewerCode.trim(),
    requestedCompetence: input.requestedCompetence.trim(),
    reviewQuestion: input.reviewQuestion.trim(),
  };
  if (
    !UUID.test(result.workspaceId) ||
    !UUID.test(result.artifactId) ||
    !UUID.test(result.versionId) ||
    !UUID.test(result.reviewerCode) ||
    !UUID.test(result.requestId) ||
    !result.requestedCompetence || result.requestedCompetence.length > 500 ||
    !result.reviewQuestion || result.reviewQuestion.length > 2000 ||
    result.confirmScope !== true
  ) throw new Error("INVALID_INPUT");
  return result;
}

export function validateSubmitSpecialistReview(input: SubmitSpecialistReviewInput): SubmitSpecialistReviewInput {
  const result = {
    ...input,
    reviewerName: input.reviewerName.trim(),
    competenceStatement: input.competenceStatement.trim(),
    summary: input.summary.trim(),
    findings: input.findings.trim(),
  };
  if (
    !UUID.test(result.assignmentId) ||
    !UUID.test(result.requestId) ||
    !result.reviewerName || result.reviewerName.length > 160 ||
    !result.competenceStatement || result.competenceStatement.length > 500 ||
    !CONCLUSIONS.has(result.conclusion) ||
    !result.summary || result.summary.length > 4000 ||
    !result.findings || result.findings.length > 4000 ||
    result.confirmCompetence !== true
  ) throw new Error("INVALID_INPUT");
  return result;
}
