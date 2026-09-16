"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { workItemService } from "@/lib/application/work-items";

export type DirectionLinkFormState = { error: string };

async function checkOrigin() {
  const origin = (await headers()).get("origin");
  if (!process.env.APP_ORIGIN || origin !== process.env.APP_ORIGIN) {
    throw new Error("Invalid request origin");
  }
}

function parseTarget(value: string) {
  const parts = value.split(":");
  if (parts[0] === "decision" && parts.length === 2) {
    return { kind: "Decision" as const, decisionId: parts[1] };
  }
  if (parts[0] === "artifact" && parts.length === 3) {
    return { kind: "Artifact" as const, artifactId: parts[1], versionId: parts[2] };
  }
  return null;
}

export async function addWorkDirectionLink(
  _: DirectionLinkFormState,
  form: FormData,
): Promise<DirectionLinkFormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const workItemId = String(form.get("workItemId") ?? "");
  const target = parseTarget(String(form.get("directionTarget") ?? ""));
  const reason = String(form.get("reason") ?? "");
  const confirm = form.get("confirm") === "on";
  const requestId = String(form.get("requestId") ?? "");
  if (!target) return { error: "Choose accepted project direction to link to this work." };

  const service = await workItemService();
  try {
    if (target.kind === "Decision") {
      await service.addDecisionLink({
        workspaceId,
        workItemId,
        decisionId: target.decisionId,
        reason,
        confirm,
        requestId,
      });
    } else {
      await service.addArtifactLink({
        workspaceId,
        workItemId,
        artifactId: target.artifactId,
        versionId: target.versionId,
        reason,
        confirm,
        requestId,
      });
    }
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({
      operation: "add_work_direction_link",
      workspace_id: workspaceId,
      work_item_id: workItemId,
      target_kind: target.kind,
      outcome: "failed",
      code,
    }));
    return {
      error: code === "INVALID_INPUT"
        ? "Choose accepted project direction, explain why the work relies on it, and confirm the link."
        : code === "REQUEST_CONFLICT"
          ? "This link request was already used with different details. Reload the workspace before starting again."
          : code === "INVALID_TARGET"
            ? "The selected work or project direction is not available in this workspace."
            : code === "INVALID_STATE"
              ? "This project direction is no longer eligible or is already linked. Reload the workspace to review current records."
              : code === "ACCESS_DENIED"
                ? "This workspace is not available for project-direction changes."
                : "We could not confirm the project-direction link. Existing work and records are unchanged. Retry with the same details to avoid duplicate history.",
    };
  }

  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/workspaces");
  redirect(`/workspaces/${workspaceId}?view=work#work-item-${workItemId}`);
}

export async function removeWorkDirectionLink(
  _: DirectionLinkFormState,
  form: FormData,
): Promise<DirectionLinkFormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const workItemId = String(form.get("workItemId") ?? "");
  const linkId = String(form.get("linkId") ?? "");
  const service = await workItemService();
  try {
    await service.removeDirectionLink({
      workspaceId,
      linkId,
      reason: String(form.get("reason") ?? ""),
      confirm: form.get("confirm") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({
      operation: "remove_work_direction_link",
      workspace_id: workspaceId,
      work_item_id: workItemId,
      link_id: linkId,
      outcome: "failed",
      code,
    }));
    return {
      error: code === "INVALID_INPUT"
        ? "Explain why this project-direction link no longer applies and confirm removal."
        : code === "REQUEST_CONFLICT"
          ? "This removal request was already used with different details. Reload the workspace before starting again."
          : code === "INVALID_TARGET"
            ? "This project-direction link is not available in this workspace."
            : code === "INVALID_STATE"
              ? "This project-direction link is already inactive. Reload the workspace to review current links."
              : code === "ACCESS_DENIED"
                ? "This workspace is not available for project-direction changes."
                : "We could not confirm project-direction removal. Existing work and records are unchanged. Retry with the same details to avoid duplicate history.",
    };
  }

  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/workspaces");
  redirect(`/workspaces/${workspaceId}?view=work#work-item-${workItemId}`);
}
