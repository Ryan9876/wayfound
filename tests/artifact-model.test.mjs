import test from 'node:test';
import assert from 'node:assert/strict';
import { getDraftArtifacts } from '../app/artifact-model.js';

const state = (idea = 'Build a helpful thing') => ({ idea });
const decision = (questionId, statement, id = `DEC-${questionId.toUpperCase()}`) => ({
  id, type: 'decision', status: 'accepted', title: questionId, statement, questionId, source: 'Interview'
});

test('creates a draft brief from the idea and brief-source decisions', () => {
  const result = getDraftArtifacts(state('Build a puzzle helper'), [
    decision('outcome', 'It helps someone learn or understand'),
    decision('audience', 'A small group of people')
  ]);
  assert.equal(result.brief.status, 'draft');
  assert.equal(result.brief.statement, 'Build a puzzle helper');
  assert.deepEqual(result.brief.sourceRecordIds, ['DEC-OUTCOME', 'DEC-AUDIENCE']);
});

test('does not create a brief without an idea', () => {
  const result = getDraftArtifacts(state('   '), []);
  assert.equal(result.brief, null);
});

test('creates requirement candidates only from mapped accepted decisions', () => {
  const records = [
    decision('privacy', 'Maybe, so collect as little as possible'),
    decision('outcome', 'It saves time or repeat work')
  ];
  const result = getDraftArtifacts(state(), records);
  assert.equal(result.requirements.length, 1);
  assert.equal(result.requirements[0].id, 'DREQ-PRIVACY');
  assert.equal(result.requirements[0].status, 'draft');
  assert.deepEqual(result.requirements[0].sourceRecordIds, ['DEC-PRIVACY']);
});

test('unresolved records become draft work rather than requirements', () => {
  const records = [
    { id: 'OQ-ABC', type: 'open-question', title: 'Something to decide', statement: 'Which service?', status: 'open' },
    { id: 'ASM-ABC', type: 'assumption', title: 'Guess to verify', statement: 'The API exists.', status: 'open' },
    { id: 'BLK-ABC', type: 'blocker', title: 'Blocked', statement: 'Need access.', status: 'open' }
  ];
  const result = getDraftArtifacts(state(), records);
  assert.equal(result.requirements.length, 0);
  assert.deepEqual(result.work.map((item) => item.id), ['DWORK-OQ-ABC', 'DWORK-ASM-ABC', 'DWORK-BLK-ABC']);
  assert.ok(result.work.every((item) => item.status === 'draft'));
});

test('journey keeps one draft step per accepted decision and source record', () => {
  const records = [decision('outcome', 'Save time'), decision('audience', 'My family')];
  const result = getDraftArtifacts(state(), records);
  assert.equal(result.journey.length, 2);
  assert.equal(result.journey[0].id, 'JRN-01-OUTCOME');
  assert.deepEqual(result.journey[1].sourceRecordIds, ['DEC-AUDIENCE']);
});

test('all generated build artifacts remain draft', () => {
  const records = [
    decision('control', 'Ask before important actions'),
    { id: 'OQ-X', type: 'open-question', title: 'Open', statement: 'What next?', status: 'open' }
  ];
  const result = getDraftArtifacts(state(), records);
  assert.equal(result.brief.status, 'draft');
  assert.ok(result.journey.every((item) => item.status === 'draft'));
  assert.ok(result.requirements.every((item) => item.status === 'draft'));
  assert.ok(result.work.every((item) => item.status === 'draft'));
});
