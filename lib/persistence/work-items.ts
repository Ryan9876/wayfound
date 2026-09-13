import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateWorkItemInput, WorkItemRecord } from "@/lib/domain/work-item";

const JWT_FUTURE_RETRY_DELAYS_MS = [150, 350, 750] as const;

function isJwtIssuedAtFuture(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST303" && error.message === "JWT issued at future";
}

async function wait(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

export class WorkItemStore {
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

  async list(workspaceId: string): Promise<WorkItemRecord[]> {
    const { data, error } = await this.rpc("list_work_items", { p_workspace: workspaceId });
    if (error) {
      if (error.code === "42501") throw new Error("ACCESS_DENIED");
      throw new Error("STORE_UNAVAILABLE");
    }
    return data;
  }

  async create(input: CreateWorkItemInput): Promise<string> {
    const { data, error } = await this.rpc("create_proposed_work_item", {
      p_workspace: input.workspaceId,
      p_title: input.title,
      p_outcome: input.outcome,
      p_completion_condition: input.completionCondition,
      p_evidence_expectation: input.evidenceExpectation,
      p_request: input.requestId,
    });
    if (error) {
      if (error.code === "22023") throw new Error("REQUEST_CONFLICT");
      if (error.code === "42501") throw new Error("ACCESS_DENIED");
      throw new Error("STORE_UNAVAILABLE");
    }
    return data;
  }
}
