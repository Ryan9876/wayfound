"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { technicalRequirementService } from "@/lib/application/technical-requirements";

export type TechnicalRequirementFormState = { error: string };

async function checkOrigin() {
  const origin = (await headers()).get("origin");
  if (!process.env.APP_ORIGIN || origin !== process.env.APP_ORIGIN) throw new Error("Invalid request origin");
}

function messageFor(code: string, operation: "proposal" | "revision" | "assignment" | "approval") {
  if (code === "INVALID_INPUT") return "Complete the required fields and confirmation before saving.";
  if (code === "REQUEST_CONFLICT") return "This request key was already used with different details. Reload the workspace before starting again.";
  if (code === "INVALID_TARGET") return operation === "assignment" ? "The reviewer or technical requirement proposal is not available." : "The technical requirement proposal is not available.";
  if (code === "STALE_STATE") return "This technical requirement changed after this form was opened. Reload and review the current proposal before continuing.";
  if (code === "INVALID_STATE") {
    if (operation === "approval") return "This proposal is not eligible for approval. It requires a completed exact-revision specialist review with No blocking finding.";
    if (operation === "assignment") return "This proposal revision cannot receive another specialist assignment in its current state.";
    if (operation === "revision") return "This technical requirement can no longer be revised through this action.";
    return "This technical requirement cannot be saved in its current state.";
  }
  if (code === "ACCESS_DENIED") return "You do not have current owner authority for this technical requirement.";
  return "We could not confirm the save. Existing project records are unchanged. Retry with the same details to avoid duplicate history.";
}

export async function createTechnicalRequirement(_: TechnicalRequirementFormState, form: FormData): Promise<TechnicalRequirementFormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const service = await technicalRequirementService();
  try {
    await service.create({
      workspaceId,
      title: String(form.get("title") ?? ""),
      obligation: String(form.get("obligation") ?? "") as "MUST" | "SHOULD" | "MAY",
      requirementStatement: String(form.get("requirementStatement") ?? ""),
      acceptanceCriterion: String(form.get("acceptanceCriterion") ?? ""),
      requestedCompetence: String(form.get("requestedCompetence") ?? ""),
      reviewQuestion: String(form.get("reviewQuestion") ?? ""),
      confirmProposal: form.get("confirmProposal") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "technical_requirement.propose", workspace_id: workspaceId, outcome: "failed", code }));
    return { error: messageFor(code, "proposal") };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  redirect(`/workspaces/${workspaceId}#technical-requirements`);
}

export async function reviseTechnicalRequirement(_: TechnicalRequirementFormState, form: FormData): Promise<TechnicalRequirementFormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const proposalId = String(form.get("proposalId") ?? "");
  const service = await technicalRequirementService();
  try {
    await service.revise({
      workspaceId,
      proposalId,
      expectedRevision: Number(form.get("expectedRevision") ?? 0),
      title: String(form.get("title") ?? ""),
      obligation: String(form.get("obligation") ?? "") as "MUST" | "SHOULD" | "MAY",
      requirementStatement: String(form.get("requirementStatement") ?? ""),
      acceptanceCriterion: String(form.get("acceptanceCriterion") ?? ""),
      requestedCompetence: String(form.get("requestedCompetence") ?? ""),
      reviewQuestion: String(form.get("reviewQuestion") ?? ""),
      confirmProposal: form.get("confirmProposal") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "technical_requirement.revise", workspace_id: workspaceId, proposal_id: proposalId, outcome: "failed", code }));
    return { error: messageFor(code, "revision") };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/specialist-reviews");
  redirect(`/workspaces/${workspaceId}#technical-requirement-${proposalId}`);
}

export async function assignTechnicalRequirementReview(_: TechnicalRequirementFormState, form: FormData): Promise<TechnicalRequirementFormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const proposalId = String(form.get("proposalId") ?? "");
  const service = await technicalRequirementService();
  try {
    await service.assign({
      workspaceId,
      proposalId,
      expectedRevision: Number(form.get("expectedRevision") ?? 0),
      reviewerCode: String(form.get("reviewerCode") ?? ""),
      confirmScope: form.get("confirmScope") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "technical_requirement.review_assign", workspace_id: workspaceId, proposal_id: proposalId, outcome: "failed", code }));
    return { error: messageFor(code, "assignment") };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/specialist-reviews");
  redirect(`/workspaces/${workspaceId}#technical-requirement-${proposalId}`);
}

export async function approveTechnicalRequirement(_: TechnicalRequirementFormState, form: FormData): Promise<TechnicalRequirementFormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const proposalId = String(form.get("proposalId") ?? "");
  const service = await technicalRequirementService();
  try {
    await service.approve({
      workspaceId,
      proposalId,
      expectedRevision: Number(form.get("expectedRevision") ?? 0),
      confirmDirection: form.get("confirmDirection") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "technical_requirement.approve", workspace_id: workspaceId, proposal_id: proposalId, outcome: "failed", code }));
    return { error: messageFor(code, "approval") };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  redirect(`/workspaces/${workspaceId}#technical-requirement-${proposalId}`);
}
