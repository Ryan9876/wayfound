import { randomUUID } from 'node:crypto';
import { getPool } from './db';

export type StoredActor = {
  actorId: string;
  externalSubject: string;
  actorType: 'human';
};

export async function getOrCreateHumanActor(provider: string, externalSubject: string): Promise<StoredActor> {
  const actorId = randomUUID();
  const result = await getPool().query<{ id: string; external_subject: string }>(
    `INSERT INTO actors (id, provider, external_subject, actor_type)
     VALUES ($1, $2, $3, 'human')
     ON CONFLICT (provider, external_subject)
     DO UPDATE SET external_subject = EXCLUDED.external_subject
     RETURNING id, external_subject`,
    [actorId, provider, externalSubject],
  );

  return {
    actorId: result.rows[0].id,
    externalSubject: result.rows[0].external_subject,
    actorType: 'human',
  };
}
