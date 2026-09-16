import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AssignSpecialistReviewInput,
  OwnerSpecialistReviewAssignment,
  SpecialistReviewAssignment,
  SubmitSpecialistReviewInput,
} from "@/lib/domain/specialist-review";

const JWT_FUTURE_RETRY_DELAYS_MS = [150, 350, 750] as const;

function isJwtIssuedAtFuture(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST303" && error.message === "JWT issued at future";
}

async function wait(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

export class SpecialistReviewStore {
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

  async ensureIdentity(): Promise<string> {
    const { data, error } = await this.rpc("ensure_specialist_reviewer_identity");
    if (error) {
      if (error.code === "42501") throw new Error("ACCESS_DENIED");
      throw new Error("STORE_UNAVAILABLE");
    }
    return data;
  }

  async listForOwner(workspaceId: string): Promise<OwnerSpecialistReviewAssignment[]> {
    const { data, error } = await this.rpc("list_owner_specialist_reviews", { p_workspace: workspaceId });
    if (error) throw new Error("STORE_UNAVAILABLE");
    return data;
  }

  async listMine(): Promise<SpecialistReviewAssignment[]> {
    const { data, error } = await this.rpc("list_my_specialist_reviews");
    if (error) throw new Error("STORE_UNAVAILABLE");
    return data;
  }

  async assign(input: AssignSpecialistReviewInput): Promise<string> {
    const { data, error } = await this.rpc("assign_specialist_review", {
      p_workspace: input.workspaceId,
      p_artifact: input.artifactId,
      p_version: input.versionId,
      p_reviewer: input.reviewerCode,
      p_requested_competence: input.requestedCompetence,
      p_review_question: input.reviewQuestion,
      p_scope_confirm: input.confirmScope,
      p_request: input.requestId,
    });
    if (error) {
      if (error.code === "22023") throw new Error("REQUEST_CONFLICT");
      if (error.code === "23503") throw new Error("INVALID_TARGET");
      if (error.code === "42501") throw new Error("ACCESS_DENIED");
      if (error.code === "55000" || error.code === "23505") throw new Error("INVALID_STATE");
      throw new Error("STORE_UNAVAILABLE");
    }
    return data;
  }

  async submit(input: SubmitSpecialistReviewInput): Promise<string> {
    const { data, error } = await this.rpc("record_specialist_review", {
      p_assignment: input.assignmentId,
      p_reviewer_name: input.reviewerName,
      p_competence_statement: input.competenceStatement,
      p_conclusion: input.conclusion,
      p_summary: input.summary,
      p_findings: input.findings,
      p_competence_confirm: input.confirmCompetence,
      p_request: input.requestId,
    });
    if (error) {
      if (error.code === "22023") throw new Error("REQUEST_CONFLICT");
      if (error.code === "23503") throw new Error("INVALID_TARGET");
      if (error.code === "42501") throw new Error("ACCESS_DENIED");
      if (error.code === "55000" || error.code === "23505") throw new Error("INVALID_STATE");
      throw new Error("STORE_UNAVAILABLE");
    }
    return data;
  }
}
