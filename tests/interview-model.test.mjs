import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceInterview,
  classifyIdea,
  createInitialState,
  deriveProjectState,
  getApplicableQuestions,
  getNextQuestion,
  getProgress,
  getInterviewRecords,
  getSummary,
  goBackInterview,
  isInterviewComplete,
  selectAnswer,
  startInterview
} from '../app/interview-model.js';

const withIdea = (idea) => ({ ...createInitialState(), idea });

function answerUntilComplete(initial, chooser = () => 0) {
  let state = startInterview(initial);
  let guard = 0;
  while (!state.complete && guard < 30) {
    const q = getApplicableQuestions(state).find((item) => item.id === state.currentQuestionId);
    const option = q.options[chooser(q, state)] ?? q.options[0];
    state = selectAnswer(state, q.id, option.id);
    state = advanceInterview(state);
    guard += 1;
  }
  return state;
}

test('blank interview does not start', () => {
  const state = createInitialState();
  assert.equal(startInterview(state).started, false);
  assert.equal(getProgress(state).percent, 0);
});

test('idea classifier detects broad project signals', () => {
  assert.deepEqual(classifyIdea('A puzzle game for my friends'), ['game', 'collaboration']);
  const tags = classifyIdea('AI network assistant that connects to an API');
  assert.ok(tags.includes('automation'));
  assert.ok(tags.includes('integration'));
  assert.ok(tags.includes('technical'));
});

test('game gets a game question and skips automation questions', () => {
  const state = withIdea('A puzzle game on a strange planet');
  const ids = getApplicableQuestions(state).map((q) => q.id);
  assert.ok(ids.includes('game-loop'));
  assert.ok(!ids.includes('control'));
  assert.ok(!ids.includes('dependencies'));
});

test('AI network tool gets control and dependency questions', () => {
  const state = withIdea('An AI assistant that helps network engineers investigate incidents using APIs');
  const ids = getApplicableQuestions(state).map((q) => q.id);
  assert.ok(ids.includes('control'));
  assert.ok(ids.includes('dependencies'));
  assert.ok(ids.includes('failure'));
  assert.ok(!ids.includes('game-loop'));
});

test('same state produces the same next question', () => {
  let state = startInterview(withIdea('A tiny gardening helper'));
  assert.equal(state.currentQuestionId, 'outcome');
  assert.equal(getNextQuestion({ ...state, currentQuestionId: null }).id, 'outcome');
  state = selectAnswer(state, 'outcome', 'easier');
  state = advanceInterview(state);
  assert.equal(state.currentQuestionId, 'audience');
});

test('an answer can make a new question applicable', () => {
  let state = withIdea('An AI writing helper');
  let ids = getApplicableQuestions(state).map((q) => q.id);
  assert.ok(ids.includes('control'));
  assert.ok(!ids.includes('failure'));
  state = selectAnswer(state, 'control', 'risk-based');
  ids = getApplicableQuestions(state).map((q) => q.id);
  assert.ok(ids.includes('failure'));
});

test('not-sure answers become visible open questions without forcing a blocker', () => {
  let state = withIdea('A puzzle game');
  state = selectAnswer(state, 'game-loop', 'not-sure');
  const derived = deriveProjectState(state);
  assert.ok(derived.openQuestions.some((text) => text.includes('spend most of their time')));
  assert.equal(derived.blockers.length, 0);
});

test('dependency assumption produces an assumption and blocker', () => {
  let state = withIdea('A tool that connects to an API');
  state = selectAnswer(state, 'dependencies', 'assume-normal');
  const derived = deriveProjectState(state);
  assert.equal(derived.assumptions.length, 1);
  assert.equal(derived.blockers.length, 1);
});

test('completion depends only on questions that apply to the idea and answers', () => {
  const state = answerUntilComplete(withIdea('A puzzle game about ducks'));
  assert.equal(state.complete, true);
  assert.equal(isInterviewComplete(state), true);
  const ids = getApplicableQuestions(state).map((q) => q.id);
  assert.ok(ids.includes('game-loop'));
  assert.ok(!ids.includes('control'));
});

test('back navigation preserves answers and returns to the prior question', () => {
  let state = startInterview(withIdea('A puzzle game'));
  state = selectAnswer(state, state.currentQuestionId, 'enjoy');
  state = advanceInterview(state);
  assert.equal(state.currentQuestionId, 'audience');
  state = goBackInterview(state);
  assert.equal(state.currentQuestionId, 'outcome');
  assert.equal(state.answers.outcome, 'enjoy');
});

test('summary contains only applicable answered decisions', () => {
  const state = answerUntilComplete(withIdea('A study helper for science class'));
  const summary = getSummary(state);
  assert.equal(summary.idea, 'A study helper for science class');
  assert.ok(summary.decisions.some((d) => d.id === 'learning-mode'));
  assert.ok(!summary.decisions.some((d) => d.id === 'game-loop'));
});


test('privacy becomes applicable when collaboration becomes shared', () => {
  let state = { ...createInitialState(), idea: 'A puzzle game for my friends' };
  let ids = getApplicableQuestions(state).map((question) => question.id);
  assert.ok(ids.includes('collaboration'));
  assert.ok(!ids.includes('privacy'));

  state = selectAnswer(state, 'collaboration', 'small-shared');
  ids = getApplicableQuestions(state).map((question) => question.id);
  assert.ok(ids.includes('privacy'));
});


test('accepted answers create stable decision records', () => {
  let state = withIdea('A tiny gardening helper');
  state = selectAnswer(state, 'outcome', 'easier');
  const records = getInterviewRecords(state);
  const decision = records.find((record) => record.id === 'DEC-OUTCOME');
  assert.equal(decision.type, 'decision');
  assert.equal(decision.status, 'accepted');
  assert.equal(decision.statement, 'It makes something easier to do or manage');
  assert.equal(decision.questionId, 'outcome');
});

test('not-sure answers become open-question records instead of decisions', () => {
  let state = withIdea('A puzzle game');
  state = selectAnswer(state, 'game-loop', 'not-sure');
  const records = getInterviewRecords(state);
  assert.ok(records.some((record) => record.id === 'OQ-GAME-LOOP' && record.type === 'open-question'));
  assert.ok(!records.some((record) => record.id === 'DEC-GAME-LOOP'));
});

test('derived guesses and blockers become separate records', () => {
  let state = withIdea('A tool that connects to an API');
  state = selectAnswer(state, 'dependencies', 'assume-normal');
  const records = getInterviewRecords(state);
  assert.ok(records.some((record) => record.type === 'assumption'));
  assert.ok(records.some((record) => record.type === 'blocker'));
  assert.ok(records.some((record) => record.id === 'DEC-DEPENDENCIES'));
});

test('records exclude answers that are not applicable to the current idea', () => {
  let state = withIdea('A puzzle game');
  state = selectAnswer(state, 'control', 'risk-based');
  const records = getInterviewRecords(state);
  assert.ok(!records.some((record) => record.id === 'DEC-CONTROL'));
});

test('record identifiers are deterministic for the same interview state', () => {
  let state = withIdea('A tool that connects to an API');
  state = selectAnswer(state, 'dependencies', 'assume-normal');
  const first = getInterviewRecords(state).map((record) => record.id);
  const second = getInterviewRecords(state).map((record) => record.id);
  assert.deepEqual(first, second);
});
