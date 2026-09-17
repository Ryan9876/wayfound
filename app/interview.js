import {
  QUESTION_BANK,
  createInitialState,
  deriveProjectState,
  getCoveragePercent,
  getQuestion,
  getSelectedOption,
  getSummary,
  isInterviewComplete,
  selectAnswer
} from './interview-model.js';

let state = createInitialState();

const questionBody = document.querySelector('#questionBody');
const nextButton = document.querySelector('#nextBtn');
const backButton = document.querySelector('#backBtn');

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#039;'
}[character]));

function setIdea(value) {
  state = { ...state, idea: value };
  render();
}

function useDemoIdea() {
  state = {
    ...state,
    idea: 'I want to make a game where you explore a weird little planet, collect clues, solve puzzles, and slowly figure out why all the robots are afraid of ducks.'
  };
  render();
}

function chooseOption(questionId, optionId) {
  state = selectAnswer(state, questionId, optionId);
  render();
}

function continueInterview() {
  if (state.step === -1) {
    if (!state.idea.trim()) return;
    state = { ...state, step: 0 };
  } else if (state.step < QUESTION_BANK.length) {
    const question = QUESTION_BANK[state.step];
    if (!state.answers[question.id]) return;
    state = { ...state, step: state.step + 1 };
  } else {
    state = { ...state, step: 0 };
  }
  render();
}

function goBack() {
  if (state.step <= -1) return;
  if (state.step === 0) state = { ...state, step: -1 };
  else if (state.step > QUESTION_BANK.length - 1) state = { ...state, step: QUESTION_BANK.length - 1 };
  else state = { ...state, step: state.step - 1 };
  render();
}

function renderStart() {
  questionBody.innerHTML = `
    <div class="stage-kicker">Start with your idea</div>
    <h2 class="question">What do you want to make, fix, or improve?</h2>
    <p class="question-help">Describe it in your own words. It can be rough, half-formed, or wildly ambitious. Wayfound will help sort it out.</p>
    <textarea id="ideaBox" placeholder="Example: I want to make a game where you explore a weird little planet and solve puzzles.">${escapeHtml(state.idea)}</textarea>
    <button class="text-action" id="demoIdeaBtn" type="button">Try a demo idea</button>
    <div class="why-box"><strong>What happens next</strong><br>Wayfound looks for what is clear, what is missing, and what could cause trouble later. Then it asks the next question that is actually worth answering.</div>
  `;

  document.querySelector('#ideaBox').addEventListener('input', (event) => setIdea(event.target.value));
  document.querySelector('#demoIdeaBtn').addEventListener('click', useDemoIdea);
  backButton.hidden = true;
  nextButton.textContent = 'Begin interview';
  nextButton.disabled = !state.idea.trim();
}

function renderQuestion() {
  const question = QUESTION_BANK[state.step];
  const selectedOption = getSelectedOption(state, question.id);

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
    ${selectedOption?.reason ? `
      <div class="reason-box"><strong>Why this is recommended</strong><br>${escapeHtml(selectedOption.reason)}
      <br><br><strong>Tradeoff</strong><br>${escapeHtml(selectedOption.tradeoff)}</div>` : ''}
    <div class="why-box"><strong>Why Wayfound is asking this</strong><br>${escapeHtml(question.why)}</div>
  `;

  questionBody.querySelectorAll('[data-option-id]').forEach((button) => {
    button.addEventListener('click', () => chooseOption(question.id, button.dataset.optionId));
  });

  backButton.hidden = false;
  nextButton.textContent = state.step === QUESTION_BANK.length - 1 ? 'Finish interview' : 'Accept & continue';
  nextButton.disabled = !state.answers[question.id];
}

function renderComplete() {
  const summary = getSummary(state);
  const derived = deriveProjectState(state);

  questionBody.innerHTML = `
    <div class="complete">
      <div class="complete-badge">✓ First definition pass complete</div>
      <h2>You know enough to shape the first real version.</h2>
      <p>Wayfound has turned the conversation into clear decisions. Next, it can turn those decisions into requirements, design choices, things to check, and a build plan.</p>

      <div class="summary-grid">
        <div class="summary-card idea"><small>Your idea</small><strong>${escapeHtml(state.idea)}</strong></div>
        <div class="summary-card"><small>Primary outcome</small><strong>${escapeHtml(summary.outcome)}</strong></div>
        <div class="summary-card"><small>Control level</small><strong>${escapeHtml(summary.control)}</strong></div>
        <div class="summary-card"><small>Unknowns</small><strong>${escapeHtml(summary.unknowns)}</strong></div>
        <div class="summary-card"><small>Done means</small><strong>${escapeHtml(summary.validation)}</strong></div>
      </div>

      <div class="next-step">
        <small>Recommended next action</small>
        <strong>Turn these decisions into the first requirements and flag anything that truly blocks the next step.</strong>
      </div>

      <div class="why-box"><strong>Traceability preview</strong><br>Each answer becomes a decision Wayfound can point back to later. Future requirements, design choices, tasks, tests, and releases can show where they came from.</div>

      ${derived.blockers.length ? `<div class="warning-box"><strong>Blocking item</strong><br>${escapeHtml(derived.blockers[0])}</div>` : ''}
    </div>
  `;

  backButton.hidden = false;
  nextButton.textContent = 'Review decisions';
  nextButton.disabled = false;
}

function renderProjectState() {
  const coverage = getCoveragePercent(state);
  const derived = deriveProjectState(state);
  const questionStatus = (id) => state.answers[id] ? 'Defined' : 'Open';
  const doneClass = (id) => state.answers[id] ? ' done' : '';

  document.querySelector('#coveragePct').textContent = `${coverage}%`;
  document.querySelector('#miniFill').style.width = `${coverage}%`;
  document.querySelector('#progressBar').style.width = `${coverage}%`;
  document.querySelector('#progressCount').textContent = `${Object.keys(state.answers).length} of ${QUESTION_BANK.length} decisions`;

  const progressLabel = state.step === -1
    ? 'Start'
    : state.step >= QUESTION_BANK.length
      ? 'First pass complete'
      : getQuestion(QUESTION_BANK[state.step].id).stage;
  document.querySelector('#progressLabel').textContent = progressLabel;

  document.querySelector('#sProblem').textContent = state.idea.trim() ? 'Defined' : 'Open';
  document.querySelector('#sProblem').className = `state-value${state.idea.trim() ? ' done' : ''}`;

  ['outcome', 'control', 'dependencies', 'failure', 'unknowns', 'validation'].forEach((id) => {
    const element = document.querySelector(`#s-${id}`);
    element.textContent = questionStatus(id);
    element.className = `state-value${doneClass(id)}`;
  });

  document.querySelector('#decisionCount').textContent = Object.keys(state.answers).length;
  document.querySelector('#assumptionCount').textContent = derived.assumptions.length;
  document.querySelector('#blockerCount').textContent = derived.blockers.length;
  document.querySelector('#openQuestionCount').textContent = derived.openQuestions.length;

  const recent = QUESTION_BANK
    .filter((question) => state.answers[question.id])
    .slice(-3);

  const decisionLog = document.querySelector('#decisionLog');
  decisionLog.innerHTML = recent.length
    ? `<div class="separator"></div><div class="side-title compact">Recent choices</div>${recent.map((question) => {
        const option = getSelectedOption(state, question.id);
        return `<div class="decision-item"><strong>${escapeHtml(question.stage)}</strong>${escapeHtml(option.label)}</div>`;
      }).join('')}`
    : '';
}

function render() {
  if (state.step === -1) renderStart();
  else if (state.step >= QUESTION_BANK.length && isInterviewComplete(state)) renderComplete();
  else renderQuestion();

  renderProjectState();
}

nextButton.addEventListener('click', continueInterview);
backButton.addEventListener('click', goBack);
render();
