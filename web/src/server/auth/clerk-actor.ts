import { auth } from '@clerk/nextjs/server';
import { unauthorized } from '../domain/errors';
import { isClerkConfigured } from '../config';
import { getOrCreateHumanActor } from '../persistence/actor-store';

export type ActorContext = {
  actorId: string;
  externalSubject: string;
  actorType: 'human';
};

export async function requireActor(): Promise<ActorContext> {
  if (!isClerkConfigured()) throw unauthorized('Clerk is not configured for this environment.');
  const { userId } = await auth();
  if (!userId) throw unauthorized();

  return getOrCreateHumanActor('clerk', userId);
}
