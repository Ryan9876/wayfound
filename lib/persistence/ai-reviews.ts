import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AiReviewRequestContext,
  DispositionAiReviewInput,
  RequestAiWorkReviewInput,
} from "@/lib/domain/ai-review";
import type { LocalAiReviewResult } from "@/lib/ai/local-ai-review";

const JWT_FUTURE_RETRY_DELAYS_MS = [150, 350, 750] as const;

function isJwtIssuedAtFuture(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST303" && error.message === "JWT issued at future";
}

async function wait(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

function mapError(error: { code?: string } | null): never {
  if (error?.code === "22023") throw new Error("REQUEST_CONFLICT");
  if (error?.code === "42501") throw new Error("ACCESS_DENIED");
  if (error?.code === "23503") throw new Error("INVALID_TARGET");
  if (error?.code === "55000") throw new Error("INVALID_STATE");
  throw new Error("STORE_UNAVAILABLE");
}

export class AiReviewStore {
  constructor(private readonly client: SupabaseClient) {}

  private async rpc(name: string, args?: Record<string, unknown>) {
    let result = await this.client.rpc(name, args);
    for (const delay of JWT_FUTURE_RETRY_DELAYS_MS) {
      if (!isJwtIssuedAtFuture(result.error)) return result;
      await wait(delay);
      result = await this.client.rpc(name, args);
    }
    return result;
  }

  async request(input: RequestAiWorkReviewInput): Promise<AiReviewRequestContext> {
    const { data, error } = await this.rpc("request_ai_work_review", {
      p_workspace: input.workspaceId,
      p_work_item: input.workItemId,
      p_expected_revision: input.expectedRevision,
      p_purpose: input.purpose,
      p_confirm: input.confirm,
      p_request: input.requestId,
    });
    if (error) mapError(error);
    return data as AiReviewRequestContext;
  }

  async complete(workspaceId: string, reviewId: string, result: LocalAiReviewResult): Promise<string> {
    if (!result.ok || !result.provider || !result.providerLabel || !result.model || !result.output) {
      throw new Error("INVALID_AI_RESULT");
    }
    const { data, error } = await this.rpc("complete_ai_review", {
      p_workspace: workspaceId,
      p_review: reviewId,
      p_provider_id: result.provider,
      p_provider_label: result.providerLabel,
      p_model: result.model,
      p_result: result.output,
      p_response_time_ms: result.responseTimeMs,
      p_prompt_tokens: result.promptTokens,
      p_completion_tokens: result.completionTokens,
      p_reasoning_tokens: result.reasoningTokens,
      p_total_tokens: result.totalTokens,
      p_tokens_per_second: result.tokensPerSecond,
    });
    if (error) mapError(error);
    return data as string;
  }

  async fail(workspaceId: string, reviewId: string, result: LocalAiReviewResult): Promise<string> {
    const { data, error } = await this.rpc("fail_ai_review", {
      p_workspace: workspaceId,
      p_review: reviewId,
      p_provider_id: result.provider,
      p_provider_label: result.providerLabel,
      p_model: result.model,
      p_failure_detail: result.detail,
    });
    if (error) mapError(error);
    return data as string;
  }

  async disposition(input: DispositionAiReviewInput): Promise<string> {
    const { data, error } = await this.rpc("disposition_ai_review", {
      p_workspace: input.workspaceId,
      p_review: input.reviewId,
      p_disposition: input.disposition,
      p_note: input.note,
      p_confirm: input.confirm,
      p_request: input.requestId,
    });
    if (error) mapError(error);
    return data as string;
  }
}
