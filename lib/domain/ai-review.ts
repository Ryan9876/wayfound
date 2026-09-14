export type AiReviewStatus = "Pending" | "Completed" | "Failed";
export type AiReviewDisposition = "Use as input" | "Needs follow-up" | "Do not use";

export type AiWorkSnapshot = {
  work_item_id: string;
  revision: number;
  stage_number: number;
  title: string;
  outcome: string;
  completion_condition: string;
  evidence_expectation: string;
  status: "Implemented";
  implementation_note: string | null;
};

export type AiReviewRecord = {
  id: string;
  workspace_id: string;
  release_id: string;
  stage_number: number;
  requested_by_actor_id: string;
  target_kind: "work_item";
  work_item_id: string;
  target_revision: number;
  target_snapshot: AiWorkSnapshot;
  purpose: string;
  context_boundary: "work-item-record-only";
  status: AiReviewStatus;
  provider_id: "lm-studio" | "ollama" | null;
  provider_label: string | null;
  model: string | null;
  advisory_result: string | null;
  response_time_ms: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  reasoning_tokens: number | null;
  total_tokens: number | null;
  tokens_per_second: number | null;
  failure_detail: string | null;
  completed_at: string | null;
  disposition: AiReviewDisposition | null;
  disposition_note: string | null;
  disposition_actor_id: string | null;
  disposition_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RequestAiWorkReviewInput = {
  workspaceId: string;
  workItemId: string;
  expectedRevision: number;
  purpose: string;
  confirm: boolean;
  requestId: string;
};

export type AiReviewRequestContext = {
  id: string;
  status: AiReviewStatus;
  purpose: string;
  target_snapshot: AiWorkSnapshot;
};

export type DispositionAiReviewInput = {
  workspaceId: string;
  reviewId: string;
  disposition: AiReviewDisposition;
  note: string;
  confirm: boolean;
  requestId: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateRequestAiWorkReview(input: RequestAiWorkReviewInput): RequestAiWorkReviewInput {
  const result = { ...input, purpose: input.purpose.trim() };
  if (
    !UUID.test(result.workspaceId) ||
    !UUID.test(result.workItemId) ||
    !UUID.test(result.requestId) ||
    !Number.isSafeInteger(result.expectedRevision) ||
    result.expectedRevision < 1 ||
    result.expectedRevision > 2147483647 ||
    !result.purpose ||
    result.purpose.length > 2000 ||
    result.confirm !== true
  ) {
    throw new Error("INVALID_INPUT");
  }
  return result;
}

export function validateDispositionAiReview(input: DispositionAiReviewInput): DispositionAiReviewInput {
  const result = { ...input, note: input.note.trim() };
  if (
    !UUID.test(result.workspaceId) ||
    !UUID.test(result.reviewId) ||
    !UUID.test(result.requestId) ||
    !["Use as input", "Needs follow-up", "Do not use"].includes(result.disposition) ||
    !result.note ||
    result.note.length > 2000 ||
    result.confirm !== true
  ) {
    throw new Error("INVALID_INPUT");
  }
  return result;
}
