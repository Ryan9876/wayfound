const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

const recordTypeLabel = (type) => ({
  decision: 'Decision',
  assumption: 'Guess to verify',
  blocker: 'Blocker',
  'open-question': 'Open question'
}[type] ?? type);

export function renderArtifactPreview(preview, artifacts) {
  if (!preview) return;
  if (!artifacts.brief) {
    preview.innerHTML = '';
    return;
  }

  const journey = artifacts.journey.length
    ? artifacts.journey.map((item, index) => `
        <li><span class="artifact-number">${index + 1}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.statement)}</small></span></li>`).join('')
    : '<li class="artifact-empty">No journey steps yet.</li>';

  const requirements = artifacts.requirements.length
    ? artifacts.requirements.map((item) => `
        <li class="artifact-item" data-reviewable-artifact data-artifact-id="${escapeHtml(item.id)}">
          <div class="artifact-item-meta"><span class="artifact-id">${escapeHtml(item.id)}</span><span>${escapeHtml(item.category)}</span></div>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.statement)}</small>
          <span class="artifact-source">From ${escapeHtml(item.sourceRecordIds.join(', '))}</span>
        </li>`).join('')
    : '<li class="artifact-empty">No requirement candidates yet. Wayfound only creates these from decisions that describe expected behavior.</li>';

  const work = artifacts.work.length
    ? artifacts.work.map((item) => `
        <li class="artifact-item" data-reviewable-artifact data-artifact-id="${escapeHtml(item.id)}">
          <div class="artifact-item-meta"><span class="artifact-id">${escapeHtml(item.id)}</span><span>${escapeHtml(recordTypeLabel(item.workType))}</span></div>
          <strong>${escapeHtml(item.title)}</strong>
          <small>${escapeHtml(item.statement)}</small>
          <span class="artifact-source">From ${escapeHtml(item.sourceRecordIds.join(', '))}</span>
        </li>`).join('')
    : '<li class="artifact-empty">Nothing needs follow-up right now.</li>';

  preview.innerHTML = `
    <div class="artifact-preview-head">
      <div>
        <div class="side-title">Draft outputs</div>
        <h3>What these records could become</h3>
        <p>These are working drafts, not approved requirements or committed work. Wayfound keeps the source record attached so you can check the reasoning later.</p>
      </div>
      <span class="draft-pill">Draft only</span>
    </div>
    <div class="artifact-brief">
      <span class="artifact-kicker">First build brief</span>
      <strong>${escapeHtml(artifacts.brief.statement)}</strong>
      <div class="artifact-brief-grid">
        <span><small>What matters most</small>${escapeHtml(artifacts.brief.outcome ?? 'Still open')}</span>
        <span><small>Who it is for first</small>${escapeHtml(artifacts.brief.audience ?? 'Still open')}</span>
      </div>
    </div>
    <div class="artifact-grid">
      <section class="artifact-group">
        <div class="artifact-group-head"><span>Journey</span><strong>${artifacts.journey.length}</strong></div>
        <p>How the idea has taken shape so far.</p>
        <ol class="artifact-journey">${journey}</ol>
      </section>
      <section class="artifact-group">
        <div class="artifact-group-head"><span>Draft requirements</span><strong>${artifacts.requirements.length}</strong></div>
        <p>Behavior candidates that still need review before approval.</p>
        <ul class="artifact-list">${requirements}</ul>
      </section>
      <section class="artifact-group">
        <div class="artifact-group-head"><span>Draft work</span><strong>${artifacts.work.length}</strong></div>
        <p>Questions, guesses, and blockers that need follow-up.</p>
        <ul class="artifact-list">${work}</ul>
      </section>
    </div>`;
}
