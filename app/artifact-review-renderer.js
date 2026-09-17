import { getArtifactDisposition, getArtifactReviewSummary } from './artifact-review-model.js';

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

export function renderArtifactReview(preview, artifacts, reviewState, onDispositionChange) {
  if (!preview || !artifacts?.brief) return;

  let summary = preview.querySelector('.artifact-review-summary');
  if (!summary) {
    summary = document.createElement('div');
    summary.className = 'artifact-review-summary';
    const grid = preview.querySelector('.artifact-grid');
    preview.insertBefore(summary, grid ?? null);
  }

  const counts = getArtifactReviewSummary(reviewState, artifacts);
  summary.innerHTML = `
    <div>
      <strong>Review the actionable drafts</strong>
      <span>Proposed means “carry this forward for project-owner review.” It is not approval. Tiny word, important job.</span>
    </div>
    <div class="artifact-review-counts">
      <span><strong>${counts.proposed.length}</strong> proposed</span>
      <span><strong>${counts.setAside.length}</strong> set aside</span>
      <span><strong>${counts.draft.length}</strong> still draft</span>
    </div>`;

  preview.querySelectorAll('[data-reviewable-artifact]').forEach((item) => {
    const artifactId = item.dataset.artifactId;
    const disposition = getArtifactDisposition(reviewState, artifactId);
    item.classList.toggle('is-proposed', disposition === 'proposed');
    item.classList.toggle('is-set-aside', disposition === 'set-aside');

    let controls = item.querySelector('.artifact-review-actions');
    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'artifact-review-actions';
      item.appendChild(controls);
    }

    if (disposition === 'draft') {
      controls.innerHTML = `
        <button type="button" class="artifact-review-button primary" data-review-action="proposed">Propose</button>
        <button type="button" class="artifact-review-button" data-review-action="set-aside">Set aside</button>`;
    } else {
      const label = disposition === 'proposed' ? 'Proposed' : 'Set aside';
      controls.innerHTML = `
        <span class="artifact-disposition ${escapeHtml(disposition)}">${escapeHtml(label)}</span>
        <button type="button" class="artifact-review-button" data-review-action="draft">Undo</button>`;
    }

    controls.querySelectorAll('[data-review-action]').forEach((button) => {
      button.addEventListener('click', () => onDispositionChange?.(artifactId, button.dataset.reviewAction));
    });
  });
}
