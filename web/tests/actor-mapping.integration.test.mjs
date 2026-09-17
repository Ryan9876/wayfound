import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { getPool } from '../src/server/persistence/db.ts';
import { getOrCreateHumanActor } from '../src/server/persistence/actor-store.ts';

after(async () => {
  await getPool().end();
});

test('the same Clerk subject maps to one stable Wayfound Actor', async () => {
  const subject = `clerk-test-${randomUUID()}`;
  const first = await getOrCreateHumanActor('clerk', subject);
  const second = await getOrCreateHumanActor('clerk', subject);

  assert.equal(first.actorId, second.actorId);
  assert.equal(first.externalSubject, subject);
  assert.equal(second.externalSubject, subject);
  assert.equal(first.actorType, 'human');

  const stored = await getPool().query(
    `SELECT count(*)::int AS count FROM actors WHERE provider = 'clerk' AND external_subject = $1`,
    [subject],
  );
  assert.equal(stored.rows[0].count, 1);
});

test('external subjects remain scoped to their identity provider', async () => {
  const subject = `shared-subject-${randomUUID()}`;
  const clerkActor = await getOrCreateHumanActor('clerk', subject);
  const testActor = await getOrCreateHumanActor('test-provider', subject);
  assert.notEqual(clerkActor.actorId, testActor.actorId);
});
