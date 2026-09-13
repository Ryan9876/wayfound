export type ArtifactLifecycle = "Proposed";
export type ArtifactSourceKind = "ExternalReference";

export type ArtifactVersionRecord = {
  id: string;
  workspace_id: string;
  artifact_id: string;
  release_id: string;
  stage_number: number;
  version_number: number;
  lifecycle: ArtifactLifecycle;
  summary: string;
  source_kind: ArtifactSourceKind;
  reference_label: string;
  reference_url: string;
  created_by_actor_id: string;
  revision: number;
  created_at: string;
  updated_at: string;
};

export type ArtifactRecord = {
  id: string;
  workspace_id: string;
  release_id: string;
  stage_number: number;
  title: string;
  kind: string;
  created_by_actor_id: string;
  revision: number;
  created_at: string;
  updated_at: string;
  versions: ArtifactVersionRecord[];
};

export type CreateArtifactInput = {
  workspaceId: string;
  title: string;
  kind: string;
  summary: string;
  referenceLabel: string;
  referenceUrl: string;
  requestId: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validReference(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateCreateArtifact(input: CreateArtifactInput): CreateArtifactInput {
  const result = {
    ...input,
    title: input.title.trim(),
    kind: input.kind.trim(),
    summary: input.summary.trim(),
    referenceLabel: input.referenceLabel.trim(),
    referenceUrl: input.referenceUrl.trim(),
  };

  if (
    !UUID.test(result.workspaceId) ||
    !UUID.test(result.requestId) ||
    !result.title || result.title.length > 160 ||
    !result.kind || result.kind.length > 80 ||
    !result.summary || result.summary.length > 4000 ||
    !result.referenceLabel || result.referenceLabel.length > 160 ||
    !result.referenceUrl || result.referenceUrl.length > 2048 ||
    !validReference(result.referenceUrl)
  ) {
    throw new Error("INVALID_INPUT");
  }

  return result;
}
