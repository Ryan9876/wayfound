import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getPool } from '../src/server/persistence/db.ts';
import {
  acceptInterviewAnswer,
  createProject,
  getProject,
  proposeArtifact,
} from '../src/server/persistence/project-store.ts';

const actorId = randomUUID();
const outsiderId = randomUUID();

async function seedActors() {
  await getPool().query(
    `INSERT INTO actors (id, provider, external_subject, actor_type)
     VALUES ($1, 'test', $2, 'human'), ($3, 'test', $4, 'human')`,
    [actorId, `actor-${actorId}`, outsiderId, `actor-${outsiderId}`],
  );
}

await seedActors();

after(async () => {
  await getPool().end();
});

test('project commands preserve revision, trace, idempotency, concurrency, and proposal boundaries', async () => {
  const createRequestId = randomUUID();
  const created = await createProject({
    actorId,
    title: 'Synthetic M2 project',
    startingIdea: 'Synthetic test content only.',
    requestId: createRequestId,
  });
  assert.equal(created.version, 1);

  const createRetry = await createProject({
    actorId,
    title: 'Synthetic M2 project',
    startingIdea: 'Synthetic test content only.',
    requestId: createRequestId,
  });
  assert.deepEqual(createRetry, created);

  const count = await getPool().query('SELECT count(*)::int AS count FROM projects WHERE id = $1', [created.projectId]);
  assert.equal(count.rows[0].count, 1);

  const answerRequestId = randomUUID();
  const accepted = await acceptInterviewAnswer({
    actorId,
    projectId: created.projectId,
    expectedVersion: 1,
    questionKey: 'outcome',
    optionKey: 'good-answer-faster',
    recordTitle: 'Primary outcome',
    recordStatement: 'Help people reach a good answer faster.',
    requestId: answerRequestId,
  });
  assert.equal(accepted.projectVersion, 2);

  const answerRetry = await acceptInterviewAnswer({
    actorId,
    projectId: created.projectId,
    expectedVersion: 1,
    questionKey: 'outcome',
    optionKey: 'good-answer-faster',
    recordTitle: 'Primary outcome',
    recordStatement: 'Help people reach a good answer faster.',
    requestId: answerRequestId,
  });
  assert.deepEqual(answerRetry, accepted);

  const answerTrace = await getPool().query(
    `SELECT count(*)::int AS count FROM trace_links
      WHERE project_id = $1 AND from_revision_id = $2 AND to_revision_id = $3 AND relation = 'produced'`,
    [created.projectId, accepted.answerRevisionId, accepted.recordRevisionId],
  );
  assert.equal(answerTrace.rows[0].count, 1);

  await assert.rejects(
    () => acceptInterviewAnswer({
      actorId,
      projectId: created.projectId,
      expectedVersion: 1,
      questionKey: 'failure',
      optionKey: 'show-it',
      recordTitle: 'Failure behavior',
      recordStatement: 'Show the problem clearly.',
      requestId: randomUUID(),
    }),
    (error) => error?.code === 'CONFLICT',
  );

  const proposed = await proposeArtifact({
    actorId,
    projectId: created.projectId,
    expectedVersion: 2,
    artifactKey: 'decision-speed',
    kind: 'requirement',
    title: 'Support faster decisions',
    statement: 'The product must help the user reach a useful decision without hiding important evidence.',
    sourceRecordRevisionIds: [accepted.recordRevisionId],
    requestId: randomUUID(),
  });
  assert.equal(proposed.projectVersion, 3);
  assert.equal(proposed.status, 'proposed');

  const proposalTrace = await getPool().query(
    `SELECT count(*)::int AS count FROM trace_links
      WHERE project_id = $1 AND from_revision_id = $2 AND to_revision_id = $3 AND relation = 'supports'`,
    [created.projectId, accepted.recordRevisionId, proposed.artifactRevisionId],
  );
  assert.equal(proposalTrace.rows[0].count, 1);

  const updated = await acceptInterviewAnswer({
    actorId,
    projectId: created.projectId,
    expectedVersion: 3,
    questionKey: 'outcome',
    optionKey: 'good-answer-safer',
    recordTitle: 'Primary outcome',
    recordStatement: 'Help people reach a useful answer with clear evidence.',
    requestId: randomUUID(),
  });
  assert.equal(updated.projectVersion, 4);
  assert.notEqual(updated.recordRevisionId, accepted.recordRevisionId);

  await assert.rejects(
    () => proposeArtifact({
      actorId,
      projectId: created.projectId,
      expectedVersion: 4,
      artifactKey: 'stale-source',
      kind: 'requirement',
      title: 'Stale proposal',
      statement: 'This should not materialize.',
      sourceRecordRevisionIds: [accepted.recordRevisionId],
      requestId: randomUUID(),
    }),
    (error) => error?.code === 'CONFLICT',
  );

  await assert.rejects(
    () => getProject(outsiderId, created.projectId),
    (error) => error?.code === 'NOT_FOUND',
  );

  await assert.rejects(
    () => getPool().query(`UPDATE artifacts SET lifecycle_state = 'approved' WHERE id = $1`, [proposed.artifactId]),
  );

  const project = await getProject(actorId, created.projectId);
  assert.equal(project.version, 4);
  assert.equal(project.artifacts[0].state, 'proposed');
});
