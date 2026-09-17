import test from 'node:test';
import assert from 'node:assert/strict';
import {
  QUESTION_BANK,
  createInitialState,
  deriveProjectState,
  getCoveragePercent,
  getSummary,
  isInterviewComplete,
  selectAnswer
} from '../app/interview-model.js';

test('blank interview starts with no coverage and is incomplete', () => {
  const state = createInitialState();
  assert.equal(getCoveragePercent(state), 0);
  assert.equal(isInterviewComplete(state), false);
});

test('idea alone starts interview coverage', () => {
  const state = { ...createInitialState(), idea: 'Build a puzzle game.' };
  assert.equal(getCoveragePercent(state), 12);
});

test('answer selection is immutable and creates a decision', () => {
  const initial = { ...createInitialState(), idea: 'Build a puzzle game.' };
  const next = selectAnswer(initial, 'outcome', 'clear-progress');
  assert.equal(initial.answers.outcome, undefined);
  assert.equal(next.answers.outcome, 'clear-progress');
});

test('dependency assumption is visible as an assumption and blocker', () => {
  let state = { ...createInitialState(), idea: 'Build a connected game.' };
  state = selectAnswer(state, 'dependencies', 'assume-normal');
  const derived = deriveProjectState(state);
  assert.equal(derived.assumptions.length, 1);
  assert.equal(derived.blockers.length, 1);
});

test('interview is complete only when all questions are answered', () => {
  let state = { ...createInitialState(), idea: 'Build something useful.' };
  for (const question of QUESTION_BANK) {
    state = selectAnswer(state, question.id, question.options[0].id);
  }
  assert.equal(isInterviewComplete(state), true);
  assert.equal(getCoveragePercent(state), 100);
});

test('summary returns user-facing labels', () => {
  let state = { ...createInitialState(), idea: 'Build something useful.' };
  state = selectAnswer(state, 'outcome', 'good-answer-faster');
  const summary = getSummary(state);
  assert.equal(summary.outcome, 'Help people reach a good answer faster');
});
