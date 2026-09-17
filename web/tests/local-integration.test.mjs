import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { getOrCreateLocalActor } from '../src/server/persistence/local-actor-store.ts';
import { closeLocalDatabaseForTests, getLocalDatabase } from '../src/server/persistence/local-db.ts';
import { acceptInterviewAnswer, createProject, getProject, listProjects, proposeArtifact } from '../src/server/persistence/local-project-store.ts';

function withLocalDatabase(t) {
  const dir = mkdtempSync(join(tmpdir(), 'wayfound-local-'));
  process.env.WAYFOUND_LOCAL_DB = join(dir, 'wayfound.sqlite');
  t.after(() => {
    closeLocalDatabaseForTests();
    delete process.env.WAYFOUND_LOCAL_DB;
    rmSync(dir, { recursive: true, force: true });
  });
}

test('local Actor is stable and projects survive database reopen', async (t) => {
  withLocalDatabase(t);
  const first = getOrCreateLocalActor();
  const second = getOrCreateLocalActor();
  assert.equal(first.actorId, second.actorId);

  const created = await createProject({ actorId: first.actorId, title: 'Local project', startingIdea: 'Build something useful without requiring the cloud.', requestId: 'create-1' });
  const repeated = await createProject({ actorId: first.actorId, title: 'ignored duplicate', startingIdea: 'ignored duplicate request', requestId: 'create-1' });
  assert.deepEqual(repeated, created);

  closeLocalDatabaseForTests();
  const projects = await listProjects(first.actorId);
  assert.equal(projects.length, 1);
  assert.equal(projects[0].id, created.projectId);
  assert.equal(projects[0].version, 1);
});

test('local revision, traceability, proposal, and stale-write rules match the domain contract', async (t) => {
  withLocalDatabase(t);
  const actor = getOrCreateLocalActor();
  const created = await createProject({ actorId: actor.actorId, title: 'Traceable local project', startingIdea: 'Keep project truth on this machine.', requestId: 'create-2' });

  const answer1 = await acceptInterviewAnswer({
    actorId: actor.actorId,
    projectId: created.projectId,
    expectedVersion: 1,
    questionKey: 'outcome',
    optionKey: 'save-effort',
    recordTitle: 'Primary outcome',
    recordStatement: 'Save effort for the person using the tool.',
    requestId: 'answer-1',
  });
  assert.equal(answer1.projectVersion, 2);

  const detail = await getProject(actor.actorId, created.projectId);
  assert.equal(detail.records.length, 1);
  assert.equal(detail.records[0].revisionId, answer1.recordRevisionId);

  const proposal = await proposeArtifact({
    actorId: actor.actorId,
    projectId: created.projectId,
    expectedVersion: 2,
    artifactKey: 'outcome-requirement',
    kind: 'requirement',
    title: 'Save effort',
    statement: 'The first build should reduce repeated manual effort.',
    sourceRecordRevisionIds: [answer1.recordRevisionId],
    requestId: 'proposal-1',
  });
  assert.equal(proposal.status, 'proposed');
  assert.equal(proposal.projectVersion, 3);

  const answer2 = await acceptInterviewAnswer({
    actorId: actor.actorId,
    projectId: created.projectId,
    expectedVersion: 3,
    questionKey: 'outcome',
    optionKey: 'reduce-errors',
    recordTitle: 'Primary outcome',
    recordStatement: 'Reduce avoidable errors first.',
    requestId: 'answer-2',
  });
  assert.equal(answer2.projectVersion, 4);
  assert.notEqual(answer2.recordRevisionId, answer1.recordRevisionId);

  await assert.rejects(
    () => proposeArtifact({
      actorId: actor.actorId,
      projectId: created.projectId,
      expectedVersion: 4,
      artifactKey: 'stale-requirement',
      kind: 'requirement',
      title: 'Stale requirement',
      statement: 'This should not be proposed from an old source revision.',
      sourceRecordRevisionIds: [answer1.recordRevisionId],
      requestId: 'proposal-stale',
    }),
    (error) => error?.code === 'CONFLICT',
  );

  const db = getLocalDatabase();
  const traces = db.prepare(`SELECT COUNT(*) AS count FROM trace_links WHERE project_id = ?`).get(created.projectId);
  assert.equal(Number(traces.count), 2);
  assert.throws(() => db.prepare(`UPDATE artifacts SET lifecycle_state = 'approved' WHERE id = ?`).run(proposal.artifactId));
});
