import { randomUUID } from 'node:crypto';
import { getPool } from '@/server/persistence/db';
import { listProjects } from '@/server/persistence/project-store';

export async function ensureActorAndList(clerkUserId: string) {
  const result = await getPool().query<{ id: string }>(
    `INSERT INTO actors (id, provider, external_subject, actor_type)
     VALUES ($1, 'clerk', $2, 'human')
     ON CONFLICT (provider, external_subject) DO UPDATE SET external_subject = EXCLUDED.external_subject
     RETURNING id`,
    [randomUUID(), clerkUserId],
  );
  return listProjects(result.rows[0].id);
}
