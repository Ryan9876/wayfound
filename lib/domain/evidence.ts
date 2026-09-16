export type EvidenceEffect = "Supports" | "Challenges" | "Inconclusive";

export type EvidenceRecord = {
  id: string;
  workspace_id: string;
  release_id: string;
  stage_number: number;
  requirement_id: string;
  requirement_revision: number;
  acceptance_criterion_id: string;
  criterion_revision: number;
  title: string;
  result: string;
  source_note: string;
  effect: EvidenceEffect;
  recorded_by_actor_id: string;
  revision: number;
  created_at: string;
  updated_at: string;
};

export type CreateEvidenceInput = {
  workspaceId: string;
  acceptanceCriterionId: string;
  title: string;
  result: string;
  sourceNote: string;
  effect: EvidenceEffect;
  requestId: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EFFECTS = new Set<EvidenceEffect>(["Supports", "Challenges", "Inconclusive"]);

export function validateCreateEvidence(input: CreateEvidenceInput): CreateEvidenceInput {
  const result = {
    ...input,
    title: input.title.trim(),
    result: input.result.trim(),
    sourceNote: input.sourceNote.trim(),
  };

  if (
    !UUID.test(result.workspaceId) ||
    !UUID.test(result.acceptanceCriterionId) ||
    !UUID.test(result.requestId) ||
    !EFFECTS.has(result.effect) ||
    !result.title || result.title.length > 160 ||
    !result.result || result.result.length > 4000 ||
    !result.sourceNote || result.sourceNote.length > 2000
  ) {
    throw new Error("INVALID_INPUT");
  }

  return result;
}
