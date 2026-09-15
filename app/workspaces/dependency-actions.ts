"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { workItemService } from "@/lib/application/work-items";

export type DependencyFormState = { error: string };

async function checkOrigin() {
  const origin = (await headers()).get("origin");
  if (!process.env.APP_ORIGIN || origin !== process.env.APP_ORIGIN) {
    throw new Error("Invalid request origin");
  }
}

export async function addWorkItemDependency(
  _: DependencyFormState,
  form: FormData,
): Promise<DependencyFormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const dependentWorkItemId = String(form.get("dependentWorkItemId") ?? "");
  const service = await workItemService();
  try {
    await service.addDependency({
      workspaceId,
      dependentWorkItemId,
      prerequisiteWorkItemId: String(form.get("prerequisiteWorkItemId") ?? ""),
      reason: String(form.get("reason") ?? ""),
      confirm: form.get("confirm") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({
      operation: "add_work_item_dependency",
      workspace_id: workspaceId,
      dependent_work_item_id: dependentWorkItemId,
      outcome: "failed",
      code,
    }));
    return {
      error: code === "INVALID_INPUT"
        ? "Choose other work, explain the dependency, and confirm the relationship."
        : code === "REQUEST_CONFLICT"
          ? "This dependency request was already used with different details. Reload the workspace before starting again."
          : code === "INVALID_TARGET"
            ? "One of the work items is not available in this workspace."
            : code === "INVALID_STATE"
              ? "This dependency already exists or would create a dependency cycle. Reload the workspace and review the current links."
              : code === "ACCESS_DENIED"
                ? "This workspace is not available for dependency changes."
                : "We could not confirm the dependency save. Existing work and links are unchanged. Retry with the same details to avoid duplicate history.",
    };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/workspaces");
  redirect(`/workspaces/${workspaceId}?view=work#work-item-${dependentWorkItemId}`);
}

export async function removeWorkItemDependency(
  _: DependencyFormState,
  form: FormData,
): Promise<DependencyFormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const workItemId = String(form.get("workItemId") ?? "");
  const dependencyId = String(form.get("dependencyId") ?? "");
  const service = await workItemService();
  try {
    await service.removeDependency({
      workspaceId,
      dependencyId,
      reason: String(form.get("reason") ?? ""),
      confirm: form.get("confirm") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({
      operation: "remove_work_item_dependency",
      workspace_id: workspaceId,
      dependency_id: dependencyId,
      outcome: "failed",
      code,
    }));
    return {
      error: code === "INVALID_INPUT"
        ? "Explain why the dependency no longer applies and confirm removal."
        : code === "REQUEST_CONFLICT"
          ? "This removal request was already used with different details. Reload the workspace before starting again."
          : code === "INVALID_TARGET"
            ? "This dependency is not available in this workspace."
            : code === "INVALID_STATE"
              ? "This dependency is already inactive. Reload the workspace to review current links."
              : code === "ACCESS_DENIED"
                ? "This workspace is not available for dependency changes."
                : "We could not confirm dependency removal. Existing work and links are unchanged. Retry with the same details to avoid duplicate history.",
    };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/workspaces");
  redirect(`/workspaces/${workspaceId}?view=work#work-item-${workItemId}`);
}
