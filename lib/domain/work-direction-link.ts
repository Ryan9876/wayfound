export type WorkDirectionLinkTargetKind = "Decision" | "Artifact";

export type WorkDirectionLinkRecord = {
  id: string;
  workspace_id: string;
  work_item_id: string;
  work_revision: number;
  target_kind: WorkDirectionLinkTargetKind;
  decision_id: string | null;
  decision_revision: number | null;
  artifact_id: string | null;
  artifact_revision: number | null;
  artifact_version_id: string | null;
  artifact_version_revision: number | null;
  reason: string;
  created_by_actor_id: string;
  created_at: string;
  decision_title: string | null;
  decision_status: "Accepted" | null;
  decision_current_revision: number | null;
  artifact_title: string | null;
  artifact_current_revision: number | null;
  artifact_current_accepted_version_id: string | null;
  artifact_version_number: number | null;
  artifact_version_lifecycle: "Proposed" | "Accepted" | null;
  artifact_version_current_revision: number | null;
};

export type WorkDirectionDecisionCandidate = {
  id: string;
  title: string;
  status: "Accepted";
  revision: number;
};

export type WorkDirectionArtifactCandidate = {
  artifact_id: string;
  artifact_title: string;
  artifact_revision: number;
  version_id: string;
  version_number: number;
  version_revision: number;
  lifecycle: "Accepted";
};

export type AddWorkDecisionLinkInput = {
  workspaceId: string;
  workItemId: string;
  decisionId: string;
  reason: string;
  confirm: boolean;
  requestId: string;
};

export type AddWorkArtifactLinkInput = {
  workspaceId: string;
  workItemId: string;
  artifactId: string;
  versionId: string;
  reason: string;
  confirm: boolean;
  requestId: string;
};

export type RemoveWorkDirectionLinkInput = {
  workspaceId: string;
  linkId: string;
  reason: string;
  confirm: boolean;
  requestId: string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function validReason(value: string) {
  return value.length >= 1 && value.length <= 2000;
}

export function validateAddWorkDecisionLink(input: AddWorkDecisionLinkInput): AddWorkDecisionLinkInput {
  const result = { ...input, reason: input.reason.trim() };
  if (
    !UUID.test(result.workspaceId) ||
    !UUID.test(result.workItemId) ||
    !UUID.test(result.decisionId) ||
    !UUID.test(result.requestId) ||
    !validReason(result.reason) ||
    result.confirm !== true
  ) throw new Error("INVALID_INPUT");
  return result;
}

export function validateAddWorkArtifactLink(input: AddWorkArtifactLinkInput): AddWorkArtifactLinkInput {
  const result = { ...input, reason: input.reason.trim() };
  if (
    !UUID.test(result.workspaceId) ||
    !UUID.test(result.workItemId) ||
    !UUID.test(result.artifactId) ||
    !UUID.test(result.versionId) ||
    !UUID.test(result.requestId) ||
    !validReason(result.reason) ||
    result.confirm !== true
  ) throw new Error("INVALID_INPUT");
  return result;
}

export function validateRemoveWorkDirectionLink(input: RemoveWorkDirectionLinkInput): RemoveWorkDirectionLinkInput {
  const result = { ...input, reason: input.reason.trim() };
  if (
    !UUID.test(result.workspaceId) ||
    !UUID.test(result.linkId) ||
    !UUID.test(result.requestId) ||
    !validReason(result.reason) ||
    result.confirm !== true
  ) throw new Error("INVALID_INPUT");
  return result;
}
