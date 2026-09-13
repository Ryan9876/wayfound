import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateInput, Workspace } from "@/lib/domain/workspace";
export class WorkspaceStore {
  constructor(private readonly client: SupabaseClient) {}
  async list(): Promise<Workspace[]> {
    const { data, error } = await this.client.rpc("list_workspaces");
    if (error) throw new Error("STORE_UNAVAILABLE");
    return data;
  }
  async open(id: string): Promise<Workspace | null> {
    const { data, error } = await this.client.rpc("open_workspace", { p_id: id });
    if (error) throw new Error("STORE_UNAVAILABLE");
    return data;
  }
  async create(input: CreateInput): Promise<string> {
    const { data, error } = await this.client.rpc("create_workspace", {
      p_name: input.name, p_problem: input.problem, p_release: input.release, p_request: input.requestId,
    });
    if (error) throw new Error(error.code === "22023" ? "REQUEST_CONFLICT" : "STORE_UNAVAILABLE");
    return data;
  }
}
