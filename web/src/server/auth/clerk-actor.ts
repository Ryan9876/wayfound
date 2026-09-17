import { auth } from '@clerk/nextjs/server';
import { randomUUID } from 'node:crypto';
import { unauthorized } from '../domain/errors';
import { getPool } from '../persistence/db';
import { isClerkConfigured } from '../config';

export type ActorContext = {
  actorId: string;
  externalSubject: string;
  actorType: 'human';
};

export async function requireActor(): Promise<ActorContext> {
  if (!isClerkConfigured()) throw unauthorized('Clerk is not configured for this environment.');
  const { userId } = await auth();
  if (!userId) throw unauthorized();

  const actorId = randomUUID();
  const result = await getPool().query<{ id: string }>(
    `INSERT INTO actors (id, provider, external_subject, actor_type)
     VALUES ($1, 'clerk', $2, 'human')
     ON CONFLICT (provider, external_subject)
     DO UPDATE SET external_subject = EXCLUDED.external_subject
     RETURNING id`,
    [actorId, userId],
  );

  return { actorId: result.rows[0].id, externalSubject: userId, actorType: 'human' };
}
