import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('durable runtime uses the validated Interview model verbatim', () => {
  const validated = readFileSync('../app/interview-model.js', 'utf8');
  const durable = readFileSync('src/shared/interview-model.js', 'utf8');
  assert.equal(durable, validated);
});
