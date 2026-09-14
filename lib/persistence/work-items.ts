import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AddWorkItemDependencyInput,
  CreateWorkItemInput,
  RemoveWorkItemDependencyInput,
  TransitionWorkItemInput,
  WorkItemRecord,
} from "@/lib/domain/work-item";

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

  async transition(input: TransitionWorkItemInput): Promise<string> {
    const { data, error } = await this.rpc("transition_work_item", {
      p_workspace: input.workspaceId,
      p_work_item: input.workItemId,
      p_expected_revision: input.expectedRevision,
      p_target_status: input.targetStatus,
      p_reason: input.reason,
      p_confirm: input.confirm,
      p_request: input.requestId,
    });
    if (error) {
      if (error.code === "22023") throw new Error("REQUEST_CONFLICT");
      if (error.code === "42501") throw new Error("ACCESS_DENIED");
      if (error.code === "23503") throw new Error("INVALID_TARGET");
      if (error.code === "55000") throw new Error("INVALID_STATE");
      throw new Error("STORE_UNAVAILABLE");
    }
    return data;
  }

  async addDependency(input: AddWorkItemDependencyInput): Promise<string> {
    const { data, error } = await this.rpc("add_work_item_dependency", {
      p_workspace: input.workspaceId,
      p_dependent_work_item: input.dependentWorkItemId,
      p_prerequisite_work_item: input.prerequisiteWorkItemId,
      p_reason: input.reason,
      p_confirm: input.confirm,
      p_request: input.requestId,
    });
    if (error) {
      if (error.code === "22023") throw new Error("REQUEST_CONFLICT");
      if (error.code === "42501") throw new Error("ACCESS_DENIED");
      if (error.code === "23503") throw new Error("INVALID_TARGET");
      if (error.code === "55000" || error.code === "23505") throw new Error("INVALID_STATE");
      throw new Error("STORE_UNAVAILABLE");
    }
    return data;
  }

  async removeDependency(input: RemoveWorkItemDependencyInput): Promise<string> {
    const { data, error } = await this.rpc("remove_work_item_dependency", {
      p_workspace: input.workspaceId,
      p_dependency: input.dependencyId,
      p_reason: input.reason,
      p_confirm: input.confirm,
      p_request: input.requestId,
    });
    if (error) {
      if (error.code === "22023") throw new Error("REQUEST_CONFLICT");
      if (error.code === "42501") throw new Error("ACCESS_DENIED");
      if (error.code === "23503") throw new Error("INVALID_TARGET");
      if (error.code === "55000") throw new Error("INVALID_STATE");
      throw new Error("STORE_UNAVAILABLE");
    }
    return data;
  }
}
