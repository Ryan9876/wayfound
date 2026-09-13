import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateInput, Workspace } from "@/lib/domain/workspace";

const JWT_FUTURE_RETRY_DELAYS_MS = [150, 350, 750] as const;

function isJwtIssuedAtFuture(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST303" && error.message === "JWT issued at future";
}

async function wait(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

export class WorkspaceStore {
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

  async list(): Promise<Workspace[]> {
    const { data, error } = await this.rpc("list_workspaces");
    if (error) throw new Error("STORE_UNAVAILABLE");
    return data;
  }

  async open(id: string): Promise<Workspace | null> {
    const { data, error } = await this.rpc("open_workspace", { p_id: id });
    if (error) throw new Error("STORE_UNAVAILABLE");
    return data;
  }

  async create(input: CreateInput): Promise<string> {
    const { data, error } = await this.rpc("create_workspace", {
      p_name: input.name,
      p_problem: input.problem,
      p_release: input.release,
      p_request: input.requestId,
    });
    if (error) throw new Error(error.code === "22023" ? "REQUEST_CONFLICT" : "STORE_UNAVAILABLE");
    return data;
  }
}
