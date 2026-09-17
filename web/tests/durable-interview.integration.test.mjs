import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { getOrCreateLocalActor } from '../src/server/persistence/local-actor-store.ts';
import { closeLocalDatabaseForTests, getLocalDatabase } from '../src/server/persistence/local-db.ts';
import { createProject } from '../src/server/persistence/local-project-store.ts';
import { getDurableInterview, saveDurableInterviewAnswer } from '../src/server/interview/durable-interview.ts';

function withLocalDatabase(t) {
  const dir = mkdtempSync(join(tmpdir(), 'wayfound-durable-interview-'));
  process.env.WAYFOUND_LOCAL_DB = join(dir, 'wayfound.sqlite');
  t.after(() => {
    closeLocalDatabaseForTests();
    delete process.env.WAYFOUND_LOCAL_DB;
    rmSync(dir, { recursive: true, force: true });
  });
}

test('adaptive Interview answers survive reopen and keep immutable revision history', async (t) => {
  withLocalDatabase(t);
  const actor = getOrCreateLocalActor();
  const created = await createProject({
    actorId: actor.actorId,
    title: 'Puzzle helper',
    startingIdea: 'I want to make a puzzle game for friends.',
    requestId: 'create-durable-interview',
  });

  const before = await getDurableInterview(actor.actorId, created.projectId);
  assert.equal(before.answers.length, 0);
  assert.equal(before.complete, false);
  assert.ok(before.progress.total >= 5);

  const first = await saveDurableInterviewAnswer({
    actorId: actor.actorId,
    projectId: created.projectId,
    expectedVersion: 1,
    questionKey: 'outcome',
    optionKey: 'enjoy',
    requestId: 'answer-outcome-1',
  });
  assert.equal(first.projectVersion, 2);
  assert.equal(first.recordType, 'decision');

  closeLocalDatabaseForTests();
  const reopened = await getDurableInterview(actor.actorId, created.projectId);
  assert.equal(reopened.version, 2);
  assert.deepEqual(reopened.answers.map((answer) => [answer.questionKey, answer.optionKey]), [['outcome', 'enjoy']]);

  const revised = await saveDurableInterviewAnswer({
    actorId: actor.actorId,
    projectId: created.projectId,
    expectedVersion: 2,
    questionKey: 'outcome',
    optionKey: 'not-sure',
    requestId: 'answer-outcome-2',
  });
  assert.equal(revised.projectVersion, 3);
  assert.equal(revised.recordType, 'open-question');

  const db = getLocalDatabase();
  const revisions = db.prepare(
    `SELECT ar.option_key
       FROM answer_revisions ar
       JOIN answers a ON a.id = ar.answer_id
      WHERE a.project_id = ? AND a.question_key = 'outcome'
      ORDER BY ar.revision_number`,
  ).all(created.projectId);
  assert.deepEqual(revisions.map((row) => row.option_key), ['enjoy', 'not-sure']);

  const currentRecord = db.prepare(
    `SELECT r.record_type, rr.statement
       FROM records r
       JOIN record_revisions rr ON rr.id = r.current_revision_id
      WHERE r.project_id = ? AND r.record_key = 'INT-OUTCOME'`,
  ).get(created.projectId);
  assert.equal(currentRecord.record_type, 'open-question');
  assert.equal(currentRecord.statement, 'If this works really well, what would make you happiest about it?');

  await assert.rejects(
    () => saveDurableInterviewAnswer({
      actorId: actor.actorId,
      projectId: created.projectId,
      expectedVersion: 2,
      questionKey: 'audience',
      optionKey: 'small-group',
      requestId: 'stale-answer',
    }),
    (error) => error?.code === 'CONFLICT',
  );
});

test('server rejects options and questions that are not valid for the current adaptive state', async (t) => {
  withLocalDatabase(t);
  const actor = getOrCreateLocalActor();
  const created = await createProject({
    actorId: actor.actorId,
    title: 'Simple local tool',
    startingIdea: 'I want to make a simple checklist for myself.',
    requestId: 'create-general-interview',
  });

  await assert.rejects(
    () => saveDurableInterviewAnswer({
      actorId: actor.actorId,
      projectId: created.projectId,
      expectedVersion: 1,
      questionKey: 'game-loop',
      optionKey: 'solve',
      requestId: 'bad-question',
    }),
    (error) => error?.code === 'VALIDATION',
  );

  await assert.rejects(
    () => saveDurableInterviewAnswer({
      actorId: actor.actorId,
      projectId: created.projectId,
      expectedVersion: 1,
      questionKey: 'outcome',
      optionKey: 'definitely-not-real',
      requestId: 'bad-option',
    }),
    (error) => error?.code === 'VALIDATION',
  );
});
