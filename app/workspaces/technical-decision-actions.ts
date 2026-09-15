"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { technicalDecisionService } from "@/lib/application/technical-decisions";

export type TechnicalDecisionFormState = { error: string };

async function checkOrigin() {
  const origin = (await headers()).get("origin");
  if (!process.env.APP_ORIGIN || origin !== process.env.APP_ORIGIN) throw new Error("Invalid request origin");
}

function messageFor(code: string, operation: "proposal" | "revision" | "assignment" | "acceptance") {
  if (code === "INVALID_INPUT") return "Complete the required fields and confirmation before saving.";
  if (code === "REQUEST_CONFLICT") return "This request key was already used with different details. Reload the workspace before starting again.";
  if (code === "INVALID_TARGET") return operation === "assignment" ? "The reviewer or technical choice proposal is not available." : "The technical choice proposal is not available.";
  if (code === "STALE_STATE") return "This technical choice changed after this form was opened. Reload and review the current proposal before continuing.";
  if (code === "INVALID_STATE") {
    if (operation === "acceptance") return "This proposal is not eligible for acceptance. It requires a completed exact-revision specialist review with No blocking finding.";
    if (operation === "assignment") return "This proposal revision cannot receive another specialist assignment in its current state.";
    if (operation === "revision") return "This technical choice can no longer be revised through this action.";
    return "This technical choice cannot be saved in its current state.";
  }
  if (code === "ACCESS_DENIED") return "You do not have current owner authority for this technical choice.";
  return "We could not confirm the save. Existing project records are unchanged. Retry with the same details to avoid duplicate history.";
}

export async function createTechnicalChoice(_: TechnicalDecisionFormState, form: FormData): Promise<TechnicalDecisionFormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const service = await technicalDecisionService();
  try {
    await service.create({
      workspaceId,
      title: String(form.get("title") ?? ""),
      choiceStatement: String(form.get("choiceStatement") ?? ""),
      rationale: String(form.get("rationale") ?? ""),
      alternatives: String(form.get("alternatives") ?? ""),
      consequences: String(form.get("consequences") ?? ""),
      requestedCompetence: String(form.get("requestedCompetence") ?? ""),
      reviewQuestion: String(form.get("reviewQuestion") ?? ""),
      confirmProposal: form.get("confirmProposal") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "technical_choice.propose", workspace_id: workspaceId, outcome: "failed", code }));
    return { error: messageFor(code, "proposal") };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  redirect(`/workspaces/${workspaceId}#technical-decisions`);
}

export async function reviseTechnicalChoice(_: TechnicalDecisionFormState, form: FormData): Promise<TechnicalDecisionFormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const proposalId = String(form.get("proposalId") ?? "");
  const service = await technicalDecisionService();
  try {
    await service.revise({
      workspaceId,
      proposalId,
      expectedRevision: Number(form.get("expectedRevision") ?? 0),
      title: String(form.get("title") ?? ""),
      choiceStatement: String(form.get("choiceStatement") ?? ""),
      rationale: String(form.get("rationale") ?? ""),
      alternatives: String(form.get("alternatives") ?? ""),
      consequences: String(form.get("consequences") ?? ""),
      requestedCompetence: String(form.get("requestedCompetence") ?? ""),
      reviewQuestion: String(form.get("reviewQuestion") ?? ""),
      confirmProposal: form.get("confirmProposal") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "technical_choice.revise", workspace_id: workspaceId, proposal_id: proposalId, outcome: "failed", code }));
    return { error: messageFor(code, "revision") };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/specialist-reviews");
  redirect(`/workspaces/${workspaceId}#technical-choice-${proposalId}`);
}

export async function assignTechnicalChoiceReview(_: TechnicalDecisionFormState, form: FormData): Promise<TechnicalDecisionFormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const proposalId = String(form.get("proposalId") ?? "");
  const service = await technicalDecisionService();
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
    console.error(JSON.stringify({ operation: "technical_choice.review_assign", workspace_id: workspaceId, proposal_id: proposalId, outcome: "failed", code }));
    return { error: messageFor(code, "assignment") };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  revalidatePath("/specialist-reviews");
  redirect(`/workspaces/${workspaceId}#technical-choice-${proposalId}`);
}

export async function acceptTechnicalChoice(_: TechnicalDecisionFormState, form: FormData): Promise<TechnicalDecisionFormState> {
  await checkOrigin();
  const workspaceId = String(form.get("workspaceId") ?? "");
  const proposalId = String(form.get("proposalId") ?? "");
  const service = await technicalDecisionService();
  try {
    await service.accept({
      workspaceId,
      proposalId,
      expectedRevision: Number(form.get("expectedRevision") ?? 0),
      confirmDirection: form.get("confirmDirection") === "on",
      requestId: String(form.get("requestId") ?? ""),
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error(JSON.stringify({ operation: "technical_decision.accept", workspace_id: workspaceId, proposal_id: proposalId, outcome: "failed", code }));
    return { error: messageFor(code, "acceptance") };
  }
  revalidatePath(`/workspaces/${workspaceId}`);
  redirect(`/workspaces/${workspaceId}#technical-choice-${proposalId}`);
}
