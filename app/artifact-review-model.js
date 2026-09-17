export function createArtifactReviewState() {
  return { dispositions: {} };
}

const VALID_DISPOSITIONS = new Set(['draft', 'proposed', 'set-aside']);

export function setArtifactDisposition(state, artifactId, disposition) {
  if (!artifactId || !VALID_DISPOSITIONS.has(disposition)) return state;
  const dispositions = { ...state.dispositions };
  if (disposition === 'draft') delete dispositions[artifactId];
  else dispositions[artifactId] = disposition;
  return { ...state, dispositions };
}

export function getArtifactDisposition(state, artifactId) {
  return state.dispositions?.[artifactId] ?? 'draft';
}

export function getReviewableArtifacts(artifacts) {
  return [...(artifacts.requirements ?? []), ...(artifacts.work ?? [])];
}

export function reconcileArtifactReviewState(state, artifacts) {
  const validIds = new Set(getReviewableArtifacts(artifacts).map((artifact) => artifact.id));
  const dispositions = Object.fromEntries(
    Object.entries(state.dispositions ?? {}).filter(([artifactId]) => validIds.has(artifactId))
  );
  return { ...state, dispositions };
}

export function getArtifactReviewSummary(state, artifacts) {
  const reviewable = getReviewableArtifacts(artifacts);
  const proposed = reviewable.filter((artifact) => getArtifactDisposition(state, artifact.id) === 'proposed');
  const setAside = reviewable.filter((artifact) => getArtifactDisposition(state, artifact.id) === 'set-aside');
  const draft = reviewable.filter((artifact) => getArtifactDisposition(state, artifact.id) === 'draft');
  return { total: reviewable.length, proposed, setAside, draft };
}

export function getProposedArtifacts(state, artifacts) {
  return getReviewableArtifacts(artifacts)
    .filter((artifact) => getArtifactDisposition(state, artifact.id) === 'proposed')
    .map((artifact) => ({ ...artifact, status: 'proposed' }));
}
