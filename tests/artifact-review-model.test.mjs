import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createArtifactReviewState,
  getArtifactDisposition,
  getArtifactReviewSummary,
  getProposedArtifacts,
  reconcileArtifactReviewState,
  setArtifactDisposition
} from '../app/artifact-review-model.js';

const artifacts = {
  brief: { id: 'DBRIEF-001', type: 'draft-brief', status: 'draft' },
  journey: [{ id: 'JRN-01', type: 'journey-step', status: 'draft' }],
  requirements: [
    { id: 'DREQ-PRIVACY', type: 'draft-requirement', status: 'draft', sourceRecordIds: ['DEC-PRIVACY'] },
    { id: 'DREQ-FAILURE', type: 'draft-requirement', status: 'draft', sourceRecordIds: ['DEC-FAILURE'] }
  ],
  work: [{ id: 'DWORK-OQ-X', type: 'draft-work', status: 'draft', sourceRecordIds: ['OQ-X'] }]
};

test('review state starts empty and leaves artifacts draft', () => {
  const state = createArtifactReviewState();
  assert.equal(getArtifactDisposition(state, 'DREQ-PRIVACY'), 'draft');
  const summary = getArtifactReviewSummary(state, artifacts);
  assert.equal(summary.draft.length, 3);
  assert.equal(summary.proposed.length, 0);
});

test('a draft can be proposed without changing the source artifact', () => {
  let state = createArtifactReviewState();
  state = setArtifactDisposition(state, 'DREQ-PRIVACY', 'proposed');
  assert.equal(getArtifactDisposition(state, 'DREQ-PRIVACY'), 'proposed');
  const proposed = getProposedArtifacts(state, artifacts);
  assert.equal(proposed.length, 1);
  assert.equal(proposed[0].status, 'proposed');
  assert.equal(artifacts.requirements[0].status, 'draft');
  assert.deepEqual(proposed[0].sourceRecordIds, ['DEC-PRIVACY']);
});

test('a draft can be set aside and later restored to draft', () => {
  let state = createArtifactReviewState();
  state = setArtifactDisposition(state, 'DWORK-OQ-X', 'set-aside');
  assert.equal(getArtifactDisposition(state, 'DWORK-OQ-X'), 'set-aside');
  state = setArtifactDisposition(state, 'DWORK-OQ-X', 'draft');
  assert.equal(getArtifactDisposition(state, 'DWORK-OQ-X'), 'draft');
});

test('brief and journey are not reviewable promotion targets', () => {
  const summary = getArtifactReviewSummary(createArtifactReviewState(), artifacts);
  assert.equal(summary.total, 3);
  assert.ok(!summary.draft.some((item) => item.id === 'DBRIEF-001'));
  assert.ok(!summary.draft.some((item) => item.id === 'JRN-01'));
});

test('reconciliation drops review choices for artifacts that no longer exist', () => {
  let state = createArtifactReviewState();
  state = setArtifactDisposition(state, 'DREQ-PRIVACY', 'proposed');
  state = setArtifactDisposition(state, 'DREQ-FAILURE', 'set-aside');
  const changedArtifacts = { ...artifacts, requirements: [artifacts.requirements[0]] };
  state = reconcileArtifactReviewState(state, changedArtifacts);
  assert.equal(getArtifactDisposition(state, 'DREQ-PRIVACY'), 'proposed');
  assert.equal(getArtifactDisposition(state, 'DREQ-FAILURE'), 'draft');
});

test('invalid dispositions are ignored', () => {
  const state = createArtifactReviewState();
  const next = setArtifactDisposition(state, 'DREQ-PRIVACY', 'approved');
  assert.deepEqual(next, state);
});
