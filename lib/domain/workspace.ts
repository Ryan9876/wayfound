export type Workspace = {
  id: string; name: string; problem_statement: string; revision: number;
  release: { id: string; label: string; lifecycle: string; current_stage: number };
  stages: { stage_number: number; state: string }[];
};
export type CreateInput = { name: string; problem: string; release: string; requestId: string };
export function validateCreate(input: CreateInput): CreateInput {
  const result = { ...input, name: input.name.trim(), problem: input.problem.trim(), release: input.release.trim() };
  if (!result.name || result.name.length > 120 || !result.problem || result.problem.length > 2000 || !result.release || result.release.length > 80 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result.requestId)) {
    throw new Error("INVALID_INPUT");
  }
  return result;
}
