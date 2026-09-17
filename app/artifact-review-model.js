export function createArtifactReviewState() {
  return { dispositions: {} };
}

const VALID_DISPOSITIONS = new Set(['draft', 'proposed', 'set-aside']);

function artifactSignature(artifact) {
  return [
    artifact?.id ?? '',
    artifact?.type ?? '',
    artifact?.title ?? '',
    artifact?.statement ?? '',
    ...(artifact?.sourceRecordIds ?? [])
  ].join('|');
}

export function setArtifactDisposition(state, artifact, disposition) {
  if (!artifact?.id || !VALID_DISPOSITIONS.has(disposition)) return state;
  const dispositions = { ...state.dispositions };
  if (disposition === 'draft') delete dispositions[artifact.id];
  else dispositions[artifact.id] = { disposition, signature: artifactSignature(artifact) };
  return { ...state, dispositions };
}

export function getArtifactDisposition(state, artifact) {
  if (!artifact?.id) return 'draft';
  const saved = state.dispositions?.[artifact.id];
  if (!saved || saved.signature !== artifactSignature(artifact)) return 'draft';
  return saved.disposition;
}

export function getReviewableArtifacts(artifacts) {
  return [...(artifacts.requirements ?? []), ...(artifacts.work ?? [])];
}

export function reconcileArtifactReviewState(state, artifacts) {
  const reviewable = new Map(getReviewableArtifacts(artifacts).map((artifact) => [artifact.id, artifact]));
  const dispositions = Object.fromEntries(
    Object.entries(state.dispositions ?? {}).filter(([artifactId, saved]) => {
      const artifact = reviewable.get(artifactId);
      return artifact && saved.signature === artifactSignature(artifact);
    })
  );
  return { ...state, dispositions };
}

export function getArtifactReviewSummary(state, artifacts) {
  const reviewable = getReviewableArtifacts(artifacts);
  const proposed = reviewable.filter((artifact) => getArtifactDisposition(state, artifact) === 'proposed');
  const setAside = reviewable.filter((artifact) => getArtifactDisposition(state, artifact) === 'set-aside');
  const draft = reviewable.filter((artifact) => getArtifactDisposition(state, artifact) === 'draft');
  return { total: reviewable.length, proposed, setAside, draft };
}

export function getProposedArtifacts(state, artifacts) {
  return getReviewableArtifacts(artifacts)
    .filter((artifact) => getArtifactDisposition(state, artifact) === 'proposed')
    .map((artifact) => ({ ...artifact, status: 'proposed' }));
}
