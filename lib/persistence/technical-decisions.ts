import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AcceptTechnicalChoiceInput,
  AssignTechnicalChoiceReviewInput,
  CreateTechnicalChoiceInput,
  ReviseTechnicalChoiceInput,
  SubmitTechnicalChoiceReviewInput,
  TechnicalChoiceProposalRecord,
  TechnicalChoiceSpecialistAssignment,
} from "@/lib/domain/technical-decision";

const JWT_FUTURE_RETRY_DELAYS_MS = [150, 350, 750] as const;

function isJwtIssuedAtFuture(error: { code?: string; message?: string } | null) {
  return error?.code === "PGRST303" && error.message === "JWT issued at future";
}

async function wait(ms: number) {
  await new Promise(resolve => setTimeout(resolve, ms));
}

function mapMutationError(error: { code?: string; message?: string }) {
  if (error.code === "42501" || error.code === "28000") throw new Error("ACCESS_DENIED");
  if (error.code === "23503") throw new Error("INVALID_TARGET");
  if (error.code === "23505" || error.code === "55000") {
    if (error.message?.includes("Stale proposal revision")) throw new Error("STALE_STATE");
    throw new Error("INVALID_STATE");
  }
  if (error.code === "22023") {
    if (error.message?.includes("Request key conflict")) throw new Error("REQUEST_CONFLICT");
    throw new Error("INVALID_INPUT");
  }
  throw new Error("STORE_UNAVAILABLE");
}

export class TechnicalDecisionStore {
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

  async listForOwner(workspaceId: string): Promise<TechnicalChoiceProposalRecord[]> {
    const { data, error } = await this.rpc("list_owner_technical_choices", { p_workspace: workspaceId });
    if (error) throw new Error(error.code === "42501" || error.code === "28000" ? "ACCESS_DENIED" : "STORE_UNAVAILABLE");
    return data;
  }

  async listMine(): Promise<TechnicalChoiceSpecialistAssignment[]> {
    const { data, error } = await this.rpc("list_my_technical_choice_reviews");
    if (error) throw new Error(error.code === "42501" || error.code === "28000" ? "ACCESS_DENIED" : "STORE_UNAVAILABLE");
    return data;
  }

  async create(input: CreateTechnicalChoiceInput): Promise<string> {
    const { data, error } = await this.rpc("create_technical_choice_proposal", {
      p_workspace: input.workspaceId,
      p_title: input.title,
      p_choice: input.choiceStatement,
      p_rationale: input.rationale,
      p_alternatives: input.alternatives,
      p_consequences: input.consequences,
      p_requested_competence: input.requestedCompetence,
      p_review_question: input.reviewQuestion,
      p_proposal_confirm: input.confirmProposal,
      p_request: input.requestId,
    });
    if (error) mapMutationError(error);
    return data;
  }

  async revise(input: ReviseTechnicalChoiceInput): Promise<number> {
    const { data, error } = await this.rpc("revise_technical_choice_proposal", {
      p_workspace: input.workspaceId,
      p_proposal: input.proposalId,
      p_expected_revision: input.expectedRevision,
      p_title: input.title,
      p_choice: input.choiceStatement,
      p_rationale: input.rationale,
      p_alternatives: input.alternatives,
      p_consequences: input.consequences,
      p_requested_competence: input.requestedCompetence,
      p_review_question: input.reviewQuestion,
      p_proposal_confirm: input.confirmProposal,
      p_request: input.requestId,
    });
    if (error) mapMutationError(error);
    return data;
  }

  async assign(input: AssignTechnicalChoiceReviewInput): Promise<string> {
    const { data, error } = await this.rpc("assign_technical_choice_review", {
      p_workspace: input.workspaceId,
      p_proposal: input.proposalId,
      p_expected_revision: input.expectedRevision,
      p_reviewer: input.reviewerCode,
      p_scope_confirm: input.confirmScope,
      p_request: input.requestId,
    });
    if (error) mapMutationError(error);
    return data;
  }

  async submit(input: SubmitTechnicalChoiceReviewInput): Promise<string> {
    const { data, error } = await this.rpc("record_technical_choice_review", {
      p_assignment: input.assignmentId,
      p_reviewer_name: input.reviewerName,
      p_competence_statement: input.competenceStatement,
      p_conclusion: input.conclusion,
      p_summary: input.summary,
      p_findings: input.findings,
      p_competence_confirm: input.confirmCompetence,
      p_request: input.requestId,
    });
    if (error) mapMutationError(error);
    return data;
  }

  async accept(input: AcceptTechnicalChoiceInput): Promise<string> {
    const { data, error } = await this.rpc("accept_technical_choice", {
      p_workspace: input.workspaceId,
      p_proposal: input.proposalId,
      p_expected_revision: input.expectedRevision,
      p_direction_confirm: input.confirmDirection,
      p_request: input.requestId,
    });
    if (error) mapMutationError(error);
    return data;
  }
}
