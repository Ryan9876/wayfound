"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirementService } from "@/lib/application/requirements";

export async function addOwnerCriterion(_: { error: string }, form: FormData): Promise<{ error: string }> {
  if (!process.env.APP_ORIGIN || (await headers()).get("origin") !== process.env.APP_ORIGIN) throw new Error("Invalid request origin");
  const workspaceId = String(form.get("workspaceId") ?? "");
  const requirementId = String(form.get("requirementId") ?? "");
  const service = await requirementService();
  let criterionId: string;
  try {
    criterionId = await service.addCriterion({
      workspaceId, requirementId,
      expectedRevision: Number(form.get("expectedRevision")),
      statement: String(form.get("statement") ?? ""),
      reason: String(form.get("reason") ?? ""),
      confirm: form.get("confirm") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "add_owner_criterion", workspace_id: workspaceId, requirement_id: requirementId, outcome: "failed", code }));
    return { error: code === "INVALID_INPUT" ? "Enter a condition and reason, then confirm your authority."
      : code === "INVALID_STATE" ? "The requirement changed or this condition already exists. Reload to review the saved conditions before trying again."
      : code === "ACCESS_DENIED" ? "This requirement is not available for an owner-only condition change."
      : code === "INVALID_TARGET" ? "This requirement is not available in this workspace."
      : code === "REQUEST_CONFLICT" ? "This request was already used with different details. Reload before starting a new request."
      : "We could not confirm the save. Retry with the same details to avoid duplicates." };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  redirect(`/workspaces/${workspaceId}?view=records#criterion-${criterionId}`);
}
