import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateDecisionInput, DecisionRecord } from "@/lib/domain/decision";

const JWT_FUTURE_RETRY_DELAYS_MS = [150, 350, 750] as const;

function isJwtIssuedAtFuture(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST303" && error.message === "JWT issued at future";
}

async function wait(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

export class DecisionStore {
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

  async list(workspaceId: string): Promise<DecisionRecord[]> {
    const { data, error } = await this.rpc("list_decisions", { p_workspace: workspaceId });
    if (error) throw new Error("STORE_UNAVAILABLE");
    return data;
  }

  async create(input: CreateDecisionInput): Promise<string> {
    const { data, error } = await this.rpc("create_decision", {
      p_workspace: input.workspaceId,
      p_title: input.title,
      p_decision: input.decision,
      p_rationale: input.rationale,
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
