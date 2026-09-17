import { randomUUID } from 'node:crypto';
import { getLocalDatabase } from './local-db';

export type LocalActor = {
  actorId: string;
  externalSubject: string;
  actorType: 'human';
};

export function getOrCreateLocalActor(): LocalActor {
  const db = getLocalDatabase();
  const externalSubject = 'local-owner';
  const existing = db.prepare(
    `SELECT id FROM actors WHERE provider = 'local' AND external_subject = ? AND actor_type = 'human'`,
  ).get(externalSubject) as { id: string } | undefined;
  if (existing) return { actorId: existing.id, externalSubject, actorType: 'human' };

  const actorId = randomUUID();
  db.prepare(
    `INSERT INTO actors (id, provider, external_subject, actor_type) VALUES (?, 'local', ?, 'human')`,
  ).run(actorId, externalSubject);
  return { actorId, externalSubject, actorType: 'human' };
}
