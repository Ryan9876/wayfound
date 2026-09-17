import test from 'node:test';
import assert from 'node:assert/strict';
import {
  artifactContentHash,
  normalizeSemanticKey,
  requireCapability,
  requireCurrentSourceRevisions,
  requireExpectedVersion,
  requireM2ArtifactTransition,
} from '../src/server/domain/project-rules.ts';
import { requireEnvironmentIsolation } from '../src/server/domain/environment-rules.ts';

const codeOf = (fn) => {
  try { fn(); return null; } catch (error) { return error.code; }
};

test('owner can write and propose but M2 does not grant approval capability', () => {
  assert.doesNotThrow(() => requireCapability('owner', 'project.write'));
  assert.doesNotThrow(() => requireCapability('owner', 'artifact.propose'));
});

test('missing membership is forbidden', () => {
  assert.equal(codeOf(() => requireCapability(null, 'project.write')), 'FORBIDDEN');
});

test('stale project versions are rejected instead of last-write-wins', () => {
  assert.doesNotThrow(() => requireExpectedVersion(4, 4));
  assert.equal(codeOf(() => requireExpectedVersion(5, 4)), 'CONFLICT');
});

test('record semantic keys are deterministic and bounded', () => {
  assert.equal(normalizeSemanticKey(' failure behavior ', 'DEC'), 'DEC-FAILURE-BEHAVIOR');
});

test('proposal source revisions must exactly match current revisions', () => {
  assert.doesNotThrow(() => requireCurrentSourceRevisions(['b', 'a'], ['a', 'b']));
  assert.equal(codeOf(() => requireCurrentSourceRevisions(['a'], ['b'])), 'CONFLICT');
});

test('artifact hash is independent of source-id ordering', () => {
  const a = artifactContentHash({ title: 'Safe failure', statement: 'Show the problem.', sourceRecordRevisionIds: ['r2', 'r1'] });
  const b = artifactContentHash({ title: 'Safe failure', statement: 'Show the problem.', sourceRecordRevisionIds: ['r1', 'r2'] });
  assert.equal(a, b);
});

test('M2 allows review transitions but not approval', () => {
  assert.doesNotThrow(() => requireM2ArtifactTransition('draft', 'proposed'));
  assert.doesNotThrow(() => requireM2ArtifactTransition('proposed', 'draft'));
  assert.equal(codeOf(() => requireM2ArtifactTransition('proposed', /** @type {any} */ ('approved'))), 'VALIDATION');
});

test('preview cannot be pointed at a production-labelled data environment', () => {
  assert.equal(requireEnvironmentIsolation({ nodeEnv: 'production', vercelEnv: 'preview', dataEnvironment: 'preview' }), 'preview');
  assert.equal(codeOf(() => requireEnvironmentIsolation({ nodeEnv: 'production', vercelEnv: 'preview', dataEnvironment: 'production' })), 'CONFIGURATION');
});
