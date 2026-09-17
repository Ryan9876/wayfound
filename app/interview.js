import {
  advanceInterview,
  classifyIdea,
  createInitialState,
  deriveProjectState,
  getApplicableQuestions,
  getProgress,
  getInterviewRecords,
  getResolvedQuestion,
  getSelectedOption,
  getSummary,
  goBackInterview,
  isInterviewComplete,
  reviewInterview,
  selectAnswer,
  startInterview
} from './interview-model.js';
import { getDraftArtifacts } from './artifact-model.js';
import { renderArtifactPreview } from './artifact-renderer.js';

let state = createInitialState();

const questionBody = document.querySelector('#questionBody');
const nextButton = document.querySelector('#nextBtn');
const backButton = document.querySelector('#backBtn');
const interviewPage = document.querySelector('#interviewPage');
const recordsPage = document.querySelector('#recordsPage');
const pageName = document.querySelector('#pageName');
const stagePill = document.querySelector('#stagePill');

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[character]));

function recordTypeLabel(type) {
  return {
    decision: 'Decision',
    assumption: 'Guess to verify',
    blocker: 'Blocker',
    'open-question': 'Open question'
  }[type] ?? type;
}

function recordCountLabel(type, count) {
  const labels = {
    decision: ['Decision', 'Decisions'],
    assumption: ['Guess to verify', 'Guesses to verify'],
    blocker: ['Blocker', 'Blockers'],
    'open-question': ['Open question', 'Open questions']
  }[type];
  return labels ? labels[count === 1 ? 0 : 1] : type;
}

function renderRecords() {
  const records = getInterviewRecords(state);
  const artifacts = getDraftArtifacts(state, records);
  const counts = records.reduce((result, record) => {
    result[record.type] = (result[record.type] ?? 0) + 1;
    return result;
  }, {});

  document.querySelector('#recordCounts').innerHTML = ['decision', 'assumption', 'blocker', 'open-question']
    .map((type) => {
      const count = counts[type] ?? 0;
      return `<span class="record-count"><strong>${count}</strong>${escapeHtml(recordCountLabel(type, count))}</span>`;
    })
    .join('');

  renderArtifactPreview(document.querySelector('#artifactPreview'), artifacts);

  const body = document.querySelector('#recordsBody');
  if (!records.length) {
    body.innerHTML = `<div class="records-empty"><strong>No records yet.</strong>Finish a few Interview choices and Wayfound will keep the important parts here.</div>`;
    return;
  }

  body.innerHTML = records.map((record) => `
    <article class="record-card">
      <div class="record-top">
        <div class="record-meta">
          <span class="record-badge ${escapeHtml(record.type)}">${escapeHtml(recordTypeLabel(record.type))}</span>
          <span class="record-id">${escapeHtml(record.id)}</span>
          ${record.recommended === true ? '<span class="recommended">Recommended choice</span>' : ''}
        </div>
        <span class="record-source">From ${escapeHtml(record.source)}</span>
      </div>
      <h3>${escapeHtml(record.title)}</h3>
      <p class="record-statement">${escapeHtml(record.statement)}</p>
      ${record.detail ? `<p class="record-detail">${escapeHtml(record.detail)}</p>` : ''}
    </article>`).join('');
}

function showPage(page) {
  const records = page === 'records';
  interviewPage.hidden = records;
  recordsPage.hidden = !records;
  pageName.textContent = records ? 'Records' : 'Interview';
  stagePill.textContent = records ? 'Project memory' : 'Stage 1 · Understand';

  document.querySelectorAll('[data-page]').forEach((link) => {
    const active = link.dataset.page === page;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  if (records) renderRecords();
}

function renderIdeaHints() {
  const hints = document.querySelector('#ideaHints');
  if (!hints) return;
  const tags = state.idea.trim() ? classifyIdea(state.idea) : [];
  const friendlyTag = {
    game: 'game or play',
    learning: 'learning',
    automation: 'something that can act for you',
    integration: 'outside connections',
    physical: 'devices or hardware',
    collaboration: 'sharing with people',
    'private-data': 'private information',
    technical: 'a technical system',
    general: 'a general idea'
  };
  hints.innerHTML = tags.length
    ? `<div class="reason-box"><strong>What Wayfound noticed</strong><br>${escapeHtml(tags.map((tag) => friendlyTag[tag] ?? tag).join(', '))}<br><br><span>These are just clues Wayfound uses to pick better questions. Your idea can still change.</span></div>`
    : '';
}

function setIdea(value) {
  const changed = value !== state.idea;
  state = changed
    ? { ...createInitialState(), idea: value }
    : { ...state, idea: value };
  nextButton.disabled = !state.idea.trim();
  renderIdeaHints();
  renderProjectState();
}

function useDemoIdea() {
  state = {
    ...createInitialState(),
    idea: 'I want to make a game where you explore a weird little planet, collect clues, solve puzzles, and slowly figure out why all the robots are afraid of ducks.'
  };
  render();
}

function chooseOption(questionId, optionId) {
  state = selectAnswer(state, questionId, optionId);
  render();
}

function continueInterview() {
  if (!state.started) {
    state = startInterview(state);
  } else if (state.complete) {
    state = reviewInterview(state);
  } else {
    state = advanceInterview(state);
  }
  render();
}

function goBack() {
  state = goBackInterview(state);
  render();
}

function renderStart() {
  questionBody.innerHTML = `
    <div class="stage-kicker">Start with your idea</div>
    <h2 class="question">What do you want to make, fix, or improve?</h2>
    <p class="question-help">Describe it in your own words. It can be rough, half-formed, or wildly ambitious. Wayfound will help sort it out.</p>
    <textarea id="ideaBox" placeholder="Example: I want to make a game where you explore a weird little planet and solve puzzles.">${escapeHtml(state.idea)}</textarea>
    <button class="text-action" id="demoIdeaBtn" type="button">Try a demo idea</button>
    <div id="ideaHints"></div>
    <div class="why-box"><strong>What happens next</strong><br>Wayfound looks for what is clear, what is missing, and what could cause trouble later. Then it asks the next question that is actually worth answering.</div>
  `;

  document.querySelector('#ideaBox').addEventListener('input', (event) => setIdea(event.target.value));
  document.querySelector('#demoIdeaBtn').addEventListener('click', useDemoIdea);
  renderIdeaHints();
  backButton.hidden = true;
  nextButton.textContent = 'Begin interview';
  nextButton.disabled = !state.idea.trim();
}

function renderQuestion() {
  const question = getResolvedQuestion(state, state.currentQuestionId);
  const selectedOption = getSelectedOption(state, question.id);
  const selectedIsRecommended = selectedOption?.id === question.recommendation?.optionId;
  const recommendedOption = question.options.find((option) => option.recommended);

  questionBody.innerHTML = `
    <div class="stage-kicker">${escapeHtml(question.stage)}</div>
    <h2 class="question">${escapeHtml(question.prompt)}</h2>
    <p class="question-help">${escapeHtml(question.help)}</p>
    <div class="options" role="radiogroup" aria-label="${escapeHtml(question.prompt)}">
      ${question.options.map((option) => {
        const selected = state.answers[question.id] === option.id;
        return `
          <button class="option ${selected ? 'selected' : ''}" type="button" role="radio" aria-checked="${selected}" data-option-id="${escapeHtml(option.id)}">
            <span class="radio" aria-hidden="true"></span>
            <span>
              <span class="option-title">${escapeHtml(option.label)}</span>
              <span class="option-sub">${escapeHtml(option.detail)}</span>
            </span>
            ${option.recommended ? '<span class="recommended">Recommended</span>' : ''}
          </button>`;
      }).join('')}
    </div>
    ${selectedOption ? `
      <div class="reason-box">
        <strong>${selectedIsRecommended ? 'Why Wayfound recommends this' : 'What to know about this choice'}</strong><br>
        ${selectedIsRecommended
          ? escapeHtml(question.recommendation?.reason ?? '')
          : `Wayfound's starting recommendation is <strong>${escapeHtml(recommendedOption?.label ?? 'another option')}</strong>${question.recommendation?.reason ? ` because ${escapeHtml(question.recommendation.reason.charAt(0).toLowerCase() + question.recommendation.reason.slice(1))}` : '.'}`}
        <br><br><strong>Tradeoff</strong><br>${escapeHtml(selectedOption.tradeoff ?? 'No material tradeoff is recorded yet.')}
      </div>` : ''}
    <div class="why-box"><strong>Why Wayfound is asking this</strong><br>${escapeHtml(question.why)}</div>
  `;

  questionBody.querySelectorAll('[data-option-id]').forEach((button) => {
    button.addEventListener('click', () => chooseOption(question.id, button.dataset.optionId));
  });

  backButton.hidden = false;
  nextButton.textContent = 'Accept & continue';
  nextButton.disabled = !state.answers[question.id];
}

function renderComplete() {
  const summary = getSummary(state);
  const derived = deriveProjectState(state);

  questionBody.innerHTML = `
    <div class="complete">
      <div class="complete-badge">✓ First adaptive pass complete</div>
      <h2>You know enough to shape the first real version.</h2>
      <p>Wayfound asked the questions that matched this idea and skipped the ones that did not. Next, these choices can become requirements, design decisions, things to check, and a build plan.</p>

      <div class="summary-grid">
        <div class="summary-card idea"><small>Your idea</small><strong>${escapeHtml(state.idea)}</strong></div>
        ${summary.decisions.map((decision) => `<div class="summary-card"><small>${escapeHtml(decision.label)}</small><strong>${escapeHtml(decision.value)}</strong></div>`).join('')}
      </div>

      <div class="next-step">
        <small>Recommended next action</small>
        <strong>Turn these choices into the first requirements and keep any open questions attached to the work they could affect.</strong>
      </div>

      <div class="why-box"><strong>Traceability preview</strong><br>Each answer is tied to the question that created it. Future requirements, design choices, tasks, tests, and releases can point back to that decision.</div>

      ${derived.blockers.length ? `<div class="warning-box"><strong>Something is stopping dependent work</strong><br>${escapeHtml(derived.blockers[0])}</div>` : ''}
      <div class="view-records-row"><button class="button" id="viewRecordsBtn" type="button">View records</button></div>
    </div>
  `;

  document.querySelector('#viewRecordsBtn').addEventListener('click', () => {
    window.location.hash = 'records';
    showPage('records');
  });

  backButton.hidden = false;
  nextButton.textContent = 'Review choices';
  nextButton.disabled = false;
}

function renderProjectState() {
  const progress = getProgress(state);
  const derived = deriveProjectState(state);
  const applicable = state.idea.trim() ? getApplicableQuestions(state) : [];
  const answeredApplicable = applicable.filter((question) => state.answers[question.id]);

  document.querySelector('#coveragePct').textContent = `${progress.percent}%`;
  document.querySelector('#miniFill').style.width = `${progress.percent}%`;
  document.querySelector('#progressBar').style.width = `${progress.percent}%`;
  document.querySelector('#progressCount').textContent = progress.total
    ? `${progress.answered} of ${progress.total} useful choices`
    : '0 choices made';

  const progressLabel = !state.started
    ? 'Start'
    : state.complete || isInterviewComplete(state)
      ? 'First pass complete'
      : getResolvedQuestion(state, state.currentQuestionId)?.stage ?? 'Next useful question';
  document.querySelector('#progressLabel').textContent = progressLabel;

  const stateList = document.querySelector('#stateList');
  const rows = [
    `<div class="state-row"><span>Idea</span><span class="state-value${state.idea.trim() ? ' done' : ''}">${state.idea.trim() ? 'Defined' : 'Open'}</span></div>`,
    ...applicable.map((question) => `<div class="state-row"><span>${escapeHtml(question.stateLabel)}</span><span class="state-value${state.answers[question.id] ? ' done' : ''}">${state.answers[question.id] ? 'Defined' : 'Open'}</span></div>`)
  ];
  stateList.innerHTML = rows.join('');

  document.querySelector('#decisionCount').textContent = answeredApplicable.length;
  document.querySelector('#assumptionCount').textContent = derived.assumptions.length;
  document.querySelector('#blockerCount').textContent = derived.blockers.length;
  document.querySelector('#openQuestionCount').textContent = derived.openQuestions.length;

  const recentIds = [...state.history, state.currentQuestionId].filter(Boolean);
  const recent = [...new Set(recentIds)]
    .filter((id) => state.answers[id] && applicable.some((question) => question.id === id))
    .slice(-3)
    .map((id) => getResolvedQuestion(state, id));

  const decisionLog = document.querySelector('#decisionLog');
  decisionLog.innerHTML = recent.length
    ? `<div class="separator"></div><div class="side-title compact">Recent choices</div>${recent.map((question) => {
        const option = getSelectedOption(state, question.id);
        return `<div class="decision-item"><strong>${escapeHtml(question.stage)}</strong>${escapeHtml(option.label)}</div>`;
      }).join('')}`
    : '';
}

function render() {
  if (!state.started) renderStart();
  else if (state.complete && isInterviewComplete(state)) renderComplete();
  else renderQuestion();
  renderProjectState();
}

nextButton.addEventListener('click', continueInterview);
backButton.addEventListener('click', goBack);
document.querySelector('#returnInterviewBtn').addEventListener('click', () => {
  window.location.hash = 'interview';
  showPage('interview');
});
document.querySelectorAll('[data-page]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    window.location.hash = link.dataset.page;
    showPage(link.dataset.page);
  });
});
window.addEventListener('hashchange', () => showPage(window.location.hash === '#records' ? 'records' : 'interview'));
render();
showPage(window.location.hash === '#records' ? 'records' : 'interview');
