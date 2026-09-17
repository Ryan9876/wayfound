import test from 'node:test';
import assert from 'node:assert/strict';
import { logCommandEvent } from '../src/server/observability.ts';

test('command telemetry emits only approved metadata fields', () => {
  const messages = [];
  const original = console.info;
  console.info = (message) => messages.push(String(message));
  try {
    logCommandEvent({
      requestId: 'req-1',
      operation: 'accept-interview-answer',
      result: 'succeeded',
      projectId: 'project-1',
      actorId: 'actor-1',
      errorCode: 'NONE',
      startingIdea: 'SECRET IDEA SHOULD NOT APPEAR',
      artifactText: 'SECRET ARTIFACT SHOULD NOT APPEAR',
    });
  } finally {
    console.info = original;
  }

  assert.equal(messages.length, 1);
  const parsed = JSON.parse(messages[0]);
  assert.deepEqual(parsed, {
    event: 'wayfound.command',
    requestId: 'req-1',
    operation: 'accept-interview-answer',
    result: 'succeeded',
    projectId: 'project-1',
    actorId: 'actor-1',
    errorCode: 'NONE',
  });
  assert.ok(!messages[0].includes('SECRET IDEA'));
  assert.ok(!messages[0].includes('SECRET ARTIFACT'));
});
